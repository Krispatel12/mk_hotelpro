/* ============================================================
   Bookings v4.0 Controller
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    const vc = new DualViewController({
        containerId:  'bookings-container',
        gridBtnId:    'view-grid-btn',
        listBtnId:    'view-list-btn',
        storageKey:   'hotelpro_bookings_v4',
        onViewChange: (view) => {
            const gridCards  = document.querySelectorAll('.booking-card');
            const tableRows  = document.querySelectorAll('.bk-list-row');
            const resetAnim  = (els) => els.forEach(el => {
                el.style.animation = 'none';
                void el.offsetWidth;
                el.style.animation = '';
            });
            if (view === 'grid') resetAnim(gridCards);
            else                 resetAnim(tableRows);
        }
    });

    /* ── Compute Nights Optimization ───────────────────────── */
    function calcNights(checkin, checkout) {
        if (!checkin || !checkout) return null;
        const diff = (new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24);
        return Math.max(0, Math.round(diff));
    }

    document.querySelectorAll('.booking-card').forEach(card => {
        const nights = calcNights(card.dataset.checkin, card.dataset.checkout);
        const el = card.querySelector('.bk-nights-count');
        if (el && nights !== null) {
            el.textContent = `${nights} Night${nights !== 1 ? 's' : ''}`;
        }
    });

    const gridCards = Array.from(document.querySelectorAll('.booking-card'));
    const listNightSpans = Array.from(document.querySelectorAll('.bk-nights-count-list'));
    listNightSpans.forEach((span, i) => {
        const card = gridCards[i];
        if (!card) return;
        const nights = calcNights(card.dataset.checkin, card.dataset.checkout);
        if (nights !== null) span.textContent = nights;
    });

    /* ── 3D Portfolio Tilt v4.0 ──────────────────────────── */
    document.querySelectorAll('.booking-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const dx = (e.clientX - rect.left) - rect.width  / 2;
            const dy = (e.clientY - rect.top)  - rect.height / 2;
            
            card.style.transition = 'transform 0.1s ease-out';
            card.style.transform = `perspective(1500px) translateY(-12px) scale(1.03) rotateX(${-dy / 25}deg) rotateY(${dx / 25}deg)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transition = 'all 0.8s cubic-bezier(0.23, 1, 0.32, 1)';
            card.style.transform = 'translateY(0) scale(1) rotateX(0) rotateY(0)';
        });
    });

    /* ── Extreme Neural Hardening v4.18 ──────────────────── */
    const searchInput = document.getElementById('bk-neural-search');
    const emptyState  = document.getElementById('neural-empty-state');
    
    if (searchInput) {
        const runEngine = () => {
            const query = searchInput.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.booking-card');
            const rows  = document.querySelectorAll('.bk-list-row');
            const grid  = document.querySelector('.booking-grid');
            const table = document.querySelector('.list-view-table');
            
            let matchesFound = 0;

            const applyFilter = (elements) => {
                elements.forEach(el => {
                    const content = el.innerText || el.textContent || "";
                    const isMatch = content.toLowerCase().includes(query);
                    
                    el.classList.toggle('neural-hidden', !isMatch);
                    
                    if (isMatch) {
                        matchesFound++;
                        if (query !== '') {
                            el.style.animation = 'none';
                            void el.offsetWidth;
                            el.style.animation = 'bkPortfolioIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                        }
                    }
                });
            };

            applyFilter(cards);
            applyFilter(rows);

            // Ephemeral Toast Orchestration
            clearTimeout(window.searchToastTimer);
            if (window.ZenithToast) window.ZenithToast.hide();

            const showEmpty = query !== '' && matchesFound === 0;
            if (showEmpty) {
                window.searchToastTimer = setTimeout(() => {
                    if (window.ZenithToast) {
                        window.ZenithToast.show("No Matching Reservations", "Scan another guest signature");
                    }
                }, 800);
            }

            if (grid) grid.classList.toggle('hidden', showEmpty);
            if (table) table.classList.toggle('hidden', showEmpty);
            // Hide legacy local empty state if it exists
            if (emptyState) emptyState.classList.add('hidden');
        };

        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runEngine, 50); 
        });

        // Harden form to prevent any accidental reloads
        const searchForm = searchInput.closest('form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => e.preventDefault());
            searchForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });
        }

        // Initial run to capture any pre-filled values
        if (searchInput.value) runEngine();
    }
});
