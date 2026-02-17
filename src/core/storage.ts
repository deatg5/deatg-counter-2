import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { AppState, GlobalSettings } from './types';

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
            return JSON.parse(data);
        } catch {
            // Return default state if no save exists
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
                    decreaseHotkey: 'CommandOrControl+Down'
                },
                activeTabId: 'default'
            };
        }
    }
}