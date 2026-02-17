let appState = null;
let isCapturing = false;
let captureTarget = null;
let editingCounter = null;
let discordStatus = { enabled: false, connected: false };

window.electron.onStateUpdate((state) => {
  appState = state;
  renderUI();
});

window.electron.onCounterAdded((counter) => {
  appState.counters.push(counter);
  renderCounters();
});

window.electron.onTabAdded((tab) => {
  appState.tabs.push(tab);
  renderTabs();
});

window.electron.onCounterUpdated((counter) => {
  const index = appState.counters.findIndex((item) => item.id === counter.id);
  if (index !== -1) {
    appState.counters[index] = counter;
    renderCounters();
  }
});

window.electron.onDiscordStatusUpdate((status) => {
  discordStatus = status;
  updateDiscordStatus();
});

window.addEventListener('click', (event) => {
  const editModal = document.getElementById('editModal');
  const addTabModal = document.getElementById('addTabModal');

  if (event.target === editModal) {
    window.handlers.closeModal();
  }
  if (event.target === addTabModal) {
    window.handlers.closeTabModal();
  }
});
