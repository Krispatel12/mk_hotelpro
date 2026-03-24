/* ══════════════════════════════════════════════════
   CUSTOMER HOTEL DETAILS LOGIC
══════════════════════════════════════════════════ */

function updateBookingLinks() {
    const ci = document.getElementById('global_check_in').value;
    const co = document.getElementById('global_check_out').value;
    const links = document.querySelectorAll('.btn-book-room');

    links.forEach(link => {
        let url = new URL(link.dataset.baseUrl, window.location.origin);
        if (ci) url.searchParams.set('check_in', ci);
        if (co) url.searchParams.set('check_out', co);
        link.href = url.toString();
    });
}

// Initial attachment if elements exist
document.addEventListener('DOMContentLoaded', () => {
    const ciInput = document.getElementById('global_check_in');
    const coInput = document.getElementById('global_check_out');

    if (ciInput) ciInput.addEventListener('change', updateBookingLinks);
    if (coInput) coInput.addEventListener('change', updateBookingLinks);
});
