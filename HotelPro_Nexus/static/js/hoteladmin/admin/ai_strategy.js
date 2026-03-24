async function generateStrategyReport() {
    const btn = document.getElementById('generateBtn');
    const container = document.getElementById('reportContainer');
    const badge = document.getElementById('statusBadge');
    
    if (!btn || !container || !badge) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    badge.classList.remove('hidden');
    
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full space-y-4">
            <div class="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin"></div>
            <p class="text-slate-500 animate-pulse">Aggregating platform metrics and synthesizing growth strategies...</p>
        </div>
    `;

    try {
        // Assume the URL is passed via data attribute or global variable
        const url = btn.dataset.url || "/api/ai/super-admin/strategy/";
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success') {
            // Very basic markdown to HTML conversion for the report
            const formattedReport = data.report
                .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold mb-4">$1</h1>')
                .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold mt-8 mb-4">$1</h2>')
                .replace(/^### (.*$)/gm, '<h3 class="text-xl font-bold mt-6 mb-3">$1</h3>')
                .replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>')
                .replace(/- (.*$)/gm, '<li class="ml-4">$1</li>')
                .replace(/\n\n/g, '<br><br>');
            
            container.innerHTML = `
                <div class="animate-fade-in p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 h-full overflow-y-auto">
                    ${formattedReport}
                </div>
            `;
        } else {
            container.innerHTML = `<div class="text-red-500">Error: ${data.message}</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div class="text-red-500">Failed to connect to AI engine.</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-brain"></i> Generate Strategic Report';
        badge.classList.add('hidden');
    }
}
