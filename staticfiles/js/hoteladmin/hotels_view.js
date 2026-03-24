/* Hotels Elite Controller v5.0: Neural Orchestration */

document.addEventListener('DOMContentLoaded', () => {
    const vc = new DualViewController({
        containerId: 'hotels-portfolio-container',
        gridBtnId: 'view-grid-btn',
        listBtnId: 'view-list-btn',
        storageKey: 'hotelpro_hotels_view',
        onViewChange: (view) => {
            document.querySelectorAll('.hotel-card-wrapper').forEach(card => {
                if (!card.classList.contains('neural-hidden')) {
                    card.style.animation = 'none';
                    void card.offsetWidth;
                    card.style.animation = '';
                }
            });
        }
    });

    /* ── Neural Search Engine v5.4 (Perspective Sync) ────── */
    const searchInput = document.getElementById('bk-neural-search');
    const clearBtn = document.getElementById('bk-search-clear');
    const emptyState = document.getElementById('neural-empty-state');
    const grid = document.querySelector('.hotel-grid');
    const statNodes = document.querySelectorAll('.bk-stat[data-status-filter]');

    let activeFilter = 'all';

    if (searchInput) {
        const runEngine = () => {
            const query = searchInput.value.toLowerCase().trim();
            const nodes = document.querySelectorAll('.hotel-card-wrapper');
            let foundCount = 0;

            // Toggle Clear Button Visibility
            if (clearBtn) clearBtn.classList.toggle('hidden', query === '');

            nodes.forEach(node => {
                const content = node.innerText || node.textContent || "";
                const nodeStatus = node.getAttribute('data-status') || "";

                const matchesQuery = content.toLowerCase().includes(query);
                const matchesStatus = (activeFilter === 'all' || nodeStatus === activeFilter);

                const isVisible = matchesQuery && matchesStatus;

                node.classList.toggle('neural-hidden', !isVisible);

                if (isVisible) {
                    foundCount++;
                    if (query !== '' || activeFilter !== 'all') {
                        node.style.animation = 'none';
                        void node.offsetWidth;
                        // Synchronize with v5.7 Elite Spring Physics
                        node.style.animation = 'bkPortfolioIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
                    }
                }
            });

            // Ephemeral Toast Orchestration
            clearTimeout(window.neuralToastTimer);
            if (window.ZenithToast) window.ZenithToast.hide();

            const showEmpty = foundCount === 0 && (query !== '' || activeFilter !== 'all');
            
            if (showEmpty) {
                window.neuralToastTimer = setTimeout(() => {
                    if (window.ZenithToast) {
                        window.ZenithToast.show("Neural Link Failure", "No property patterns found for this query");
                    }
                }, 800);
            }
            
            // Legacy grid toggle (still needed to clear view)
            if (grid) grid.classList.toggle('hidden', showEmpty);
        };

        // Instant Clear Orchestration
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                searchInput.focus();
                if (window.ZenithToast) window.ZenithToast.hide();
                runEngine();
            });
        }

        // Perspective Clicks
        statNodes.forEach(stat => {
            stat.addEventListener('click', () => {
                statNodes.forEach(s => s.classList.remove('is-active'));
                stat.classList.add('is-active');
                activeFilter = stat.getAttribute('data-status-filter');
                if (window.ZenithToast) window.ZenithToast.hide();
                runEngine();
            });
        });

        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runEngine, 30); // Zero-Latency Performance
        });

        // Harden for pure client-side interaction
        const form = searchInput.closest('form');
        if (form) {
            form.addEventListener('submit', (e) => e.preventDefault());
            form.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });
        }

        // Auto-Focus Intelligence
        setTimeout(() => searchInput.focus(), 1200);

        // Initial run
        runEngine();
    }

    /* ── Kinetic Symphony Engine (v7.0) ─────────────────────── */
    const orchestratePhysics = () => {
        const kineticNodes = document.querySelectorAll('.executive-card, .bk-stat');
        const magneticBtns = document.querySelectorAll('.bk-search-clear, .action-hub a, #view-grid-btn, #view-list-btn');

        document.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;

            // 1. Parallax Mesh Engine
            kineticNodes.forEach(node => {
                const rect = node.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // Only process nodes in/near viewport
                if (rect.top > window.innerHeight || rect.bottom < 0) return;

                const deltaX = (clientX - centerX) / 25;
                const deltaY = (clientY - centerY) / 25;

                node.style.setProperty('--parallax-mx', `${deltaX}px`);
                node.style.setProperty('--parallax-my', `${deltaY}px`);
            });

            // 2. Magnetic Pull Engine
            magneticBtns.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                const distance = Math.hypot(clientX - centerX, clientY - centerY);
                const isNear = distance < 100;

                if (isNear) {
                    const pullX = (clientX - centerX) * 0.25;
                    const pullY = (clientY - centerY) * 0.25;
                    btn.style.transform = `translate(${pullX}px, ${pullY}px) scale(1.05)`;
                    btn.style.transition = 'transform 0.2s cubic-bezier(0.33, 1, 0.68, 1)';
                } else {
                    btn.style.transform = '';
                    btn.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                }
            });
        });
    };

    /* ── Executive Selection Engine (v6.3) ─────────────────── */
    const orchestrateSelection = () => {
        document.querySelectorAll('.executive-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('a')) return;
                const isSelected = card.classList.contains('selected-node');
                document.querySelectorAll('.executive-card').forEach(c => c.classList.remove('selected-node'));
                if (!isSelected) card.classList.add('selected-node');
            });
        });
    };

    /* ── Shortcut Intelligence ───────────────────────────── */
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        if (e.key.toLowerCase() === 'g') vc.setView('grid');
        else if (e.key.toLowerCase() === 'l') vc.setView('list');
    });

    // Initialize Kinetic Environment
    orchestrateSelection();
    orchestratePhysics();

    /* ── Welcome Guidance Orchestration (Infinite Responsive Flow) ────── */
    const welcomePopup = document.getElementById('bk-welcome-popup');
    const addBtn       = document.getElementById('bk-add-hotel-hero');
    let manuallyKilled = sessionStorage.getItem('bk_hotel_tip_killed') === 'true';

    const showTip = () => {
        if (!welcomePopup || manuallyKilled) return;
        welcomePopup.classList.add('show');
    };

    const hideTip = () => {
        if (!welcomePopup) return;
        welcomePopup.classList.remove('show');
    };

    // 1. Precise Auto-Land (Delayed for impact)
    if (welcomePopup && !manuallyKilled) {
        setTimeout(showTip, 1500);
    }

    // 2. High-Fidelity Hover Integration
    if (addBtn) {
        // Show on hover if not already up
        addBtn.addEventListener('mouseenter', showTip);
        
        // Hide on "Move Away" (Matches user request)
        addBtn.addEventListener('mouseleave', () => {
            // Only hide if the user isn't hovering the tip itself
            setTimeout(() => {
                if (!welcomePopup.matches(':hover') && !addBtn.matches(':hover')) {
                    hideTip();
                }
            }, 100);
        });
    }

    // Handle tip hover as well so it doesn't flicker
    if (welcomePopup) {
        welcomePopup.addEventListener('mouseleave', hideTip);
    }

    // 3. Absolute Dismissal (X Button)
    window.dismissWelcomeTip = (e) => {
        if (e) e.stopPropagation();
        hideTip();
        manuallyKilled = true;
        sessionStorage.setItem('bk_hotel_tip_killed', 'true');
    };

    // Zenith Ultra - Dynamic Interaction Protocol for My Hotels
    const meshCards = document.querySelectorAll('.metric-mesh-card');
    meshCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });
});

