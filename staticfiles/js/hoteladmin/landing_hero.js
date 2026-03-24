(function () {
    const container = document.getElementById('hero-mockup-container');
    if (!container) return;
    const tiltElement = container.querySelector('.glass-panel');
    if (!tiltElement) return;

    document.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        const rect = container.getBoundingClientRect();
        
        // Only run if mouse is somewhat near the hero section
        if (clientY > rect.bottom + 500 || clientY < rect.top - 500) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const rotateX = (e.clientY - centerY) / 30;
        const rotateY = (centerX - e.clientX) / 30;

        // Apply smooth 3D tilt
        tiltElement.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    // Reset tilt on mouse leave from the container area
    container.addEventListener('mouseleave', () => {
        tiltElement.style.transform = `perspective(1000px) rotateX(-12deg) rotateY(6deg) scale3d(1, 1, 1)`;
    });
})();
