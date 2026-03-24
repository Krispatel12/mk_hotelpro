document.addEventListener('DOMContentLoaded', function () {
    const fill = document.querySelector('.progress-bar-fill');
    if (fill) {
        const progress = fill.getAttribute('data-progress') || 0;
        setTimeout(() => {
            fill.style.width = progress + '%';
        }, 500);
    }
});
