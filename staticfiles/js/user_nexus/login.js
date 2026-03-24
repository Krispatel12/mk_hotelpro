document.addEventListener('DOMContentLoaded', () => {
    /* ── PARTICLE CANVAS ── */
    initParticles();

    /* ── PASSWORD TOGGLE ── */
    const passwordToggle = document.getElementById('toggle-pwd');
    if (passwordToggle) {
        passwordToggle.addEventListener('click', function () {
            const inp = document.getElementById('password');
            const icon = document.getElementById('eye-icon');
            if (inp.type === 'password') {
                inp.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                inp.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    }

    /* ── SUBMIT SPINNER ── */
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function () {
            const btn = document.getElementById('submit-btn');
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AUTHENTICATING...';
            btn.style.opacity = '.8';
            btn.disabled = true;
        });
    }

    /* ── PARALLAX ARC ── */
    document.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth - .5) * 18;
        const y = (e.clientY / window.innerHeight - .5) * 18;
        const arc = document.querySelector('.arc-container svg');
        if (arc) arc.style.transform = `translate(${x * -.7}px,${y * -.7}px)`;
    });
});

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const NUM = 50, MAX_DIST = 120;
    const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const rand = (a, b) => Math.random() * (b - a) + a;
    for (let i = 0; i < NUM; i++) {
        particles.push({
            x: rand(0, W),
            y: rand(0, H),
            vx: rand(-.25, .25),
            vy: rand(-.25, .25),
            size: rand(.8, 2.2),
            opacity: rand(.15, .45)
        });
    }
    let mouse = {
        x: -999,
        y: -999
    };
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            const dx = p.x - mouse.x,
                dy = p.y - mouse.y,
                dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
                p.vx += dx / dist * .02;
                p.vy += dy / dist * .02;
            }
            const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > .5) {
                p.vx = p.vx / spd * .5;
                p.vy = p.vy / spd * .5;
            }
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(13,36,200,${p.opacity})`;
            ctx.fill();
        });
        particles.forEach((a, i) => {
            particles.slice(i + 1).forEach(b => {
                const dx = a.x - b.x,
                    dy = a.y - b.y,
                    dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MAX_DIST) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(13,36,200,${.12 * (1 - dist / MAX_DIST)})`;
                    ctx.lineWidth = .6;
                    ctx.stroke();
                }
            });
        });
        requestAnimationFrame(draw);
    }
    draw();
}
