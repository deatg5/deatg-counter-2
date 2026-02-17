// public/js/main.js

let appState = null;
let isCapturing = false;
let captureTarget = null;
let editingCounter = null;
let richPresenceConnected = false;

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
    const index = appState.counters.findIndex(c => c.id === counter.id);
    if (index !== -1) {
        appState.counters[index] = counter;
        renderCounters();
    }
});

window.electron.onRichPresenceStatus(({ connected }) => {
    richPresenceConnected = connected;
    updateRichPresenceStatus?.();
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
