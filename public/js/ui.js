function renderUI() {
  renderTabs();
  renderCounters();
  updateGlobalSettings();
  updateDiscordStatus();
}

function attachTabEventListeners() {
  document.querySelectorAll('.tab-delete').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const tabId = event.target.dataset.tabId;
      window.handlers.deleteTab(tabId);
    });
  });

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', (event) => {
      const tabId = event.target.dataset.tabId;
      window.handlers.selectTab(tabId);
      appState.activeTabId = tabId;
      renderTabs();
      renderCounters();
    });
  });
}

function attachCounterEventListeners() {
  document.querySelectorAll('.counter-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const counterId = event.target.dataset.counterId;
      window.handlers.toggleCounter(counterId, event.target.checked);
    });
  });

  document.querySelectorAll('.edit-counter-btn').forEach((button) => {
    button.addEventListener('click', (event) => {
      const counterId = event.target.dataset.counterId;
      window.handlers.editCounter(counterId);
    });
  });
}

function setupEventListeners() {
  document.getElementById('addCounterBtn')?.addEventListener('click', window.handlers.addCounter);
  document.getElementById('addTabBtn')?.addEventListener('click', window.handlers.addTab);

  document.getElementById('counterForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.handlers.saveCounter(event);
  });

  document.getElementById('tabForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    window.handlers.saveNewTab(event);
  });

  document.getElementById('cancelEditBtn')?.addEventListener('click', window.handlers.closeModal);
  document.getElementById('cancelTabBtn')?.addEventListener('click', window.handlers.closeTabModal);

  document.getElementById('counterIncreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('counterIncrease'));
  document.getElementById('counterDecreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('counterDecrease'));
  document.getElementById('globalIncreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('globalIncrease'));
  document.getElementById('globalDecreaseHotkey')?.addEventListener('click', () => window.handlers.captureHotkey('globalDecrease'));

  document.getElementById('clearIncreaseHotkey')?.addEventListener('click', () => window.handlers.clearHotkey('counterIncrease'));
  document.getElementById('clearDecreaseHotkey')?.addEventListener('click', () => window.handlers.clearHotkey('counterDecrease'));

  document.getElementById('globalIncreaseAmount')?.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      appState.globalSettings.increaseAmount = value;
      window.electron.updateGlobalSettings(appState.globalSettings);
    }
  });

  document.getElementById('globalDecreaseAmount')?.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      appState.globalSettings.decreaseAmount = value;
      window.electron.updateGlobalSettings(appState.globalSettings);
    }
  });

  document.getElementById('richPresenceEnabled')?.addEventListener('change', (event) => {
    appState.globalSettings.richPresenceEnabled = Boolean(event.target.checked);
    window.electron.updateGlobalSettings(appState.globalSettings);
  });
}

function renderTabs() {
  const tabList = document.getElementById('tabList');
  tabList.innerHTML = appState.tabs
    .sort((a, b) => a.order - b.order)
    .map(
      (tab) => `<div class="tab ${tab.id === appState.activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
        ${tab.name}
        <button class="tab-delete" data-tab-id="${tab.id}">Delete</button>
      </div>`
    )
    .join('');

  attachTabEventListeners();
}

function renderCounters() {
  const counterList = document.getElementById('counterList');
  const activeCounters = appState.counters.filter((counter) => counter.tabId === appState.activeTabId);

  counterList.innerHTML = activeCounters
    .map(
      (counter) => `<div class="counter-item">
      <input type="checkbox" class="counter-checkbox" data-counter-id="${counter.id}" ${counter.isSelected ? 'checked' : ''}>
      <div>
        <div>${counter.name}</div>
        <div class="count">Count: ${counter.count}</div>
      </div>
      <button class="edit-counter-btn" data-counter-id="${counter.id}">Edit</button>
    </div>`
    )
    .join('');

  attachCounterEventListeners();
}

function updateGlobalSettings() {
  const { globalSettings } = appState;
  if (!globalSettings) {
    return;
  }

  document.getElementById('globalIncreaseAmount').value = globalSettings.increaseAmount;
  document.getElementById('globalDecreaseAmount').value = globalSettings.decreaseAmount;
  document.getElementById('globalIncreaseHotkey').textContent = globalSettings.increaseHotkey || 'Set Hotkey';
  document.getElementById('globalDecreaseHotkey').textContent = globalSettings.decreaseHotkey || 'Set Hotkey';
  document.getElementById('richPresenceEnabled').checked = Boolean(globalSettings.richPresenceEnabled);
}

function updateDiscordStatus() {
  const status = document.getElementById('discordStatus');
  if (!status) {
    return;
  }

  if (!discordStatus.enabled) {
    status.textContent = 'Discord Rich Presence is disabled';
    return;
  }

  status.textContent = discordStatus.connected
    ? 'Discord Rich Presence connected'
    : 'Discord not detected (counter still works normally)';
}

document.addEventListener('DOMContentLoaded', setupEventListeners);
