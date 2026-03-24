// Precision cursor glow tracking for Sentinel Command Center
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cc-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
            card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
        });
    });
});
