export interface CounterState {
  count: number;
  lastUpdated: Date;
}

export interface HotkeyManager {
  register(key: string, callback: () => void): void;
  unregister(key: string): void;
}

export interface Counter {
  id: string;
  name: string;
  count: number;
  tabId: string;
  increaseAmount?: number;    // optional, uses global if undefined
  decreaseAmount?: number;    // optional, uses global if undefined
  increaseHotkey?: string;    // optional, uses global if undefined
  decreaseHotkey?: string;    // optional, uses global if undefined
  isSelected: boolean;
}

export interface Tab {
  id: string;
  name: string;
  order: number;
}

export interface GlobalSettings {
  increaseAmount: number;
  decreaseAmount: number;
  increaseHotkey: string;
  decreaseHotkey: string;
  richPresenceEnabled: boolean;
}

export interface AppState {
  counters: Counter[];
  tabs: Tab[];
  globalSettings: GlobalSettings;
  activeTabId: string;
}