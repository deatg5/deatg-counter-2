import { contextBridge, ipcRenderer } from 'electron';

interface Counter {
    id: string;
    name: string;
    count: number;
    tabId: string;
    isSelected: boolean;
    increaseAmount?: number;
    decreaseAmount?: number;
    increaseHotkey?: string;
    decreaseHotkey?: string;
}

interface Tab {
    id: string;
    name: string;
    order: number;
}

interface GlobalSettings {
    increaseAmount: number;
    decreaseAmount: number;
    increaseHotkey: string;
    decreaseHotkey: string;
    discordRichPresenceEnabled: boolean;
}

interface DiscordStatus {
    enabled: boolean;
    connected: boolean;
}

contextBridge.exposeInMainWorld('electron', {
    addCounter: (counter: Counter) => ipcRenderer.send('add-counter', counter),
    updateCounter: (counter: Counter) => ipcRenderer.send('update-counter', counter),

    addTab: (tab: Tab) => ipcRenderer.send('add-tab', tab),
    updateActiveTab: (tabId: string) => ipcRenderer.send('update-active-tab', tabId),
    deleteTab: (tabId: string) => ipcRenderer.send('delete-tab', tabId),
    updateTabs: (tabs: Tab[]) => ipcRenderer.send('update-tabs', tabs),

    updateGlobalSettings: (settings: GlobalSettings) => ipcRenderer.send('update-global-settings', settings),

    pauseHotkeys: () => ipcRenderer.send('pause-hotkeys'),
    resumeHotkeys: () => ipcRenderer.send('resume-hotkeys'),

    onStateUpdate: (callback: (data: any) => void) => ipcRenderer.on('state-update', (_, data) => callback(data)),
    onCounterAdded: (callback: (counter: Counter) => void) => ipcRenderer.on('counter-added', (_, data) => callback(data)),
    onCounterUpdated: (callback: (counter: Counter) => void) => ipcRenderer.on('counter-updated', (_, data) => callback(data)),
    onTabAdded: (callback: (tab: Tab) => void) => ipcRenderer.on('tab-added', (_, data) => callback(data)),
    onDiscordStatus: (callback: (status: DiscordStatus) => void) => ipcRenderer.on('discord-status', (_, data) => callback(data)),

    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
});

declare global {
    interface Window {
        electron: {
            addCounter: (counter: Counter) => void;
            updateCounter: (counter: Counter) => void;
            addTab: (tab: Tab) => void;
            updateActiveTab: (tabId: string) => void;
            deleteTab: (tabId: string) => void;
            updateTabs: (tabs: Tab[]) => void;
            updateGlobalSettings: (settings: GlobalSettings) => void;
            pauseHotkeys: () => void;
            resumeHotkeys: () => void;
            onStateUpdate: (callback: (data: any) => void) => void;
            onCounterAdded: (callback: (counter: Counter) => void) => void;
            onCounterUpdated: (callback: (counter: Counter) => void) => void;
            onTabAdded: (callback: (tab: Tab) => void) => void;
            onDiscordStatus: (callback: (status: DiscordStatus) => void) => void;
            removeAllListeners: (channel: string) => void;
        };
    }
}
