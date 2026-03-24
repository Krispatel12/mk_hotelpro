async function auditHotel(hotelId) {
    const btn = document.getElementById(`audit-btn-${hotelId}`);
    const resultDiv = document.getElementById(`audit-result-${hotelId}`);
    
    if (!btn || !resultDiv) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Auditing...';
    
    try {
        const response = await fetch(`/api/ai/admin/hotel-audit/${hotelId}/`);
        const data = await response.json();
        
        if (data.status === 'success') {
            const audit = data.audit;
            const statusClass = audit.Status === 'Verified' ? 'text-emerald-500' : 'text-rose-500';
            const statusIcon = audit.Status === 'Verified' ? 'fa-check-circle' : 'fa-exclamation-triangle';
            
            resultDiv.innerHTML = `
                <div class="flex items-start gap-3">
                    <i class="fas ${statusIcon} ${statusClass} mt-1"></i>
                    <div>
                        <div class="font-bold ${statusClass} text-[10px] uppercase tracking-widest">${audit.Status}</div>
                        <p class="text-xs text-slate-600 mt-1 italic leading-relaxed">${audit['Audit Note']}</p>
                    </div>
                </div>
            `;
            resultDiv.classList.remove('hidden');
        } else {
            alert('Audit failed: ' + data.message);
        }
    } catch (err) {
        alert('Connection error during audit.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-microchip"></i> AI Audit';
    }
}
