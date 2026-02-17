let appState = null;
let isCapturing = false;
let captureTarget = null;
let editingCounter = null;

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
    const index = appState.counters.findIndex((c) => c.id === counter.id);
    if (index !== -1) {
        appState.counters[index] = counter;
        renderCounters();
    }
});

window.electron.onDiscordStatus((status) => {
    const el = document.getElementById('discordStatusText');
    if (!el) return;

    if (!status.enabled) {
        el.textContent = 'Discord status: disabled';
        return;
    }

    el.textContent = status.connected
        ? 'Discord status: connected'
        : 'Discord status: unavailable (is Discord running?)';
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
