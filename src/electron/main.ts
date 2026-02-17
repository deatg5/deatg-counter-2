import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { StorageManager } from '../core/storage';
import { HotkeyManager } from '../core/hotkeys';
import { AppState, Counter, GlobalSettings, Tab } from '../core/types';
import { DiscordPresenceManager } from '../core/discordPresence';

let mainWindow: BrowserWindow | null = null;
const storage = new StorageManager();
const hotkeyManager = new HotkeyManager();
const discordPresence = new DiscordPresenceManager();
let currentState: AppState;

async function createWindow() {
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

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self';"]
            }
        });
    });

    currentState = await storage.loadState();

    await mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('state-update', currentState);
    });

    await discordPresence.setEnabled(currentState.globalSettings.discordRichPresenceEnabled);
    await updateDiscordPresence();
    updateHotkeys();
}

function getActiveTabName(): string {
    const tab = currentState.tabs.find((item) => item.id === currentState.activeTabId);
    return tab?.name ?? 'Counters';
}

function getSelectedTotal(): number {
    return currentState.counters
        .filter((counter) => counter.isSelected && counter.tabId === currentState.activeTabId)
        .reduce((total, counter) => total + Number(counter.count), 0);
}

async function updateDiscordPresence() {
    if (!discordPresence.isEnabled()) {
        mainWindow?.webContents.send('discord-status', { enabled: false, connected: false });
        return;
    }

    await discordPresence.updateActivity(getActiveTabName(), getSelectedTotal());
    mainWindow?.webContents.send('discord-status', { enabled: true, connected: discordPresence.isConnected() });
}

async function persistAndSync() {
    await storage.saveState(currentState);
    updateHotkeys();
    await updateDiscordPresence();
}

function updateHotkeys() {
    hotkeyManager.registerCounterHotkeys(
        currentState.counters,
        currentState.globalSettings,
        async (counterId, amount) => {
            const counter = currentState.counters.find((item) => item.id === counterId);
            if (!counter) return;

            counter.count = Number(counter.count) + Number(amount);
            await persistAndSync();
            mainWindow?.webContents.send('counter-updated', counter);
        },
        async (counterId, amount) => {
            const counter = currentState.counters.find((item) => item.id === counterId);
            if (!counter) return;

            counter.count = Number(counter.count) - Number(amount);
            await persistAndSync();
            mainWindow?.webContents.send('counter-updated', counter);
        }
    );
}

ipcMain.on('update-counter', async (_event, counter: Counter) => {
    const index = currentState.counters.findIndex((item) => item.id === counter.id);
    if (index === -1) return;

    currentState.counters[index] = counter;
    await persistAndSync();
    mainWindow?.webContents.send('counter-updated', counter);
});

ipcMain.on('add-counter', async (event, counter: Counter) => {
    currentState.counters.push(counter);
    await persistAndSync();
    event.reply('counter-added', counter);
});

ipcMain.on('update-global-settings', async (_event, settings: GlobalSettings) => {
    currentState.globalSettings = settings;
    await discordPresence.setEnabled(settings.discordRichPresenceEnabled);
    await persistAndSync();
    mainWindow?.webContents.send('state-update', currentState);
});

ipcMain.on('pause-hotkeys', () => {
    hotkeyManager.pause();
});

ipcMain.on('resume-hotkeys', () => {
    hotkeyManager.resume();
    updateHotkeys();
});

ipcMain.on('add-tab', async (event, tab: Tab) => {
    currentState.tabs.push(tab);
    await persistAndSync();
    event.reply('tab-added', tab);
});

ipcMain.on('update-active-tab', async (_event, tabId: string) => {
    currentState.activeTabId = tabId;
    await persistAndSync();
});

ipcMain.on('delete-tab', async (_event, tabId: string) => {
    if (currentState.tabs.length <= 1) {
        return;
    }

    currentState.tabs = currentState.tabs.filter((tab) => tab.id !== tabId);
    currentState.counters = currentState.counters.filter((counter) => counter.tabId !== tabId);

    if (currentState.activeTabId === tabId && currentState.tabs[0]) {
        currentState.activeTabId = currentState.tabs[0].id;
    }

    await persistAndSync();
    mainWindow?.webContents.send('state-update', currentState);
});

ipcMain.on('update-tabs', async (_event, tabs: Tab[]) => {
    currentState.tabs = tabs;
    await persistAndSync();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    hotkeyManager.unregisterAll();
    discordPresence.disconnect();
});
