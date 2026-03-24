document.addEventListener('DOMContentLoaded', () => {
    // Stage Selector elements
    const hotelSelector = document.getElementById('hotel-selector');
    const searchInput = document.getElementById('bk-neural-search');

    // UI Elements
    const container = document.getElementById('bookings-dynamic-container');
    const statBookings = document.getElementById('stat-bookings');
    const statRevenue = document.getElementById('stat-revenue');
    const statConfirmed = document.getElementById('stat-confirmed');

    // View Controllers
    const viewGridBtn = document.getElementById('view-grid-btn');
    const viewListBtn = document.getElementById('view-list-btn');

    let currentViewMode = 'grid'; // 'grid' | 'list'
    let currentSearchQuery = '';

    // Initialize
    fetchBookings();

    // Event Listeners
    hotelSelector.addEventListener('change', () => fetchBookings());

    let searchDebounce;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            fetchBookings();
        }, 300);
    });

    if (viewGridBtn && viewListBtn) {
        viewGridBtn.addEventListener('click', () => setViewMode('grid'));
        viewListBtn.addEventListener('click', () => setViewMode('list'));
    }

    function setViewMode(mode) {
        currentViewMode = mode;
        if (mode === 'grid') {
            viewGridBtn.classList.add('is-active');
            viewListBtn.classList.remove('is-active');
        } else {
            viewListBtn.classList.add('is-active');
            viewGridBtn.classList.remove('is-active');
        }

        // Toggle view classes on the container
        if (mode === 'list') {
            container.classList.add('global-list-active');
        } else {
            container.classList.remove('global-list-active');
        }
    }

    async function fetchBookings() {
        const hotelId = hotelSelector.value;
        showSkeleton();

        try {
            const res = await fetch(`/api/bookings/?hotelId=${hotelId}`);
            if (!res.ok) throw new Error('API Sync Failed');

            const payload = await res.json();
            if (payload.status === 'success') {
                updateStats(payload.stats);
                renderHotels(payload.data.hotels);
            } else {
                showErrorState();
            }
        } catch (error) {
            console.error('[Bookings] Sync Error:', error);
            showErrorState();
        }
    }

    function updateStats(stats) {
        if (!stats) return;

        function animateValue(obj, start, end, duration, formatStr) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const current = Math.floor(progress * (end - start) + start);

                if (formatStr === 'currency') obj.innerHTML = `&#8377;${current.toLocaleString('en-IN')}`;
                else obj.innerHTML = current.toLocaleString('en-IN');

                if (progress < 1) window.requestAnimationFrame(step);
            };
            window.requestAnimationFrame(step);
        }

        statBookings.innerHTML = stats.total_bookings;
        statConfirmed.innerHTML = stats.confirmed_stays;

        // Currency animation base
        const revValue = parseInt(stats.total_revenue) || 0;
        statRevenue.innerHTML = `&#8377;${revValue.toLocaleString('en-IN')}`;
    }

    function renderHotels(hotels) {
        if (!hotels || hotels.length === 0) {
            showEmptyState();
            return;
        }

        // Apply local search filtering before render
        let renderedAny = false;
        container.innerHTML = ''; // Build in fresh fragment
        const fragment = document.createDocumentFragment();

        hotels.forEach(hotel => {
            let filteredBookings = hotel.bookings;
            if (currentSearchQuery) {
                filteredBookings = hotel.bookings.filter(b =>
                    b.guest_name.toLowerCase().includes(currentSearchQuery) ||
                    b.room_category.toLowerCase().includes(currentSearchQuery) ||
                    b.status.toLowerCase().includes(currentSearchQuery)
                );
            }

            if (filteredBookings.length === 0) return; // Skip hotel if empty after filter

            renderedAny = true;

            // 1. Hotel Header
            const header = document.createElement('div');
            header.className = 'flex items-center justify-between mb-6 mt-12 first:mt-2 border-b border-white/5 pb-4';
            header.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-emerald-400 shadow-lg shadow-black/20">
                        <i class="fas fa-building text-sm"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-display font-black text-slate-100 uppercase tracking-wide flex items-center gap-3">
                            ${hotel.name}
                            <span class="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-[8px] tracking-[0.2em] text-slate-400">${hotel.active_count} ACTIVE</span>
                        </h3>
                    </div>
                </div>
                <div class="hidden sm:flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${hotel.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}"></span>
                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">${hotel.status}</span>
                </div>
            `;
            fragment.appendChild(header);

            // 2. Grid Wrapper
            const gridWrapper = document.createElement('div');
            gridWrapper.className = 'booking-grid custom-dynamic-grid';

            // 3. List Wrapper
            const listWrapper = document.createElement('div');
            listWrapper.className = 'list-view-table custom-dynamic-list min-h-0';
            
            // 3.1 List Header Node
            const listHeader = document.createElement('div');
            listHeader.className = 'list-grid-sync mb-4 px-6 opacity-40 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400';
            listHeader.innerHTML = `
                <div>Guest Intelligence</div>
                <div>Stay Coordinates</div>
                <div class="text-center">Revenue</div>
                <div class="text-center">Node Status</div>
            `;
            listWrapper.appendChild(listHeader);

            const listStack = document.createElement('div');
            listStack.className = 'list-cards-stack pt-2';
            listWrapper.appendChild(listStack);

            filteredBookings.forEach((b, idx) => {
                gridWrapper.appendChild(createGridCard(b, idx));
                listStack.appendChild(createListRow(b));
            });

            // Dual View sync Container
            const dualViewNode = document.createElement('div');
            dualViewNode.className = 'hotel-portfolio-module group/module';
            dualViewNode.appendChild(gridWrapper);
            dualViewNode.appendChild(listWrapper);

            fragment.appendChild(dualViewNode);

            // 4. View More Action
            if (hotel.has_more && !currentSearchQuery) {
                const viewMoreContainer = document.createElement('div');
                viewMoreContainer.className = 'mt-8 flex justify-center';
                viewMoreContainer.innerHTML = `
                    <a href="/bookings/?hotel_id=${hotel.id}" class="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 group">
                        <span>View Portfolio Archive</span>
                        <i class="fas fa-arrow-right text-[10px] opacity-70 group-hover:translate-x-1 transition-transform"></i>
                    </a>
                `;
                fragment.appendChild(viewMoreContainer);
            }
        });

        if (!renderedAny) {
            showEmptyState();
        } else {
            container.appendChild(fragment);
            // Re-apply view classes
            if (currentViewMode === 'list') container.classList.add('global-list-active');

            // Add CSS styling rules for the dynamic list/grid toggle within vanilla JS
            if (!document.getElementById('dynamic-dual-view-styles')) {
                const style = document.createElement('style');
                style.id = 'dynamic-dual-view-styles';
                style.textContent = `
                    #bookings-dynamic-container .custom-dynamic-list { display: none; }
                    #bookings-dynamic-container.global-list-active .custom-dynamic-grid { display: none; }
                    #bookings-dynamic-container.global-list-active .custom-dynamic-list { display: block; }
                `;
                document.head.appendChild(style);
            }
        }
    }

    function getStatusTheme(status) {
        if (status === 'CONFIRMED') return 'confirmed';
        if (status === 'PENDING') return 'pending';
        if (status === 'CANCELLED') return 'cancelled';
        return 'default';
    }

    function createGridCard(b, idx) {
        const card = document.createElement('div');
        card.className = 'booking-card group slide-up-fade';
        card.style.animationDelay = `${idx * 0.05}s`;
        card.dataset.status = b.status;
        card.dataset.name = b.guest_name.toLowerCase();

        const isPaid = b.payment_status === 'PAID';
        const pColor = isPaid ? 'emerald' : 'amber';
        const pText = isPaid ? 'PAID' : 'UNPAID';

        card.innerHTML = `
            <div class="guest-avatar">
                <i class="fas fa-user-tie"></i>
            </div>
            
            <div class="guest-info-block">
                <h5 class="guest-name">${b.guest_name}</h5>
                <span class="room-name">${b.room_category}</span>
            </div>

            <div class="stay-intel-bar">
                <div class="stay-node">
                    <span class="stay-label">Arrival</span>
                    <span class="stay-value">${b.check_in}</span>
                </div>
                <div class="stay-connector"></div>
                <div class="stay-node">
                    <span class="stay-label">Intensity</span>
                    <span class="stay-value">${b.nights} Night${b.nights > 1 ? 's' : ''}</span>
                </div>
                <div class="stay-connector"></div>
                <div class="stay-node">
                    <span class="stay-label">Departure</span>
                    <span class="stay-value">${b.check_out}</span>
                </div>
            </div>

            <div class="bk-status-wrap">
                <span class="bk-status-badge ${getStatusTheme(b.status)}">${b.status}</span>
                <span class="bk-payment-tag text-${pColor}-500 flex items-center gap-2 uppercase font-black text-[9px] tracking-widest mt-1">
                    <span class="w-1 h-1 rounded-full bg-${pColor}-500 group-hover:animate-pulse"></span>
                    ${pText}
                </span>
            </div>
        `;
        return card;
    }

    function createListRow(b) {
        const row = document.createElement('div');
        row.className = 'bk-list-row list-grid-sync transition-colors hover:bg-white/[0.02] border-b border-white/5 last:border-0';

        const isPaid = b.payment_status === 'PAID';
        const pBg = isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600';
        const pDot = isPaid ? 'bg-emerald-500' : 'bg-amber-500';

        row.innerHTML = `
            <div class="col-guest">
                <div class="flex items-center gap-6">
                    <div class="bk-list-avatar shadow-lg shadow-black/20">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div>
                        <div class="text-lg font-black text-slate-100 leading-tight">${b.guest_name}</div>
                        <div class="text-[9px] font-black text-slate-400/80 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                            <i class="fas fa-bed opacity-50"></i><span class="italic text-slate-300">${b.room_category}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-stay">
                <div class="text-[13px] font-black text-slate-200 tracking-tight">
                    ${b.check_in.split(',')[0]} — ${b.check_out}
                </div>
                <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
                    <span class="font-black text-slate-400">${b.nights}</span> Night stay
                </div>
            </div>
            <div class="col-payment text-center">
                <span class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${pBg}">
                    <span class="w-1.5 h-1.5 rounded-full ${pDot}"></span>
                    ${b.payment_status || "UNPAID"}
                </span>
            </div>
            <div class="col-status text-center">
                <span class="bk-status-badge ${getStatusTheme(b.status)}">${b.status}</span>
            </div>
        `;
        return row;
    }

    function showSkeleton() {
        container.innerHTML = `
            <div class="w-full flex flex-col gap-12 pt-8">
                <!-- Skeleton Header -->
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-white/5 animate-pulse"></div>
                    <div class="w-48 h-6 bg-white/5 rounded-full animate-pulse"></div>
                </div>
                <!-- Skeleton Grid -->
                <div class="booking-grid">
                    ${Array(4).fill(0).map(() => `
                        <div class="booking-card animate-pulse shadow-none border-transparent bg-white/[0.02]">
                            <div class="flex items-center gap-6 mb-8">
                                <div class="w-16 h-16 rounded-full bg-white/5"></div>
                                <div class="space-y-3 flex-1">
                                    <div class="h-4 bg-white/5 rounded w-3/4"></div>
                                    <div class="h-3 bg-white/5 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div class="h-px bg-white/5 my-8"></div>
                            <div class="space-y-4">
                                <div class="h-3 bg-white/5 rounded w-full"></div>
                                <div class="h-3 bg-white/5 rounded w-5/6"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function showEmptyState() {
        container.innerHTML = `
            <div class="py-32 flex flex-col items-center gap-6 text-center animate-[fadeIn_0.5s_ease-out]">
                <div class="w-24 h-24 rounded-[3rem] bg-white/5 flex items-center justify-center text-slate-400 border border-white/5 shadow-xl">
                    <i class="fas fa-search-minus text-3xl"></i>
                </div>
                <div>
                    <h4 class="text-2xl font-display font-black text-slate-200 mb-2">No Correlations Found</h4>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Neural engine generated 0 matching profiles</p>
                </div>
            </div>
        `;
    }

    function showErrorState() {
        container.innerHTML = `
            <div class="py-32 flex flex-col items-center gap-6 text-center">
                <div class="w-24 h-24 rounded-[3rem] bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-xl">
                    <i class="fas fa-exclamation-triangle text-3xl"></i>
                </div>
                <div>
                    <h4 class="text-2xl font-display font-black text-red-400 mb-2">Sync Anomaly Detected</h4>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Please refresh the orchestrator interface</p>
                </div>
                <button onclick="window.location.reload()" class="mt-4 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-xs font-black uppercase text-slate-300 hover:bg-white/10 transition-colors">
                    Reboot Protocol
                </button>
            </div>
        `;
    }

    // Add inline keyframes for smooth insertion
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        @keyframes slideUpFade {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .slide-up-fade {
            opacity: 0;
            animation: slideUpFade 0.5s ease-out forwards;
        }
    `;
    document.head.appendChild(styleEl);
});
