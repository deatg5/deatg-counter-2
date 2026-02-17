import { globalShortcut } from 'electron';
import { Counter, GlobalSettings } from './types';

type HotkeyAction = {
    action: 'increase' | 'decrease';
    counterId: string;
    amount: number;
};

const MODIFIER_ALIASES: Record<string, string> = {
    ctrl: 'Control',
    control: 'Control',
    cmd: 'Command',
    command: 'Command',
    meta: 'Command',
    alt: 'Alt',
    option: 'Alt',
    shift: 'Shift'
};

export class HotkeyManager {
    private paused = false;

    registerCounterHotkeys(
        counters: Counter[],
        globalSettings: GlobalSettings,
        onIncrease: (counterId: string, amount: number) => void,
        onDecrease: (counterId: string, amount: number) => void
    ) {
        this.unregisterAll();
        if (this.paused) {
            return;
        }

        const hotkeyMap = new Map<string, HotkeyAction[]>();
        const selectedCounters = counters.filter((counter) => counter.isSelected);

        selectedCounters.forEach((counter) => {
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

    pause() {
        this.paused = true;
        this.unregisterAll();
    }

    resume() {
        this.paused = false;
    }

    private addToHotkeyMap(map: Map<string, HotkeyAction[]>, hotkey: string, action: HotkeyAction) {
        const normalized = this.normalizeAccelerator(hotkey);
        if (!normalized || !this.hasModifier(normalized)) {
            return;
        }

        if (!map.has(normalized)) {
            map.set(normalized, []);
        }
        map.get(normalized)!.push(action);
    }

    private hasModifier(accelerator: string): boolean {
        return accelerator.split('+').some((part) => ['Control', 'Command', 'Alt', 'Shift'].includes(part));
    }

    private normalizeAccelerator(accelerator: string): string | null {
        const parts = accelerator
            .split('+')
            .map((part) => part.trim())
            .filter(Boolean);

        if (!parts.length) {
            return null;
        }

        const normalizedParts = parts.map((part) => {
            const lower = part.toLowerCase();
            if (MODIFIER_ALIASES[lower]) {
                return MODIFIER_ALIASES[lower];
            }

            if (lower === 'arrowup') return 'Up';
            if (lower === 'arrowdown') return 'Down';
            if (lower === 'arrowleft') return 'Left';
            if (lower === 'arrowright') return 'Right';

            return part.length === 1 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`;
        });

        return normalizedParts.join('+');
    }

    private registerHotkey(accelerator: string, callback: () => void) {
        globalShortcut.register(accelerator, callback);
    }

    unregisterAll() {
        globalShortcut.unregisterAll();
    }
}
