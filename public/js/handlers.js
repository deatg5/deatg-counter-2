window.handlers = {
  addCounter() {
    const counter = {
      id: Date.now().toString(),
      name: 'New Counter',
      count: 0,
      tabId: appState.activeTabId,
      isSelected: false,
      increaseAmount: undefined,
      decreaseAmount: undefined,
      increaseHotkey: undefined,
      decreaseHotkey: undefined
    };

    window.electron.addCounter(counter);
  },

  editCounter(counterId) {
    const counter = appState.counters.find((item) => item.id === counterId);
    if (!counter) {
      return;
    }

    editingCounter = { ...counter };

    document.getElementById('editCounterId').value = counter.id;
    document.getElementById('counterName').value = counter.name;
    document.getElementById('counterCount').value = String(counter.count);
    document.getElementById('counterIncreaseAmount').value = counter.increaseAmount ?? '';
    document.getElementById('counterDecreaseAmount').value = counter.decreaseAmount ?? '';

    const incBtn = document.getElementById('counterIncreaseHotkey');
    const decBtn = document.getElementById('counterDecreaseHotkey');
    incBtn.textContent = counter.increaseHotkey || 'Set Hotkey';
    decBtn.textContent = counter.decreaseHotkey || 'Set Hotkey';

    document.getElementById('editModal').style.display = 'flex';
  },

  toggleCounter(counterId, isSelected) {
    const counter = appState.counters.find((item) => item.id === counterId);
    if (!counter) {
      return;
    }

    counter.isSelected = isSelected;
    window.electron.updateCounter(counter);
  },

  addTab() {
    document.getElementById('addTabModal').style.display = 'flex';
    document.getElementById('newTabName').focus();
  },

  selectTab(tabId) {
    appState.activeTabId = tabId;
    window.electron.updateActiveTab(tabId);
    renderCounters();
  },

  deleteTab(tabId) {
    if (appState.tabs.length <= 1) {
      alert("Can't delete the last tab!");
      return;
    }

    if (!confirm('Delete this tab and all its counters?')) {
      return;
    }

    window.electron.deleteTab(tabId);

    appState.tabs = appState.tabs.filter((tab) => tab.id !== tabId);
    appState.counters = appState.counters.filter((counter) => counter.tabId !== tabId);

    if (appState.activeTabId === tabId) {
      appState.activeTabId = appState.tabs[0].id;
    }

    renderUI();
  },

  saveCounter(event) {
    event.preventDefault();

    const parseOptionalInteger = (value) => {
      if (value === '') {
        return undefined;
      }

      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return undefined;
      }

      return parsed;
    };

    const updatedCounter = {
      ...editingCounter,
      name: document.getElementById('counterName').value.trim() || editingCounter.name,
      count: Number(document.getElementById('counterCount').value),
      increaseAmount: parseOptionalInteger(document.getElementById('counterIncreaseAmount').value),
      decreaseAmount: parseOptionalInteger(document.getElementById('counterDecreaseAmount').value)
    };

    window.electron.updateCounter(updatedCounter);
    this.closeModal();
  },

  saveNewTab(event) {
    event.preventDefault();

    const tabName = document.getElementById('newTabName').value.trim();
    if (!tabName) {
      return;
    }

    const tab = {
      id: Date.now().toString(),
      name: tabName,
      order: appState.tabs.length
    };

    window.electron.addTab(tab);
    this.closeTabModal();
  },

  closeModal() {
    document.getElementById('editModal').style.display = 'none';
    editingCounter = null;
    if (isCapturing) {
      this.stopHotkeyCapture();
    }
  },

  closeTabModal() {
    const modal = document.getElementById('addTabModal');
    const input = document.getElementById('newTabName');
    input.value = '';
    modal.style.display = 'none';
  },

  captureHotkey(target) {
    if (isCapturing) {
      this.stopHotkeyCapture();
      return;
    }

    isCapturing = true;
    captureTarget = target;

    const btn = document.getElementById(`${target}Hotkey`);
    btn.textContent = 'Press keys...';
    btn.classList.add('capturing');

    window.electron.pauseHotkeys();
    document.addEventListener('keydown', this.handleHotkeyCapture);
  },

  handleHotkeyCapture(event) {
    if (event.target.tagName === 'INPUT') {
      return;
    }

    event.preventDefault();

    const mods = [];
    if (event.ctrlKey) mods.push('Control');
    if (event.metaKey) mods.push('Command');
    if (event.altKey) mods.push('Alt');
    if (event.shiftKey) mods.push('Shift');

    const key = event.key;
    if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) {
      return;
    }

    const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
    const hotkey = [...mods, normalizedKey].join('+');

    const btn = document.getElementById(`${captureTarget}Hotkey`);
    btn.textContent = hotkey;

    if (captureTarget.startsWith('counter')) {
      if (captureTarget === 'counterIncrease') {
        editingCounter.increaseHotkey = hotkey;
      } else {
        editingCounter.decreaseHotkey = hotkey;
      }
    } else {
      const settingName = `${captureTarget}Hotkey`;
      appState.globalSettings[settingName] = hotkey;
      window.electron.updateGlobalSettings(appState.globalSettings);
    }

    window.handlers.stopHotkeyCapture();
  },

  stopHotkeyCapture() {
    if (!isCapturing) {
      return;
    }

    isCapturing = false;
    const btn = document.getElementById(`${captureTarget}Hotkey`);
    btn.classList.remove('capturing');

    document.removeEventListener('keydown', this.handleHotkeyCapture);
    window.electron.resumeHotkeys();

    captureTarget = null;
  },

  clearHotkey(type) {
    const btn = document.getElementById(`${type}Hotkey`);
    btn.textContent = 'Set Hotkey';

    if (type === 'counterIncrease') {
      editingCounter.increaseHotkey = undefined;
    }
    if (type === 'counterDecrease') {
      editingCounter.decreaseHotkey = undefined;
    }
  }
};
