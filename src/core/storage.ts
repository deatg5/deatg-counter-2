import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppState, GlobalSettings } from './types';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
    increaseAmount: 1,
    decreaseAmount: 1,
    increaseHotkey: 'Control+ArrowUp',
    decreaseHotkey: 'Control+ArrowDown',
    discordRichPresenceEnabled: false
};

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
            const loaded = JSON.parse(data) as Partial<AppState>;

            return {
                counters: loaded.counters ?? [],
                tabs: loaded.tabs?.length ? loaded.tabs : [{ id: 'default', name: 'Counters', order: 0 }],
                globalSettings: {
                    ...DEFAULT_GLOBAL_SETTINGS,
                    ...(loaded.globalSettings ?? {})
                },
                activeTabId: loaded.activeTabId ?? (loaded.tabs?.[0]?.id || 'default')
            };
        } catch {
            return {
                counters: [],
                tabs: [{
                    id: 'default',
                    name: 'Counters',
                    order: 0
                }],
                globalSettings: DEFAULT_GLOBAL_SETTINGS,
                activeTabId: 'default'
            };
        }
    }
}
