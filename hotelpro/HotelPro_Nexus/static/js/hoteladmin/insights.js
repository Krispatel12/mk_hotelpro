document.addEventListener('DOMContentLoaded', function () {
    const bars = document.querySelectorAll('.perf-bar');
    bars.forEach(bar => {
        const h = bar.getAttribute('data-height');
        const delay = bar.getAttribute('data-delay') || 0;
        setTimeout(() => {
            bar.style.transitionDelay = (delay * 50) + 'ms';
            bar.style.height = h + '%';
        }, 600);
    });
});
