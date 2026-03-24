document.addEventListener('DOMContentLoaded', () => {
    /* --- Premium Reveal Engine --- */
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('.reveal-up').forEach(el => revealObserver.observe(el));

    /* --- Mouse-Following Glow Effect --- */
    const glowCards = document.querySelectorAll('.ultra-glow-card');
    glowCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    /* --- Magnetic Elements --- */
    const magneticElements = document.querySelectorAll('.magnetic-wrap');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const x = (e.clientX - centerX) * 0.3;
            const y = (e.clientY - centerY) * 0.3;
            el.style.transform = `translate(${x}px, ${y}px)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'translate(0, 0)';
        });
    });

    /* --- 3D Dashboard Interaction --- */
    const heroMockup = document.getElementById('hero-mockup-container');
    if (heroMockup) {
        const tiltElement = heroMockup.querySelector('.glass-panel-heavy') || heroMockup.querySelector('.glass-panel');
        if (tiltElement) {
            document.addEventListener('mousemove', (e) => {
                const rect = heroMockup.getBoundingClientRect();
                if (e.clientY > rect.bottom + 1000 || e.clientY < rect.top - 1000) return;

                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const rotateX = (e.clientY - centerY) / 60; // Softer tilt
                const rotateY = (centerX - e.clientX) / 60;

                tiltElement.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

                // Parallax for floating cards
                const cards = heroMockup.parentElement.querySelectorAll('.animate-float');
                cards.forEach((card, i) => {
                    const factor = (i + 1) * 25; // More subtle parallax
                    const tx = (e.clientX - centerX) / factor;
                    const ty = (e.clientY - centerY) / factor;
                    card.style.transform = `translate(${tx}px, ${ty}px)`;
                });
            });

            heroMockup.addEventListener('mouseleave', () => {
                tiltElement.style.transform = `perspective(1200px) rotateX(-12deg) rotateY(6deg) scale3d(1, 1, 1)`;
            });
        }
    }
    /* --- Dashboard Swipe Mode Engine --- */
    class DashboardCarousel {
        constructor() {
            this.container = document.getElementById('dashboard-carousel-container');
            this.slider = document.getElementById('dashboard-slider');
            this.dots = document.getElementById('carousel-dots');
            this.prevBtn = document.getElementById('carousel-prev');
            this.nextBtn = document.getElementById('carousel-next');
            
            if (!this.container || !this.slider) return;
            
            this.slides = Array.from(this.slider.children);
            this.currentIndex = 0;
            this.isDragging = false;
            this.startPos = 0;
            this.currentTranslate = 0;
            this.prevTranslate = 0;
            this.animationID = 0;
            
            this.init();
        }

        init() {
            // Drag / Swipe events
            this.slider.addEventListener('mousedown', (e) => this.dragStart(e));
            this.slider.addEventListener('touchstart', (e) => this.dragStart(e), { passive: true });
            
            window.addEventListener('mouseup', () => this.dragEnd());
            window.addEventListener('touchend', () => this.dragEnd());
            
            window.addEventListener('mousemove', (e) => this.dragAction(e));
            window.addEventListener('touchmove', (e) => this.dragAction(e), { passive: true });

            // Button controls
            if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.moveSlide(-1));
            if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.moveSlide(1));

            // Dot controls
            if (this.dots) {
                Array.from(this.dots.children).forEach((dot, index) => {
                    dot.addEventListener('click', () => this.goToSlide(index));
                });
            }

            // Prevent context menu/drag on images
            this.slides.forEach(slide => {
                const img = slide.querySelector('img');
                if (img) img.addEventListener('dragstart', (e) => e.preventDefault());
            });

            // Handle Resize
            window.addEventListener('resize', () => this.updatePosition());
        }

        dragStart(e) {
            this.isDragging = true;
            this.startPos = this.getPositionX(e);
            this.slider.classList.add('grabbing');
            
            this.animationID = requestAnimationFrame(() => this.animation());
        }

        dragEnd() {
            if (!this.isDragging) return;
            this.isDragging = false;
            cancelAnimationFrame(this.animationID);
            this.slider.classList.remove('grabbing');

            const movedBy = this.currentTranslate - this.prevTranslate;
            if (movedBy < -100 && this.currentIndex < this.slides.length - 1) this.currentIndex += 1;
            if (movedBy > 100 && this.currentIndex > 0) this.currentIndex -= 1;

            this.updatePosition();
        }

        dragAction(e) {
            if (!this.isDragging) return;
            const currentPosition = this.getPositionX(e);
            this.currentTranslate = this.prevTranslate + currentPosition - this.startPos;
        }

        getPositionX(e) {
            return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
        }

        animation() {
            this.setSliderPosition();
            if (this.isDragging) requestAnimationFrame(() => this.animation());
        }

        setSliderPosition() {
            this.slider.style.transform = `translateX(${this.currentTranslate}px)`;
        }

        updatePosition() {
            this.currentTranslate = this.currentIndex * -this.container.offsetWidth;
            this.prevTranslate = this.currentTranslate;
            this.slider.style.transition = 'transform 0.5s cubic-bezier(0.33, 1, 0.68, 1)';
            this.setSliderPosition();
            
            setTimeout(() => {
                this.slider.style.transition = 'none';
            }, 500);

            this.updateDots();
        }

        moveSlide(direction) {
            const nextIndex = this.currentIndex + direction;
            if (nextIndex >= 0 && nextIndex < this.slides.length) {
                this.currentIndex = nextIndex;
                this.updatePosition();
            }
        }

        goToSlide(index) {
            this.currentIndex = index;
            this.updatePosition();
        }

        updateDots() {
            if (!this.dots) return;
            Array.from(this.dots.children).forEach((dot, index) => {
                if (index === this.currentIndex) {
                    dot.className = 'min-w-[8px] h-2 rounded-full bg-primary-500 transition-all duration-300 dot-active';
                    dot.style.width = '1.5rem';
                } else {
                    dot.className = 'min-w-[8px] h-2 rounded-full bg-slate-300 dark:bg-white/20 transition-all duration-300';
                    dot.style.width = '0.5rem';
                }
            });

            // Update arrow colors
            const isDark = document.documentElement.classList.contains('dark');
            if (this.prevBtn) this.prevBtn.className = isDark ? 'text-white/60 hover:text-white transition-all hover:scale-125' : 'text-slate-400 hover:text-slate-900 transition-all hover:scale-125';
            if (this.nextBtn) this.nextBtn.className = isDark ? 'text-white/60 hover:text-white transition-all hover:scale-125' : 'text-slate-400 hover:text-slate-900 transition-all hover:scale-125';
        }
    }

    class HeroTextCycler {
        constructor() {
            this.element = document.getElementById('hero-dynamic-text');
            if (!this.element) return;
            this.words = ['Smart AI', 'Elite Intelligence', 'Strategic Automation', 'Digital Synergy'];
            this.currentIndex = 0;
            this.startCycling();
        }
        startCycling() {
            setInterval(() => {
                this.element.style.opacity = '0';
                this.element.style.filter = 'blur(10px)';
                this.element.style.transform = 'translateY(20px)';
                this.element.style.transition = 'all 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
                
                setTimeout(() => {
                    this.currentIndex = (this.currentIndex + 1) % this.words.length;
                    this.element.textContent = this.words[this.currentIndex];
                    this.element.style.filter = 'blur(0)';
                    this.element.style.opacity = '1';
                    this.element.style.transform = 'translateY(0)';
                }, 800);
            }, 4000);
        }
    }

    // Initialize components
    new DashboardCarousel();
    new HeroTextCycler();

    const themeToggle = document.getElementById('theme-swipe-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    /* --- Smooth Scroll Engine --- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const navOffset = 100;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - navOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});
