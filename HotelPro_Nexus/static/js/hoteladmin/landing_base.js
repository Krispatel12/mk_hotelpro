// Tailwind CSS Configuration
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#3B82F6', // Modern Blue
                    600: '#2563EB',
                    700: '#1D4ED8',
                    800: '#1E40AF',
                    900: '#1E3A8A',
                },
                accent: {
                    orange: '#F97316',
                    indigo: '#4F46E5', // Professional Indigo
                },
                slate: {
                    950: '#020617', // Deeper Midnight
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                }
            },
        }
    }
}

// Global JS initialization
document.addEventListener('DOMContentLoaded', () => {
    /* ── Premium Reveal Engine ── */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: add a slight delay for staggered children if not handled by CSS
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));

    /* ── Magnetic Buttons ── */
    const magneticButtons = document.querySelectorAll('.px-10, .px-8, .glass-card');
    magneticButtons.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            if (btn.classList.contains('glass-card')) {
                btn.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) translateY(-5px)`;
            }
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    /* ── Particle Background Canvas ── */
    initParticles();

    /* ── Mobile Menu ── */
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    /* ── Back to Top ── */
    const backToTopButton = document.getElementById('back-to-top');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTopButton.classList.remove('hidden');
            } else {
                backToTopButton.classList.add('hidden');
            }
        });

        backToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ── Theme Toggle ── */
    const themeSlider = document.getElementById('theme-slider-container');
    const themeSliderMobile = document.getElementById('theme-slider-mobile');
    const html = document.documentElement;

    const toggleTheme = () => {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    };

    if (themeSlider) themeSlider.addEventListener('click', toggleTheme);
    if (themeSliderMobile) themeSliderMobile.addEventListener('click', toggleTheme);

    /* ── Smooth Scrolling for anchor links ── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                }
            }
        });
    });
});

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const NUM = 50, MAX_DIST = 150;

    const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = (Math.random() - 0.5) * 0.4;
            this.size = Math.random() * 2 + 1;
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0) this.x = W; if (this.x > W) this.x = 0;
            if (this.y < 0) this.y = H; if (this.y > H) this.y = 0;
        }
    }

    for (let i = 0; i < NUM; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, W, H);
        const isDark = document.documentElement.classList.contains('dark');
        const pColor = isDark ? 'rgba(255, 255, 255,' : 'rgba(59, 130, 246,';

        particles.forEach(p => {
            p.update();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `${pColor}${p.opacity})`;
            ctx.fill();
        });

        for (let i = 0; i < NUM; i++) {
            for (let j = i + 1; j < NUM; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `${pColor}${0.1 * (1 - dist / MAX_DIST)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
}
