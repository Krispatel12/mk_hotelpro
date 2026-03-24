/**
 * Strategy Simulator & Offer Interactions
 * HotelPro Enterprise Design System
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('strategyForm');
    if (!form) return;

    const discountType = document.getElementById('discount_type');
    const discountValue = document.getElementById('discount_value');
    const checkboxes = document.querySelectorAll('input[name="room_categories"]');

    // Preview Elements
    const prevOld = document.getElementById('prev-old');
    const prevNew = document.getElementById('prev-new');
    const prevSavings = document.getElementById('prev-savings');
    const prevBase = document.getElementById('prev-base');
    const prevBurn = document.getElementById('prev-burn');
    const prevNet = document.getElementById('prev-net');

    function updateSimulator() {
        let totalOld = 0;
        let selectedCount = 0;

        checkboxes.forEach(cb => {
            if (cb.checked) {
                const row = cb.closest('.selection-row');
                totalOld += parseFloat(row.dataset.price);
                selectedCount++;
            }
        });

        if (selectedCount === 0) {
            resetSimulator();
            return;
        }

        const avgOld = totalOld / selectedCount;
        const discType = discountType.value;
        const discVal = parseFloat(discountValue.value) || 0;

        let avgNew = avgOld;
        let savingsPercent = 0;

        if (discType === 'PERCENT') {
            savingsPercent = discVal;
            avgNew = avgOld * (1 - (discVal / 100));
        } else {
            avgNew = Math.max(0, avgOld - discVal);
            savingsPercent = avgOld > 0 ? (discVal / avgOld) * 100 : 0;
        }

        const burn = (avgOld - avgNew) * selectedCount;
        const base = avgOld * selectedCount;
        const net = avgNew * selectedCount;

        // Animate values
        animateValue(prevOld, avgOld, '₹');
        animateValue(prevNew, avgNew, '₹');
        prevSavings.textContent = `${Math.round(savingsPercent)}% REDUCTION`;

        animateValue(prevBase, base, '₹');
        animateValue(prevBurn, -burn, '₹');
        animateValue(prevNet, net, '₹');
    }

    function resetSimulator() {
        prevOld.textContent = '₹0';
        prevNew.textContent = '₹0';
        prevSavings.textContent = '0% REDUCTION';
        prevBase.textContent = '₹0';
        prevBurn.textContent = '-₹0';
        prevNet.textContent = '₹0';
    }

    function animateValue(el, val, prefix = '') {
        const target = parseFloat(val) || 0;
        const current = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
        const duration = 500;
        const start = performance.now();

        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const currentVal = current + (target - current) * progress;
            el.textContent = `${prefix}${Math.round(currentVal).toLocaleString()}`;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // Event Listeners
    discountType.addEventListener('change', updateSimulator);
    discountValue.addEventListener('input', updateSimulator);
    checkboxes.forEach(cb => cb.addEventListener('change', updateSimulator));

    // Initial Update
    updateSimulator();

    // Archetype Selection Logic
    document.querySelectorAll('.archetype-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.archetype-pill').forEach(p => p.classList.remove('active-archetype'));
            pill.classList.add('active-archetype');
            document.getElementById('offer_type_input').value = pill.dataset.value;

            // Add a little punch animation
            pill.style.transform = 'scale(0.95)';
            setTimeout(() => pill.style.transform = '', 100);
        });
    });
});