function toggleHotelMenu(event, id) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${id}`);
    const allMenus = document.querySelectorAll('.hotel-dropdown');

    // Close all other dropdowns and restore overflow on their parent cards
    allMenus.forEach(m => {
        if (m.id !== `menu-${id}`) {
            m.classList.remove('active');
            const parentCard = m.closest('.executive-card');
            if (parentCard) {
                parentCard.style.overflow = '';
            }
        }
    });

    if (menu) {
        menu.classList.toggle('active');
        const parentCard = menu.closest('.executive-card');
        if (parentCard) {
            // When open, make card overflow visible so dropdown isn't clipped
            parentCard.style.overflow = menu.classList.contains('active') ? 'visible' : '';
        }
    }
}

function confirmDelete(id, name, isDirect) {
    const title = isDirect ? 'Permanently Delete?' : 'Request Removal?';
    const message = isDirect
        ? `Are you sure you want to completely remove "${name}"? This action cannot be undone.`
        : `"${name}" is a verified property. Removal requires an audit. Proceed with deletion request?`;

    if (confirm(`${title}\n\n${message}`)) {
        const form = document.getElementById(`delete-form-${id}`);
        if (form) form.submit();
    }
}

// Close menus on click outside
document.addEventListener('click', () => {
    document.querySelectorAll('.hotel-dropdown').forEach(m => {
        m.classList.remove('active');
        const parentCard = m.closest('.executive-card');
        if (parentCard) parentCard.style.overflow = '';
    });
});
