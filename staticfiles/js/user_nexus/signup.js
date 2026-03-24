document.addEventListener('DOMContentLoaded', () => {
    /* ── PARTICLE CANVAS ── */
    initParticles();

    /* ── ANIMATED COUNTERS ── */
    initCounters();

    /* ── HELPERS ── */
    const $ = id => document.getElementById(id);
    let currentStep = 1;

    const signupForm = $('signup-form');
    const apiSendOtpUrl = signupForm ? signupForm.getAttribute('data-api-send-otp') : '';
    const apiVerifyOtpUrl = signupForm ? signupForm.getAttribute('data-api-verify-otp') : '';

    function showAlert(msg, type = 'error') {
        const el = $('js-alert');
        if (!el) return;
        el.className = 'alert alert-' + type + ' show';
        const icon = $('js-alert-icon');
        if (icon) icon.className = 'fas fa-' + (type === 'success' ? 'circle-check' : type === 'warning' ? 'triangle-exclamation' : 'exclamation-circle');
        const msgEl = $('js-alert-msg');
        if (msgEl) msgEl.textContent = msg;
        el.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
        });
        if (type !== 'error') setTimeout(() => el.classList.remove('show'), 5000);
    }

    function goStep(n) {
        const fromEl = $('step-' + currentStep);
        const toEl = $('step-' + n);
        if (fromEl && toEl) {
            fromEl.classList.add('exit');
            setTimeout(() => {
                fromEl.classList.remove('active', 'exit');
            }, 300);
            setTimeout(() => {
                toEl.classList.add('active');
            }, 50);
        }
        // Update progress
        for (let i = 1; i <= 3; i++) {
            const dot = $('prog-' + i);
            if (dot) {
                dot.classList.remove('active', 'done');
                if (i < n) dot.classList.add('done');
                if (i === n) dot.classList.add('active');
            }
        }
        const alert = $('js-alert');
        if (alert) alert.classList.remove('show');
        currentStep = n;
    }

    const toggleButtons = document.querySelectorAll('.password-toggle');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.previousElementSibling.previousElementSibling.id; // Corrected traversal: label is between input and button
            // Wait, let's look at the HTML structure of signup.html
            // <div class="input-group">
            //     <input type="password" id="password" ...>
            //     <label for="password">...</label>
            //     <button type="button" class="password-toggle" ...>
            // </div>
            // btn.previousElementSibling is <label>
            // btn.previousElementSibling.previousElementSibling is <input>
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

    /* ── STEP 1: Send OTP ── */
    const sendOtpBtn = $('send-otp-btn');
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            const username = $('username').value.trim();
            const email = $('email').value.trim();
            if (!username || !email) {
                showAlert('Please fill in both fields.');
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showAlert('Please enter a valid email address.');
                return;
            }

            sendOtpBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> SENDING...';
            sendOtpBtn.disabled = true;

            try {
                const res = await fetch(apiSendOtpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        username,
                        email
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    $('display-email').textContent = email;
                    $('final-username').value = username;
                    $('final-email').value = email;
                    showAlert('OTP sent! Check your inbox.', 'success');
                    setTimeout(() => goStep(2), 700);
                    startOtpTimer();
                } else {
                    showAlert(data.message || 'Failed to send OTP.');
                }
            } catch {
                showAlert('Network error. Please try again.');
            } finally {
                sendOtpBtn.innerHTML = 'SEND OTP <i class="fas fa-paper-plane"></i>';
                sendOtpBtn.disabled = false;
            }
        });
    }

    /* ── STEP 2: OTP Logic ── */
    const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
    const verifyOtpBtn = $('verify-otp-btn');

    function checkOtpReady() {
        if (!verifyOtpBtn) return;
        const otp = otpBoxes.map(b => b.value).join('');
        verifyOtpBtn.disabled = otp.length < 6;
    }

    otpBoxes.forEach((box, i) => {
        box.addEventListener('input', e => {
            if (box.value) {
                box.classList.add('filled');
                if (i < 5) otpBoxes[i + 1].focus();
            } else {
                box.classList.remove('filled');
            }
            checkOtpReady();
        });
        box.addEventListener('keydown', e => {
            if (e.key === 'Backspace' && !box.value && i > 0) {
                otpBoxes[i - 1].focus();
            }
        });
        // Handle paste event for OTP
        box.addEventListener('paste', e => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData('text').trim();
            if (/^\d{6}$/.test(text)) {
                otpBoxes.forEach((b, idx) => {
                    b.value = text[idx];
                    b.classList.add('filled');
                });
                otpBoxes[5].focus();
                checkOtpReady();
            }
        });
    });
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const otp = otpBoxes.map(b => b.value).join('');
            if (otp.length < 6) {
                showAlert('Please enter all 6 digits.');
                return;
            }

            verifyOtpBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> VERIFYING...';
            verifyOtpBtn.disabled = true;

            try {
                const res = await fetch(apiVerifyOtpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        email: $('final-email').value,
                        otp: otp
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showAlert('Identity verified!', 'success');
                    setTimeout(() => goStep(3), 800);
                } else {
                    showAlert(data.message || 'Invalid OTP. Please try again.');
                    otpBoxes.forEach(b => {
                        b.classList.add('otp-error');
                        setTimeout(() => b.classList.remove('otp-error'), 500);
                    });
                }
            } catch {
                showAlert('Network error. Please try again.');
            } finally {
                verifyOtpBtn.innerHTML = 'VERIFY OTP <i class="fas fa-check-circle"></i>';
                if (typeof checkOtpReady === 'function') checkOtpReady();
            }
        });
    }

    /* ── OTP TIMER + BUTTON SWAP ── */
    let timerInterval = null;

    function showVerifyBtn() {
        $('verify-otp-btn').classList.remove('btn-hidden');
        $('resend-otp-btn').classList.add('btn-hidden');
        $('otp-timer-label').textContent = 'Expires in';
    }

    function showResendBtn() {
        $('verify-otp-btn').classList.add('btn-hidden');
        $('resend-otp-btn').classList.remove('btn-hidden');
        $('otp-timer-label').textContent = 'OTP Expired';
        $('otp-timer-badge').classList.add('expired');
    }

    function startOtpTimer() {
        clearInterval(timerInterval);
        let time = 30;
        showVerifyBtn();
        $('otp-timer-badge').classList.remove('expired');
        const update = () => {
            if (time <= 0) {
                clearInterval(timerInterval);
                showResendBtn();
                return;
            }
            time--;
            const s = time % 60;
            $('otp-countdown').textContent = `0:${s < 10 ? '0' : ''}${s}`;
        };
        timerInterval = setInterval(update, 1000);
    }

    function clearOtpBoxes() {
        otpBoxes.forEach(b => {
            b.value = '';
            b.classList.remove('filled');
        });
        if (typeof checkOtpReady === 'function') checkOtpReady();
    }

    const changeEmailBtn = $('change-email-btn') || $('back-btn');
    if (changeEmailBtn) {
        changeEmailBtn.addEventListener('click', () => {
            clearInterval(timerInterval);
            clearOtpBoxes();
            if (typeof showVerifyBtn === 'function') showVerifyBtn();
            const badge = $('otp-timer-badge');
            if (badge) badge.classList.remove('expired');
            const countdown = $('otp-countdown');
            if (countdown) countdown.textContent = '0:30';
            goStep(1);
        });
    }

    /* ── RESEND OTP ── */
    const resendOtpBtn = $('resend-otp-btn');
    if (resendOtpBtn) {
        resendOtpBtn.addEventListener('click', async () => {
            const username = $('final-username').value;
            const email = $('final-email').value;
            resendOtpBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> SENDING...';
            resendOtpBtn.disabled = true;
            try {
                const res = await fetch(apiSendOtpUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        username,
                        email
                    })
                });
                const data = await res.json();
                if (res.ok) {
                    showAlert('New OTP sent! Check your inbox.', 'success');
                    clearOtpBoxes();
                    otpBoxes[0].focus();
                    startOtpTimer();
                } else {
                    showAlert(data.message || 'Failed to resend. Try again.');
                    resendOtpBtn.disabled = false;
                }
            } catch {
                showAlert('Network error. Please try again.');
                resendOtpBtn.disabled = false;
            } finally {
                resendOtpBtn.innerHTML = 'RESEND OTP <i class="fas fa-rotate-right"></i>';
            }
        });
    }

    /* ── STEP 3: Password Validation ── */
    const passInput = $('password');
    const confInput = $('confirm_password');
    const createBtn = $('create-btn');
    const sBar = $('strength-bar');

    function req(id, ok) {
        const el = $(id);
        if (!el) return;

        if (ok) {
            el.classList.add('valid');
        } else {
            el.classList.remove('valid');
        }

        const icon = el.querySelector('i');
        if (icon) {
            icon.className = ok ? 'fas fa-check-circle' : 'fas fa-circle-dot';
            icon.style.color = ok ? '#10b981' : '#cbd5e1';
            icon.style.fontSize = ok ? '10px' : '6px'; // Sync with CSS for insurance
        }
    }

    function validatePassword() {
        if (!passInput || !confInput) return;

        const v = passInput.value || '';
        const c = confInput.value || '';

        const len = v.length >= 8;
        const cas = /[a-z]/.test(v) && /[A-Z]/.test(v);
        const num = /[0-9]/.test(v);
        const sym = /[^A-Za-z0-9]/.test(v);
        const match = v === c && v.length > 0;

        req('req-len', len);
        req('req-case', cas);
        req('req-num', num);
        req('req-sym', sym);
        req('req-match', match);

        // Strength Calculation
        let score = 0;
        if (v.length > 0) score++;
        if (len) score++;
        if (cas) score++;
        if (num) score++;
        if (sym) score++;
        if (v.length > 12) score++;

        if (sBar) {
            sBar.className = 'strength-bar';
            if (score >= 5) sBar.classList.add('strength-strong');
            else if (score >= 3) sBar.classList.add('strength-medium');
            else if (score > 0) sBar.classList.add('strength-weak');
            else sBar.style.width = '0';
        }

        if (createBtn) {
            const allValid = len && cas && num && sym && match;
            createBtn.disabled = !allValid;
        }
    }

    if (passInput) {
        ['input', 'keyup', 'change', 'blur'].forEach(ev => passInput.addEventListener(ev, validatePassword));
    }
    if (confInput) {
        ['input', 'keyup', 'change', 'blur'].forEach(ev => confInput.addEventListener(ev, validatePassword));
    }

    // Run once on load to catch cached values
    validatePassword();

    const signupFormEl = $('signup-form');
    if (signupFormEl) {
        signupFormEl.addEventListener('submit', function () {
            createBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> CREATING...';
            createBtn.disabled = true;
        });
    }

    /* ── PARALLAX ── */
    document.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth - .5) * 18;
        const y = (e.clientY / window.innerHeight - .5) * 18;
        const arcSvg = document.querySelector('.arc-container svg');
        if (arcSvg) arcSvg.style.transform = `translate(${x * -.7}px,${y * -.7}px)`;
    });
});

