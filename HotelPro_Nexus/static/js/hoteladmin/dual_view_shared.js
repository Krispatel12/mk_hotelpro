/**
 * DualViewController: Enterprise State Engine
 * Manages Grid/List transitions and local storage persistence.
 */
class DualViewController {
    constructor(config) {
        this.container = document.getElementById(config.containerId);
        this.gridBtn = document.getElementById(config.gridBtnId);
        this.listBtn = document.getElementById(config.listBtnId);
        this.storageKey = config.storageKey;
        this.onViewChange = config.onViewChange || null;

        if (!this.container || !this.gridBtn || !this.listBtn) {
            console.warn(`DualView init failed for ${config.storageKey}: Missing elements.`);
            return;
        }

        this.init();
    }

    init() {
        // Load persistence
        const savedView = localStorage.getItem(this.storageKey) || 'grid';
        this.setView(savedView);

        // Bind events
        this.gridBtn.addEventListener('click', () => this.setView('grid'));
        this.listBtn.addEventListener('click', () => this.setView('list'));
    }

    setView(view) {
        if (view === 'list') {
            this.container.classList.add('view-list-mode');
            this.listBtn.classList.add('is-active');
            this.gridBtn.classList.remove('is-active');
        } else {
            this.container.classList.remove('view-list-mode');
            this.gridBtn.classList.add('is-active');
            this.listBtn.classList.remove('is-active');
        }

        localStorage.setItem(this.storageKey, view);

        // Visual Polish: Entrance reveal
        this.container.classList.remove('animate-reveal');
        void this.container.offsetWidth; // Force reflow
        this.container.classList.add('animate-reveal');

        if (this.onViewChange) {
            this.onViewChange(view);
        }
    }
}

window.DualViewController = DualViewController;
