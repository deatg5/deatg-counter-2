// public/js/ui.js

function renderUI() {
    renderTabs();
    renderCounters();
    updateGlobalSettings();
}

function attachTabEventListeners() {
    document.querySelectorAll('.tab-delete').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const tabId = e.target.dataset.tabId;
            window.handlers.deleteTab(tabId);
        });
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.dataset.tabId;
            window.handlers.selectTab(tabId);
            appState.activeTabId = tabId; 
            renderTabs(); 
            renderCounters(); 
        });
    });
}

function attachCounterEventListeners() {
    document.querySelectorAll('.counter-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const counterId = e.target.dataset.counterId;
            window.handlers.toggleCounter(counterId, e.target.checked);
        });
    });
    
    document.querySelectorAll('.edit-counter-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const counterId = e.target.dataset.counterId;
            window.handlers.editCounter(counterId);
        });
    });
}

function setupEventListeners() {
    document.getElementById('addCounterBtn')?.addEventListener('click', window.handlers.addCounter);
    document.getElementById('addTabBtn')?.addEventListener('click', window.handlers.addTab);
    
    document.getElementById('counterForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.handlers.saveCounter(e);
    });
    
    document.getElementById('tabForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        window.handlers.saveNewTab(e);
    });
    
    document.getElementById('cancelEditBtn')?.addEventListener('click', window.handlers.closeModal);
    document.getElementById('cancelTabBtn')?.addEventListener('click', window.handlers.closeTabModal);
    
    document.getElementById('counterIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('counterIncrease'));
    document.getElementById('counterDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('counterDecrease'));
    document.getElementById('globalIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('globalIncrease'));
    document.getElementById('globalDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.captureHotkey('globalDecrease'));
    
    document.getElementById('clearIncreaseHotkey')?.addEventListener('click', () => 
        window.handlers.clearHotkey('counterIncrease'));
    document.getElementById('clearDecreaseHotkey')?.addEventListener('click', () => 
        window.handlers.clearHotkey('counterDecrease'));

    document.getElementById('globalIncreaseAmount')?.addEventListener('change', (e) => {
        window.handlers.updateGlobalAmount('increase', e.target.value);
    });
    
    document.getElementById('globalDecreaseAmount')?.addEventListener('change', (e) => {
        window.handlers.updateGlobalAmount('decrease', e.target.value);
    });

    document.getElementById('deleteCounterBtn')?.addEventListener('click', () => {
        window.handlers.deleteCounter();
    });

    document.getElementById('discordRPCToggle')?.addEventListener('change', (e) => {
        appState.globalSettings.discordRPCEnabled = e.target.checked;
        window.electron.updateGlobalSettings(appState.globalSettings);
    });
}

function renderTabs() {
    const tabList = document.getElementById('tabList');
    if (!tabList) return;

    tabList.innerHTML = (appState.tabs || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
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
    if (!counterList) return;

    const activeCounters = (appState.counters || [])
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

    const incInput = document.getElementById('globalIncreaseAmount');
    // strict fallback so the browser doesn't swallow undefined! :3
    if (incInput) incInput.value = globalSettings.increaseAmount ?? ''; 
    
    const decInput = document.getElementById('globalDecreaseAmount');
    if (decInput) decInput.value = globalSettings.decreaseAmount ?? '';
    
    const incBtn = document.getElementById('globalIncreaseHotkey');
    if (incBtn) incBtn.textContent = globalSettings.increaseHotkey || 'Set Hotkey';
    
    const decBtn = document.getElementById('globalDecreaseHotkey');
    if (decBtn) decBtn.textContent = globalSettings.decreaseHotkey || 'Set Hotkey';
}

document.addEventListener('DOMContentLoaded', setupEventListeners);