/**
 * reviews_dynamic.js
 * Advanced Client-Side Rendering Engine for the Reviews Dashboard.
 * Supports dynamic hotel filtering, dual view modes, and inline Booking Intelligence.
 */

document.addEventListener('DOMContentLoaded', () => {

    const ds = {
        hotelSelector: document.getElementById('hotel-selector'),
        container: document.getElementById('reviews-dynamic-container'),
        searchInput: document.getElementById('review-neural-search'),

        // Metrics
        statAvg: document.getElementById('stat-avg-rating'),
        statFeedback: document.getElementById('stat-total-feedback'),
        statService: document.getElementById('stat-service'),
        statFood: document.getElementById('stat-food'),
        statRoom: document.getElementById('stat-room'),
        statCheckin: document.getElementById('stat-checkin'),

        // View Switches
        viewGridBtn: document.getElementById('view-grid-btn'),
        viewListBtn: document.getElementById('view-list-btn')
    };

    // 2. State Management Engine
    const urlParams = new URLSearchParams(window.location.search);
    const initialHotelId = urlParams.get('hotelId') || (ds.hotelSelector ? ds.hotelSelector.value : 'all');

    let state = {
        hotelId: initialHotelId,
        viewMode: 'grid', // 'grid' | 'list'
        data: null,       // Stores raw JSON hydration
        isFetching: false,
        searchQuery: ''
    };

    // 3. Initialization Protocol
    init();

    function init() {
        if (!ds.container) return; // Prevent crashes on missing mounts

        // Sync selector with initial state if needed
        if (ds.hotelSelector && ds.hotelSelector.value !== state.hotelId) {
            ds.hotelSelector.value = state.hotelId;
        }

        // Zenith Orchestrator Initialization
        if (typeof ZenithSelector !== 'undefined') {
            new ZenithSelector('hotel-selector', {
                placeholder: 'Property Management...',
                icon: 'fa-building'
            });
        } else {
            console.warn('ZenithSelector engine missing. Falling back to native.');
            if (ds.hotelSelector) ds.hotelSelector.classList.remove('hidden');
        }

        // Bind Selectors
        if (ds.hotelSelector) {
            ds.hotelSelector.addEventListener('change', (e) => {
                state.hotelId = e.target.value;
                // Update URL without reload for professional persistence
                const newUrl = new URL(window.location);
                newUrl.searchParams.set('hotelId', state.hotelId);
                window.history.pushState({}, '', newUrl);
                
                fetchReviewsData();
            });
        }

        // Bind Search
        if (ds.searchInput) {
            ds.searchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value.toLowerCase();
                renderUI(); // Re-render with local filter
            });
        }

        // Bind Controls
        if (ds.viewGridBtn && ds.viewListBtn) {
            ds.viewGridBtn.addEventListener('click', () => setViewMode('grid'));
            ds.viewListBtn.addEventListener('click', () => setViewMode('list'));
        }

        // Add custom animations
        injectAnimations();

        // Initial Data Hydration
        fetchReviewsData();
    }

    // 4. View Controller
    function setViewMode(mode) {
        if (state.viewMode === mode) return;
        state.viewMode = mode;

        ds.viewGridBtn.classList.toggle('is-active', mode === 'grid');
        ds.viewGridBtn.classList.toggle('text-emerald-400', mode === 'grid');

        ds.viewListBtn.classList.toggle('is-active', mode === 'list');
        ds.viewListBtn.classList.toggle('text-emerald-400', mode === 'list');

        renderUI();
    }

    // 5. API Communications
    async function fetchReviewsData() {
        if (state.isFetching) return;
        state.isFetching = true;

        renderSkeleton();

        try {
            const response = await fetch(`/api/reviews/?hotelId=${state.hotelId}`);
            const json = await response.json();

            if (response.ok && json.status === 'success') {
                state.data = json;
                updateMetrics(json.stats);
                renderUI();
            } else {
                renderError(json.message || "Failed to load review data.");
            }
        } catch (error) {
            console.error("Reviews Sync Error:", error);
            renderError("Network protocol failure. Please verify connection.");
        } finally {
            state.isFetching = false;
        }
    }

    // 6. Metrics Binder
    function updateMetrics(stats) {
        if (!stats) return;

        const safeFloat = (val) => isNaN(parseFloat(val)) ? "0.0" : parseFloat(val).toFixed(1);

        if (ds.statAvg) ds.statAvg.innerHTML = safeFloat(stats.avg_rating);
        if (ds.statFeedback) ds.statFeedback.innerHTML = `${stats.total_feedback} Record${stats.total_feedback !== 1 ? 's' : ''}`;

        if (ds.statService) ds.statService.innerHTML = stats.service_quality || "0%";
        if (ds.statFood) ds.statFood.innerHTML = stats.food_dining || "0%";
        if (ds.statRoom) ds.statRoom.innerHTML = stats.room_details || "0%";
        if (ds.statCheckin) ds.statCheckin.innerHTML = stats.checkin_process || "0%";
    }

    // 7. Core Render Loop
    function renderUI() {
        if (!state.data || !state.data.data || !state.data.data.hotels) return;
        const hotels = state.data.data.hotels;

        ds.container.innerHTML = '';

        if (hotels.length === 0) {
            renderEmptyState();
            return;
        }

        let delayCounter = 0;

        hotels.forEach(hotel => {
            // Local Filtering Logic (Neural Search)
            let filteredReviews = hotel.reviews;
            if (state.searchQuery) {
                filteredReviews = hotel.reviews.filter(r => 
                    r.guest_name.toLowerCase().includes(state.searchQuery) ||
                    r.comment.toLowerCase().includes(state.searchQuery)
                );
            }

            if (filteredReviews.length === 0) return;

            // Group Header (Global Mode)
            if (state.hotelId === 'all') {
                const header = document.createElement('div');
                header.className = `flex items-center justify-between mb-8 mt-12 pb-4 border-b border-white/5 pl-4 slide-up-fade`;
                header.style.animationDelay = `${delayCounter++ * 0.05}s`;
                header.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-emerald-400">
                            <i class="fas fa-building text-sm"></i>
                        </div>
                        <h4 class="text-xl font-display font-bold text-white tracking-tight">${hotel.name}</h4>
                    </div>
                    <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                        ${hotel.active_count} Review${hotel.active_count !== 1 ? 's' : ''}
                    </span>
                `;
                ds.container.appendChild(header);
            }

            // Reviews Wrapper
            const layoutWrapper = document.createElement('div');
            layoutWrapper.className = state.viewMode === 'grid'
                ? 'grid grid-cols-1 gap-8' // Single col because the cards are horizontal dual-pane
                : 'flex flex-col gap-4';

            filteredReviews.forEach(review => {
                const card = state.viewMode === 'grid'
                    ? createGridCard(review, hotel.id)
                    : createListCard(review, hotel.id);

                card.style.animationDelay = `${delayCounter++ * 0.05}s`;
                layoutWrapper.appendChild(card);
            });

            ds.container.appendChild(layoutWrapper);

            // Expansion Trigger
            if (hotel.has_more) {
                const moreWrapper = document.createElement('div');
                moreWrapper.className = 'flex justify-center mt-10 w-full slide-up-fade';
                moreWrapper.style.animationDelay = `${delayCounter++ * 0.05}s`;
                moreWrapper.innerHTML = `
                    <a href="/reviews/?hotelId=${hotel.id}" class="px-8 py-3 rounded-full bg-white/5 text-slate-300 text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 transition-all border border-white/10 flex items-center gap-3 group">
                        Load Complete Archive
                        <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </a>
                `;
                ds.container.appendChild(moreWrapper);
            }
        });

        // Re-bind window functions for AI Reply specifically for this dynamic context
        window.generateAIReply = async function (hotelId, reviewId) {
            const btn = document.getElementById(`ai-reply-btn-${reviewId}`);
            const responseBox = document.getElementById(`ai-response-box-${reviewId}`);
            const responseText = document.getElementById(`ai-response-text-${reviewId}`);

            if (!btn || !responseBox || !responseText) return;

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

            try {
                const response = await fetch(`/api/ai/${hotelId}/review-response/${reviewId}/`);
                const data = await response.json();

                if (data.status === 'success') {
                    responseText.innerText = data.response;
                    responseBox.classList.remove('hidden');
                } else {
                    alert('AI Generation failed: ' + data.message);
                }
            } catch (err) {
                alert('Connection error resolving AI Node.');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-magic"></i> AI Reply';
            }
        };

        window.copyResponse = function (reviewId) {
            const textElement = document.getElementById(`ai-response-text-${reviewId}`);
            if (!textElement) return;
            navigator.clipboard.writeText(textElement.innerText);

            const copyBtn = document.getElementById(`copy-btn-${reviewId}`);
            if (copyBtn) {
                const oldText = copyBtn.innerText;
                copyBtn.innerText = "Copied!";
                setTimeout(() => copyBtn.innerText = oldText, 2000);
            }
        };
    }

    // 8. Grid Card Builder (Includes Booking Intel)
    function createGridCard(review, hotelId) {
        const div = document.createElement('div');
        div.className = "executive-card p-12 rounded-[2.5rem] bg-white/5 border border-white/5 transition-all duration-700 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.4)] group/card backdrop-blur-xl hover:-translate-y-1 slide-up-fade relative overflow-hidden";

        // Setup Stars
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="${i <= review.rating ? 'fas' : 'far'} fa-star text-[10px]"></i>`;
        }

        // Construct Initial Check
        const initial = (review.guest_name && review.guest_name.length > 0) ? review.guest_name.charAt(0).toUpperCase() : '?';

        // 🌟 BOOKING INTELLIGENCE BLOCK 🌟
        let bookingIntelHtml = '';
        if (review.booking_info) {
            bookingIntelHtml = `
                <div class="mt-6 p-6 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                            <i class="fas fa-bed text-sm"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Authentic Booking Source</p>
                            <p class="text-sm font-semibold text-slate-300">${review.booking_info.room_category} Room &middot; <span class="text-slate-500">${review.booking_info.nights} Night${review.booking_info.nights !== 1 ? 's' : ''}</span></p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="text-xs font-medium text-slate-400">${review.booking_info.check_in} &rarr; ${review.booking_info.check_out}</p>
                    </div>
                </div>
            `;
        }

        // Action Hub & AI Container
        const aiResponseBlock = `
            <div id="ai-response-box-${review.id}" class="hidden mt-6 p-8 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 relative group/response animate-in fade-in slide-in-from-top-4">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest">AI Generated Draft</span>
                    <button id="copy-btn-${review.id}" onclick="copyResponse('${review.id}')" class="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors">Copy</button>
                </div>
                <p id="ai-response-text-${review.id}" class="text-xs text-slate-700 leading-relaxed italic"></p>
            </div>
        `;

        div.innerHTML = `
            <div class="flex flex-col xl:flex-row gap-12 relative z-10">
                <!-- Identity Block -->
                <div class="identity-block flex flex-col items-center xl:items-start text-center xl:text-left shrink-0 xl:w-48">
                    <div class="w-20 h-20 rounded-[1.75rem] bg-primary-600/20 border border-primary-500/30 text-primary-400 flex items-center justify-center text-3xl font-display font-bold shadow-2xl group-hover/card:scale-110 group-hover/card:bg-primary-600 group-hover/card:text-white transition-all duration-700 mb-6">
                        ${initial}
                    </div>
                    <div>
                        <h5 class="text-lg font-bold text-white mb-1">${review.guest_name}</h5>
                        <p class="text-[10px] font-bold ${review.booking_info ? 'text-emerald-400' : 'text-slate-500'} uppercase tracking-widest italic leading-none mb-6">
                            ${review.booking_info ? '<i class="fas fa-check-circle mr-1"></i> Verified Stay' : 'Guest'}
                        </p>
                        <div class="flex items-center justify-center xl:justify-start gap-1 text-amber-500 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 max-w-max mx-auto xl:mx-0">
                            ${starsHtml}
                        </div>
                    </div>
                </div>

                <!-- Content Block -->
                <div class="content-orchestration flex-1 space-y-6">
                    <div class="flex items-center justify-between border-b border-white/5 pb-4">
                        <span class="text-[11px] font-bold text-primary-400 uppercase tracking-widest">Guest Experience</span>
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">${review.created_at}</span>
                    </div>
                    
                    <p class="text-lg md:text-xl text-slate-200 font-display font-medium leading-relaxed italic opacity-90">
                        "${review.comment}"
                    </p>

                    ${bookingIntelHtml}

                    <div class="flex flex-wrap items-center gap-6 pt-6">
                        <button onclick="generateAIReply('${hotelId}', '${review.id}')" id="ai-reply-btn-${review.id}" class="px-8 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-500 hover:text-white transition-all active:scale-95 border border-indigo-500/20 flex items-center gap-2">
                            <i class="fas fa-magic"></i> Draft AI Reply
                        </button>
                        <button class="px-8 py-3 rounded-xl bg-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all active:scale-95 border border-white/5">
                            Reply
                        </button>
                    </div>
                    
                    ${aiResponseBlock}
                </div>
            </div>
        `;
        return div;
    }

    // 9. List Row Builder
    function createListCard(review, hotelId) {
        const div = document.createElement('div');
        div.className = "flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-all slide-up-fade gap-6";

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<i class="${i <= review.rating ? 'fas' : 'far'} fa-star text-[10px]"></i>`;
        }

        const sourceLabel = review.booking_info
            ? `<span class="bg-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ml-3 " title="${review.booking_info.room_category} Room">Verified</span>`
            : '';

        div.innerHTML = `
            <div class="flex items-center gap-5 min-w-[250px] shrink-0">
                <div class="w-12 h-12 rounded-xl bg-primary-600/20 border border-primary-500/30 text-primary-400 flex items-center justify-center font-display font-bold">
                    ${review.guest_name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h5 class="text-sm font-bold text-white flex items-center">${review.guest_name} ${sourceLabel}</h5>
                    <div class="flex items-center gap-1 text-amber-500 mt-1">
                        ${starsHtml}
                    </div>
                </div>
            </div>
            
            <div class="flex-1 truncate md:px-6">
                <p class="text-xs md:text-sm text-slate-300 italic truncate" title="${review.comment}">"${review.comment}"</p>
                ${review.booking_info ? `<p class="text-[10px] text-indigo-400 mt-1 uppercase tracking-widest"><i class="fas fa-bed mr-1"></i> ${review.booking_info.room_category} &middot; ${review.booking_info.nights} Nights</p>` : ''}
            </div>
            
            <div class="flex items-center gap-6 shrink-0 md:pl-6 md:border-l border-white/10">
                <div class="text-right hidden xl:block">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">${review.created_at}</p>
                </div>
                <button onclick="generateAIReply('${hotelId}', '${review.id}')" id="ai-reply-btn-${review.id}" class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-colors" title="AI Reply">
                    <i class="fas fa-magic"></i>
                </button>
            </div>
        `;
        return div;
    }

    // 10. UX States: Empty & Skeleton & Error
    function renderEmptyState() {
        ds.container.innerHTML = `
            <div class="py-32 text-center bg-slate-500/5 rounded-[3rem] border border-dashed border-white/10 slide-up-fade">
                <div class="flex flex-col items-center opacity-60">
                    <div class="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-8 mx-auto shadow-inner">
                        <i class="fas fa-comment-slash text-4xl"></i>
                    </div>
                    <h4 class="text-2xl font-display font-bold text-white mb-3 tracking-tight">No Reviews Found</h4>
                    <p class="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Ensure filters are cleared or await guest feedback.</p>
                </div>
            </div>
        `;
    }

    function renderSkeleton() {
        let html = '';
        for (let i = 0; i < 3; i++) {
            html += `
                <div class="executive-card p-12 rounded-[2.5rem] bg-white/5 border border-white/5 animate-pulse mb-8">
                    <div class="flex flex-col xl:flex-row gap-12">
                        <div class="identity-block flex flex-col items-center xl:items-start shrink-0 xl:w-48">
                            <div class="w-20 h-20 rounded-[1.75rem] bg-white/10 mb-6"></div>
                            <div class="w-24 h-4 bg-white/10 rounded-full mb-4"></div>
                            <div class="w-16 h-2 bg-white/10 rounded-full"></div>
                        </div>
                        <div class="content flex-1 space-y-6">
                            <div class="flex justify-between border-b border-white/5 pb-4">
                                <div class="w-32 h-3 bg-white/10 rounded-full"></div>
                                <div class="w-24 h-3 bg-white/10 rounded-full"></div>
                            </div>
                            <div class="w-full h-4 bg-white/10 rounded-full"></div>
                            <div class="w-3/4 h-4 bg-white/10 rounded-full"></div>
                            <div class="flex gap-4 pt-6">
                                <div class="w-32 h-10 bg-white/10 rounded-xl"></div>
                                <div class="w-24 h-10 bg-white/10 rounded-xl"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        ds.container.innerHTML = html;
    }

    function renderError(message) {
        ds.container.innerHTML = `
            <div class="py-24 text-center bg-rose-500/5 rounded-[3rem] border border-rose-500/20 slide-up-fade">
                <div class="flex flex-col items-center">
                    <div class="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/10">
                        <i class="fas fa-exclamation-triangle text-2xl"></i>
                    </div>
                    <h4 class="text-xl font-bold text-white mb-2 tracking-tight">System Error</h4>
                    <p class="text-xs text-rose-300/80 mb-8 max-w-sm mx-auto">${message}</p>
                    <button onclick="location.reload()" class="px-8 py-3 rounded-full bg-rose-500 text-white text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">
                        Attempt Recovery
                    </button>
                </div>
            </div>
        `;
    }

    // 11. CSS Injector Built-In
    function injectAnimations() {
        if (!document.getElementById('reviews-view-animations')) {
            const style = document.createElement('style');
            style.id = 'reviews-view-animations';
            style.textContent = `
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(20px) scale(0.98); filter: blur(4px); }
                    100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
                }
                .slide-up-fade {
                    animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    opacity: 0;
                }
            `;
            document.head.appendChild(style);
        }
    }
});
