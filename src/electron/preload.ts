import { contextBridge, ipcRenderer } from 'electron';

// Define interfaces for our data types
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
}

// Expose our APIs with proper typing
contextBridge.exposeInMainWorld('electron', {
    // Counter operations
    addCounter: (counter: Counter) => ipcRenderer.send('add-counter', counter),
    updateCounter: (counter: Counter) => ipcRenderer.send('update-counter', counter),
    deleteCounter: (id: string) => ipcRenderer.send('delete-counter', id),
    getCount: () => ipcRenderer.invoke('get-count'),
    
    // Tab operations
    addTab: (tab: Tab) => ipcRenderer.send('add-tab', tab),
    updateActiveTab: (tabId: string) => ipcRenderer.send('update-active-tab', tabId),
    deleteTab: (tabId: string) => ipcRenderer.send('delete-tab', tabId),
    updateTabs: (tabs: Tab[]) => ipcRenderer.send('update-tabs', tabs),
    
    // Settings
    updateGlobalSettings: (settings: GlobalSettings) => 
        ipcRenderer.send('update-global-settings', settings),
        
    // Hotkey management
    startHotkeyBinding: () => ipcRenderer.invoke('start-hotkey-binding'),
    
    // Listeners
    onStateUpdate: (callback: (data: any) => void) => 
        ipcRenderer.on('state-update', (_, data) => callback(data)),
    onCounterAdded: (callback: (counter: Counter) => void) => 
        ipcRenderer.on('counter-added', (_, data) => callback(data)),
    onCounterUpdated: (callback: (counter: Counter) => void) => 
        ipcRenderer.on('counter-updated', (_, data) => callback(data)),
    onTabAdded: (callback: (tab: Tab) => void) => 
        ipcRenderer.on('tab-added', (_, data) => callback(data)),
    
    // Remove listeners
    removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
});

// Declare the types for use in renderer process
declare global {
    interface Window {
        electron: {
            addCounter: (counter: Counter) => void;
            updateCounter: (counter: Counter) => void;
            getCount: () => Promise<number>;
            addTab: (tab: Tab) => void;
            updateActiveTab: (tabId: string) => void;
            deleteTab: (tabId: string) => void;
            updateTabs: (tabs: Tab[]) => void;
            updateGlobalSettings: (settings: GlobalSettings) => void;
            startHotkeyBinding: () => Promise<{ keycode: number, keyName: string }>;
            onStateUpdate: (callback: (data: any) => void) => void;
            onCounterAdded: (callback: (counter: Counter) => void) => void;
            onCounterUpdated: (callback: (counter: Counter) => void) => void;
            onTabAdded: (callback: (tab: Tab) => void) => void;
            removeAllListeners: (channel: string) => void;
            deleteCounter: (id: string) => void;
        };
    }
}