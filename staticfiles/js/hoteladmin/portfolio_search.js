/**
 * 🔍 Enterprise Portfolio Search Protocol (v51.0 Shared)
 * Professional real-time filtering for hotel nodes across the Hub.
 */
document.addEventListener('DOMContentLoaded', () => {
    initPortfolioSearch();
});

function initPortfolioSearch() {
    // 🔎 Support both unified search and My Hotels neural search nodes
    const searchInput = document.getElementById('portfolioSearchNode') || document.getElementById('bk-neural-search');
    const nodes = document.querySelectorAll('.portfolio-node-item, .hotel-card-wrapper');
    const container = document.getElementById('portfolioNodeContainer') || document.getElementById('hotels-portfolio-container');

    if (!searchInput) return;

    // Removal of legacy No Results Node implementation
    // The search engine now uses ephemeral toast notifications (Phase 23)

    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        let visibleCount = 0;
        
        // Also handle "Add New Node" shortcut if present
        const addNodeLink = container ? container.querySelector('a[href*="hotel_onboarding"]') : null;
        const addNodeShortcut = addNodeLink ? addNodeLink.parentElement : null;

        nodes.forEach(node => {
            const content = node.innerText || node.textContent || "";
            const matches = content.toLowerCase().includes(query);

            if (matches) {
                node.style.display = '';
                node.style.opacity = '1';
                node.style.transform = 'scale(1)';
                node.classList.add('snap-start');
                visibleCount++;
            } else {
                node.style.opacity = '0';
                node.style.transform = 'scale(0.95)';
                node.style.display = 'none';
                node.classList.remove('snap-start');
            }
        });

        // Handle Add Node Shortcut visibility
        if (addNodeShortcut) {
            if (query !== '') {
                addNodeShortcut.style.display = 'none';
            } else {
                addNodeShortcut.style.display = '';
            }
        }

        // Ephemeral Toast Orchestration
        clearTimeout(window.searchToastTimer);
        if (window.ZenithToast) window.ZenithToast.hide();

        if (visibleCount === 0 && query !== '') {
            window.searchToastTimer = setTimeout(() => {
                if (window.ZenithToast) {
                    window.ZenithToast.show("No Matching Nodes", "Try a different property name");
                }
            }, 800); // Polished Debounce for professional impact
        }
    });

    // Removal of legacy local engine in favor of global ZenithToast (Phase 23)

    // Handle focus effects & Toast Dismissal
    searchInput.addEventListener('focus', () => {
        searchInput.parentElement.classList.add('search-focused');
        if (window.ZenithToast) window.ZenithToast.hide();
    });
    searchInput.addEventListener('blur', () => {
        searchInput.parentElement.classList.remove('search-focused');
    });
}
