/* ============================================================
   Rooms Dual View Controller
   Grid ↔ List with LocalStorage persistence & re-animation
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('inventory-container');
    const gridBtn = document.getElementById('view-grid-btn');
    const listBtn = document.getElementById('view-list-btn');

    if (!container || !gridBtn || !listBtn) return;

    const STORAGE_KEY = 'hotelpro_rooms_view';

    // ── Core view switch ──────────────────────────────────────
    const setView = (view, animate = true) => {
        const cards = container.querySelectorAll('.room-card');

        // Swap mode class
        if (view === 'list') {
            container.classList.add('view-list-mode');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        } else {
            container.classList.remove('view-list-mode');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        }

        // Persist
        localStorage.setItem(STORAGE_KEY, view);

        // Re-trigger entrance animation on every switch
        if (animate) {
            cards.forEach(card => {
                card.style.animation = 'none';
                // Force reflow so the browser notices
                void card.offsetWidth;
                card.style.animation = '';
            });
        }
    };

    // ── Keyboard shortcut: G = grid, L = list ────────────────
    document.addEventListener('keydown', e => {
        // Ignore if typing inside an input/textarea
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.key === 'g' || e.key === 'G') setView('grid');
        if (e.key === 'l' || e.key === 'L') setView('list');
    });

    // ── Button listeners ─────────────────────────────────────
    gridBtn.addEventListener('click', () => setView('grid'));
    listBtn.addEventListener('click', () => setView('list'));

    // ── Initialize from saved preference ─────────────────────
    const saved = localStorage.getItem(STORAGE_KEY) || 'grid';
    setView(saved, false);  // no re-animation on initial load (CSS handles it)

    // ── Delete confirm guard ──────────────────────────────────
    document.querySelectorAll('.delete-confirm').forEach(form => {
        form.addEventListener('submit', e => {
            if (!confirm('Delete this room category? This action cannot be undone.')) {
                e.preventDefault();
            }
        });
    });

    // ── Room Category Guidance Orchestration ──────
    const roomTipPopup = document.getElementById('bk-room-tip-popup');
    const addCategoryBtn = document.getElementById('bk-add-category-hero');
    let roomTipKilled = sessionStorage.getItem('bk_room_tip_killed') === 'true';

    const showRoomTip = () => {
        if (!roomTipPopup || roomTipKilled) return;
        roomTipPopup.classList.add('show');
    };

    const hideRoomTip = () => {
        if (!roomTipPopup) return;
        roomTipPopup.classList.remove('show');
    };

    // 1. Precise Auto-Land (Delayed for impact)
    if (roomTipPopup && !roomTipKilled) {
        setTimeout(showRoomTip, 1500);
    }

    // 2. High-Fidelity Hover Integration
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('mouseenter', showRoomTip);
        addCategoryBtn.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!roomTipPopup.matches(':hover') && !addCategoryBtn.matches(':hover')) {
                    hideRoomTip();
                }
            }, 100);
        });
    }

    if (roomTipPopup) {
        roomTipPopup.addEventListener('mouseleave', hideRoomTip);
    }

    // 3. Absolute Dismissal
    window.dismissRoomTip = (e) => {
        if (e) e.stopPropagation();
        hideRoomTip();
        roomTipKilled = true;
        sessionStorage.setItem('bk_room_tip_killed', 'true');
    };
    // ── Auto-Search Orchestration ────────────────────────────
    const searchInput = document.getElementById('inventory-search');
    const emptyState = document.getElementById('empty-inventory-state');
    const cards = container.querySelectorAll('.room-card');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            const sections = container.querySelectorAll('.category-section');
            let totalVisibleCount = 0;

            sections.forEach(section => {
                const sectionCards = section.querySelectorAll('.room-card');
                let sectionVisibleCount = 0;

                sectionCards.forEach(card => {
                    const name = card.querySelector('h3').textContent.toLowerCase();
                    const category = card.dataset.category.toLowerCase();

                    if (name.includes(query) || category.includes(query)) {
                        card.classList.remove('neural-hidden');
                        sectionVisibleCount++;
                        totalVisibleCount++;
                    } else {
                        card.classList.add('neural-hidden');
                    }
                });

                // Toggle Category Section Visibility
                if (sectionVisibleCount === 0 && query !== '') {
                    section.classList.add('neural-hidden');
                } else {
                    section.classList.remove('neural-hidden');
                }
            });

            // Toggle Empty State
            if (totalVisibleCount === 0 && query !== '') {
                emptyState.classList.add('show');
                emptyState.classList.remove('hidden');
            } else {
                emptyState.classList.remove('show');
                emptyState.classList.add('hidden');
            }
        });
    }

    // ── Dropdown Professional Polish ──────────────────────────
    const selector = document.getElementById('portfolio-selector');
    if (selector) {
        const trigger = selector.querySelector('.elite-dropdown-trigger');
        const options = selector.querySelectorAll('.portfolio-option');

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            selector.classList.toggle('active');
        });

        // Ensure current active item is marked
        const currentUrl = window.location.pathname;
        options.forEach(opt => {
            if (opt.dataset.url && currentUrl.includes(opt.dataset.url)) {
                opt.classList.add('active');
            }

            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                location.href = opt.dataset.url;
            });
        });

        document.addEventListener('click', () => {
            selector.classList.remove('active');
        });
    }

    // ── Clickable Unit Cards (Elite Interaction) ──────────────
    container.addEventListener('click', (e) => {
        const card = e.target.closest('.room-card');
        if (card && card.dataset.editUrl) {
            // Only navigate if we didn't click a real button/form
            if (!e.target.closest('button, a, form')) {
                window.location.href = card.dataset.editUrl;
            }
        }
    });
});
