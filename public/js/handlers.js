// public/js/handlers.js

// Create a handlers object to store all our functions
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
        
        // Update local state
        appState.tabs = appState.tabs.filter(t => t.id !== tabId);
        appState.counters = appState.counters.filter(c => c.tabId !== tabId);
        
        if (appState.activeTabId === tabId) {
            appState.activeTabId = appState.tabs[0].id;
        }
        
        renderUI();
    },

    saveCounter(event) {
        event.preventDefault();

        // harvest the raw strings first to keep our ontology clean :3
        const incInput = document.getElementById('counterIncreaseAmount').value;
        const decInput = document.getElementById('counterDecreaseAmount').value;
        
        const updatedCounter = {
            ...editingCounter,
            name: document.getElementById('counterName').value,
            // Number("") defaults to 0, which is safe for the main count!
            count: Number(document.getElementById('counterCount').value), 
            
            // check for strict emptiness before transmuting to a number
            increaseAmount: incInput !== "" ? Number(incInput) : undefined,
            decreaseAmount: decInput !== "" ? Number(decInput) : undefined
        };
        
        window.electron.updateCounter(updatedCounter);
        this.closeModal();
    },

    saveNewTab(event) {
        event.preventDefault();
        
        const tabName = document.getElementById('newTabName').value;
        if (!tabName) return;
        
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
    },

    closeTabModal() {
        const modal = document.getElementById('addTabModal');
        const input = document.getElementById('newTabName');
        input.value = '';
        modal.style.display = 'none';
    },

    async captureHotkey(target) {
        // give the user a visual cue
        const btn = document.getElementById(`${target}Hotkey`);
        btn.textContent = 'Listening...';
        btn.classList.add('capturing');
        
        // knock on the drawbridge and wait for the sovereign net to catch a key! :3
        const capturedKey = await window.electron.startHotkeyBinding();
        
        // we got it! extract the human-readable string
        const hotkeyString = capturedKey.keyName;
        
        // update the ui
        btn.textContent = hotkeyString;
        btn.classList.remove('capturing');
        
        // save it to the correct mathematical state
        if (target.startsWith('counter')) {
            if (target === 'counterIncrease') {
                editingCounter.increaseHotkey = hotkeyString;
            } else {
                editingCounter.decreaseHotkey = hotkeyString;
            }
        } else {
            // transmute the raw target string to the EXACT property the backend expects! ><
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
    }
};