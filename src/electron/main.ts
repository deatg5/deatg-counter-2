import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { StorageManager } from '../core/storage';
import { HotkeyManager } from '../core/hotkeys';
import { DiscordPresenceManager } from '../core/discordPresence';
import { AppState, Counter, GlobalSettings, Tab } from '../core/types';

let mainWindow: BrowserWindow | null = null;
const storage = new StorageManager();
const hotkeyManager = new HotkeyManager();
const discordPresence = new DiscordPresenceManager();
let currentState: AppState;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  currentState = await storage.loadState();

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('state-update', currentState);
    sendDiscordStatus();
  });

  hotkeyManager.attachWindowListeners(mainWindow, increaseCounter, decreaseCounter);
  updateHotkeys();
  await syncDiscordPresence();
}

function increaseCounter(counterId: string, amount: number): void {
  const counter = currentState.counters.find((item) => item.id === counterId);
  if (!counter) {
    return;
  }

  counter.count = Number(counter.count) + Number(amount);
  mainWindow?.webContents.send('counter-updated', counter);
  void persistAndRefresh();
}

function decreaseCounter(counterId: string, amount: number): void {
  const counter = currentState.counters.find((item) => item.id === counterId);
  if (!counter) {
    return;
  }

  counter.count = Number(counter.count) - Number(amount);
  mainWindow?.webContents.send('counter-updated', counter);
  void persistAndRefresh();
}

function updateHotkeys(): void {
  hotkeyManager.registerCounterHotkeys(
    currentState.counters,
    currentState.globalSettings,
    increaseCounter,
    decreaseCounter
  );
}

async function persistAndRefresh(): Promise<void> {
  await storage.saveState(currentState);
  updateHotkeys();
  await syncDiscordPresence();
}

function getActiveTabName(): string {
  const tab = currentState.tabs.find((item) => item.id === currentState.activeTabId);
  return tab?.name || 'Counters';
}

function getSelectedEncounterTotal(): number {
  return currentState.counters
    .filter((counter) => counter.isSelected)
    .reduce((total, counter) => total + Number(counter.count), 0);
}

async function syncDiscordPresence(): Promise<void> {
  await discordPresence.setEnabled(currentState.globalSettings.richPresenceEnabled);
  await discordPresence.update(getActiveTabName(), getSelectedEncounterTotal());
  sendDiscordStatus();
}

function sendDiscordStatus(): void {
  mainWindow?.webContents.send('discord-status-update', {
    enabled: currentState.globalSettings.richPresenceEnabled,
    connected: discordPresence.isConnected()
  });
}

ipcMain.on('update-counter', async (_event, counter: Counter) => {
  const index = currentState.counters.findIndex((item) => item.id === counter.id);
  if (index === -1) {
    return;
  }

  currentState.counters[index] = counter;
  await persistAndRefresh();
});

ipcMain.on('add-counter', async (event, counter: Counter) => {
  currentState.counters.push(counter);
  await persistAndRefresh();
  event.reply('counter-added', counter);
});

ipcMain.on('update-global-settings', async (_event, settings: GlobalSettings) => {
  currentState.globalSettings = settings;
  await persistAndRefresh();
});

ipcMain.on('add-tab', async (event, tab: Tab) => {
  currentState.tabs.push(tab);
  await persistAndRefresh();
  event.reply('tab-added', tab);
});

ipcMain.on('update-active-tab', async (_event, tabId: string) => {
  currentState.activeTabId = tabId;
  await persistAndRefresh();
});

ipcMain.on('delete-tab', async (_event, tabId: string) => {
  if (currentState.tabs.length <= 1) {
    return;
  }

  currentState.tabs = currentState.tabs.filter((tab) => tab.id !== tabId);
  currentState.counters = currentState.counters.filter((counter) => counter.tabId !== tabId);

  if (currentState.activeTabId === tabId) {
    currentState.activeTabId = currentState.tabs[0]?.id ?? 'default';
  }

  await persistAndRefresh();
});

ipcMain.on('update-tabs', async (_event, tabs: Tab[]) => {
  currentState.tabs = tabs;
  await persistAndRefresh();
});

ipcMain.on('pause-hotkeys', () => {
  hotkeyManager.pause();
});

ipcMain.on('resume-hotkeys', () => {
  hotkeyManager.resume();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  hotkeyManager.unregisterAll();
});
