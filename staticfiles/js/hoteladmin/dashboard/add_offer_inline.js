document.addEventListener('DOMContentLoaded', () => {

  // ─── Initialize Delays ───
  document.querySelectorAll('[data-delay]').forEach(el => {
    el.style.animationDelay = el.dataset.delay;
  });
  const dashboardCont = document.getElementById('mainDashboardCont');
  if (dashboardCont) dashboardCont.style.animationDelay = '0.8s';

  /**
   * OfferEngine: Elite Orchestration Logic
   * Modular state management for the professional offer canvas.
   */
  class OfferEngine {
    constructor() {
      this.customPerksList = [];
      this.selectors = {
        form: document.getElementById('strategicForm'),
        offerName: document.getElementById('offerName'),
        promoType: document.getElementById('promoType'),
        discountValue: document.getElementById('discountValue'),
        magnitudeWrapper: document.getElementById('magnitudeWrapper'),
        offerCategory: document.getElementById('offerCategory'),
        minNightsStay: document.getElementById('minNightsStay'),
        perksInput: document.getElementById('perksInput'),
        isLiveInput: document.getElementById('isLiveInput'),
        saveDraftBtn: document.getElementById('saveDraftBtn'),
        activateCampaignBtn: document.getElementById('activateCampaignBtn'),
        customPerkInput: document.getElementById('customPerkInput'),
        addCustomPerkBtn: document.getElementById('addCustomPerkBtn')
      };
      this.state = { hotels: [] };
      this.roomsByHotel = {};
      this.customPerksList = [];
      this.perkIcons = {
        'wifi': 'fa-wifi',
        'wi-fi': 'fa-wifi',
        'internet': 'fa-globe',
        'breakfast': 'fa-coffee',
        'pool': 'fa-swimming-pool',
        'spa': 'fa-spa',
        'gym': 'fa-dumbbell',
        'parking': 'fa-car',
        'bar': 'fa-glass-martini-alt',
        'ac': 'fa-wind',
        'tv': 'fa-tv',
        'check-in': 'fa-sign-in-alt',
        'check-out': 'fa-sign-out-alt',
        'late': 'fa-clock',
        'early': 'fa-hourglass-start',
        'welcome': 'fa-wine-glass-alt',
        'drink': 'fa-glass-cheers',
        'transfer': 'fa-shuttle-van',
        'shuttle': 'fa-shuttle-van',
        'airport': 'fa-plane-arrival',
        'upgrade': 'fa-arrow-alt-circle-up',
        'credit': 'fa-hand-holding-usd',
        'voucher': 'fa-ticket-alt',
        'meal': 'fa-utensils',
        'dinner': 'fa-utensils-alt',
        'all-inclusive': 'fa-infinity',
        'concierge': 'fa-concierge-bell',
        'diamond': 'fa-gem',
        'luxury': 'fa-gem',
        'gift': 'fa-gift',
        'tour': 'fa-map-marked-alt',
        'service': 'fa-bell',
        'room': 'fa-door-open'
      };
    }

    init() {
      this.initEliteSelects();
      this.initLuxePicker();
      this.initStarters();
      this.initPerks();
      this.initStacking();
      this.initCombinable();
      this.initHotels();
      this.initRooms();
      this.initModal(); // Ensure modal-specific state is ready
      this.bindEvents(); // Bind all high-fidelity interactions
      this.syncAll();
      this.showDiscoveryHint(); // Trigger World-Class onboarding
    }

    initEliteSelects() {
      const containers = document.querySelectorAll('.elite-select-container');

      containers.forEach(container => {
        const trigger = container.querySelector('.elite-select-trigger');
        const input = container.querySelector('input[type="hidden"]');
        const valueDisplay = container.querySelector('.elite-select-value');
        const options = container.querySelectorAll('.elite-select-option');

        // Robust opening: click on container or trigger
        container.addEventListener('click', (e) => {
          e.stopPropagation();
          // Close others
          document.querySelectorAll('.elite-select-container.active').forEach(c => {
            if (c !== container) c.classList.remove('active');
          });
          container.classList.toggle('active');
        });

        options.forEach(option => {
          option.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = option.dataset.value;
            const label = option.querySelector('.option-label').textContent;

            if (input) {
              input.value = val;
              input.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (valueDisplay) valueDisplay.textContent = label;

            options.forEach(opt => opt.classList.remove('selected'));
            options.forEach(opt => {
              const check = opt.querySelector('.option-check');
              if (check) check.remove();
            });

            option.classList.add('selected');
            option.insertAdjacentHTML('beforeend', '<i class="fas fa-check option-check"></i>');

            container.classList.add('has-value');
            container.classList.remove('active');
            this.updatePreview();

            if (input?.id === 'promoType') this.updateMagnitudeVisibility();
          });
        });
      });

      document.addEventListener('click', () => {
        document.querySelectorAll('.elite-select-container.active').forEach(c => c.classList.remove('active'));
      });
    }

    // ─── LuxePicker: Premium Custom Range Calendar ───
    initLuxePicker() {
      const card = document.getElementById('dateRangeCard');
      if (!card) return;

      // State
      let startDate = null;
      let endDate = null;
      let selecting = false; // true after first click (picking end)
      let today = new Date(); today.setHours(0, 0, 0, 0);

      // Pre-fill from existing offer data
      const preStart = document.getElementById('startDateHidden')?.value;
      const preEnd = document.getElementById('endDateHidden')?.value;
      if (preStart) { startDate = new Date(preStart); startDate.setHours(0, 0, 0, 0); }
      if (preEnd) { endDate = new Date(preEnd); endDate.setHours(0, 0, 0, 0); }

      // ── Build popup DOM ──────────────────────────────────────────
      const popup = document.createElement('div');
      popup.className = 'lp-popup';
      popup.id = 'luxePickerPopup';
      popup.innerHTML = `
        <div class="lp-popup-header">
          <div class="lp-title"><i class="fas fa-calendar-check"></i> Select Campaign Window</div>
          <button class="lp-close-btn" id="lpCloseBtn" type="button"><i class="fas fa-times"></i></button>
        </div>
        <div class="lp-months">
          <div class="lp-month-pane" id="lpPane0">
            <div class="lp-month-nav">
              <button class="lp-nav-btn" id="lpPrev" type="button"><i class="fas fa-chevron-left"></i></button>
              <div class="lp-month-label" id="lpLabel0"></div>
              <div style="width:32px"></div>
            </div>
            <div class="lp-dow-row">
              ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<div class="lp-dow">${d}</div>`).join('')}
            </div>
            <div class="lp-day-grid" id="lpGrid0"></div>
          </div>
          <div class="lp-month-pane" id="lpPane1">
            <div class="lp-month-nav">
              <div style="width:32px"></div>
              <div class="lp-month-label" id="lpLabel1"></div>
              <button class="lp-nav-btn" id="lpNext" type="button"><i class="fas fa-chevron-right"></i></button>
            </div>
            <div class="lp-dow-row">
              ${['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => `<div class="lp-dow">${d}</div>`).join('')}
            </div>
            <div class="lp-day-grid" id="lpGrid1"></div>
          </div>
        </div>
        <div class="lp-popup-footer">
          <div class="lp-range-preview">
            <span class="lp-range-chip lp-empty" id="lpChipS">Pick Start</span>
            <i class="fas fa-arrow-right lp-range-sep"></i>
            <span class="lp-range-chip lp-empty" id="lpChipE">Pick End</span>
          </div>
          <div class="lp-footer-actions">
            <button class="lp-btn-clear" id="lpClearBtn" type="button">Clear</button>
            <button class="lp-btn-apply" id="lpApplyBtn" type="button" disabled>Apply Range</button>
          </div>
        </div>
      `;
      card.appendChild(popup);

      // ── Current view state ───────────────────────────────────────
      let viewYear = today.getFullYear();
      let viewMonth = today.getMonth(); // 0-indexed

      // ── Helpers ─────────────────────────────────────────────────
      const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const fmt = (d) => d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
      const fmtChip = (d) => d ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
      const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
      const isBetween = (d, a, b) => a && b && d > a && d < b;
      const toISO = (d) => {
        if (!d) return '';
        const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // ── Smart Hover Handling (no full re-render) ─────────────────
      const updateHoverClasses = (hDate) => {
        if (!selecting || !startDate || endDate) return;
        const days = popup.querySelectorAll('.lp-day:not(.lp-empty):not(.lp-past)');
        days.forEach(el => {
          const dDate = new Date(el.dataset.date);
          const effStart = hDate < startDate ? hDate : startDate;
          const effEnd = hDate < startDate ? startDate : hDate;

          el.classList.remove('lp-in-range', 'lp-selected-end', 'lp-range-segment-start', 'lp-range-segment-end');

          if (sameDay(dDate, hDate) && !sameDay(hDate, startDate)) {
            el.classList.add('lp-selected-end');
          }
          if (isBetween(dDate, effStart, effEnd)) {
            el.classList.add('lp-in-range');
            const dNum = dDate.getDate();
            const daysInMonth = new Date(dDate.getFullYear(), dDate.getMonth() + 1, 0).getDate();
            if (dDate.getDay() === 0 || dNum === 1) el.classList.add('lp-range-segment-start');
            if (dDate.getDay() === 6 || dNum === daysInMonth) el.classList.add('lp-range-segment-end');
          }
        });

        // Update footer chip
        const chipE = document.getElementById('lpChipE');
        if (chipE) {
          chipE.textContent = fmtChip(hDate);
          chipE.classList.remove('lp-empty');
        }
      };

      // ── Render two month grids ───────────────────────────────────
      const renderMonth = (paneIdx, year, month) => {
        const label = document.getElementById(`lpLabel${paneIdx}`);
        const grid = document.getElementById(`lpGrid${paneIdx}`);
        if (!label || !grid) return;

        label.textContent = `${MONTHS[month]} ${year}`;
        grid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty slots before first day
        for (let i = 0; i < firstDay; i++) {
          const blank = document.createElement('div');
          blank.className = 'lp-day lp-empty';
          grid.appendChild(blank);
        }

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          const el = document.createElement('div');
          el.className = 'lp-day';
          el.textContent = d;
          el.dataset.date = toISO(date);

          if (date < today) el.classList.add('lp-past');
          else {
            if (sameDay(date, today)) el.classList.add('lp-today');
            if (sameDay(date, startDate)) el.classList.add('lp-selected-start');
            if (sameDay(date, endDate) && !sameDay(endDate, startDate)) el.classList.add('lp-selected-end');
            if (isBetween(date, startDate, endDate)) {
              el.classList.add('lp-in-range');
              if (date.getDay() === 0 || d === 1) el.classList.add('lp-range-segment-start');
              if (date.getDay() === 6 || d === daysInMonth) el.classList.add('lp-range-segment-end');
            }

            el.addEventListener('mouseenter', () => {
              if (selecting && startDate && !endDate) {
                updateHoverClasses(date);
                // Night count badge
                const nights = Math.abs(Math.round((date - startDate) / 864e5));
                if (nights > 0) {
                  const badge = document.createElement('span');
                  badge.className = 'lp-nights-badge visible';
                  badge.textContent = `${nights}n`;
                  el.appendChild(badge);
                }
              }
            });

            el.addEventListener('mouseleave', () => {
              const badge = el.querySelector('.lp-nights-badge');
              if (badge) badge.remove();
            });

            el.addEventListener('mousedown', (e) => {
              e.stopPropagation(); // Prevent card click
              // Ripple
              el.classList.add('lp-rippling');
              setTimeout(() => el.classList.remove('lp-rippling'), 500);

              if (!startDate || (!selecting && endDate)) {
                // First pick
                startDate = new Date(date);
                endDate = null;
                selecting = true;
              } else {
                // Second pick
                let secondDate = new Date(date);
                if (secondDate < startDate) {
                  endDate = new Date(startDate);
                  startDate = secondDate;
                } else {
                  endDate = secondDate;
                }
                selecting = false;
              }
              renderBoth();
              syncFooter();
            });
          }
          grid.appendChild(el);
        }
      };

      const renderBoth = (animDir = null) => {
        const p0 = document.getElementById('lpPane0');
        const p1 = document.getElementById('lpPane1');

        if (animDir && p0 && p1) {
          const cls = animDir === 'left' ? 'lp-anim-left' : 'lp-anim-right';
          p0.classList.remove('lp-anim-left', 'lp-anim-right');
          p1.classList.remove('lp-anim-left', 'lp-anim-right');
          void p0.offsetWidth; // reflow
          p0.classList.add(cls); p1.classList.add(cls);
          setTimeout(() => { p0.classList.remove(cls); p1.classList.remove(cls); }, 400);
        }

        let m2 = viewMonth + 1, y2 = viewYear;
        if (m2 > 11) { m2 = 0; y2++; }

        renderMonth(0, viewYear, viewMonth);
        renderMonth(1, y2, m2);

        // Disable prev if we're at current month
        const prevBtn = document.getElementById('lpPrev');
        if (prevBtn) {
          const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();
          prevBtn.disabled = isCurrentMonth;
        }
      };

      const syncFooter = () => {
        const chipS = document.getElementById('lpChipS');
        const chipE = document.getElementById('lpChipE');
        const applyBtn = document.getElementById('lpApplyBtn');

        if (chipS) { chipS.textContent = startDate ? fmtChip(startDate) : 'Pick Start'; chipS.classList.toggle('lp-empty', !startDate); }
        if (chipE) { chipE.textContent = endDate ? fmtChip(endDate) : (selecting ? 'Pick End…' : 'Pick End'); chipE.classList.toggle('lp-empty', !endDate); }
        if (applyBtn) {
          applyBtn.disabled = !(startDate && endDate);
          if (!applyBtn.disabled) applyBtn.style.opacity = '1';
        }
      };

      const syncCardDisplay = () => {
        const slotStart = document.getElementById('slotStart');
        const slotEnd = document.getElementById('slotEnd');
        const chipNights = document.getElementById('drcChipNights');
        const chipS = document.getElementById('drcChipStart');
        const chipE = document.getElementById('drcChipEnd');
        const nightsTxt = document.getElementById('drcNightsTxt');
        const startTxt = document.getElementById('drcStartTxt');
        const endTxt = document.getElementById('drcEndTxt');
        const clearBtn = document.getElementById('clearDatesBtn');
        const startHidden = document.getElementById('startDateHidden');
        const endHidden = document.getElementById('endDateHidden');

        if (startDate && endDate) {
          if (slotStart) slotStart.textContent = fmt(startDate);
          if (slotEnd) slotEnd.textContent = fmt(endDate);

          const nights = Math.round((endDate - startDate) / 864e5);
          if (nightsTxt) nightsTxt.textContent = `${nights} NIGHTS`;
          if (startTxt) startTxt.textContent = fmtChip(startDate);
          if (endTxt) endTxt.textContent = fmtChip(endDate);

          chipNights?.classList.add('active');
          chipS?.classList.add('active');
          chipE?.classList.add('active');
          card.classList.add('lp-has-range');
          clearBtn?.classList.add('visible');

          if (startHidden) startHidden.value = toISO(startDate);
          if (endHidden) endHidden.value = toISO(endDate);
        } else {
          if (slotStart) slotStart.innerHTML = '<span class="drc-slot-placeholder">Pick start</span>';
          if (slotEnd) slotEnd.innerHTML = '<span class="drc-slot-placeholder">Pick end</span>';
          chipNights?.classList.remove('active');
          chipS?.classList.remove('active');
          chipE?.classList.remove('active');
          card.classList.remove('lp-has-range');
          clearBtn?.classList.remove('visible');

          if (startHidden) startHidden.value = '';
          if (endHidden) endHidden.value = '';
        }

        if (this.updatePreview) this.updatePreview();
      };

      // ── Open / Close ─────────────────────────────────────────────
      let isOpen = false;

      const openPicker = () => {
        if (isOpen) return;
        isOpen = true;
        card.classList.add('lp-open');
        const parentCard = card.closest('.form-card');
        if (parentCard) parentCard.classList.add('lp-active-section');
        renderBoth();
        syncFooter();
        // Small tick so the transition plays
        requestAnimationFrame(() => popup.classList.add('lp-visible'));
      };

      const closePicker = () => {
        if (!isOpen) return;
        isOpen = false;
        card.classList.remove('lp-open');
        const parentCard = card.closest('.form-card');
        if (parentCard) parentCard.classList.remove('lp-active-section');
        popup.classList.remove('lp-visible');
      };

      card.addEventListener('click', (e) => {
        if (e.target.closest('#luxePickerPopup')) return;
        if (!isOpen) openPicker();
      });

      // Close on outside click
      document.addEventListener('mousedown', (e) => {
        if (isOpen && !card.contains(e.target)) closePicker();
      });

      // ── Nav buttons ──────────────────────────────────────────────
      document.getElementById('lpPrev')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        viewMonth--;
        if (viewMonth < 0) { viewMonth = 11; viewYear--; }
        renderBoth('right');
      });

      document.getElementById('lpNext')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        viewMonth++;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        renderBoth('left');
      });

      // ── Close/Clear/Apply buttons ────────────────────────────────
      document.getElementById('lpCloseBtn')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        closePicker();
      });

      document.getElementById('lpClearBtn')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDate = null; endDate = null; selecting = false;
        renderBoth();
        syncFooter();
        syncCardDisplay();
      });

      document.getElementById('lpApplyBtn')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        syncCardDisplay();
        closePicker();
      });

      // Old clear button in card header
      document.getElementById('clearDatesBtn')?.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        startDate = null; endDate = null; selecting = false;
        renderBoth();
        syncFooter();
        syncCardDisplay();
      });

      // ── Initial render if pre-filled ─────────────────────────────
      if (startDate) {
        viewYear = startDate.getFullYear();
        viewMonth = startDate.getMonth();
        syncCardDisplay();
      }
    }

    initModal() {
      // Professional Hardening: Eliminate all display conflicts by removing Tailwind utility
      document.querySelectorAll('.offer-stack-modal, .discovery-modal').forEach(m => {
        m.classList.remove('hidden');
        m.style.display = 'none'; // Set explicit base to allow CSS .active to win
      });
    }

    initRooms() {
      const roomData = document.getElementById('roomDataJson')?.textContent;
      if (roomData) {
        try {
          const raw = JSON.parse(roomData);
          raw.forEach(r => {
            if (!this.roomsByHotel[r.hotel_id]) this.roomsByHotel[r.hotel_id] = [];
            this.roomsByHotel[r.hotel_id].push(r);
          });
          this.renderRooms();
        } catch (e) { console.error("Room orchestration failure:", e); }
      }
    }
    initStarters() {
      const starters = document.querySelectorAll('.starter-card');
      starters.forEach(card => {
        card.addEventListener('click', () => {
          starters.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          this.applyTemplate(card);
        });
      });
    }

    applyTemplate(card) {
      if (!card) return;
      const d = card.dataset;

      // Core Identity Mapping
      if (this.selectors.offerName) this.selectors.offerName.value = d.name || "";

      // Select Synchronization Logic
      const syncSelect = (inputId, val) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = val;

        // Trigger generic change event to ensure other listeners fire
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const container = input.closest('.elite-select-container');
        if (!container) return;

        container.classList.add('has-value'); // Ensure label floats

        const option = container.querySelector(`.elite-select-option[data-value="${val}"]`);
        if (option) {
          const label = option.querySelector('.option-label').textContent;
          const display = container.querySelector('.elite-select-value');
          if (display) display.textContent = label;

          container.querySelectorAll('.elite-select-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('.option-check')?.remove();
          });
          option.classList.add('selected');
          option.insertAdjacentHTML('beforeend', '<i class="fas fa-check option-check"></i>');
        }
      };

      syncSelect('promoType', d.promoType || "PERCENT");

      // Fix: use nullish coalescing to avoid treating "0" as falsy
      if (this.selectors.discountValue) {
        this.selectors.discountValue.value = (d.discount !== undefined && d.discount !== "") ? d.discount : 0;
        // Animate label floating
        const wrap = this.selectors.discountValue.closest('.field-wrap');
        if (wrap) wrap.classList.add('has-value');
      }

      syncSelect('offerCategory', d.category || "PRICE");
      if (this.selectors.minNightsStay) this.selectors.minNightsStay.value = d.minNights || 1;

      // Update the magnitude symbol based on promo type (inline, no separate function needed)
      const promoVal = d.promoType || "PERCENT";
      const magSym = document.querySelector('.mag-sym');
      if (magSym) {
        magSym.textContent = promoVal === 'FIXED' ? '₹' : promoVal === 'PERCENT' ? '%' : '';
      }

      // Theme Orchestration
      const themeColors = {
        seasonal: { accent: '#E05D1A', soft: 'rgba(234,88,12,0.1)', bg: '#FFF4EC', text: '#9A3412' },
        stay: { accent: '#314ED7', soft: 'rgba(59,91,232,0.1)', bg: '#EEF2FF', text: '#1E3A8A' },
        experience: { accent: '#059669', soft: 'rgba(16,185,129,0.1)', bg: '#ECFDF5', text: '#064E3B' },
        growth: { accent: '#7C3AED', soft: 'rgba(124,58,237,0.1)', bg: '#F5F0FF', text: '#4C1D95' },
        urgency: { accent: '#E11D48', soft: 'rgba(225,29,72,0.1)', bg: '#FFF1F2', text: '#881337' },
        loyalty: { accent: '#D97706', soft: 'rgba(217,119,6,0.1)', bg: '#FFFBEB', text: '#78350F' },
        custom: { accent: '#2DD4BF', soft: 'rgba(45,212,191,0.2)', bg: '#0F172A', text: '#14B8A6' }
      };

      const c = themeColors[d.template] || themeColors.custom;
      this.applyTheme(c);

      // Strategic Perks Reset
      const defaultPerks = {
        seasonal: ['Complimentary Breakfast'],
        stay: ['Early Check-in', 'Complimentary Breakfast'],
        experience: ['Welcome Drink', 'Dinner Credit', 'Early Check-in'],
        urgency: ['Airport Transfer'],
        loyalty: ['Early Check-in', 'Late Check-out'],
        growth: [],
        custom: []
      };
      this.resetPerks(defaultPerks[d.template] || []);

      this.updatePreview();
    }

    applyTheme(theme) {
      const root = document.documentElement;
      root.style.setProperty('--theme-accent', theme.accent);
      root.style.setProperty('--theme-accent-soft', theme.soft);
      root.style.setProperty('--theme-bg-soft', theme.bg);
      root.style.setProperty('--theme-text-accent', theme.text);
      document.querySelectorAll('.form-card, .preview-card, .starter-card.active').forEach(el => {
        el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
      });
    }

    initPerks() {
      const initial = this.selectors.perksInput?.value;
      if (initial) {
        const perks = initial.split(',').filter(p => p.trim() !== '');
        const defaults = Array.from(document.querySelectorAll('.perk-input')).map(cb => cb.value);
        perks.forEach(p => { if (!defaults.includes(p.trim())) this.customPerksList.push(p.trim()); });
      }
      this.selectors.addCustomPerkBtn?.addEventListener('click', () => this.addCustomPerk());
      this.selectors.customPerkInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.addCustomPerk(); } });
      document.querySelectorAll('.perk-card').forEach(card => {
        if (card.classList.contains('co-card')) return;
        card.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') { const cb = card.querySelector('.perk-input'); if (cb) cb.checked = !cb.checked; }
          this.syncPerks();
        });
      });
      this.renderCustomPerks();
      this.injectIcons();
    }

    addCustomPerk() {
      const val = this.selectors.customPerkInput?.value.trim();
      if (val && !this.customPerksList.includes(val)) {
        this.customPerksList.push(val);
        if (this.selectors.customPerkInput) this.selectors.customPerkInput.value = '';
        this.renderCustomPerks();
      }
    }

    removeCustomPerk(index) {
      this.customPerksList.splice(index, 1);
      this.renderCustomPerks();
    }

    getPerkIcon(name) {
      if (!name) return 'fa-sparkles';
      const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const [key, icon] of Object.entries(this.perkIcons)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.includes(normalizedKey)) return icon;
      }
      return null; // Return null to trigger stylized placeholder
    }

    injectIcons() {
      document.querySelectorAll('.perk-card:not(.custom-perk-item) .perk-icon-wrapper i').forEach(iconEl => {
        const name = iconEl.dataset.perkName;
        if (name) iconEl.className = `fas ${this.getPerkIcon(name)}`;
      });
    }

    renderCustomPerks() {
      const container = document.getElementById('customPerksContainer');
      if (!container) return;
      container.innerHTML = '';

      this.customPerksList.forEach((perk, index) => {
        const icon = this.getPerkIcon(perk);
        const card = document.createElement('div');
        card.className = 'perk-card checked custom-perk-item animate-elite';
        card.style.animationDelay = `${index * 50}ms`;

        const iconHtml = icon
          ? `<i class="fas ${icon}"></i>`
          : `<span style="font-family: 'Outfit'; font-weight: 900; font-size: 1.1rem; opacity: 0.8;">${perk.charAt(0).toUpperCase()}</span>`;

        card.innerHTML = `
          <div class="perk-icon-wrapper" style="background: linear-gradient(135deg, var(--theme-accent-soft) 0%, white 100%);">
            ${iconHtml}
          </div>
          <span class="perk-name">${perk}</span>
          <div class="remove-perk-btn" onclick="engine.removeCustomPerk(${index})">
            <i class="fas fa-times"></i>
          </div>
        `;
        container.appendChild(card);
      });
      this.syncPerks();
    }

    resetPerks(values) {
      document.querySelectorAll('.perk-input').forEach(cb => { cb.checked = values.includes(cb.value); });
      const defaults = Array.from(document.querySelectorAll('.perk-input')).map(cb => cb.value);
      this.customPerksList = values.filter(v => !defaults.includes(v));
      this.renderCustomPerks();
      this.injectIcons();
    }

    syncPerks() {
      document.querySelectorAll('.perk-input').forEach(cb => {
        cb.closest('.perk-card')?.classList.toggle('checked', cb.checked);
      });
      if (this.selectors.perksInput) {
        const active = [...Array.from(document.querySelectorAll('.perk-input:checked')).map(c => c.value), ...this.customPerksList];
        this.selectors.perksInput.value = active.join(',');
      }
      this.updatePreview();
    }

    initStacking() {
      const track = document.getElementById('stackTrack');
      const left = document.getElementById('stackLabelLeft');
      const right = document.getElementById('stackLabelRight');

      if (left) left.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyStackingMode(true);
      });

      if (right) right.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyStackingMode(false);
      });

      if (track) track.addEventListener('click', () => {
        const isStackable = document.getElementById('radio-stackable-input')?.checked;
        this.applyStackingMode(!isStackable);
      });
    }

    applyStackingMode(isStackable) {
      const elements = {
        pill: document.getElementById('stackPill'),
        track: document.getElementById('stackTrack'),
        leftLabel: document.getElementById('stackLabelLeft'),
        rightLabel: document.getElementById('stackLabelRight'),
        badge: document.getElementById('stackStateBadge'),
        pillIcon: document.getElementById('stackPillIcon'),
        combinableSection: document.getElementById('combinableOffersSection'),
        stackInput: document.getElementById('radio-stackable-input'),
        isolatedInput: document.getElementById('radio-isolated-input'),
        overlay: document.getElementById('stackingLockOverlay')
      };

      if (elements.stackInput) elements.stackInput.checked = isStackable;
      if (elements.isolatedInput) elements.isolatedInput.checked = !isStackable;

      if (elements.pill) elements.pill.classList.toggle('right', !isStackable);
      if (elements.track) {
        elements.track.classList.toggle('stack-track-active-left', isStackable);
        elements.track.classList.toggle('stack-track-active-right', !isStackable);
      }
      if (elements.leftLabel) elements.leftLabel.classList.toggle('active', isStackable);
      if (elements.rightLabel) elements.rightLabel.classList.toggle('active', !isStackable);
      if (elements.pillIcon) elements.pillIcon.className = isStackable ? 'fas fa-layer-group' : 'fas fa-lock';

      if (elements.badge) {
        elements.badge.className = `stack-state-badge ${isStackable ? 'stackable' : 'isolated'}`;
        elements.badge.innerHTML = isStackable
          ? '<i class="fas fa-check-circle"></i> Stackable — this offer can be combined with others'
          : '<i class="fas fa-lock"></i> Isolated — this offer runs standalone only';
      }

      if (elements.combinableSection) {
        elements.combinableSection.classList.toggle('co-section-locked', !isStackable);
        if (elements.overlay) elements.overlay.classList.toggle('co-overlay-hidden', isStackable);
        if (!isStackable) {
          document.querySelectorAll('.co-input').forEach(cb => { cb.checked = false; });
          this.syncCombinableOffers();
        }
      }
      this.updatePreview();
    }

    initCombinable() {
      const search = document.getElementById('offerSearchInput');
      const clear = document.getElementById('clearOffersBtn');
      const selectAll = document.getElementById('selectAllOffersFilteredBtn');

      if (search) {
        search.addEventListener('input', (e) => this.applyOfferVisibility(e.target.value));
        search.addEventListener('keydown', (e) => { if (e.key === 'Escape') { search.value = ''; this.applyOfferVisibility(''); } });
      }
      if (clear) clear.addEventListener('click', () => {
        document.querySelectorAll('.co-input').forEach(cb => { cb.checked = false; });
        this.syncCombinableOffers();
      });
      if (selectAll) selectAll.addEventListener('click', () => {
        document.querySelectorAll('.co-card').forEach(card => {
          if (card.style.display !== 'none') { const cb = card.querySelector('.co-input'); if (cb) cb.checked = true; }
        });
        this.syncCombinableOffers();
      });

      document.querySelectorAll('.co-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.tagName !== 'INPUT') { const cb = card.querySelector('.co-input'); if (cb) cb.checked = !cb.checked; }
          this.syncCombinableOffers();
        });
      });
    }

    syncCombinableOffers() {
      document.querySelectorAll('.co-input').forEach(cb => {
        cb.closest('.co-card')?.classList.toggle('checked', cb.checked);
      });
      this.updatePreview();
    }

    applyOfferVisibility(query) {
      const q = (query || '').trim().toLowerCase();
      let visibleCount = 0;
      document.querySelectorAll('.co-card').forEach(card => {
        const matches = q === '' || (card.dataset.offerName || '').toLowerCase().includes(q);
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      const noResults = document.getElementById('offerNoResults');
      if (noResults) noResults.style.display = (q !== '' && visibleCount === 0) ? 'block' : 'none';
    }

    initHotels() {
      const hotelGrid = document.getElementById('hotelGrid');
      const searchInput = document.getElementById('hotelSearchInput');
      const selectAllBtn = document.getElementById('selectAllHotelsBtn');
      const clearAllBtn = document.getElementById('clearAllHotelsBtn');

      if (!hotelGrid) return;

      // ── Individual hotel cards ──
      hotelGrid.querySelectorAll('.individual-hotel').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          const cb = card.querySelector('.individual-hotel-input');
          if (cb) { cb.checked = !cb.checked; this.syncHotels(); }
        });
      });

      // ── Toolbar: Select All ──
      selectAllBtn?.addEventListener('click', () => {
        document.querySelectorAll('.individual-hotel-input').forEach(cb => cb.checked = true);
        this.syncHotels();
      });

      // ── Toolbar: Clear All ──
      clearAllBtn?.addEventListener('click', () => {
        document.querySelectorAll('.individual-hotel-input').forEach(cb => cb.checked = false);
        this.syncHotels();
      });

      // ── Search filter ──
      searchInput?.addEventListener('input', (e) => this.applyHotelVisibility(e.target.value));
      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { if (searchInput) searchInput.value = ''; this.applyHotelVisibility(''); }
      });

      // Apply initial active states based on checked checkboxes
      this.syncHotels();
    }

    syncHotels() {
      // Sync individual hotel card .active class to match their checkbox state
      document.querySelectorAll('.individual-hotel').forEach(card => {
        const cb = card.querySelector('.individual-hotel-input');
        if (cb) card.classList.toggle('active', cb.checked);
      });

      const selected = Array.from(document.querySelectorAll('.individual-hotel-input:checked'))
        .map(cb => cb.value);
      this.state.hotels = selected;

      this.renderRooms();
      this.updatePreview();
    }

    applyHotelVisibility(query) {
      const q = (query || '').trim().toLowerCase();
      let visibleCount = 0;
      document.querySelectorAll('.individual-hotel').forEach(card => {
        const name = (card.dataset.hotelName || '').toLowerCase();
        const matches = q === '' || name.includes(q);
        card.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });
      const noResults = document.getElementById('hotelNoResults');
      if (noResults) noResults.style.display = (q !== '' && visibleCount === 0) ? 'block' : 'none';
    }

    initRooms() {
      const dataEl = document.getElementById('roomsData');
      if (dataEl) {
        try { this.roomsByHotel = JSON.parse(dataEl.textContent); }
        catch (e) { console.error("Room logic corrupted:", e); }
      }

      const search = document.getElementById('roomSearchInput');
      if (search) search.addEventListener('input', () => this.renderRooms());

      document.getElementById('selectAllRoomsFilteredBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)').forEach(card => {
          if (card.style.display !== 'none') card.classList.add('rc-selected');
        });
        this.syncRoomSelector();
      });

      document.getElementById('clearRoomsBtn')?.addEventListener('click', () => {
        document.querySelectorAll('.rc-selected').forEach(c => c.classList.remove('rc-selected'));
        this.syncRoomSelector();
      });

      document.querySelectorAll('.room-mode-card').forEach(card => {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const radio = card.querySelector('.mode-input');
          if (radio) {
            radio.checked = true;
            this.applyRoomMode(radio.value);
          }
        });
      });
    }

    renderRooms() {
      const grid = document.getElementById('roomCardGrid');
      if (!grid) return;

      const selectedHotels = Array.from(document.querySelectorAll('.individual-hotel-input:checked')).map(cb => cb.value);
      const q = (document.getElementById('roomSearchInput')?.value || '').toLowerCase().trim();
      const currentlySelected = Array.from(grid.querySelectorAll('.rc-selected')).map(c => c.dataset.roomValue);

      grid.querySelectorAll('.room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)').forEach(c => c.remove());

      let rooms = [];
      selectedHotels.forEach(hid => { if (this.roomsByHotel[hid]) rooms = rooms.concat(this.roomsByHotel[hid]); });
      if (q) rooms = rooms.filter(r => r.name.toLowerCase().includes(q) || r.room_class.toLowerCase().includes(q));

      const noResults = document.getElementById('roomNoResults');
      if (noResults) noResults.style.display = (rooms.length === 0 && selectedHotels.length > 0) ? 'block' : 'none';

      rooms.forEach((room, index) => {
        const isSelected = currentlySelected.includes(room.id.toString());
        const html = `
          <div class="room-card ${isSelected ? 'rc-selected' : ''}" 
               data-room-value="${room.id}" 
               data-name="${room.name}" 
               data-class="${room.room_class}" 
               data-price="${room.base_price}" 
               data-guests="${room.max_guests}" 
               data-image="${room.image}"
               style="--stagger: ${index % 15}">
            <div class="hotel-card-image">
              ${room.image ? `<img src="${room.image}" alt="${room.name}">` : `<i class="fas fa-bed"></i>`}
              <div class="card-tick-circle"><i class="fas fa-check"></i></div>
            </div>
            <div class="card-info-stack" style="padding: 1.5rem;">
              <div class="card-meta-subtitle" style="margin-bottom: 2px;">${room.room_class}</div>
              <div class="card-main-title" style="font-size: 17px;">${room.name}</div>
              <div class="status-tag-price">
                <i class="fas fa-tag" style="font-size: 0.75rem; opacity: 0.6;"></i>
                ₹${room.base_price.toLocaleString('en-IN')} • ${room.max_guests} Guests
              </div>
            </div>
          </div>`;
        grid.insertAdjacentHTML('beforeend', html);
      });

      this.bindRoomCardEvents();
      this.syncRoomSelector();
    }

    bindRoomCardEvents() {
      document.querySelectorAll('#roomCardGrid .room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)').forEach(card => {
        card.addEventListener('click', () => {
          card.classList.toggle('rc-selected');
          this.syncRoomSelector();
        });
      });
    }

    syncRoomSelector() {
      const selector = document.getElementById('roomSelector');
      if (!selector) return;
      const mode = document.querySelector('input[name="room_selection_mode"]:checked')?.value || 'ALL';
      if (mode === 'ALL') {
        selector.innerHTML = '<option value="ALL" selected>All Room Categories</option>';
      } else {
        selector.innerHTML = '';
        const selectedCards = document.querySelectorAll('.rc-selected:not(.room-card-all)');
        selectedCards.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.dataset.roomValue; opt.selected = true;
          selector.appendChild(opt);
        });
      }
      this.updatePreview();
    }

    applyRoomMode(mode) {
      document.querySelectorAll('.room-mode-card').forEach(card => {
        const radio = card.querySelector('.mode-input');
        card.classList.toggle('active', radio && radio.value === mode);
      });

      const elements = {
        toolbar: document.getElementById('roomToolbar'),
        searchWrap: document.getElementById('roomSearchWrap'),
        clrBtn: document.getElementById('clearRoomsBtn'),
        selAllBtn: document.getElementById('selectAllRoomsFilteredBtn'),
        grid: document.getElementById('roomCardGrid')
      };

      const isSpecific = mode === 'SPECIFIC';
      if (elements.toolbar) elements.toolbar.style.display = isSpecific ? 'flex' : 'none';
      if (elements.searchWrap) elements.searchWrap.style.display = isSpecific ? 'flex' : 'none';
      if (elements.clrBtn) elements.clrBtn.style.display = isSpecific ? 'block' : 'none';
      if (elements.selAllBtn) elements.selAllBtn.style.display = isSpecific ? 'block' : 'none';
      if (elements.grid) elements.grid.style.display = isSpecific ? 'grid' : 'none';

      if (isSpecific) this.renderRooms();
      this.syncRoomSelector();
    }

    updatePreview() {
      const p = {
        name: document.getElementById('previewRoomName'),
        class: document.getElementById('previewRoomClass'),
        guests: document.getElementById('previewRoomGuests'),
        img: document.getElementById('previewRoomImage'),
        base: document.getElementById('previewBasePrice'),
        val: document.getElementById('previewValueText'),
        badge: document.getElementById('previewBadge'),
        label: document.getElementById('previewOfferLabel'),
        stack: document.getElementById('previewStackCount')
      };

      const isSpecific = document.querySelector('input[name="room_selection_mode"]:checked')?.value === 'SPECIFIC';
      const selected = document.querySelectorAll('.rc-selected:not(.starter-card):not(.os-modal-card):not(.room-card-all)');

      if (isSpecific && selected.length > 0) {
        const first = selected[0];
        if (selected.length === 1) {
          if (p.name) p.name.textContent = first.dataset.name;
          if (p.class) p.class.textContent = first.dataset.class;
          if (p.guests) p.guests.textContent = first.dataset.guests;
          if (p.base) p.base.textContent = `₹${parseFloat(first.dataset.price).toLocaleString('en-IN')}`;
        } else {
          if (p.name) p.name.textContent = `Applies to ${selected.length} Rooms`;
          if (p.class) p.class.textContent = 'Mixed Categories';
          if (p.guests) p.guests.textContent = 'Various';
          if (p.base) p.base.textContent = `From ₹${parseFloat(first.dataset.price).toLocaleString('en-IN')}`;
        }
        if (p.img) p.img.src = first.dataset.image;
      } else {
        const available = document.querySelectorAll('.room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)');
        if (available.length > 0) {
          const first = available[0];
          if (p.name) p.name.textContent = `Applies to All ${available.length} Rooms`;
          if (p.class) p.class.textContent = 'Variable Options';
          if (p.guests) p.guests.textContent = 'Various';
          if (p.base) p.base.textContent = `From ₹${parseFloat(first.dataset.price).toLocaleString('en-IN')}`;
          if (p.img) p.img.src = first.dataset.image;
        }
      }

      const applied = [];
      let totalP = 0, totalF = 0;
      const type = this.selectors.promoType?.value;
      const val = parseFloat(this.selectors.discountValue?.value) || 0;

      if (['PERCENT', 'FIXED', 'BOGO', 'UPGRADE', 'FREE_UPGRADE'].includes(type)) {
        applied.push({ name: this.selectors.offerName?.value || 'Primary Offer', type, value: val, isMain: true });
        if (type === 'PERCENT') totalP += val; else if (type === 'FIXED') totalF += val;
      }

      if (document.getElementById('radio-stackable-input')?.checked) {
        document.querySelectorAll('.co-input:checked').forEach(cb => {
          const card = cb.closest('.co-card');
          const ct = card.dataset.discountType, cv = parseFloat(card.dataset.discountValue) || 0;
          applied.push({ name: card.dataset.offerName, type: ct, value: cv, isMain: false });
          if (ct === 'PERCENT') totalP += cv; else if (ct === 'FIXED') totalF += cv;
        });
      }

      if (p.stack) {
        const count = isSpecific ? selected.length : document.querySelectorAll('.room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)').length;
        p.stack.textContent = count;
        if (p.stack.parentElement) p.stack.parentElement.style.display = count > 0 ? 'flex' : 'none';
      }

      if (p.val) {
        let txt = totalP > 0 ? `${totalP}%` : '';
        if (totalF > 0) txt += (txt ? ' + ' : '') + `₹${totalF.toLocaleString('en-IN')}`;

        if (!txt) {
          if (type === 'BOGO') {
            const minNights = parseInt(this.selectors.minNightsStay?.value) || 1;
            txt = minNights > 1 ? `STAY ${minNights}, PAY ${minNights - 1}` : 'BUY 1 GET 1';
          } else if (type?.includes('UPGRADE')) {
            txt = 'FREE UPGRADE';
          } else {
            txt = '0%';
          }
        }
        p.val.textContent = (txt.includes('%') || txt.includes('₹')) ? txt + ' OFF' : txt;
      }

      if (p.label) p.label.textContent = this.selectors.offerName?.value.toUpperCase() || 'OFFER NAME';
      if (p.badge) p.badge.textContent = (type === 'PERCENT' || type === 'FIXED') ? 'Promotion' : 'Elite Perk';

      this.updateModalList(applied);
    }

    updateModalList(applied) {
      const list = document.getElementById('offerStackList');
      if (!list) return;
      list.innerHTML = applied.length ? '' : '<div style="text-align:center;padding:2rem;color:#94A3B8;font-size:12px;font-weight:600;">No active promotions applied to this stack yet.</div>';
      applied.forEach(off => {
        const valTxt = off.type === 'PERCENT' ? `${off.value}% OFF` : (off.type === 'FIXED' ? `₹${off.value.toLocaleString('en-IN')} OFF` : off.type.replace('_', ' '));
        list.insertAdjacentHTML('beforeend', `
          <div class="os-offer-item">
            <div class="os-icon-box" style="${off.isMain ? 'background:#FFF7ED;border-color:#FFEDD5;color:#F59E0B;' : 'background:#EFF6FF;border-color:#DBEAFE;color:#3B82F6;'}">
              <i class="fas ${off.isMain ? 'fa-star' : 'fa-layer-group'}"></i>
            </div>
            <div class="os-offer-details">
              <div class="os-offer-name">${off.name} ${off.isMain ? '<span class="os-primary-badge">PRIMARY</span>' : ''}</div>
              <div class="os-offer-meta">Type: ${off.type}</div>
            </div>
            <div class="os-offer-value">${valTxt}</div>
          </div>`);
      });
    }

    openDiscovery(card) {
      const d = card.dataset;
      const modal = document.getElementById('discoveryModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'none'; // Reset to none so active display:flex wins
      }
      const nameEl = document.getElementById('discOfferName');
      const typeEl = document.getElementById('discOfferType');
      const valEl = document.getElementById('discOfferValue');
      const detailEl = document.getElementById('discOfferDetail');

      if (nameEl) nameEl.textContent = d.offerName.toUpperCase();
      if (typeEl) typeEl.textContent = d.discountType.replace('_', ' ');
      if (valEl) valEl.textContent = d.discountType === 'PERCENT' ? `${d.discountValue}% OFF` : `₹${d.discountValue} OFF`;

      if (detailEl) {
        detailEl.innerHTML = `
          <div class="yield-meta-labels">
            <span class="yield-label">STRATEGIC MAGNITUDE</span>
          </div>
          <div class="yield-values">
            <span class="yield-main-val" style="color: var(--navy)">${d.discountValue}${d.discountType === 'PERCENT' ? '%' : '₹'}</span>
            <span class="yield-base-val">ACTIVE</span>
          </div>
        `;
      }

      modal?.classList.add('active');
    }

    updateMagnitudeVisibility() {
      const type = this.selectors.promoType?.value;
      const isLocked = type?.includes('UPGRADE') || type === 'BOGO';
      if (this.selectors.magnitudeWrapper) {
        this.selectors.magnitudeWrapper.style.opacity = isLocked ? '0.35' : '1';
        this.selectors.magnitudeWrapper.style.pointerEvents = isLocked ? 'none' : 'auto';
        const sym = this.selectors.magnitudeWrapper.querySelector('.mag-sym');
        if (sym) sym.textContent = type === 'FIXED' ? '₹' : '%';
      }
      if (isLocked && this.selectors.discountValue) this.selectors.discountValue.value = 0;
      this.updatePreview();
    }

    showDiscoveryHint() {
      const intelTarget = document.querySelector('.card-discovery-trigger');
      const stackTarget = document.getElementById('viewOfferStackBtn');

      // Primary: Strategic Audit Stack Hint
      if (stackTarget && !localStorage.getItem('audit_stack_hint_final_ultimate')) {
        const hint = document.createElement('div');
        hint.className = 'elite-hint-bubble';
        hint.style.right = 'auto';
        hint.style.left = '50%';
        hint.style.transform = 'translateX(-50%)';
        hint.innerHTML = '<i class="fas fa-layer-group mr-1"></i> VIEW MORE OFFERS';

        stackTarget.style.position = 'relative';
        stackTarget.appendChild(hint);
        stackTarget.classList.add('coach-mark-pulse');

        document.addEventListener('mousedown', () => {
          hint.style.opacity = '0';
          setTimeout(() => hint.remove(), 400);
          localStorage.setItem('audit_stack_hint_final_ultimate', 'true');
        }, { once: true });
      }

      // Secondary: Intelligence Anchor Hint
      if (intelTarget && !localStorage.getItem('intel_discovery_hint_ultimate')) {
        const hint = document.createElement('div');
        hint.className = 'elite-hint-bubble';
        hint.innerHTML = '<i class="fas fa-wand-magic-sparkles mr-1"></i> VIEW OFFER INTEL HERE';

        intelTarget.style.position = 'relative';
        intelTarget.appendChild(hint);
        intelTarget.classList.add('coach-mark-pulse');

        document.addEventListener('mousedown', () => {
          hint.style.opacity = '0';
          setTimeout(() => hint.remove(), 400);
          localStorage.setItem('intel_discovery_hint_ultimate', 'true');
        }, { once: true });
      }
    }

    bindEvents() {
      // Submission Logic
      this.initSubmission();

      // Modal Logic
      const modal = document.getElementById('offerStackModal');
      const openBtn = document.getElementById('viewOfferStackBtn');
      const closeBtn = document.getElementById('closeOfferStackModal');
      const doneBtn = document.getElementById('modalDoneBtn');
      const search = document.getElementById('offerStackSearch');

      if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
          this.renderModalAudit();
          modal.classList.add('active');
          document.body.style.overflow = 'hidden';
          if (search) search.value = ''; // Reset search on open
        });
      }

      const close = () => {
        modal?.classList.remove('active');
        document.body.style.overflow = '';
      };

      closeBtn?.addEventListener('click', close);
      doneBtn?.addEventListener('click', close);
      modal?.addEventListener('click', (e) => { if (e.target === modal) close(); });

      if (search) {
        search.addEventListener('input', (e) => this.renderModalAudit(e.target.value));
      }

      // Discovery Interaction (Delegated for Template Robustness)
      document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.card-discovery-trigger');
        if (trigger) {
          e.stopPropagation();
          const card = trigger.closest('.co-card');
          if (card) this.openDiscovery(card);
        }
      });

      // Book Now Mock
      const bookBtn = document.getElementById('previewBookNowBtn');
      if (bookBtn) {
        bookBtn.addEventListener('click', () => {
          const original = bookBtn.innerHTML;
          bookBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> GENERATING FLOW...';
          setTimeout(() => {
            bookBtn.style.background = '#10B981';
            bookBtn.innerHTML = '<i class="fas fa-check"></i> VIEW READY';
            setTimeout(() => { bookBtn.innerHTML = original; bookBtn.style.background = ''; }, 2000);
          }, 1000);
        });
      }

      // Legacy Triggers
      document.getElementById('promoType')?.addEventListener('change', () => this.updateMagnitudeVisibility());
      document.getElementById('discountValue')?.addEventListener('input', () => this.updatePreview());
      document.getElementById('offerName')?.addEventListener('input', () => this.updatePreview());
    }

    initSubmission() {
      const { form, saveDraftBtn, activateCampaignBtn, isLiveInput } = this.selectors;
      if (!form) return;

      const handleSubmission = (isLive) => {
        if (isLiveInput) isLiveInput.value = isLive ? 'true' : 'false';

        // Final Sync before submission
        this.syncPerks();
        this.syncRoomSelector();

        // Orchestrated Submission Animation
        const activeBtn = isLive ? activateCampaignBtn : saveDraftBtn;
        if (activeBtn) {
          const original = activeBtn.innerHTML;
          activeBtn.disabled = true;
          activeBtn.innerHTML = `<i class="fas fa-circle-notch fa-spin mr-2"></i> ${isLive ? 'ACTIVATING...' : 'SAVING...'}`;
        }

        form.submit();
      };

      saveDraftBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        handleSubmission(false);
      });

      activateCampaignBtn?.addEventListener('click', (e) => {
        // Form's default submit behavior will handle validation
        // but we override to ensure is_live state is synced.
        if (form.checkValidity()) {
          e.preventDefault();
          handleSubmission(true);
        } else {
          form.reportValidity();
        }
      });
    }

    renderModalAudit(query = '') {
      const grid = document.getElementById('modalRoomGrid');
      if (!grid) return;
      grid.innerHTML = '';
      const q = query.toLowerCase().trim();

      let tp = 0, tf = 0;
      const type = this.selectors.promoType?.value;
      const val = parseFloat(this.selectors.discountValue?.value) || 0;
      if (type === 'PERCENT') tp += val; else if (type === 'FIXED') tf += val;

      if (document.getElementById('radio-stackable-input')?.checked) {
        document.querySelectorAll('.co-input:checked').forEach(cb => {
          const d = cb.closest('.co-card').dataset;
          if (d.discountType === 'PERCENT') tp += parseFloat(d.discountValue);
          else tf += parseFloat(d.discountValue);
        });
      }

      const mode = document.querySelector('input[name="room_selection_mode"]:checked')?.value || 'ALL';
      const rooms = mode === 'ALL'
        ? document.querySelectorAll('.room-card:not(.starter-card):not(.os-modal-card):not(.room-card-all)')
        : document.querySelectorAll('.rc-selected:not(.starter-card):not(.os-modal-card):not(.room-card-all)');

      const filtered = Array.from(rooms).filter(r => r.dataset.name.toLowerCase().includes(q));
      const statusBadge = document.getElementById('modalGlobalStatus');
      if (statusBadge) statusBadge.textContent = `STACK: ${tp}% + ₹${tf.toLocaleString('en-IN')}`;

      filtered.forEach(r => {
        const bp = parseFloat(r.dataset.price), dp = Math.max(0, (bp * (1 - tp / 100)) - tf);
        grid.insertAdjacentHTML('beforeend', `
          <div class="room-card os-modal-card animate-elite" style="border: 1px solid rgba(15, 23, 42, 0.06); background: white; border-radius: 28px; overflow: hidden; box-shadow: 0 12px 30px -8px rgba(15, 23, 42, 0.04); display: flex; flex-direction: column;">
            <div style="position: relative; height: 160px; overflow: hidden;">
               <img src="${r.dataset.image}" class="room-card-photo" style="height: 100%; width: 100%; object-fit: cover; transition: transform 0.8s cubic-bezier(0.2, 0, 0.2, 1);">
               <div style="position: absolute; top: 16px; right: 16px; background: #10B981; color: white; padding: 6px 14px; border-radius: 14px; font-size: 10px; font-weight: 800; font-family: 'Outfit'; z-index: 10; letter-spacing: 0.05em; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">BEST YIELD</div>
               <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 60%, rgba(15, 23, 42, 0.05));"></div>
            </div>
            <div style="padding: 1.5rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="font-family: 'Outfit'; font-weight: 800; color: var(--navy); font-size: 1.1rem; letter-spacing: -0.02em; line-height: 1.2;">${r.dataset.name}</div>
              <div style="margin-top: 1.25rem; display: flex; justify-content: space-between; align-items: flex-end;">
                <div>
                   <div style="font-size: 9px; font-weight: 900; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 4px;">Strategic Yield</div>
                   <div style="font-family: 'Outfit'; font-size: 1.4rem; font-weight: 800; color: #10B981;">₹${dp.toLocaleString('en-IN')}</div>
                </div>
                <div style="text-align: right;">
                   <div style="font-size: 10px; font-weight: 800; color: #CBD5E1; text-decoration: line-through;">₹${bp.toLocaleString('en-IN')}</div>
                   <div style="font-size: 10px; font-weight: 900; color: #10B981; margin-top: 2px; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 6px;">SAVE ₹${(bp - dp).toLocaleString('en-IN')}</div>
                </div>
              </div>
            </div>
          </div>`);
      });
    }

    syncAll() {
      this.syncHotels();
      this.applyRoomMode(document.querySelector('input[name="room_selection_mode"]:checked')?.value || 'ALL');
      const stackInp = document.getElementById('radio-stackable-input');
      if (stackInp) this.applyStackingMode(stackInp.checked);
      this.updateMagnitudeVisibility();
      this.syncCombinableOffers();
      this.updatePreview();
    }

    updateUI() { this.updatePreview(); }
  }

  const engine = new OfferEngine();
  window.engine = engine;
  engine.init();

  // Professional Floating Label Orchestration
  document.querySelectorAll('.field-input').forEach(input => {
    const wrap = input.closest('.field-wrap');
    const updateFocus = () => wrap?.classList.toggle('has-value', input.value.length > 0);
    input.addEventListener('input', updateFocus);
    input.addEventListener('focus', () => wrap?.classList.add('focused'));
    input.addEventListener('blur', () => {
      wrap?.classList.remove('focused');
      updateFocus();
    });
    updateFocus();
  });
});
