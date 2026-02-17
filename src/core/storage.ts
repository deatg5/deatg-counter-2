import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppState } from './types';

export class StorageManager {
    private filePath: string;

    constructor() {
        this.filePath = path.join(app.getPath('userData'), 'save.json');
    }

    async saveState(state: AppState): Promise<void> {
        await fs.writeFile(this.filePath, JSON.stringify(state, null, 2));
    }

    async loadState(): Promise<AppState> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(data) as Partial<AppState>;

            return {
                counters: parsed.counters ?? [],
                tabs: parsed.tabs && parsed.tabs.length > 0
                    ? parsed.tabs
                    : [{ id: 'default', name: 'Counters', order: 0 }],
                globalSettings: {
                    increaseAmount: Number(parsed.globalSettings?.increaseAmount ?? 1),
                    decreaseAmount: Number(parsed.globalSettings?.decreaseAmount ?? 1),
                    increaseHotkey: parsed.globalSettings?.increaseHotkey ?? 'CommandOrControl+Up',
                    decreaseHotkey: parsed.globalSettings?.decreaseHotkey ?? 'CommandOrControl+Down',
                    richPresenceEnabled: Boolean(parsed.globalSettings?.richPresenceEnabled ?? false)
                },
                activeTabId: parsed.activeTabId ?? 'default'
            };
        } catch {
            return {
                counters: [],
                tabs: [{
                    id: 'default',
                    name: 'Counters',
                    order: 0
                }],
                globalSettings: {
                    increaseAmount: 1,
                    decreaseAmount: 1,
                    increaseHotkey: 'CommandOrControl+Up',
                    decreaseHotkey: 'CommandOrControl+Down',
                    richPresenceEnabled: false
                },
                activeTabId: 'default'
            };
        }
    }
}
