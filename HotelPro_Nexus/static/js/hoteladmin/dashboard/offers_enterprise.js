const EnterpriseUI = {
    currentView: 'all',

    init() {
        this.initOrchestration();
        this.initSearch();
        this.initCalendar();
        this.applyProgress();
        this.applyFilters();
        console.log("Enterprise Strategic Controller: Initialized and Synchronized.");
    },

    initOrchestration() {
        const cards = document.querySelectorAll('.offer-card-master');
        cards.forEach(card => {
            // Animation Delay Orchestration
            const index = card.dataset.index || 0;
            card.style.animationDelay = `${index * 0.1}s`;

            // 3D Tilt Effect
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const dx = x - (rect.width / 2);
                const dy = y - (rect.height / 2);
                card.style.transform = `perspective(1000px) translateY(-8px) rotateX(${-dy / 25}deg) rotateY(${dx / 25}deg)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) rotateX(0) rotateY(0)';
            });
        });
    },

    initSearch() {
        const search = document.getElementById('globalPortfolioSearch');
        const hotel = document.getElementById('hotelFilterSelector');
        if (search) search.addEventListener('input', () => this.applyFilters());
        if (hotel) hotel.addEventListener('change', () => this.applyFilters());
    },

    switchView(view) {
        // Toggle Logic: If clicking the same view, reset to 'all'
        if (this.currentView === view) {
            this.currentView = 'all';
        } else {
            this.currentView = view;
        }

        document.querySelectorAll('.metric-node').forEach(node => {
            node.classList.remove('active');
            if (node.dataset.metric === this.currentView) node.classList.add('active');
        });
        this.applyFilters();

        // Re-trigger card entrance animations on visible cards
        const list = document.getElementById('offerPortfolioList');
        if (list) {
            list.querySelectorAll('.offer-card-master:not(.strategic-hidden)').forEach(c => {
                c.style.animation = 'none';
                void c.offsetWidth;
                c.style.animation = '';
            });
        }
    },

    applyProgress() {
        document.querySelectorAll('.orchestration-progress').forEach(el => {
            const width = el.dataset.width || 0;
            el.style.width = width + '%';
        });
    },

    initCalendar() {
        const engine = document.getElementById('yieldCalendar');
        if (!engine) return;

        // High-Fidelity JSON Data Integration
        let offersData = [];
        const dataNode = document.getElementById('offers-data');
        if (dataNode) {
            try {
                offersData = JSON.parse(dataNode.textContent);
            } catch (e) { console.error("Strategic Data Parsing Failure:", e); }
        }

        const days = 30;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let html = '<div class="flex gap-4 pb-6 overflow-x-auto custom-scrollbar px-2 pt-2">';

        for (let i = 0; i < days; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + i);
            const isToday = i === 0;

            html += `
                <div class="min-w-[90px] flex flex-col items-center gap-5 p-5 rounded-[1.5rem] transition-all ${isToday ? 'border border-blue-200/60 bg-blue-50/20 shadow-sm' : 'border border-transparent hover:bg-slate-50'}">
                    <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">${date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span class="text-[1.75rem] leading-none font-display font-black text-navy-pro">${date.getDate()}</span>
                    
                    <div class="w-full flex justify-center mt-2">
                        ${this.getOfferMarkersFromData(date, offersData)}
                    </div>
                </div>
            `;
        }
        html += '</div>';
        engine.innerHTML = html;
    },

    getOfferMarkersFromData(date, offers) {
        let markers = '';
        offers.forEach(o => {
            const start = new Date(o.activation_date);
            const end = new Date(o.expiration_date);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);

            if (date >= start && date <= end) {
                markers += `
                    <div class="h-1.5 w-10 mx-auto rounded-full ${o.is_live ? 'bg-emerald-400' : 'bg-amber-400'} shadow-sm relative group/marker cursor-pointer" onclick="EnterpriseUI.showTimelineOverlay('${o.id}')">
                        <div class="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-navy-pro text-white text-[9px] font-black rounded-lg opacity-0 pointer-events-none group-hover/marker:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-50">
                            ${o.name}
                        </div>
                    </div>
                `;
            }
        });
        return markers;
    },

    applyFilters() {
        const query = document.getElementById('globalPortfolioSearch')?.value.toLowerCase() || '';
        const hotelId = document.getElementById('hotelFilterSelector')?.value || 'all';
        const cards = document.querySelectorAll('.offer-card-master');

        // Resolve which status filter is active
        const statusFilter = (this.currentView === 'live' || this.currentView === 'draft')
            ? this.currentView : null;

        let count = 0;
        cards.forEach(card => {
            const status = card.dataset.status;
            const cardHotelId = card.dataset.hotelId;
            const name = card.dataset.name;

            const statusMatch = !statusFilter || status === statusFilter;
            const hotelMatch = hotelId === 'all' || cardHotelId === hotelId;
            const searchMatch = !query || name.includes(query);

            if (statusMatch && hotelMatch && searchMatch) {
                card.classList.remove('strategic-hidden');
                card.style.removeProperty('display');   // let CSS handle display
                card.style.opacity = '1';
                card.style.animationDelay = `${count * 0.05}s`;
                count++;
            } else {
                card.classList.add('strategic-hidden');
                card.style.setProperty('display', 'none', 'important'); // bulletproof hide
            }
        });

        // Update the active-filter badge
        this._updateFilterBadge(statusFilter, count);
    },

    _updateFilterBadge(statusFilter, count) {
        const container = document.getElementById('offerPortfolioList');
        if (!container) return;

        let badge = document.getElementById('offers-filter-badge');

        if (!statusFilter) {
            // No active filter — remove badge if present
            if (badge) badge.remove();
            return;
        }

        const isLive = statusFilter === 'live';
        const label = isLive ? 'Live' : 'Draft';
        const colorCls = isLive
            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
            : 'bg-amber-50 text-amber-600 border-amber-200';
        const dotCls = isLive ? 'bg-emerald-500' : 'bg-amber-400';
        const pulseAttr = isLive ? ' animate-pulse' : '';

        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'offers-filter-badge';
            badge.style.cssText = 'margin-bottom:1.5rem;display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;';
            container.parentNode.insertBefore(badge, container);
        }

        badge.innerHTML = `
            <div class="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${colorCls}" style="transition:all 0.3s ease;">
                <span class="w-2 h-2 rounded-full ${dotCls}${pulseAttr}"></span>
                Filtering: ${label} Offers Only &mdash; ${count} result${count !== 1 ? 's' : ''}
                <button onclick="EnterpriseUI.switchView('${statusFilter}')" title="Clear filter"
                    style="margin-left:0.25rem;width:1.1rem;height:1.1rem;border-radius:50%;background:rgba(0,0,0,0.08);border:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:0.6rem;color:inherit;">
                    &times;
                </button>
            </div>
        `;
    },

    async toggleStatus(offerId) {
        const node = event.currentTarget;
        node.classList.add('opacity-50', 'pointer-events-none');

        try {
            const response = await fetch(`/offers/toggle/${offerId}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': this.getCookie('csrftoken') }
            });
            const data = await response.json();
            if (data.status === 'success') {
                node.classList.toggle('on', data.is_live);
                const card = node.closest('.offer-card-master');
                card.dataset.status = data.is_live ? 'live' : 'draft';

                // Update pulse color
                const pulse = card.querySelector('.rounded-full:not(.switch-handle)');
                pulse.className = `w-2 h-2 rounded-full ${data.is_live ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`;

                this.applyFilters();
                this.initCalendar(); // Refresh calendar view
            }
        } catch (err) { console.error("Strategic Toggling Failure:", err); }
        finally { node.classList.remove('opacity-50', 'pointer-events-none'); }
    },

    async showDetails(offerId) {
        const overlay = document.getElementById('usageDrilldownOverlay');
        const table = document.getElementById('usageDataTable');
        const title = document.getElementById('drilldownOfferName');

        overlay.classList.remove('hidden');
        table.innerHTML = `<tr><td colspan="5" class="py-20 text-center"><i class="fas fa-spinner fa-spin text-4xl text-navy-pro"></i></td></tr>`;

        try {
            const res = await fetch(`/api/offers/${offerId}/usage/`);
            const data = await res.json();

            if (data.status === 'success') {
                title.innerText = data.offer_name;
                table.innerHTML = data.usage_data.length ? data.usage_data.map(u => `
                    <tr class="bg-white/5 hover:bg-white/10 transition-colors">
                        <td class="py-6 pl-6">
                            <span class="block font-black text-white text-sm">${u.guest_name}</span>
                            <span class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">${u.guest_email}</span>
                        </td>
                        <td class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${u.room_type}</td>
                        <td class="text-[10px] font-black text-white uppercase tracking-widest">${u.check_in} — ${u.check_out}</td>
                        <td class="text-[10px] font-bold text-gold-pro tracking-[0.2em]">${u.reference}</td>
                        <td class="text-right pr-6">
                            <span class="text-lg font-display font-black text-emerald-500">₹${u.revenue}</span>
                        </td>
                    </tr>
                `).join('') : `<tr><td colspan="5" class="py-20 text-center text-slate-400 uppercase tracking-[0.2em] font-black">No consumption records found</td></tr>`;
            }
        } catch (err) { table.innerHTML = `<tr><td colspan="5" class="py-20 text-center text-rose-500">Node Synchronization Error</td></tr>`; }
    },

    hideDetails() {
        document.getElementById('usageDrilldownOverlay').classList.add('hidden');
    },

    async showRooms(offerId) {
        const overlay = document.getElementById('targetedRoomsOverlay');
        const list = document.getElementById('targetedRoomsList');
        const title = document.getElementById('roomsOfferName');

        overlay.classList.remove('hidden');
        list.innerHTML = `<div class="col-span-full py-20 text-center"><i class="fas fa-spinner fa-spin text-4xl text-navy-pro"></i></div>`;

        try {
            const res = await fetch(`/api/offers/${offerId}/rooms/`);
            const data = await res.json();

            if (data.status === 'success') {
                title.innerText = data.offer_name;
                list.innerHTML = data.rooms.length ? data.rooms.map(r => `
                    <div class="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-sm hover:shadow-xl transition-all flex gap-6 items-center group cursor-default">
                        <div class="w-24 h-24 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 relative">
                            ${r.image ? `<img src="${r.image}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `<div class="w-full h-full flex items-center justify-center text-slate-500"><i class="fas fa-bed text-3xl"></i></div>`}
                        </div>
                        <div class="space-y-2 flex-1">
                            <span class="text-[9px] font-black text-gold-pro uppercase tracking-widest">${r.hotel_name}</span>
                            <h4 class="text-lg font-display font-black text-white leading-tight">${r.name}</h4>
                            <div class="flex justify-between items-center pt-2">
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest"><i class="fas fa-user-friends mr-1"></i> MAX ${r.max_guests}</span>
                                <span class="text-sm font-black text-emerald-500">₹${r.base_price}</span>
                            </div>
                        </div>
                    </div>
                `).join('') : `<div class="col-span-full py-20 text-center text-slate-400 uppercase tracking-[0.2em] font-black">No targeted rooms found</div>`;
            } else {
                list.innerHTML = `<div class="col-span-full py-20 text-center text-rose-500">Failed to load rooms</div>`;
            }
        } catch (err) { list.innerHTML = `<div class="col-span-full py-20 text-center text-rose-500">Node Synchronization Error</div>`; }
    },

    hideRooms() {
        document.getElementById('targetedRoomsOverlay').classList.add('hidden');
    },

    // ==========================================
    // LIVE TIMELINE ENGINE (Temporal Overdrive)
    // ==========================================
    timelineInterval: null,

    showTimelineOverlay(targetOfferId = null) {
        const overlay = document.getElementById('globalTimelineOverlay');
        const list = document.getElementById('timelineOffersList');

        // Parse current data state
        let offersData = [];
        const dataNode = document.getElementById('offers-data');
        if (dataNode) {
            try { offersData = JSON.parse(dataNode.textContent); }
            catch (e) { console.error("Strategic Parsing Failure:", e); return; }
        }

        // Filter if specific offer requested
        if (targetOfferId) {
            offersData = offersData.filter(o => o.id.toString() === targetOfferId.toString());
        }

        overlay.classList.remove('hidden');

        if (offersData.length === 0) {
            list.innerHTML = `<div class="py-20 text-center font-black text-slate-300 uppercase tracking-widest">No temporal data available</div>`;
            return;
        }

        list.innerHTML = offersData.map(o => this.renderTimelineCard(o)).join('');

        // Ignite the Engine
        this.igniteTimelineEngine();
    },

    hideTimelineOverlay() {
        document.getElementById('globalTimelineOverlay').classList.add('hidden');
        if (this.timelineInterval) clearInterval(this.timelineInterval);
    },

    renderTimelineCard(offer) {
        const isLive = offer.is_live;
        // Start date parsing
        const startRaw = new Date(offer.activation_date);
        const startStr = startRaw.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // End date parsing
        const endRaw = new Date(offer.expiration_date);
        const endStr = endRaw.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        // To build the countdown, we inject data attributes into the nodes
        return `
            <div class="bg-slate-900/50 rounded-3xl p-8 border border-white/5 shadow-2xl backdrop-blur-md transition-all relative overflow-hidden group">
                <!-- Status Bar -->
                <div class="absolute top-0 left-0 w-1.5 h-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}"></div>
                
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pl-4">
                    <div class="space-y-4 flex-1">
                        <div class="flex items-center gap-3">
                            <span class="w-2.5 h-2.5 rounded-full ${isLive ? 'bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-amber-400'}"></span>
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">${isLive ? 'Active Protocol' : 'Staged Rollout'}</span>
                        </div>
                        <h4 class="text-3xl font-display font-black text-white tracking-tighter">${offer.name}</h4>
                        <div class="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl w-fit border border-white/5">
                            <i class="fas fa-calendar-alt text-slate-500"></i>
                            <span>${startStr} &mdash; ${endStr}</span>
                        </div>
                    </div>

                    <!-- Temporal Metrics Node -->
                    <div class="flex gap-4">
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 rounded-2xl bg-slate-800/50 text-white flex items-center justify-center text-2xl font-display font-black border border-white/10 shadow-lg temporal-node" data-target="${offer.expiration_date}" data-unit="days">00</div>
                            <span class="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Days</span>
                        </div>
                        <div class="text-2xl font-black text-white/10 mt-4">:</div>
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 rounded-2xl bg-slate-800/50 text-white flex items-center justify-center text-2xl font-display font-black border border-white/10 shadow-sm temporal-node" data-target="${offer.expiration_date}" data-unit="hours">00</div>
                            <span class="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Hrs</span>
                        </div>
                        <div class="text-2xl font-black text-white/10 mt-4">:</div>
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 rounded-2xl bg-slate-800/50 text-white flex items-center justify-center text-2xl font-display font-black border border-white/10 shadow-sm temporal-node" data-target="${offer.expiration_date}" data-unit="minutes">00</div>
                            <span class="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Min</span>
                        </div>
                        <div class="text-2xl font-black text-white/10 mt-4">:</div>
                        <div class="flex flex-col items-center">
                            <div class="w-16 h-16 rounded-2xl bg-slate-900/80 border-2 border-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-display font-black shadow-sm temporal-node" data-target="${offer.expiration_date}" data-unit="seconds">00</div>
                            <span class="mt-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">Sec</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    igniteTimelineEngine() {
        if (this.timelineInterval) clearInterval(this.timelineInterval);

        const updateNodes = () => {
            const now = new Date().getTime();
            document.querySelectorAll('.temporal-node').forEach(node => {
                const targetStr = node.dataset.target;
                const unit = node.dataset.unit;
                if (!targetStr) return;

                // For accuracy, we expect ISO strings, but backend might supply YYYY-MM-DD
                let targetDate = new Date(targetStr);
                // If it's just a date without time, we assume expiration is at end of day
                if (targetStr.length === 10) {
                    targetDate.setHours(23, 59, 59, 999);
                }

                const distance = targetDate.getTime() - now;

                if (distance < 0) {
                    node.innerText = "00";
                    return;
                }

                let value = 0;
                switch (unit) {
                    case 'days':
                        value = Math.floor(distance / (1000 * 60 * 60 * 24));
                        break;
                    case 'hours':
                        value = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        break;
                    case 'minutes':
                        value = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        break;
                    case 'seconds':
                        value = Math.floor((distance % (1000 * 60)) / 1000);
                        break;
                }

                // Format with leading zero
                node.innerText = value < 10 ? '0' + value : value;
            });
        };

        // Run immediately then loop
        updateNodes();
        this.timelineInterval = setInterval(updateNodes, 1000);
    },

    async deleteStrategy(offerId) {
        if (!confirm("STRATEGIC DECOMMISSION: Are you sure?")) return;
        try {
            const res = await fetch(`/offers/delete/${offerId}/`, {
                method: 'POST',
                headers: { 'X-CSRFToken': this.getCookie('csrftoken') }
            });
            const data = await res.json();
            if (data.status === 'success') location.reload();
        } catch (err) { console.error(err); }
    },

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};

/* ── Offers Dual View Controller ─────────────────────── */
const OffersViewCtrl = (function() {
    const STORAGE_KEY = 'hotelpro_offers_view';
    
    function setView(view, animate) {
        const list = document.getElementById('offerPortfolioList');
        const gridBtn = document.getElementById('offers-grid-btn');
        const listBtn = document.getElementById('offers-list-btn');
        if (!list || !gridBtn || !listBtn) return;

        const cards = list.querySelectorAll('.offer-card-master');

        if (view === 'list') {
            list.classList.add('offers-list-mode');
            list.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3', 'gap-12');
            listBtn.classList.add('active');
            gridBtn.classList.remove('active');
        } else {
            list.classList.remove('offers-list-mode');
            list.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'xl:grid-cols-3', 'gap-12');
            gridBtn.classList.add('active');
            listBtn.classList.remove('active');
        }

        localStorage.setItem(STORAGE_KEY, view);

        // Re-apply status filter so hidden cards stay hidden in new view mode
        if (typeof EnterpriseUI !== 'undefined') {
            EnterpriseUI.applyFilters();
        }

        // Re-trigger entrance animations only on visible cards
        if (animate) {
            cards.forEach(function(c) {
                if (!c.classList.contains('strategic-hidden')) {
                    c.style.animation = 'none';
                    void c.offsetWidth;
                    c.style.animation = '';
                }
            });
        }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
        if (e.key === 'g' || e.key === 'G') setView('grid', true);
        if (e.key === 'l' || e.key === 'L') setView('list', true);
    });

    return {
        init: function() {
            const gridBtn = document.getElementById('offers-grid-btn');
            const listBtn = document.getElementById('offers-list-btn');
            if (gridBtn) gridBtn.addEventListener('click', function() { setView('grid', true); });
            if (listBtn) listBtn.addEventListener('click', function() { setView('list', true); });

            // Initialise from localStorage
            var saved = localStorage.getItem(STORAGE_KEY) || 'grid';
            setView(saved, false);
        },
        setView: setView
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    EnterpriseUI.init();
    OffersViewCtrl.init();
});
