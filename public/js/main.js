// public/js/main.js

// Global state and variables
let appState = null;
let isCapturing = false;
let captureTarget = null;
let editingCounter = null;

// Initialize
window.electron.onStateUpdate((state) => {
    appState = state;
    renderUI();
});

// IPC Listeners
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

// Modal click-outside handlers
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