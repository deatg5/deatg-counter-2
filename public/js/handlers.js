// public/js/handlers.js

// public/js/handlers.js

// a temporal ward to silence the echoes! ><
let lastCastTime = 0;
function isEcho() {
    const now = Date.now();
    // if less than 200ms has passed, it is a phantom duplicate! 
    if (now - lastCastTime < 200) return true; 
    lastCastTime = now;
    return false;
}

window.handlers = {
    addCounter() {
        if (isEcho()) return; // block the phantom! ._.

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
        
        try { window.electron.addCounter(counter); } catch (e) { console.error("Bridge missing!", e); }
        
        if (!appState.counters) appState.counters = [];
        appState.counters.push(counter);
        renderCounters();
    },

    editCounter(counterId) {
        const counter = appState.counters.find(c => c.id === counterId);
        if (!counter) return;
        
        editingCounter = counter;
        
        document.getElementById('editCounterId').value = counter.id;
        document.getElementById('counterName').value = counter.name;
        document.getElementById('counterCount').value = counter.count;
        document.getElementById('counterIncreaseAmount').value = counter.increaseAmount ?? '';
        document.getElementById('counterDecreaseAmount').value = counter.decreaseAmount ?? '';
        
        const incBtn = document.getElementById('counterIncreaseHotkey');
        const decBtn = document.getElementById('counterDecreaseHotkey');
        incBtn.textContent = counter.increaseHotkey || 'Set Hotkey';
        decBtn.textContent = counter.decreaseHotkey || 'Set Hotkey';
        
        document.getElementById('editModal').style.display = 'flex';
    },

    toggleCounter(counterId, isSelected) {
        const counter = appState.counters.find(c => c.id === counterId);
        if (counter) {
            counter.isSelected = isSelected;
            window.electron.updateCounter(counter);
        }
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
        
        if (!confirm('Delete this tab and all its counters?')) return;
        
        window.electron.deleteTab(tabId);
        
        appState.tabs = appState.tabs.filter(t => t.id !== tabId);
        appState.counters = appState.counters.filter(c => c.tabId !== tabId);
        
        if (appState.activeTabId === tabId) {
            appState.activeTabId = appState.tabs[0].id;
        }
        
        renderUI();
    },

    saveCounter(event) {
        event.preventDefault();

        const incInput = document.getElementById('counterIncreaseAmount').value;
        const decInput = document.getElementById('counterDecreaseAmount').value;
        
        const updatedCounter = {
            ...editingCounter,
            name: document.getElementById('counterName').value,
            count: Number(document.getElementById('counterCount').value), 
            increaseAmount: incInput !== "" ? Number(incInput) : undefined,
            decreaseAmount: decInput !== "" ? Number(decInput) : undefined
        };
        
        window.electron.updateCounter(updatedCounter);
        window.handlers.closeModal();
    },

    deleteCounter() {
        if (!editingCounter) return;
        
        if (!confirm(`Are you absolutely sure you want to delete "${editingCounter.name}"?`)) return;
        
        window.electron.deleteCounter(editingCounter.id);
        
        appState.counters = appState.counters.filter(c => c.id !== editingCounter.id);
        
        window.handlers.closeModal();
        renderCounters(); 
    },

    saveNewTab(event) {
        
        if (event) event.preventDefault();
        
        if (isEcho()) return; // block the phantom! ><
        
        const tabName = document.getElementById('newTabName').value;
        if (!tabName) {
            alert("you must give the anomaly a name first! ><");
            return;
        }
        
        const tab = {
            id: Date.now().toString(),
            name: tabName,
            order: appState.tabs ? appState.tabs.length : 0
        };
        
        // try to whisper to the backend, but don't crash if the bridge is wounded!
        try {
            if (window.electron && window.electron.addTab) {
                window.electron.addTab(tab);
            } else {
                console.warn("electron.addTab is missing from preload.ts! ;-;");
            }
        } catch (err) {
            console.error(err);
        }
        
        // instantly weave the local illusion! :3
        if (!appState.tabs) appState.tabs = [];
        appState.tabs.push(tab);
        appState.activeTabId = tab.id; 
        
        // try to redraw the screen, but catch any rendering anomalies!
        try {
            renderUI(); 
        } catch (err) {
            console.error("renderUI crashed:", err);
        }
        
        // explicitly use window.handlers to ensure context is never lost
        window.handlers.closeTabModal();
    },

    closeModal() {
        document.getElementById('editModal').style.display = 'none';
        editingCounter = null;
    },

    closeTabModal() {
        const modal = document.getElementById('addTabModal');
        const input = document.getElementById('newTabName');
        if (input) input.value = '';
        if (modal) modal.style.display = 'none';
    },

    async captureHotkey(target) {
        const btn = document.getElementById(`${target}Hotkey`);
        btn.textContent = 'Listening...';
        btn.classList.add('capturing');
        
        const capturedKey = await window.electron.startHotkeyBinding();
        const hotkeyString = capturedKey.keyName;
        
        btn.textContent = hotkeyString;
        btn.classList.remove('capturing');
        
        if (target.startsWith('counter')) {
            if (target === 'counterIncrease') {
                editingCounter.increaseHotkey = hotkeyString;
            } else {
                editingCounter.decreaseHotkey = hotkeyString;
            }
        } else {
            const settingName = target === 'globalIncrease' ? 'increaseHotkey' : 'decreaseHotkey';
            appState.globalSettings[settingName] = hotkeyString;
            window.electron.updateGlobalSettings(appState.globalSettings);
        }
    },

    clearHotkey(type) {
        const btn = document.getElementById(`${type}Hotkey`);
        btn.textContent = 'Set Hotkey';
        
        if (type.startsWith('counter')) {
            if (type === 'counterIncrease') {
                editingCounter.increaseHotkey = undefined;
            } else {
                editingCounter.decreaseHotkey = undefined;
            }
        }
    },

    updateGlobalAmount(type, value) {
        const numValue = value !== "" ? Number(value) : undefined;
        
        if (type === 'increase') {
            appState.globalSettings.increaseAmount = numValue;
        } else {
            appState.globalSettings.decreaseAmount = numValue;
        }
        
        window.electron.updateGlobalSettings(appState.globalSettings);
    },
    
};