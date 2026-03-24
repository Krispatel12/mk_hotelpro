/* Reviews View Controller: Professional State Initialization & Shortcuts */

document.addEventListener('DOMContentLoaded', () => {
    const vc = new DualViewController({
        containerId: 'reviews-portfolio-container',
        gridBtnId: 'view-grid-btn',
        listBtnId: 'view-list-btn',
        storageKey: 'hotelpro_reviews_view',
        onViewChange: (view) => {
            const cards = document.querySelectorAll('.review-card-wrapper');
            cards.forEach(card => {
                card.style.animation = 'none';
                void card.offsetWidth; // Force reflow
                card.style.animation = '';
            });
        }
    });

    // ── Keyboard Shortcuts: G = Grid, L = List ────────────────
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        
        if (e.key.toLowerCase() === 'g') vc.setView('grid');
        else if (e.key.toLowerCase() === 'l') vc.setView('list');
    });
});
