import { BrowserWindow, globalShortcut } from 'electron';
import { Counter, GlobalSettings } from './types';

type HotkeyAction = {
  action: 'increase' | 'decrease';
  counterId: string;
  amount: number;
};

export class HotkeyManager {
  private localActions = new Map<string, HotkeyAction[]>();
  private isPaused = false;

  registerCounterHotkeys(
    counters: Counter[],
    globalSettings: GlobalSettings,
    onIncrease: (counterId: string, amount: number) => void,
    onDecrease: (counterId: string, amount: number) => void
  ): void {
    this.unregisterAll();

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
    });

    selectedCounters.forEach((counter) => {
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
      const normalized = this.normalizeAccelerator(hotkey);
      const runActions = () => {
        if (this.isPaused) {
          return;
        }

        actions.forEach(({ action, counterId, amount }) => {
          if (action === 'increase') {
            onIncrease(counterId, amount);
          } else {
            onDecrease(counterId, amount);
          }
        });
      };

      if (this.hasModifier(normalized)) {
        globalShortcut.register(normalized, runActions);
      } else {
        this.localActions.set(normalized, actions);
      }
    });
  }

  attachWindowListeners(
    window: BrowserWindow,
    onIncrease: (counterId: string, amount: number) => void,
    onDecrease: (counterId: string, amount: number) => void
  ): void {
    window.webContents.on('before-input-event', (event, input) => {
      if (!input.key || input.type !== 'keyDown' || input.isAutoRepeat || this.isPaused) {
        return;
      }

      if (input.control || input.meta || input.alt) {
        return;
      }

      const accelerator = this.normalizeInputToAccelerator(input);
      const actions = this.localActions.get(accelerator);

      if (!actions) {
        return;
      }

      event.preventDefault();
      actions.forEach(({ action, counterId, amount }) => {
        if (action === 'increase') {
          onIncrease(counterId, amount);
        } else {
          onDecrease(counterId, amount);
        }
      });
    });
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  unregisterAll(): void {
    globalShortcut.unregisterAll();
    this.localActions.clear();
  }

  private addToHotkeyMap(map: Map<string, HotkeyAction[]>, hotkey: string, action: HotkeyAction): void {
    const normalized = this.normalizeAccelerator(hotkey);
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized)?.push(action);
  }

  private hasModifier(accelerator: string): boolean {
    return accelerator.includes('Control+')
      || accelerator.includes('Command+')
      || accelerator.includes('Alt+')
      || accelerator.includes('Shift+');
  }

  private normalizeAccelerator(accelerator: string): string {
    const parts = accelerator
      .split('+')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => this.normalizeToken(part));

    const modifiers = ['Control', 'Command', 'Alt', 'Shift'];
    const modifierParts = modifiers.filter((modifier) => parts.includes(modifier));
    const key = parts.find((part) => !modifiers.includes(part)) ?? '';

    return [...modifierParts, key].filter(Boolean).join('+');
  }

  private normalizeToken(token: string): string {
    const lowered = token.toLowerCase();
    if (lowered === 'cmdorctrl' || lowered === 'commandorcontrol' || lowered === 'ctrl') {
      return process.platform === 'darwin' ? 'Command' : 'Control';
    }
    if (lowered === 'meta' || lowered === 'command') {
      return 'Command';
    }
    if (lowered === 'control') {
      return 'Control';
    }
    if (lowered === 'alt' || lowered === 'option') {
      return 'Alt';
    }
    if (lowered === 'shift') {
      return 'Shift';
    }
    if (lowered === 'arrowup' || lowered === 'up') {
      return 'Up';
    }
    if (lowered === 'arrowdown' || lowered === 'down') {
      return 'Down';
    }
    if (lowered === 'arrowleft' || lowered === 'left') {
      return 'Left';
    }
    if (lowered === 'arrowright' || lowered === 'right') {
      return 'Right';
    }
    return token.length === 1
      ? token.toUpperCase()
      : `${token[0].toUpperCase()}${token.slice(1).toLowerCase()}`;
  }

  private normalizeInputToAccelerator(input: Electron.Input): string {
    const modifiers: string[] = [];
    if (input.control) modifiers.push('Control');
    if (input.meta) modifiers.push('Command');
    if (input.alt) modifiers.push('Alt');
    if (input.shift) modifiers.push('Shift');

    return [...modifiers, this.normalizeToken(input.key)].join('+');
  }
}
