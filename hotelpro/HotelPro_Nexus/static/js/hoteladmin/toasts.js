/**
 * Premium Toast Notification System
 * Handles toast creation, auto-close, and interactive closing.
 */
function closeToast(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.animation = 'toastSlideOut 0.5s ease forwards';
        setTimeout(() => el.remove(), 500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Premium Toast Auto-Close
    const toasts = document.querySelectorAll('.premium-toast');
    toasts.forEach(t => {
        setTimeout(() => {
            if (document.getElementById(t.id)) {
                closeToast(t.id);
            }
        }, 6000);
    });

    // Delegated click event for close buttons
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.toast-close');
        if (closeBtn) {
            const toast = closeBtn.closest('.premium-toast');
            if (toast) {
                closeToast(toast.id);
            }
        }
    });
});
