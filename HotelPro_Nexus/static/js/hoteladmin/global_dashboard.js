/* ══ Global Dashboard Interactive Engine (v28.0) ══ */

document.addEventListener('DOMContentLoaded', () => {
    const metricCards = document.querySelectorAll('[data-metric-id]');
    const insightConsole = document.getElementById('metricInsightConsole');
    const insightContent = document.getElementById('insightContent');
    const insightTitle = document.getElementById('insightTitle');
    const insightSubtitle = document.getElementById('insightSubtitle');
    const insightIcon = document.getElementById('insightIcon');

    const metricData = {
        revenue: {
            title: 'Revenue Stream Intelligence',
            subtitle: 'Aggregate Financial Breakdown',
            icon: 'fa-chart-line',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enterprise Yield Velocity</span>
                    <div class="flex items-end gap-2 h-20 px-2">
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 45%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">Q1 · ₹1.2M</div></div>
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 75%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">Q2 · ₹2.8M</div></div>
                        <div class="flex-1 bg-emerald-600 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 95%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">Peak · ₹4.2M</div></div>
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 60%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">Q4 · ₹2.1M</div></div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Portfolio Allocation</span>
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-slate-600">Room Inventory Node</span>
                            <span class="text-[10px] font-black text-emerald-600">82% Share</span>
                        </div>
                        <div class="h-1.5 bg-white rounded-full overflow-hidden border border-slate-100">
                            <div class="h-full bg-emerald-500 w-[82%] shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                        </div>
                    </div>
                </div>
                <div class="space-y-2">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Growth Forecast</span>
                    <p class="text-3xl font-display font-bold text-slate-900 tracking-tighter">₹8.4M <span class="text-[10px] text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg ml-2">+14.2% YoY</span></p>
                </div>
            `
        },
        capacity: {
            title: 'Network Capacity Matrix',
            subtitle: 'Operational Node Deployment',
            icon: 'fa-building',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deployment Mix</span>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50">
                            <h5 class="text-lg font-display font-bold text-emerald-900">72%</h5>
                            <p class="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Live Active</p>
                        </div>
                        <div class="p-4 rounded-2xl bg-amber-50 border border-amber-100/50">
                            <h5 class="text-lg font-display font-bold text-amber-900">12%</h5>
                            <p class="text-[9px] font-bold text-amber-600 uppercase tracking-widest">In Audit</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lifecycle Distribution</span>
                    <div class="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group/chart">
                        <div class="flex gap-1 h-3">
                            <div class="flex-[72] bg-emerald-500 rounded-full"></div>
                            <div class="flex-[12] bg-amber-500 rounded-full"></div>
                            <div class="flex-[16] bg-slate-200 rounded-full"></div>
                        </div>
                        <div class="mt-4 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Live</span>
                            <span>Audit</span>
                            <span>Draft</span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-3 p-4 rounded-2xl bg-slate-900 text-white shadow-xl">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-[10px] font-black uppercase tracking-[0.2em]">System Health: Nominal</span>
                </div>
            `
        },
        bookings: {
            title: 'Reservation Density Hub',
            subtitle: 'Channel Flow Synchronicity',
            icon: 'fa-calendar-check',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inbound Channel Load</span>
                    <div class="flex items-center gap-6">
                        <div class="flex-1 space-y-3">
                            <div class="flex justify-between text-[10px] font-bold"><span>Direct Hub</span><span>42%</span></div>
                            <div class="h-1.5 bg-slate-100 rounded-full"><div class="h-full bg-indigo-500 w-[42%]"></div></div>
                            <div class="flex justify-between text-[10px] font-bold"><span>OTA Network</span><span>58%</span></div>
                            <div class="h-1.5 bg-slate-100 rounded-full"><div class="h-full bg-slate-400 w-[58%]"></div></div>
                        </div>
                        <div class="w-24 h-24 rounded-full border-[6px] border-slate-100 flex items-center justify-center relative">
                            <div class="absolute inset-0 border-[6px] border-indigo-500 rounded-full clip-path-half"></div>
                            <div class="text-center">
                                <span class="text-xl font-display font-bold text-slate-900 leading-none">9.4</span>
                                <p class="text-[7px] font-black text-slate-400 uppercase">MVI</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="space-y-2">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Next Peak Cycle</span>
                    <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                        <span class="text-[11px] font-bold text-slate-700">Extended Weekend Solar</span>
                        <span class="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Projected</span>
                    </div>
                </div>
            `
        },
        audit: {
            title: 'Compliance & Verification',
            subtitle: 'Enterprise Security Protocol',
            icon: 'fa-shield-halved',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Pipeline Velocity</span>
                    <div class="space-y-4">
                        <div class="flex items-center gap-4 relative">
                            <div class="absolute left-1.5 top-2 bottom-0 w-0.5 bg-slate-100"></div>
                            <div class="w-3 h-3 rounded-full bg-emerald-500 border-4 border-white shadow-sm relative z-10"></div>
                            <span class="text-[11px] font-bold text-slate-600">Document Registry Layer</span>
                        </div>
                        <div class="flex items-center gap-4 relative">
                            <div class="absolute left-1.5 top-0 bottom-0 w-0.5 bg-slate-100"></div>
                            <div class="w-3 h-3 rounded-full bg-amber-500 border-4 border-white shadow-sm relative z-10 animate-pulse"></div>
                            <span class="text-[11px] font-bold text-slate-900">Safety Verification Node</span>
                        </div>
                        <div class="flex items-center gap-4">
                            <div class="w-3 h-3 rounded-full bg-slate-200 border-4 border-white shadow-sm relative z-10"></div>
                            <span class="text-[11px] font-bold text-slate-400 italic">Final Executive Auth</span>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-5 rounded-[2rem] bg-slate-50 border border-slate-100 text-center">
                        <h4 class="text-2xl font-display font-bold text-slate-900">4.2</h4>
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avg Clearance</p>
                    </div>
                    <div class="p-5 rounded-[2rem] bg-blue-600 text-white shadow-xl text-center">
                        <i class="fas fa-lock text-sm mb-2 text-white/50"></i>
                        <p class="text-[9px] font-black uppercase tracking-widest">Secure Node</p>
                    </div>
                </div>
            `
        }
    };

    metricCards.forEach(card => {
        card.addEventListener('click', () => {
            const metricId = card.getAttribute('data-metric-id');
            const data = metricData[metricId];

            if (!data) return;

            // Hide property console if open
            if (propertyConsole) propertyConsole.classList.add('hidden');
            hotelCards.forEach(c => c.classList.remove('selected-card-prism'));

            // Update Selection UI
            metricCards.forEach(c => c.classList.remove('selected-card-prism'));
            card.classList.add('selected-card-prism');

            // Update Insight Console
            insightTitle.textContent = data.title;
            insightSubtitle.textContent = data.subtitle;
            insightIcon.innerHTML = `<i class="fas ${data.icon}"></i>`;
            insightContent.innerHTML = data.content;

            // Reveal Console
            insightConsole.classList.remove('hidden');
            
            // Kinetic scroll to console
            insightConsole.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // Initialize Enterprise Performance Spectrum (v32.2)
    const initSpectrumChart = () => {
        const bars = document.querySelectorAll('.spectrum-bar');
        bars.forEach((bar, index) => {
            const height = bar.dataset.nodeHeight || '0';
            setTimeout(() => {
                bar.style.height = `${height}%`;
                bar.classList.add('animate-in', 'fade-in', 'slide-in-from-bottom', 'duration-1000');
            }, index * 100);
        });
    };

    initSpectrumChart();

    // ══ Property Selection Engine (v30.0) ══
    const hotelCards = document.querySelectorAll('[data-hotel-node-id]');
    const propertyConsole = document.getElementById('propertyInsightConsole');
    const propTitle = document.getElementById('propTitle');
    const propLocation = document.getElementById('propLocation');
    const propTag = document.getElementById('propTag');
    const propCommandLink = document.getElementById('propCommandLink');
    const propInsightContent = document.getElementById('propInsightContent');

    hotelCards.forEach(card => {
        card.addEventListener('click', () => {
            const hotelId = card.getAttribute('data-hotel-node-id');
            const hotelName = card.querySelector('h4').textContent;
            const hotelLocation = card.querySelector('.flex.items-center.gap-2 span').textContent;
            const hotelStatus = card.querySelector('.px-3.py-1').textContent;

            // Update Selection UI
            metricCards.forEach(c => c.classList.remove('selected-card-prism'));
            if (insightConsole) insightConsole.classList.add('hidden');
            
            hotelCards.forEach(c => c.classList.remove('selected-card-prism'));
            card.classList.add('selected-card-prism');

            // Update Property Insight Console
            propTitle.textContent = hotelName;
            propLocation.textContent = `Registry ID #${hotelId.padStart(4, '0')} · ${hotelLocation}`;
            propTag.textContent = hotelStatus;
            propCommandLink.href = `/dashboard/${hotelId}/`;

            // Mocked Professional Property Stats
            propInsightContent.innerHTML = `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Velocity (Node)</span>
                    <div class="p-6 rounded-3xl bg-emerald-50 border border-emerald-100/50 relative overflow-hidden group/revenue">
                        <div class="absolute right-0 top-0 p-4 opacity-10 group-hover/revenue:opacity-20 transition-opacity">
                            <i class="fas fa-chart-line text-4xl text-emerald-600"></i>
                        </div>
                        <h5 class="text-3xl font-display font-bold text-emerald-900 tracking-tighter">₹${(Math.random() * 50000 + 10000).toFixed(0)}</h5>
                        <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Live Yield · <span class="text-emerald-400">+8.4%</span></p>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Occupancy Flow Matrix</span>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-5 rounded-2xl bg-blue-50 border border-blue-100/50">
                            <h5 class="text-2xl font-display font-bold text-blue-900">${(Math.random() * 40 + 60).toFixed(0)}%</h5>
                            <p class="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Live Density</p>
                        </div>
                        <div class="p-5 rounded-2xl bg-slate-900 text-white shadow-xl relative overflow-hidden group/rank">
                            <div class="flex items-center gap-1 text-amber-500 mb-1 scale-75 origin-left">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star-half-alt"></i>
                            </div>
                            <h5 class="text-[14px] font-bold group-hover/rank:text-primary-400 transition-colors">Elite Tier</h5>
                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rank #12</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Distribution Nodes</span>
                    <div class="flex items-center gap-3">
                        <div class="flex -space-x-3">
                            <div class="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 hover:z-10 transition-all hover:scale-110 cursor-pointer">G</div>
                            <div class="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 hover:z-10 transition-all hover:scale-110 cursor-pointer">B</div>
                            <div class="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-slate-400 hover:z-10 transition-all hover:scale-110 cursor-pointer">A</div>
                        </div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">3 Active Channels</span>
                    </div>
                </div>
            `;

            // Reveal Console
            propertyConsole.classList.remove('hidden');
            
            // Kinetic scroll to console
            propertyConsole.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    // Zenith Ultra - Dynamic Interaction Protocol
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

async function syncPortfolioIntel() {
    const btn = document.getElementById('generatePortfolioIntel');
    const container = document.getElementById('portfolioAISentinelContent');
    const hotelCount = btn.getAttribute('data-hotel-count') || '0';
    const originalBtnHtml = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Synchronizing Registry...`;
    container.innerHTML = `
        <div class="p-8 rounded-3xl bg-white/5 border border-white/5 flex items-center gap-6">
            <div class="w-12 h-12 rounded-full border-2 border-primary-500 border-t-transparent animate-spin"></div>
            <div>
                <p class="text-[12px] font-bold text-white">AI Sentinel Analyzing Portfolio Nodes...</p>
                <p id="aiStatus" class="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-black">Scanning 0/${hotelCount} Properties</p>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/ai/portfolio/insights/');
        const data = await response.json();

        if (data.status === 'success') {
            const insights = data.insights;
            let htmlContent = '';
            
            if (insights.top_node && insights.weak_node) {
                htmlContent += `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div class="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 group/insight">
                            <span class="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3 block">Top-Performing Node</span>
                            <h4 class="text-xl font-display font-bold text-white mb-2">${insights.top_node.name || 'Core Property'}</h4>
                            <p class="text-[12px] text-slate-400 leading-relaxed">${insights.top_node.reason || 'Optimal yield density and reputation velocity.'}</p>
                        </div>
                        <div class="p-8 rounded-3xl bg-rose-500/5 border border-rose-500/20 group/insight">
                            <span class="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] mb-3 block">Opportunity Node</span>
                            <h4 class="text-xl font-display font-bold text-white mb-2">${insights.weak_node.name || 'Growth Property'}</h4>
                            <p class="text-[12px] text-slate-400 leading-relaxed">${insights.weak_node.fix || 'Optimize pricing strategy for current market conditions.'}</p>
                        </div>
                    </div>
                `;
            }
            
            htmlContent += `
                <div class="p-8 rounded-[2rem] bg-primary-600/5 border border-primary-600/20 mt-6 group/strategy">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm shadow-lg">
                            <i class="fas fa-shield-cat"></i>
                        </div>
                        <span class="text-[10px] font-black text-white uppercase tracking-[0.2em]">Strategic Directives</span>
                    </div>
                    <p class="text-[13px] text-slate-300 leading-relaxed font-medium">${insights.strategy || 'Maintain current trajectory and optimize high-yield nodes.'}</p>
                </div>
            `;
            
            container.innerHTML = htmlContent;
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        container.innerHTML = `
            <div class="p-8 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <p class="text-sm font-bold">Protocol Interrupted: ${error.message}</p>
                <p class="text-[11px] mt-2 opacity-70">Check system logs or connectivity to AI services.</p>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }
}
