// onboarding_services.js
document.addEventListener('DOMContentLoaded', () => {
    const servicesGrid = document.getElementById('servicesGrid');
    const input = document.getElementById('customServiceInput');
    const btn = document.getElementById('addServiceBtn');

    if (!btn || !input || !servicesGrid) return;

    const createServicePill = (name) => {
        const label = document.createElement('label');
        label.className = 'pill-label';
        label.style.animation = 'pillFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

        label.innerHTML = `
            <input type="checkbox" name="services" value="${name}" checked>
            <i class="fas fa-concierge-bell"></i>
            ${name}
        `;

        return label;
    };

    btn.addEventListener('click', (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const name = input.value.trim();
        if (name) {
            console.log(`[Services] Adding custom service: ${name}`);
            const pill = createServicePill(name);
            servicesGrid.appendChild(pill);
            input.value = '';

            // Subtle feedback
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = '', 100);
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            btn.click();
        }
    });
});
