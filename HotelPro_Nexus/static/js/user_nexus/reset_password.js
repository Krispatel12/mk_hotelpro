(function () {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const rand = (a, b) => Math.random() * (b - a) + a;
    for (let i = 0; i < 50; i++) particles.push({
        x: rand(0, W),
        y: rand(0, H),
        vx: rand(-.25, .25),
        vy: rand(-.25, .25),
        size: rand(.8, 2.2),
        opacity: rand(.15, .45)
    });
    let mouse = { x: -999, y: -999 };
    document.addEventListener('mousemove', e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(p => {
            const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
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
                const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(13,36,200,${.12 * (1 - dist / 120)})`;
                    ctx.lineWidth = .6;
                    ctx.stroke();
                }
            });
        });
        requestAnimationFrame(draw);
    } draw();
})();

document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.pwd-toggle');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
        });
    });
});

(function () {
    const passInput = document.getElementById('password');
    if (!passInput) return;
    const confInput = document.getElementById('confirm_password');
    const sBar = document.getElementById('strength-bar');
    const submitBtn = document.getElementById('submit-btn');
    const reqs = {
        len: document.getElementById('req-len'),
        case: document.getElementById('req-case'),
        num: document.getElementById('req-num'),
        sym: document.getElementById('req-sym'),
        match: document.getElementById('req-match')
    };

    function setReq(el, ok) {
        if (!el) return;
        el.classList.toggle('valid', ok);
        const icon = el.querySelector('i');
        if (icon) {
            icon.className = ok ? 'fas fa-check-circle' : 'fas fa-circle-dot';
            icon.style.color = ok ? '#10b981' : '#cbd5e1';
        }
    }

    function validate() {
        const v = passInput.value, c = confInput.value;
        const len = v.length >= 8,
            cas = /[a-z]/.test(v) && /[A-Z]/.test(v),
            num = /[0-9]/.test(v),
            sym = /[^A-Za-z0-9]/.test(v),
            match = v === c && c.length > 0;

        setReq(reqs.len, len);
        setReq(reqs.case, cas);
        setReq(reqs.num, num);
        setReq(reqs.sym, sym);
        setReq(reqs.match, match);

        let score = [v.length > 0, len, cas, num, sym, v.length > 12].filter(Boolean).length;
        if (sBar) {
            sBar.className = 'strength-bar';
            if (score > 4) sBar.classList.add('strength-strong');
            else if (score > 2) sBar.classList.add('strength-medium');
            else if (score > 0) sBar.classList.add('strength-weak');
        }
        if (submitBtn) submitBtn.disabled = !(len && cas && num && sym && match);
    }

    passInput.addEventListener('input', validate);
    confInput.addEventListener('input', validate);
    validate();

    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
        resetForm.addEventListener('submit', function () {
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> SECURING...';
            submitBtn.disabled = true;
        });
    }
})();

document.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - .5) * 18,
        y = (e.clientY / window.innerHeight - .5) * 18;
    const arc = document.querySelector('.arc-container svg');
    if (arc) arc.style.transform = `translate(${x * -.7}px,${y * -.7}px)`;
});
