function renderUI() {
    renderTabs();
    renderCounters();
    updateGlobalSettings();
}

function attachTabEventListeners() {
    document.querySelectorAll('.tab-delete').forEach((button) => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const tabId = e.target.dataset.tabId;
            window.handlers.deleteTab(tabId);
        });
    });

    document.querySelectorAll('.tab').forEach((tab) => {
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
    document.querySelectorAll('.counter-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', (e) => {
            const counterId = e.target.dataset.counterId;
            window.handlers.toggleCounter(counterId, e.target.checked);
        });
    });

    document.querySelectorAll('.edit-counter-btn').forEach((button) => {
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

    document.getElementById('counterIncreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('counterIncrease'));
    document.getElementById('counterDecreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('counterDecrease'));
    document.getElementById('globalIncreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('globalIncrease'));
    document.getElementById('globalDecreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('globalDecrease'));

    document.getElementById('clearIncreaseHotkey')?.addEventListener('click', () => window.handlers.clearHotkey('counterIncrease'));
    document.getElementById('clearDecreaseHotkey')?.addEventListener('click', () => window.handlers.clearHotkey('counterDecrease'));

    document.getElementById('globalIncreaseAmount')?.addEventListener('change', window.handlers.saveGlobalSettingsFromInputs);
    document.getElementById('globalDecreaseAmount')?.addEventListener('change', window.handlers.saveGlobalSettingsFromInputs);
    document.getElementById('richPresenceEnabled')?.addEventListener('change', window.handlers.saveGlobalSettingsFromInputs);
}

function renderTabs() {
    const tabList = document.getElementById('tabList');
    tabList.innerHTML = appState.tabs
        .sort((a, b) => a.order - b.order)
        .map((tab) => `
            <div class="tab ${tab.id === appState.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                ${tab.name}
                <button class="tab-delete" data-tab-id="${tab.id}">Delete</button>
            </div>
        `).join('');

    attachTabEventListeners();
}

function renderCounters() {
    const counterList = document.getElementById('counterList');
    const activeCounters = appState.counters.filter((counter) => counter.tabId === appState.activeTabId);

    counterList.innerHTML = activeCounters.map((counter) => `
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
    document.getElementById('globalIncreaseHotkey').textContent = globalSettings.increaseHotkey || 'Set Hotkey';
    document.getElementById('globalDecreaseHotkey').textContent = globalSettings.decreaseHotkey || 'Set Hotkey';
    document.getElementById('richPresenceEnabled').checked = Boolean(globalSettings.richPresenceEnabled);
}

document.addEventListener('DOMContentLoaded', setupEventListeners);
