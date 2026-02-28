// public/js/ui.js

// Move all function declarations to the top
function renderUI() {
    renderTabs();
    renderCounters();
    updateGlobalSettings();
}

function attachTabEventListeners() {
    // Tab deletion
    document.querySelectorAll('.tab-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent tab selection when deleting
            const tabId = e.target.dataset.tabId;
            window.handlers.deleteTab(tabId);
        });
    });
    
    // Tab selection
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tabId;
            window.handlers.selectTab(tabId);
            appState.activeTabId = tabId; // Update the active tab in the state
            renderTabs(); // Re-render the tabs to reflect the active tab change
            renderCounters(); // Re-render the counters to reflect the active tab change
        });
    });
}

function attachCounterEventListeners() {
    // Counter checkboxes
    document.querySelectorAll('.counter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const counterId = e.target.dataset.counterId;
            window.handlers.toggleCounter(counterId, e.target.checked);
        });
    });
    
    // Edit buttons
    document.querySelectorAll('.edit-counter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const counterId = e.target.dataset.counterId;
            window.handlers.editCounter(counterId);
        });
    });
}

function setupEventListeners() {
    // Add Counter button
    document.getElementById('addCounterBtn')?.addEventListener('click', window.handlers.addCounter);
    
    // Add Tab button
    document.getElementById('addTabBtn')?.addEventListener('click', window.handlers.addTab);
    
    // Counter form submission
    document.getElementById('counterForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.handlers.saveCounter(e);
    });
    
    // Tab form submission
    document.getElementById('tabForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.handlers.saveNewTab(e);
    });
    
    // Modal cancel buttons
    document.getElementById('cancelEditBtn')?.addEventListener('click', window.handlers.closeModal);
    document.getElementById('cancelTabBtn')?.addEventListener('click', window.handlers.closeTabModal);
    
    // Hotkey buttons
    document.getElementById('counterIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('counterIncrease'));
    document.getElementById('counterDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('counterDecrease'));
    document.getElementById('globalIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('globalIncrease'));
    document.getElementById('globalDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('globalDecrease'));
    
    // Clear hotkey buttons
    document.getElementById('clearIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.clearHotkey('counterIncrease'));
    document.getElementById('clearDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.clearHotkey('counterDecrease'));

    // Global amount nerves! ><
    document.getElementById('globalIncreaseAmount')?.addEventListener('change', (e) => {
        window.handlers.updateGlobalAmount('increase', e.target.value);
    });
    
    document.getElementById('globalDecreaseAmount')?.addEventListener('change', (e) => {
        window.handlers.updateGlobalAmount('decrease', e.target.value);
    });

    // the destructive nerve! ._.
    document.getElementById('deleteCounterBtn')?.addEventListener('click', () => {
        window.handlers.deleteCounter();
    });

    // the discord presence nerve! ><
    document.getElementById('discordRPCToggle')?.addEventListener('change', (e) => {
        appState.globalSettings.discordRPCEnabled = e.target.checked;
        window.electron.updateGlobalSettings(appState.globalSettings);
    });
}

function renderTabs() {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = appState.tabs
        .sort((a, b) => a.order - b.order)
        .map(tab => `
            <div class="tab ${tab.id === appState.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                ${tab.name}
                <button class="tab-delete" data-tab-id="${tab.id}">Delete</button>
            </div>
        `).join('');
    
    attachTabEventListeners();
}

function renderCounters() {
    const counterList = document.getElementById('counterList');
    const activeCounters = appState.counters
        .filter(counter => counter.tabId === appState.activeTabId);
    
    counterList.innerHTML = activeCounters.map(counter => `
        <div class="counter-item">
            <input type="checkbox" class="counter-checkbox"
                   data-counter-id="${counter.id}"
                   ${counter.isSelected ? 'checked' : ''}>
            <div>
                <div>${counter.name}</div>
                <div class="count">Count: ${counter.count}</div>
            </div>
            <button class="edit-counter-btn" data-counter-id="${counter.id}">Edit</button>
        </div>
    `).join('');
    
    attachCounterEventListeners();
}

function updateGlobalSettings() {
    const { globalSettings } = appState;
    if (!globalSettings) return;

    document.getElementById('globalIncreaseAmount').value = globalSettings.increaseAmount;
    document.getElementById('globalDecreaseAmount').value = globalSettings.decreaseAmount;
    document.getElementById('globalIncreaseHotkey').textContent = 
        globalSettings.increaseHotkey || 'Set Hotkey';
    document.getElementById('globalDecreaseHotkey').textContent = 
        globalSettings.decreaseHotkey || 'Set Hotkey';
}

// Set up event listeners when the page loads
document.addEventListener('DOMContentLoaded', setupEventListeners);