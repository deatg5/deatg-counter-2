// src/electron/main.ts
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { StorageManager } from '../core/storage';
import { HotkeyManager } from '../core/hotkeys';
import { AppState, Counter } from '../core/types';
import { uIOhook, UiohookKey } from 'uiohook-napi';
import { DiscordPresenceManager } from './discord';

let mainWindow: BrowserWindow | null = null;
const storage = new StorageManager();
const hotkeyManager = new HotkeyManager();
const discordManager = new DiscordPresenceManager();
let currentState: AppState;

async function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        icon: path.join(__dirname, '../../public/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    currentState = await storage.loadState();
    discordManager.setEnabled(!!currentState.globalSettings.discordRPCEnabled);
    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));
    
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('state-update', currentState);
    });

    updateHotkeys();

    // awaken the global net AND give it ears to listen! ><
    uIOhook.start();
    uIOhook.on('keydown', (event) => {
        const humanReadableName = keyNameMap[event.keycode] || `KeyCode_${event.keycode}`;
        hotkeyManager.handleKeyPress(humanReadableName);
    });
}

function updateHotkeys() {
    hotkeyManager.registerCounterHotkeys(
        currentState.counters,
        currentState.globalSettings,
        async (counterId, amount) => {
            // increase counter
            const counter = currentState.counters.find(c => c.id === counterId);
            if (counter) {
                counter.count = Number(counter.count) + Number(amount);
                mainWindow?.webContents.send('counter-updated', counter);
                await storage.saveState(currentState); // <-- bind it to the hard drive! ^^
            }
        },
        async (counterId, amount) => {
            // decrease counter
            const counter = currentState.counters.find(c => c.id === counterId);
            if (counter) {
                counter.count = Math.max(0, Number(counter.count) - Number(amount));
                mainWindow?.webContents.send('counter-updated', counter);
                await storage.saveState(currentState); // <-- bind it to the hard drive! ^^
            }
        }
    );
    discordManager.updateCounters(currentState.counters);
}

// IPC handlers

// we construct a reverse grimoire to translate integers back to human-readable strings! :3
const keyNameMap: Record<number, string> = Object.entries(UiohookKey).reduce((acc, [key, value]) => {
    acc[value as number] = key;
    return acc;
}, {} as Record<number, string>);

// the ephemeral trap ritual
ipcMain.handle('start-hotkey-binding', async () => {
    return new Promise((resolve) => {
        // we define the exact mechanics of the trap
        const captureListener = (event: any) => {
            const rawKeycode = event.keycode;
            
            // translate the integer to a string, or fallback to the raw number if it's deeply esoteric
            const humanReadableName = keyNameMap[rawKeycode] || `KeyCode_${rawKeycode}`;
            
            // CRITICAL: we violently destroy the net the exact millisecond we catch our prey!
            uIOhook.removeListener('keydown', captureListener);
            
            // hand the chimera payload back across the bridge
            resolve({ 
                keycode: rawKeycode, 
                keyName: humanReadableName 
            });
        };

        // cast the net into the operating system's river!
        uIOhook.on('keydown', captureListener);
    });
});

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

// the ritual of true unmaking! ><
ipcMain.on('delete-counter', async (event, counterId: string) => {
    // filter the ghost out of the array
    currentState.counters = currentState.counters.filter(c => c.id !== counterId);
    
    // bind the newly empty space to stone
    await storage.saveState(currentState);
    
    // re-weave the eavesdropper's net so it stops listening for the dead counter's hotkeys!
    updateHotkeys();
});

ipcMain.on('update-global-settings', async (event, settings) => {
    const wasEnabled = currentState.globalSettings.discordRPCEnabled;
    currentState.globalSettings = settings;
    await storage.saveState(currentState);

    // dynamically connect or sever the socket based on the toggle! :3
    if (wasEnabled !== settings.discordRPCEnabled) {
        discordManager.setEnabled(!!settings.discordRPCEnabled);
    }
    updateHotkeys(); 
});

// ... similar handlers for tabs, selection, etc.

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    discordManager.disconnect();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    uIOhook.stop();
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