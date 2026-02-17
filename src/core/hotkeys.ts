// src/core/hotkeys.ts
import { globalShortcut } from 'electron';
import { Counter, GlobalSettings } from './types';

export class HotkeyManager {
    private registeredHotkeys: Map<string, () => void> = new Map();
    
    registerCounterHotkeys(
        counters: Counter[],
        globalSettings: GlobalSettings,
        onIncrease: (counterId: string, amount: number) => void,
        onDecrease: (counterId: string, amount: number) => void
    ) {
        // Clear existing hotkeys
        this.unregisterAll();
        
        // Build hotkey map (counter-specific + global)
        const hotkeyMap = new Map<string, {
            action: 'increase' | 'decrease',
            counterId?: string,
            amount: number
        }[]>();

        // Register counter-specific hotkeys
        counters.forEach(counter => {
            if (counter.isSelected) {
                if (counter.increaseHotkey) {
                    this.addToHotkeyMap(hotkeyMap, counter.increaseHotkey, {
                        action: 'increase',
                        counterId: counter.id,
                        amount: counter.increaseAmount ?? globalSettings.increaseAmount
                    });
                }
                if (counter.decreaseHotkey) {
                    this.addToHotkeyMap(hotkeyMap, counter.decreaseHotkey, {
                        action: 'decrease',
                        counterId: counter.id,
                        amount: counter.decreaseAmount ?? globalSettings.decreaseAmount
                    });
                }
            }
        });

        // Register global hotkeys for selected counters without specific hotkeys
        const selectedCounters = counters.filter(c => c.isSelected);
        selectedCounters.forEach(counter => {
            if (!counter.increaseHotkey) {
                this.addToHotkeyMap(hotkeyMap, globalSettings.increaseHotkey, {
                    action: 'increase',
                    counterId: counter.id,
                    amount: counter.increaseAmount ?? globalSettings.increaseAmount
                });
            }
            if (!counter.decreaseHotkey) {
                this.addToHotkeyMap(hotkeyMap, globalSettings.decreaseHotkey, {
                    action: 'decrease',
                    counterId: counter.id,
                    amount: counter.decreaseAmount ?? globalSettings.decreaseAmount
                });
            }
        });

        // Register all collected hotkeys
        hotkeyMap.forEach((actions, hotkey) => {
            this.registerHotkey(hotkey, () => {
                actions.forEach(({ action, counterId, amount }) => {
                    if (action === 'increase') {
                        onIncrease(counterId!, amount);
                    } else {
                        onDecrease(counterId!, amount);
                    }
                });
            });
        });
    }

    private addToHotkeyMap(
        map: Map<string, any[]>,
        hotkey: string,
        action: any
    ) {
        if (!map.has(hotkey)) {
            map.set(hotkey, []);
        }
        map.get(hotkey)!.push(action);
    }

    private registerHotkey(accelerator: string, callback: () => void) {
        if (globalShortcut.register(accelerator, callback)) {
            this.registeredHotkeys.set(accelerator, callback);
        }
    }

    unregisterAll() {
        globalShortcut.unregisterAll();
        this.registeredHotkeys.clear();
    }
}