function initParticles() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const NUM = 55,
        MAX_DIST = 120;
    const resize = () => {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const random = (min, max) => Math.random() * (max - min) + min;
    for (let i = 0; i < NUM; i++) particles.push({
        x: random(0, W),
        y: random(0, H),
        vx: random(-0.25, 0.25),
        vy: random(-0.25, 0.25),
        size: random(.8, 2.2),
        opacity: random(.15, .45)
    });

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
                dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 80) {
                p.vx += dx / dist * .02;
                p.vy += dy / dist * .02;
            }
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > .5) {
                p.vx = p.vx / speed * .5;
                p.vy = p.vy / speed * .5;
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
                    dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
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

function initCounters() {
    const targets = [{
        id: 'counter-hotels',
        target: 2400,
        suffix: '+'
    },
    {
        id: 'counter-rooms',
        target: 98,
        suffix: 'k+'
    },
    {
        id: 'counter-uptime',
        target: 99.9,
        suffix: '%',
        decimal: true
    },
    ];
    const dur = 2200;
    targets.forEach(({
        id,
        target,
        suffix,
        decimal
    }) => {
        const el = document.getElementById(id);
        if (!el) return;
        const start = performance.now();
        const step = now => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            const val = eased * target;
            el.textContent = (decimal ? val.toFixed(1) : Math.floor(val)) + suffix;
            if (t < 1) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 500);
    });
}
