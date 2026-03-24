/* ══════════════════════════════════════════════════
   CUSTOMER CHECKOUT LOGIC - ADVANCED CALCULATIONS
══════════════════════════════════════════════════ */

let activeCoupon = null;

function calcTotal() {
    const ciInput = document.getElementById('check_in');
    const coInput = document.getElementById('check_out');
    const basePriceEl = document.getElementById('base_price');
    const nightsEl = document.getElementById('display_nights');
    const calcEl = document.getElementById('display_calc');
    const totalEl = document.getElementById('total_price');
    const discountRow = document.getElementById('discount_row');
    const discountEl = document.getElementById('display_discount');

    if (!ciInput || !coInput || !basePriceEl) return;

    const ci = ciInput.value;
    const co = coInput.value;
    const priceText = basePriceEl.innerText;
    const basePrice = parseFloat(priceText.replace(/[^\d.-]/g, ''));

    if (ci && co && basePrice) {
        const start = new Date(ci);
        const end = new Date(co);
        const diffTime = end - start;
        const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (nights > 0) {
            let baseTotal = nights * basePrice;
            let finalTotal = baseTotal;
            let discountAmount = 0;
            let discountPercent = 0;

            // 1. Check for manual coupon first (it overrides radio selection in current logic)
            if (activeCoupon) {
                discountPercent = activeCoupon.discount;
                discountAmount = (baseTotal * discountPercent) / 100;

                // Max discount cap check
                if (activeCoupon.max_discount && discountAmount > activeCoupon.max_discount) {
                    discountAmount = activeCoupon.max_discount;
                }

                finalTotal = baseTotal - discountAmount;
            }
            // 2. Check for selected radio offer
            else {
                const selectedOffer = document.querySelector('input[name="offer_id"]:checked');
                if (selectedOffer) {
                    discountPercent = parseFloat(selectedOffer.dataset.discount);
                    discountAmount = (baseTotal * discountPercent) / 100;
                    finalTotal = baseTotal - discountAmount;
                }
            }

            if (discountAmount > 0) {
                if (discountRow) {
                    discountRow.style.display = 'flex';
                    discountEl.innerText = '-₹' + discountAmount.toFixed(0) + (discountPercent > 0 ? ' (' + discountPercent + '%)' : '');
                }
            } else {
                if (discountRow) discountRow.style.display = 'none';
            }

            if (nightsEl) nightsEl.innerText = nights + (nights === 1 ? ' night' : ' nights');
            if (calcEl) calcEl.innerText = '₹' + basePrice.toFixed(0) + ' × ' + nights;
            if (totalEl) totalEl.innerText = '₹' + finalTotal.toFixed(0);
        } else {
            if (nightsEl) nightsEl.innerText = '—';
            if (calcEl) calcEl.innerText = '—';
            if (totalEl) totalEl.innerText = '₹0';
            if (discountRow) discountRow.style.display = 'none';
        }
    }
}

async function validateCoupon() {
    const code = document.getElementById('coupon_code').value.trim();
    const hotelId = document.getElementById('hotel_id').value;
    const statusEl = document.getElementById('coupon_status');
    const csrfToken = document.getElementById('csrf_token').value;

    // Calc current amount for min spend check
    const ci = document.getElementById('check_in').value;
    const co = document.getElementById('check_out').value;
    const basePrice = parseFloat(document.getElementById('base_price').innerText.replace(/[^\d.-]/g, ''));

    if (!code) return;

    const nights = Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
    const amount = nights * basePrice;

    statusEl.innerText = 'Validating...';
    statusEl.style.color = 'rgba(255,255,255,0.5)';

    try {
        const formData = new FormData();
        formData.append('code', code);
        formData.append('hotel_id', hotelId);
        formData.append('amount', amount);
        formData.append('csrfmiddlewaretoken', csrfToken);

        const response = await fetch('/explore/api/validate-coupon/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const data = await response.json();

        if (data.valid) {
            activeCoupon = data;
            statusEl.innerText = data.message;
            statusEl.style.color = '#10b981';

            // Uncheck any offer radio buttons to avoid confusion
            document.querySelectorAll('input[name="offer_id"]').forEach(r => r.checked = false);

            calcTotal();
        } else {
            activeCoupon = null;
            statusEl.innerText = data.message;
            statusEl.style.color = '#ef4444';
            calcTotal();
        }
    } catch (error) {
        statusEl.innerText = 'Coupon service unavailable.';
        statusEl.style.color = '#ef4444';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const ciInput = document.getElementById('check_in');
    const coInput = document.getElementById('check_out');
    const offerRadios = document.querySelectorAll('input[name="offer_id"]');

    if (ciInput) ciInput.addEventListener('change', calcTotal);
    if (coInput) coInput.addEventListener('change', calcTotal);

    offerRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // If selecting a radio, clear manual coupon
            activeCoupon = null;
            document.getElementById('coupon_code').value = '';
            document.getElementById('coupon_status').innerText = '';
            calcTotal();
        });
    });

    // Initial calculation
    calcTotal();
});
