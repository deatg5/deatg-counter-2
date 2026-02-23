import { Counter, GlobalSettings } from './types';

// define the shape of our mathematical commands
type HotkeyAction = {
    action: 'increase' | 'decrease';
    counterId: string;
    amount: number;
};

export class HotkeyManager {
    private hotkeyMap: Map<string, HotkeyAction[]> = new Map();
    private onIncrease: (id: string, amount: number) => void;
    private onDecrease: (id: string, amount: number) => void;

    constructor() {
        this.onIncrease = () => {};
        this.onDecrease = () => {};
    }

    // this just maps the strings (like "ArrowUp" or "A") to the math, NO system binding here!
    registerCounterHotkeys(
        counters: Counter[],
        globalSettings: GlobalSettings,
        onIncrease: (id: string, amount: number) => void,
        onDecrease: (id: string, amount: number) => void
    ) {
        this.hotkeyMap.clear();
        this.onIncrease = onIncrease;
        this.onDecrease = onDecrease;

        // map specific counter hotkeys
        counters.forEach(counter => {
            if (counter.isSelected) { // <-- the strict shield is intact! :3
                if (counter.increaseHotkey) {
                    this.addToMap(counter.increaseHotkey, { action: 'increase', counterId: counter.id, amount: counter.increaseAmount ?? globalSettings.increaseAmount ?? 1 });
                }
                if (counter.decreaseHotkey) {
                    this.addToMap(counter.decreaseHotkey, { action: 'decrease', counterId: counter.id, amount: counter.decreaseAmount ?? globalSettings.decreaseAmount ?? 1 });
                }
            }
        });

        // map global fallbacks
        const selectedCounters = counters.filter(c => c.isSelected);
        selectedCounters.forEach(counter => {
            if (!counter.increaseHotkey && globalSettings.increaseHotkey) {
                this.addToMap(globalSettings.increaseHotkey, { action: 'increase', counterId: counter.id, amount: counter.increaseAmount ?? globalSettings.increaseAmount ?? 1 });
            }
            if (!counter.decreaseHotkey && globalSettings.decreaseHotkey) {
                this.addToMap(globalSettings.decreaseHotkey, { action: 'decrease', counterId: counter.id, amount: counter.decreaseAmount ?? globalSettings.decreaseAmount ?? 1 });
            }
        });
    }

    private addToMap(key: string, action: HotkeyAction) {
        if (!this.hotkeyMap.has(key)) {
            this.hotkeyMap.set(key, []);
        }
        this.hotkeyMap.get(key)!.push(action);
    }

    // our main process will whisper to this whenever it hears a raw hardware keystroke!
    handleKeyPress(keyString: string) {
        const actions = this.hotkeyMap.get(keyString);
        if (actions) {
            actions.forEach(action => {
                if (action.action === 'increase') {
                    this.onIncrease(action.counterId, action.amount);
                } else {
                    this.onDecrease(action.counterId, action.amount);
                }
            });
        }
    }

    unregisterAll() {
        this.hotkeyMap.clear();
    }
}