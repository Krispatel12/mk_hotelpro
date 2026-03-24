document.addEventListener('DOMContentLoaded', () => {
    const hiddenInput = document.getElementById('otp-hidden');
    const boxes = [1, 2, 3, 4, 5, 6].map(i => document.getElementById(`box-${i}`));

    if (hiddenInput) {
        hiddenInput.addEventListener('input', (e) => {
            const val = e.target.value;
            boxes.forEach((box, i) => {
                box.innerText = val[i] || '';
                box.classList.toggle('active', i === val.length);
            });
        });

        // Focus management
        document.body.addEventListener('click', () => hiddenInput.focus());
    }

    // Countdown Timer
    let time = 60;
    const countdown = document.getElementById('countdown');
    const resendBtn = document.getElementById('resend-btn');
    if (countdown && resendBtn) {
        const interval = setInterval(() => {
            time--;
            countdown.innerText = time;
            if (time <= 0) {
                clearInterval(interval);
                resendBtn.disabled = false;
                const timerText = document.getElementById('timer-text');
                if (timerText) timerText.style.opacity = '0.5';
            }
        }, 1000);
    }

    const otpForm = document.getElementById('otp-form');
    if (otpForm) {
        otpForm.addEventListener('submit', () => {
            const btn = document.getElementById('verify-btn');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AUTHENTICATING...';
                btn.style.opacity = '0.8';
            }
        });
    }

    // Professional Parallax Effect
    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;

        const arcs = document.querySelector('.arc-container svg');
        const glassBoxes = document.querySelectorAll('.glass-box');

        if (arcs) arcs.style.transform = `translate(${x * -1}px, ${y * -1}px)`;

        glassBoxes.forEach((box, i) => {
            const depth = (i + 1) * 1.5;
            box.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
        });
    });
});
