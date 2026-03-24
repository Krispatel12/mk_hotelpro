/**
 * Strategic Audit: Offer Review Detail JS
 * Handles rejection section toggling and yield shift animations.
 */
document.addEventListener('DOMContentLoaded', function () {
    const trigger = document.getElementById('triggerRejection');
    const section = document.getElementById('rejectionSection');
    const finalBtn = document.getElementById('finalReject');

    if (trigger && section && finalBtn) {
        trigger.addEventListener('click', function () {
            section.classList.remove('hidden');
            this.classList.add('hidden');
            finalBtn.classList.remove('hidden');
        });
    }

    // Yield Shift Animation
    const yieldBar = document.querySelector('.yield-shift-bar');
    if (yieldBar) {
        const progress = yieldBar.getAttribute('data-progress') || 0;
        setTimeout(() => {
            yieldBar.style.width = progress + '%';
        }, 500);
    }
});
