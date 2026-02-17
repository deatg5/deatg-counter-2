import { app, BrowserWindow, ipcMain, session } from 'electron';
import * as path from 'path';
import { StorageManager } from '../core/storage';
import { HotkeyManager } from '../core/hotkeys';
import { AppState, Counter, GlobalSettings, Tab } from '../core/types';
import { DiscordRichPresenceManager } from '../core/discord-rich-presence';

let mainWindow: BrowserWindow | null = null;
const storage = new StorageManager();
const hotkeyManager = new HotkeyManager();
const richPresenceManager = new DiscordRichPresenceManager();
let currentState: AppState;
let hotkeysPaused = false;

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
                'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'"]
            }
        });
    });

    currentState = await storage.loadState();

    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('state-update', currentState);
    });

    richPresenceManager.onStatusChanged(connected => {
        mainWindow?.webContents.send('rich-presence-status', { connected });
    });

    await richPresenceManager.setEnabled(currentState.globalSettings.richPresenceEnabled);
    await updatePresence();
    updateHotkeys();
}

function getActiveTabName(): string {
    const tab = currentState.tabs.find(t => t.id === currentState.activeTabId);
    return tab?.name ?? 'Counters';
}

function getSelectedCounterTotal(): number {
    return currentState.counters
        .filter(counter => counter.isSelected)
        .reduce((sum, counter) => sum + Number(counter.count || 0), 0);
}

async function updatePresence() {
    if (!currentState.globalSettings.richPresenceEnabled) {
        return;
    }

    await richPresenceManager.updatePresence({
        tabName: getActiveTabName(),
        encounterCount: getSelectedCounterTotal(),
        startTimestamp: richPresenceManager.getSessionStart()
    });
}

async function persistAndSync() {
    await storage.saveState(currentState);

    if (!hotkeysPaused) {
        updateHotkeys();
    }

    await updatePresence();
}

function updateCounterCount(counterId: string, delta: number) {
    const counter = currentState.counters.find(c => c.id === counterId);
    if (!counter) {
        return;
    }

    counter.count = Number(counter.count) + Number(delta);
    mainWindow?.webContents.send('counter-updated', counter);
    void persistAndSync();
}

function updateHotkeys() {
    if (hotkeysPaused) {
        hotkeyManager.unregisterAll();
        return;
    }

    hotkeyManager.registerCounterHotkeys(
        currentState.counters,
        currentState.globalSettings,
        (counterId, amount) => updateCounterCount(counterId, amount),
        (counterId, amount) => updateCounterCount(counterId, -amount)
    );
}

ipcMain.on('update-counter', async (_event, counter: Counter) => {
    const index = currentState.counters.findIndex(c => c.id === counter.id);
    if (index === -1) {
        return;
    }

    currentState.counters[index] = counter;
    await persistAndSync();
});

ipcMain.on('add-counter', async (event, counter: Counter) => {
    currentState.counters.push(counter);
    await persistAndSync();
    event.reply('counter-added', counter);
});

ipcMain.on('update-global-settings', async (_event, settings: GlobalSettings) => {
    currentState.globalSettings = settings;
    await richPresenceManager.setEnabled(currentState.globalSettings.richPresenceEnabled);
    await persistAndSync();
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
    currentState.tabs = currentState.tabs.filter(t => t.id !== tabId);
    currentState.counters = currentState.counters.filter(c => c.tabId !== tabId);

    if (!currentState.tabs.length) {
        currentState.tabs.push({ id: 'default', name: 'Counters', order: 0 });
    }

    if (currentState.activeTabId === tabId) {
        currentState.activeTabId = currentState.tabs[0].id;
    }

    await persistAndSync();
});

ipcMain.on('update-tabs', async (_event, tabs: Tab[]) => {
    currentState.tabs = tabs;
    await persistAndSync();
});

ipcMain.on('pause-hotkeys', () => {
    hotkeysPaused = true;
    updateHotkeys();
});

ipcMain.on('resume-hotkeys', () => {
    hotkeysPaused = false;
    updateHotkeys();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    hotkeyManager.unregisterAll();
    richPresenceManager.disconnect();
});
