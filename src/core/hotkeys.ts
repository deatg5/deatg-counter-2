import { Counter, GlobalSettings } from './types';

type HotkeyAction = {
    action: 'increase' | 'decrease';
    counterId: string;
    amount: number;
};

export class HotkeyManager {
    private shortcutHandler: ((accelerator: string) => void) | null = null;

    setShortcutHandler(handler: ((accelerator: string) => void) | null) {
        this.shortcutHandler = handler;
    }

    registerCounterHotkeys(
        counters: Counter[],
        globalSettings: GlobalSettings,
        onIncrease: (counterId: string, amount: number) => void,
        onDecrease: (counterId: string, amount: number) => void
    ) {
        this.setShortcutHandler((accelerator) => {
            const actions = this.resolveActionsForHotkey(accelerator, counters, globalSettings);
            actions.forEach(({ action, counterId, amount }) => {
                if (action === 'increase') {
                    onIncrease(counterId, amount);
                    return;
                }
                onDecrease(counterId, amount);
            });
        });
    }

    handleAccelerator(accelerator: string) {
        this.shortcutHandler?.(accelerator);
    }

    private resolveActionsForHotkey(
        accelerator: string,
        counters: Counter[],
        globalSettings: GlobalSettings
    ): HotkeyAction[] {
        const selectedCounters = counters.filter((counter) => counter.isSelected);
        const normalizedPressed = this.normalizeAccelerator(accelerator);

        const counterSpecificMatches = selectedCounters.flatMap((counter) => {
            const actions: HotkeyAction[] = [];
            if (counter.increaseHotkey && this.matchesHotkey(normalizedPressed, counter.increaseHotkey)) {
                actions.push({
                    action: 'increase',
                    counterId: counter.id,
                    amount: this.resolveAmount(counter.increaseAmount, globalSettings.increaseAmount)
                });
            }
            if (counter.decreaseHotkey && this.matchesHotkey(normalizedPressed, counter.decreaseHotkey)) {
                actions.push({
                    action: 'decrease',
                    counterId: counter.id,
                    amount: this.resolveAmount(counter.decreaseAmount, globalSettings.decreaseAmount)
                });
            }
            return actions;
        });

        if (counterSpecificMatches.length > 0) {
            return counterSpecificMatches;
        }

        const globalMatches: HotkeyAction[] = [];
        selectedCounters.forEach((counter) => {
            const hasCounterSpecificIncrease = Boolean(counter.increaseHotkey);
            const hasCounterSpecificDecrease = Boolean(counter.decreaseHotkey);

            if (!hasCounterSpecificIncrease && this.matchesHotkey(normalizedPressed, globalSettings.increaseHotkey)) {
                globalMatches.push({
                    action: 'increase',
                    counterId: counter.id,
                    amount: this.resolveAmount(counter.increaseAmount, globalSettings.increaseAmount)
                });
            }

            if (!hasCounterSpecificDecrease && this.matchesHotkey(normalizedPressed, globalSettings.decreaseHotkey)) {
                globalMatches.push({
                    action: 'decrease',
                    counterId: counter.id,
                    amount: this.resolveAmount(counter.decreaseAmount, globalSettings.decreaseAmount)
                });
            }
        });

        return globalMatches;
    }

    private matchesHotkey(pressed: string, configuredHotkey: string): boolean {
        return pressed === this.normalizeAccelerator(configuredHotkey);
    }

    private normalizeAccelerator(accelerator: string): string {
        return accelerator
            .split('+')
            .map((part) => part.trim())
            .filter(Boolean)
            .map((part) => {
                const lower = part.toLowerCase();
                if (lower === 'ctrl' || lower === 'control') return 'Control';
                if (lower === 'cmd' || lower === 'command' || lower === 'meta' || lower === 'super') return 'Command';
                if (lower === 'alt' || lower === 'option') return 'Alt';
                if (lower === 'shift') return 'Shift';
                if (lower === 'arrowup' || lower === 'up') return 'Up';
                if (lower === 'arrowdown' || lower === 'down') return 'Down';
                if (lower === 'arrowleft' || lower === 'left') return 'Left';
                if (lower === 'arrowright' || lower === 'right') return 'Right';
                if (lower === 'commandorcontrol' || lower === 'cmdorctrl' || lower === 'ctrlorcmd') {
                    return process.platform === 'darwin' ? 'Command' : 'Control';
                }
                return part.length === 1 ? part.toUpperCase() : part;
            })
            .sort((a, b) => {
                const weight = (key: string) => {
                    if (key === 'Control') return 1;
                    if (key === 'Command') return 2;
                    if (key === 'Alt') return 3;
                    if (key === 'Shift') return 4;
                    return 5;
                };
                return weight(a) - weight(b) || a.localeCompare(b);
            })
            .join('+');
    }

    private resolveAmount(counterAmount: number | undefined, globalAmount: number): number {
        if (typeof counterAmount === 'number' && Number.isFinite(counterAmount)) {
            return counterAmount;
        }
        return globalAmount;
    }

    unregisterAll() {
        this.shortcutHandler = null;
    }
}
