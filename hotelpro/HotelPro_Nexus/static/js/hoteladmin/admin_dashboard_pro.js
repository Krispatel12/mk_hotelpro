/* ══ Live Dashboard Interactive Engine (v29.0) ══ */

document.addEventListener('DOMContentLoaded', () => {
    const metricCards = document.querySelectorAll('[data-metric-id]');
    const insightConsole = document.getElementById('metricInsightConsole');
    const insightContent = document.getElementById('insightContent');
    const insightTitle = document.getElementById('insightTitle');
    const insightSubtitle = document.getElementById('insightSubtitle');
    const insightIcon = document.getElementById('insightIcon');

    const liveMetricData = {
        revenue_today: {
            title: 'Daily Yield Analytics',
            subtitle: 'Real-time property revenue flow',
            icon: 'fa-indian-rupee-sign',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Velocity (24h)</span>
                    <div class="flex items-end gap-2 h-20 px-2">
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 40%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">08:00 · ₹1.2k</div></div>
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 65%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">12:00 · ₹2.8k</div></div>
                        <div class="flex-1 bg-emerald-600 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 90%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">Peak · ₹4.2k</div></div>
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 55%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">18:00 · ₹2.1k</div></div>
                        <div class="flex-1 bg-slate-100 rounded-t-lg hover:bg-emerald-500 transition-all cursor-help relative group/bar" style="height: 30%"><div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">EOD · ₹0.8k</div></div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Yield Allocation</span>
                    <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] font-bold text-slate-600">Lux Deluxe Category</span>
                            <span class="text-[10px] font-black text-emerald-600">₹12,400</span>
                        </div>
                        <div class="h-1.5 bg-white rounded-full overflow-hidden border border-slate-100">
                            <div class="h-full bg-emerald-500 w-[74%]"></div>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Projected EOD Closing</span>
                    <p class="text-3xl font-display font-bold text-slate-900 tracking-tighter">₹18,500 <span class="text-[10px] text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg ml-2">+12.4% vs Avg</span></p>
                </div>
            `
        },
        total_bookings: {
            title: 'Occupancy Dynamics',
            subtitle: 'Guest flow & channel density',
            icon: 'fa-user-group',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Channel Load</span>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="p-4 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-globe text-indigo-500 text-sm"></i>
                                <span class="text-[10px] font-bold text-indigo-900">OTA</span>
                            </div>
                            <span class="text-[12px] font-black text-indigo-600">42%</span>
                        </div>
                        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100/50 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <i class="fas fa-bolt text-emerald-500 text-sm"></i>
                                <span class="text-[10px] font-bold text-emerald-900">Direct</span>
                            </div>
                            <span class="text-[12px] font-black text-emerald-600">58%</span>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upcoming Node Check-ins</span>
                    <div class="space-y-3">
                        <div class="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group/item">
                            <div class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">JD</div>
                            <div class="flex-1">
                                <p class="text-[11px] font-bold text-slate-900 tracking-tight">John Doe · <span class="text-slate-400">#BK-9021</span></p>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lux Suite node</p>
                            </div>
                            <span class="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">2h Away</span>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flow Statistics</span>
                    <div class="flex items-center justify-between text-[18px] font-display font-bold text-slate-900">
                        <span>2.4 Days</span>
                        <span class="text-[10px] text-slate-400 uppercase">Avg Stay Path</span>
                    </div>
                </div>
            `
        },
        avg_rating: {
            title: 'Reputation Radar',
            subtitle: 'Guest sentiment registry',
            icon: 'fa-star',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sentiment Stream</span>
                    <div class="space-y-4">
                        <div class="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm relative overflow-hidden group/feedback">
                            <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                            <div class="flex items-center justify-between mb-3">
                                <div class="flex items-center gap-1 text-amber-500 text-[10px]">
                                    <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                                </div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Verified Guest</span>
                            </div>
                            <p class="text-[11px] text-slate-600 leading-relaxed font-medium italic">"Exceptional service at checking, room was pristine. The Zenith UI experience made management feel elite."</p>
                            <div class="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <span class="text-[9px] font-black text-slate-900">Anas K. · <span class="text-slate-400">London, UK</span></span>
                                <span class="text-[8px] font-bold text-slate-400 uppercase">2 Days ago</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Global Elite Standing</span>
                    <div class="p-6 rounded-[2.5rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden group/elite">
                        <div class="absolute inset-0 bg-gradient-to-tr from-primary-600/20 to-transparent"></div>
                        <h4 class="text-3xl font-display font-bold text-white relative z-10">Top 5%</h4>
                        <p class="text-[10px] font-bold text-primary-400 uppercase mt-2 relative z-10 tracking-[0.2em]">Global Luxury Benchmark</p>
                        <i class="fas fa-crown absolute right-6 top-6 text-2xl text-white/10 group-hover/elite:rotate-12 transition-transform"></i>
                    </div>
                </div>
            `
        },
        active_offers: {
            title: 'Campaign Strategic Nodes',
            subtitle: 'Performance marketing registry',
            icon: 'fa-rocket',
            content: `
                <div class="space-y-6">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Elite Campaign Nodes</span>
                    <div class="space-y-4">
                        <div class="p-5 rounded-2xl bg-[#FAFAFA] border border-slate-100 group/offer hover:bg-white hover:shadow-xl transition-all duration-500 relative overflow-hidden">
                            <div class="absolute right-0 top-0 p-3">
                                <span class="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest">ACTIVE</span>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center text-lg">
                                    <i class="fas fa-bolt"></i>
                                </div>
                                <div>
                                    <h5 class="text-[14px] font-bold text-slate-900">Summer Flash Node</h5>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROI: 14.2% · Exp: 12d</p>
                                </div>
                            </div>
                            <div class="mt-4 flex items-center justify-between">
                                <span class="text-[10px] font-black text-primary-600 uppercase tracking-widest">34 Bookings Captured</span>
                                <i class="fas fa-arrow-right text-[8px] text-slate-300 group-hover/offer:translate-x-1 transition-transform"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aggregated Reach</span>
                        <p class="text-2xl font-display font-bold text-slate-900">1,240 <span class="text-[8px] text-emerald-500">+14%</span></p>
                        <p class="text-[8px] font-black text-slate-400 uppercase">Impressions this node</p>
                    </div>
                    <div class="space-y-2">
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Conversion Delta</span>
                        <div class="h-10 w-full bg-slate-50 rounded-xl relative overflow-hidden">
                            <div class="absolute left-0 top-0 bottom-0 bg-primary-500 w-[64%] shadow-[0_0_10px_rgba(37,99,235,0.3)]"></div>
                        </div>
                    </div>
                </div>
            `
        }
    };

    metricCards.forEach(card => {
        card.addEventListener('click', () => {
            const metricId = card.getAttribute('data-metric-id');
            const data = liveMetricData[metricId];

            if (!data) return;

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

    // ══ Property Performance Spectrum Kinetic Engine (v33.0) ══
    const initPropertySpectrum = () => {
        const bars = document.querySelectorAll('.property-spectrum-bar');
        bars.forEach((bar, index) => {
            const finalHeight = bar.getAttribute('data-node-height');
            
            // Set initial state
            bar.style.height = '0px';
            bar.style.opacity = '0';
            
            // Staggered reveal
            setTimeout(() => {
                bar.style.transition = 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                bar.style.height = `${finalHeight}%`;
                bar.style.opacity = '1';
            }, 200 + (index * 120));
        });
    };

    // Initialize with a slight delay for premium impact
    setTimeout(initPropertySpectrum, 800);
});
