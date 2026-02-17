// src/electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { StorageManager } from '../core/storage';
import { HotkeyManager } from '../core/hotkeys';
import { AppState, Counter } from '../core/types';

let mainWindow: BrowserWindow | null = null;
const storage = new StorageManager();
const hotkeyManager = new HotkeyManager();
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

    // Load the app state
    currentState = await storage.loadState();
    
    // Load the HTML file
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
    
    // Send initial state to renderer
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('state-update', currentState);
    });

    // Register initial hotkeys
    updateHotkeys();
}

function updateHotkeys() {
    hotkeyManager.registerCounterHotkeys(
        currentState.counters,
        currentState.globalSettings,
        (counterId, amount) => {
            // Increase counter
            const counter = currentState.counters.find(c => c.id === counterId);
            if (counter) {
                counter.count = Number(counter.count) + Number(amount);
                mainWindow?.webContents.send('counter-updated', counter);
            }
        },
        (counterId, amount) => {
            // Decrease counter
            const counter = currentState.counters.find(c => c.id === counterId);
            if (counter) {
                counter.count = Math.max(0, Number(counter.count) - Number(amount));
                mainWindow?.webContents.send('counter-updated', counter);
            }
        }
    );
}

// IPC handlers
ipcMain.on('update-counter', async (event, counter: Counter) => {
    const index = currentState.counters.findIndex(c => c.id === counter.id);
    if (index !== -1) {
        currentState.counters[index] = counter;
        await storage.saveState(currentState);
        updateHotkeys();
    }
});

ipcMain.on('add-counter', async (event, counter: Counter) => {
    currentState.counters.push(counter);
    await storage.saveState(currentState);
    updateHotkeys();
    event.reply('counter-added', counter);
});

ipcMain.on('update-global-settings', async (event, settings) => {
    currentState.globalSettings = settings;
    await storage.saveState(currentState);
    updateHotkeys();
});

// ... similar handlers for tabs, selection, etc.

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    hotkeyManager.unregisterAll();
});

// in main.ts
ipcMain.on('add-tab', async (event, tab) => {
    currentState.tabs.push(tab);
    await storage.saveState(currentState);
    event.reply('tab-added', tab);
});

ipcMain.on('update-active-tab', async (event, tabId) => {
    currentState.activeTabId = tabId;
    await storage.saveState(currentState);
});

ipcMain.on('delete-tab', async (event, tabId) => {
    currentState.tabs = currentState.tabs.filter(t => t.id !== tabId);
    currentState.counters = currentState.counters.filter(c => c.tabId !== tabId);
    if (currentState.activeTabId === tabId) {
        currentState.activeTabId = currentState.tabs[0].id;
    }
    await storage.saveState(currentState);
});

ipcMain.on('update-tabs', async (event, tabs) => {
    currentState.tabs = tabs;
    await storage.saveState(currentState);
});