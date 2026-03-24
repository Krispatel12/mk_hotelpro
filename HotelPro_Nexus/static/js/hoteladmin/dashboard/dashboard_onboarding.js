/**
 * Professional Onboarding Interface Engine
 * Handles the tactical deployment and refinement of property data modules.
 */

function openEditInterface(hotelId, category) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const submitBtn = document.getElementById('submitBtn');

    // UI Feedback: Start Sync Animation
    modalBody.innerHTML = `
        <div class="flex flex-col items-center justify-center py-24 text-slate-400">
            <div class="relative mb-8">
                <i class="fas fa-microchip text-5xl text-primary-600/30"></i>
                <div class="absolute inset-0 border-4 border-primary-600 border-t-transparent rounded-full animate-spin-slow"></div>
            </div>
            <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-600">Initializing Executive Secure Channel...</p>
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Retrieving Property Dossier: ${category}</p>
        </div>
    `;

    // Strategy Map for Category Labels
    const categoryLabels = {
        'IDENTITY': 'Identity Pillars & Registry',
        'INVENTORY': 'Inventory & Asset Tiers',
        'GALLERY': 'Media Portfolio & HD Visuals',
        'OPS': 'Operational Flows & Protocols'
    };

    modalTitle.innerText = categoryLabels[category] || 'Refine Portfolio Strategy';

    // Simulate Secure Retrieval (Replace with actual fetch in future)
    setTimeout(() => {
        let content = '';

        switch (category) {
            case 'IDENTITY':
                content = `
                    <div class="space-y-8 animate-premium-fade">
                        <div class="group">
                            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block group-focus-within:text-primary-600 transition-colors">Strategic Property Designation</label>
                            <input type="text" class="w-full bg-white/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:border-primary-500 premium-input" placeholder="Loading Identity...">
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                            <div class="group">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Market City</label>
                                <input type="text" class="w-full bg-white/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:border-primary-500 premium-input" placeholder="Elite Hub">
                            </div>
                            <div class="group">
                                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Deployment Pincode</label>
                                <input type="text" class="w-full bg-white/50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-semibold focus:outline-none focus:border-primary-500 premium-input" placeholder="560001">
                            </div>
                        </div>
                    </div>
                `;
                break;
            case 'INVENTORY':
                content = `
                    <div class="flex flex-col items-center justify-center py-12 text-center">
                        <div class="w-20 h-20 rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 glow-blue">
                             <i class="fas fa-layer-group text-2xl"></i>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900 uppercase tracking-tight">Active Inventory Mapping</h4>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 max-w-[280px]">Inventory manifests are currently indexed via the main growth engine.</p>
                        <a href="/dashboard/" class="mt-8 btn-premium px-8 py-4 rounded-xl text-[10px]">Access Growth Suite</a>
                    </div>
                `;
                break;
            default:
                content = `
                    <div class="p-10 bg-slate-50 rounded-2xl border border-slate-100/50 text-center">
                        <i class="fas fa-shield-virus text-4xl text-slate-300 mb-4"></i>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-widest">Protocol Unavailable in current Sandbox session.</p>
                    </div>
                `;
        }

        modalBody.innerHTML = content;
        submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt mr-2"></i> SYNC PROTOCOL UPDATE`;
    }, 1200);
}

function submitEditRequest() {
    const btn = document.getElementById('submitBtn');
    const originalText = btn.innerHTML;

    btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> DEPLOYING SYNC...`;
    btn.classList.add('opacity-80', 'pointer-events-none');

    setTimeout(() => {
        btn.innerHTML = `<i class="fas fa-check-circle mr-2"></i> PROTOCOL DEPLOYED`;
        btn.classList.remove('bg-primary-600');
        btn.classList.add('bg-emerald-600');

        setTimeout(() => {
            closeModal();
            // Reset button for next use
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('bg-emerald-600', 'opacity-80', 'pointer-events-none');
                btn.classList.add('bg-primary-600');
            }, 300);
        }, 800);
    }, 1500);
}
