import { app, BrowserWindow, ipcMain } from 'electron';
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
let hotkeysPaused = false;

function parseFiniteNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeGlobalSettings(settings: Partial<GlobalSettings> | undefined, previous: GlobalSettings): GlobalSettings {
    const next = settings ?? {};
    return {
        increaseAmount: parseFiniteNumber(next.increaseAmount, previous.increaseAmount),
        decreaseAmount: parseFiniteNumber(next.decreaseAmount, previous.decreaseAmount),
        increaseHotkey: typeof next.increaseHotkey === 'string' && next.increaseHotkey.trim()
            ? next.increaseHotkey.trim()
            : previous.increaseHotkey,
        decreaseHotkey: typeof next.decreaseHotkey === 'string' && next.decreaseHotkey.trim()
            ? next.decreaseHotkey.trim()
            : previous.decreaseHotkey,
        richPresenceEnabled: typeof next.richPresenceEnabled === 'boolean'
            ? next.richPresenceEnabled
            : previous.richPresenceEnabled
    };
}

function sanitizeCounter(counter: Counter): Counter {
    return {
        ...counter,
        count: parseFiniteNumber(counter.count, 0),
        increaseAmount: typeof counter.increaseAmount === 'number' && Number.isFinite(counter.increaseAmount)
            ? counter.increaseAmount
            : undefined,
        decreaseAmount: typeof counter.decreaseAmount === 'number' && Number.isFinite(counter.decreaseAmount)
            ? counter.decreaseAmount
            : undefined
    };
}

function acceleratorFromInput(input: Electron.Input): string | null {
    if (!input.key || ['Control', 'Shift', 'Alt', 'Meta'].includes(input.key)) {
        return null;
    }

    const modifiers: string[] = [];
    if (input.control) modifiers.push('Control');
    if (input.meta) modifiers.push('Command');
    if (input.alt) modifiers.push('Alt');
    if (input.shift) modifiers.push('Shift');

    let key = input.key;
    if (key.startsWith('Arrow')) {
        key = key.replace('Arrow', '');
    } else if (key.length === 1) {
        key = key.toUpperCase();
    }

    return [...modifiers, key].join('+');
}

async function updateDiscordPresence() {
    const activeTab = currentState.tabs.find((tab) => tab.id === currentState.activeTabId);
    const tabName = activeTab?.name ?? 'Counters';
    const total = currentState.counters
        .filter((counter) => counter.tabId === currentState.activeTabId && counter.isSelected)
        .reduce((sum, counter) => sum + Number(counter.count), 0);

    await discordPresence.setEnabled(currentState.globalSettings.richPresenceEnabled);
    await discordPresence.updateActivity(tabName, total);
    mainWindow?.webContents.send('discord-status', discordPresence.getStatus());
}

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

    currentState = await storage.loadState();

    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (hotkeysPaused || input.type !== 'keyDown') {
            return;
        }
        const accelerator = acceleratorFromInput(input);
        if (!accelerator) {
            return;
        }
        hotkeyManager.handleAccelerator(accelerator);
        event.preventDefault();
    });

    mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

    mainWindow.webContents.on('did-finish-load', async () => {
        mainWindow?.webContents.send('state-update', currentState);
        await updateDiscordPresence();
    });

    updateHotkeys();
}

function updateHotkeys() {
    hotkeyManager.registerCounterHotkeys(
        currentState.counters,
        currentState.globalSettings,
        async (counterId, amount) => {
            const counter = currentState.counters.find((c) => c.id === counterId);
            if (!counter) return;
            counter.count = Number(counter.count) + Number(amount);
            await storage.saveState(currentState);
            mainWindow?.webContents.send('counter-updated', counter);
            await updateDiscordPresence();
        },
        async (counterId, amount) => {
            const counter = currentState.counters.find((c) => c.id === counterId);
            if (!counter) return;
            counter.count = Number(counter.count) - Number(amount);
            await storage.saveState(currentState);
            mainWindow?.webContents.send('counter-updated', counter);
            await updateDiscordPresence();
        }
    );
}

ipcMain.on('pause-hotkeys', () => {
    hotkeysPaused = true;
});

ipcMain.on('resume-hotkeys', () => {
    hotkeysPaused = false;
});

ipcMain.on('update-counter', async (_event, counter: Counter) => {
    const index = currentState.counters.findIndex((c) => c.id === counter.id);
    if (index !== -1) {
        currentState.counters[index] = sanitizeCounter(counter);
        await storage.saveState(currentState);
        updateHotkeys();
        await updateDiscordPresence();
    }
});

ipcMain.on('add-counter', async (event, counter: Counter) => {
    const sanitized = sanitizeCounter(counter);
    currentState.counters.push(sanitized);
    await storage.saveState(currentState);
    updateHotkeys();
    await updateDiscordPresence();
    event.reply('counter-added', sanitized);
});

ipcMain.on('update-global-settings', async (_event, settings: Partial<GlobalSettings>) => {
    currentState.globalSettings = sanitizeGlobalSettings(settings, currentState.globalSettings);
    await storage.saveState(currentState);
    updateHotkeys();
    await updateDiscordPresence();
    mainWindow?.webContents.send('state-update', currentState);
});

ipcMain.on('add-tab', async (event, tab: Tab) => {
    currentState.tabs.push(tab);
    await storage.saveState(currentState);
    await updateDiscordPresence();
    event.reply('tab-added', tab);
});

ipcMain.on('update-active-tab', async (_event, tabId: string) => {
    currentState.activeTabId = tabId;
    await storage.saveState(currentState);
    await updateDiscordPresence();
});

ipcMain.on('delete-tab', async (_event, tabId: string) => {
    currentState.tabs = currentState.tabs.filter((t) => t.id !== tabId);
    currentState.counters = currentState.counters.filter((c) => c.tabId !== tabId);
    if (currentState.activeTabId === tabId && currentState.tabs[0]) {
        currentState.activeTabId = currentState.tabs[0].id;
    }
    await storage.saveState(currentState);
    updateHotkeys();
    await updateDiscordPresence();
    mainWindow?.webContents.send('state-update', currentState);
});

ipcMain.on('update-tabs', async (_event, tabs: Tab[]) => {
    currentState.tabs = tabs;
    await storage.saveState(currentState);
    await updateDiscordPresence();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    hotkeyManager.unregisterAll();
    discordPresence.shutdown();
});
