import { globalShortcut } from 'electron';
import { Counter, GlobalSettings } from './types';

interface HotkeyAction {
    action: 'increase' | 'decrease';
    counterId: string;
    amount: number;
}

export class HotkeyManager {
    private registeredHotkeys: Set<string> = new Set();

    registerCounterHotkeys(
        counters: Counter[],
        globalSettings: GlobalSettings,
        onIncrease: (counterId: string, amount: number) => void,
        onDecrease: (counterId: string, amount: number) => void
    ) {
        this.unregisterAll();

        const hotkeyMap = new Map<string, HotkeyAction[]>();

        counters.forEach(counter => {
            if (!counter.isSelected) {
                return;
            }

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
        });

        counters.filter(c => c.isSelected).forEach(counter => {
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

        hotkeyMap.forEach((actions, hotkey) => {
            if (!this.isSupportedGlobalHotkey(hotkey)) {
                return;
            }

            this.registerHotkey(hotkey, () => {
                actions.forEach(({ action, counterId, amount }) => {
                    if (action === 'increase') {
                        onIncrease(counterId, amount);
                    } else {
                        onDecrease(counterId, amount);
                    }
                });
            });
        });
    }

    private addToHotkeyMap(map: Map<string, HotkeyAction[]>, hotkey: string, action: HotkeyAction) {
        if (!map.has(hotkey)) {
            map.set(hotkey, []);
        }

        map.get(hotkey)?.push(action);
    }

    private isSupportedGlobalHotkey(accelerator: string): boolean {
        const hasModifier = /(CommandOrControl|Control|Command|Alt|Option|Super|Meta|Shift)/i.test(accelerator);
        return hasModifier;
    }

    private registerHotkey(accelerator: string, callback: () => void) {
        if (globalShortcut.register(accelerator, callback)) {
            this.registeredHotkeys.add(accelerator);
        }
    }

    unregisterAll() {
        globalShortcut.unregisterAll();
        this.registeredHotkeys.clear();
    }
}
