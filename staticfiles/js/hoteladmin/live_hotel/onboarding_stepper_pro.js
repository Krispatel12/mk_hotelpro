/**
 * OnboardingModel - Central State Authority for Multi-Step Onboarding
 * Handles persistence, DOM synchronization, and session recovery.
 */
class OnboardingModel {
    constructor(formId = 'onboardingForm') {
        this.formId = formId;
        this.storageKey = 'hotelpro_onboarding_draft';

        // --- NEW: Handle Reset Parameter ---
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('reset') === 'true') {
            console.warn('[Model] Reset requested. Purging all draft data.');
            localStorage.removeItem(this.storageKey);
            this.sessionReset = true; // Flag for UI feedback
            // Remove ?reset=true from URL to prevent accidental reset on manual reload
            const newUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }

        this.data = this.load() || this.getInitialState();
    }

    getInitialState() {
        return {
            currentStep: 1,
            step1: {},
            step2: {
                rooms: [],
                operational: {}
            },
            step3: {
                id_type: 'AADHAAR',
                id_number: '',
                compliance: {}
            },
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Scrapes the entire form and dynamic components into a clean JSON object.
     */
    syncFromDOM() {
        const form = document.getElementById(this.formId);
        if (!form) return;

        // 1. All Inputs (Handling Multi-Value and Key-Value)
        const formData = new FormData(form);
        const dataMap = {};

        // Use keys() to handle multi-value fields like 'services'
        const keys = Array.from(new Set(formData.keys()));
        keys.forEach(key => {
            if (key.startsWith('room_') || key === 'csrfmiddlewaretoken') return; // handled separately or skipped

            const values = formData.getAll(key).filter(v => !(v instanceof File));
            if (values.length > 1) {
                dataMap[key] = values;
            } else if (values.length === 1) {
                dataMap[key] = values[0];
            }
        });

        this.data.formData = dataMap;

        // 2. Room Inventory (Dynamic)
        this.data.step2.rooms = [];
        const roomCards = document.querySelectorAll('.room-card-elite');
        roomCards.forEach(card => {
            const idx = card.dataset.roomIndex;
            const amenityRaw = card.querySelector(`[name="room_amenities_${idx}"]`)?.value || '[]';
            let amenityList = [];
            try {
                amenityList = JSON.parse(amenityRaw);
            } catch (e) {
                console.warn('[Model] Amenity parse failed for card', idx, e);
            }

            this.data.step2.rooms.push({
                index: idx,
                name: card.querySelector(`[name="room_name_${idx}"]`)?.value || '',
                class: card.querySelector(`[name="room_class_${idx}"]`)?.value || '',
                guests: card.querySelector(`[name="room_guests_${idx}"]`)?.value || '',
                price: card.querySelector(`[name="room_price_${idx}"]`)?.value || '',
                count: card.querySelector(`[name="room_count_${idx}"]`)?.value || '',
                amenities: amenityList
            });
        });

        // 3. Document Metadata (Step 3)
        this.data.step3.docs_meta = {};
        const docZones = ['doc-mandatory', 'doc-certificate', 'doc-gst'];
        docZones.forEach(key => {
            const zone = document.getElementById(`zone-${key}`);
            if (zone && zone.classList.contains('has-file')) {
                const name = document.getElementById(`name-${key}`)?.textContent;
                this.data.step3.docs_meta[key] = { attached: true, name: name };
            }
        });

        this.data.lastUpdated = new Date().toISOString();
        this.save();
    }

    /**
     * Restores all saved state into the DOM elements.
     */
    applyToDOM() {
        const form = document.getElementById(this.formId);
        if (!form) return;

        if (this.data.formData) {
            Object.keys(this.data.formData).forEach(key => {
                // SECURITY: NEVER restore the CSRF token from localStorage.
                // Django always provides a fresh token in the rendered form.
                // Restoring an old one causes 403 CSRF verification failures.
                if (key === 'csrfmiddlewaretoken') return;

                const value = this.data.formData[key];

                // Special handling for multi-value (e.g. services)
                if (Array.isArray(value)) {
                    this.restoreMultiValue(key, value);
                } else {
                    this.restoreSingleValue(key, value);
                }
            });
        }

        // Restore Dynamic Rooms
        if (this.data.step2.rooms.length > 0 && window.roomManager) {
            window.roomManager.restoreRooms(this.data.step2.rooms);
        }

        // Restore Document Metadata state indicators
        if (this.data.step3.docs_meta) {
            Object.keys(this.data.step3.docs_meta).forEach(key => {
                const meta = this.data.step3.docs_meta[key];
                if (meta.attached) {
                    this.setDocZoneVisualRestored(key, meta.name);
                }
            });
        }
    }

    restoreSingleValue(key, value) {
        const inputs = document.querySelectorAll(`[name="${key}"]`);
        inputs.forEach(input => {
            if (input.type === 'radio') {
                if (input.value === value) input.checked = true;
            } else if (input.type === 'checkbox') {
                input.checked = (input.value === value);
            } else {
                input.value = value;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Custom Dropdown Sync
            if (input.id) {
                const custom = document.querySelector(`.custom-select-container[data-target="${input.id}"]`);
                if (custom) this.syncCustomDropdownUI(custom, value);
            }
        });
    }

    restoreMultiValue(key, values) {
        const inputs = document.querySelectorAll(`[name="${key}"]`);
        const foundValues = new Set();

        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                const isChecked = values.includes(input.value);
                input.checked = isChecked;
                if (isChecked) foundValues.add(input.value);
            }
        });

        // Re-create custom ones if they don't exist in DOM
        if (key === 'services') {
            const grid = document.getElementById('servicesGrid');
            if (grid) {
                values.forEach(v => {
                    if (!foundValues.has(v)) {
                        this.appendCustomServicePill(grid, v);
                    }
                });
            }
        }
    }

    appendCustomServicePill(grid, name) {
        const label = document.createElement('label');
        label.className = 'pill-label';
        label.innerHTML = `
            <input type="checkbox" name="services" value="${name}" checked>
            <i class="fas fa-concierge-bell"></i>
            ${name}
        `;
        grid.appendChild(label);
    }

    syncCustomDropdownUI(container, value) {
        setTimeout(() => {
            const items = container.querySelectorAll('.select-item');
            items.forEach(item => {
                if (item.dataset.value === value) {
                    const textEl = container.querySelector('.selected-text');
                    if (textEl) textEl.innerHTML = item.innerHTML;
                    const group = container.closest('.input-group');
                    if (group) group.classList.add('not-empty');
                }
            });
        }, 300);
    }

    setDocZoneVisualRestored(key, filename) {
        const nameEl = document.getElementById(`name-${key}`);
        if (nameEl) {
            nameEl.innerHTML = `<i class="fas fa-history" title="Draft Recovered"></i> ${filename}`;
            const zone = document.getElementById(`zone-${key}`);
            zone?.classList.add('has-file', 'upload-completed');
            const ph = document.getElementById(`ph-${key}`);
            if (ph) ph.style.display = 'none';
            const badge = document.getElementById(`badge-${key}`);
            badge?.classList.add('active');
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    load() {
        const d = localStorage.getItem(this.storageKey);
        if (!d) return null;
        const parsed = JSON.parse(d);
        // SECURITY: Purge any stale CSRF token that may have been saved by an older
        // version of this script. This prevents 403 errors when a new session starts.
        if (parsed && parsed.formData && parsed.formData.csrfmiddlewaretoken) {
            delete parsed.formData.csrfmiddlewaretoken;
            localStorage.setItem(this.storageKey, JSON.stringify(parsed));
        }
        return parsed;
    }

    setCurrentStep(step) {
        this.data.currentStep = step;
        this.save();
    }
}

/**
 * StepperManager - Professional Multi-Step Navigation & Validation
 */
class StepperManager {
    constructor() {
        this.model = new OnboardingModel();
        this.currentStep = this.model.data.currentStep || 1;
        this.steps = document.querySelectorAll('.onboarding-step');
        this.stepperIcons = document.querySelectorAll('.step');
        this.toast = this.initToast();

        this.init();
        this.setupRoomObserver();
    }

    setupRoomObserver() {
        const roomList = document.getElementById('roomList');
        if (!roomList) return;

        this.roomObserver = new MutationObserver(() => {
            if (this.currentStep === 2) {
                console.log('[Stepper] Room list mutation detected. Re-auditing Step 2...');
                this.updateStepStatusUI();
            }
        });

        this.roomObserver.observe(roomList, { childList: true, subtree: true });
    }

    init() {
        this.setupNavigation();
        this.setupFormGuard();
        this.setupInputSentries();

        // --- Elite Welcome Message & Modal ---
        if (this.model.sessionReset) {
            const modal = document.getElementById('greetingModal');
            if (modal) {
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('show'), 10);
                document.body.classList.add('modal-open');
            }
        }

        // Deep Restore Sequence
        window.addEventListener('load', () => {
            console.log('[Stepper] Initializing Deep Restore...');
            try {
                this.model.applyToDOM();
            } catch (err) {
                console.error('[Stepper] Critical restoration error:', err);
            }
            this.showStep(this.currentStep, false);
            this.setupAutoSave();
        });
    }

    /**
     * Initializes global listeners to save state as the user types.
     */
    setupAutoSave() {
        const form = document.getElementById('onboardingForm');
        if (!form) return;

        let saveTimeout;
        form.addEventListener('input', (e) => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                console.log('[Model] Auto-syncing state...');
                this.model.syncFromDOM();
            }, 1000);
        });

        // Save immediately on any select change
        form.addEventListener('change', (e) => {
            if (e.target.tagName === 'SELECT' || e.target.type === 'radio' || e.target.type === 'hidden') {
                this.model.syncFromDOM();
                this.updateStepStatusUI(); // Update lock state
            }
        });
    }

    updateStepStatusUI() {
        // Toggle the Next Button based on current step validation
        const nextBtn = document.querySelector('.next-step');
        if (nextBtn) {
            const isValid = this.validateStep(this.currentStep, true); // Silent check
            nextBtn.disabled = !isValid;
            
            if (!isValid) {
                nextBtn.classList.add('is-locked');
                nextBtn.innerHTML = `Step Locked <i class="fas fa-lock ml-8"></i>`;
            } else {
                nextBtn.classList.remove('is-locked');
                const nextStepName = this.currentStep === 1 ? 'Inventory' : (this.currentStep === 2 ? 'Compliance' : 'Final Review');
                nextBtn.innerHTML = `Next: ${nextStepName} <i class="fas fa-arrow-right ml-8"></i>`;
            }
        }
        
        // Refresh Stepper Icons
        this.stepIconsUpdate();
    }

    setupInputSentries() {
        const checkInput = (el) => {
            const group = el.closest('.input-group');
            if (!group) return;
            if (el.value && el.value.trim() !== '') {
                group.classList.add('not-empty');

                // Clear error dynamically when the user fills in valid data
                const val = el.value ? el.value.trim().toLowerCase() : '';
                const isInvalidHidden = (el.type === 'hidden' || el.tagName === 'SELECT') && (!val || val === 'select-category' || val === 'select category' || val === 'none');

                if (el.checkValidity && (el.checkValidity() && !isInvalidHidden)) {
                    el.classList.remove('input-error');
                    group.classList.remove('has-error');
                    const feedback = group.querySelector('.invalid-feedback');
                    if (feedback) feedback.remove();
                    const customSelect = group.querySelector('.custom-select-container');
                    if (customSelect) customSelect.classList.remove('input-error');
                }
            } else {
                group.classList.remove('not-empty');
            }
        };

        document.querySelectorAll('input, textarea, select').forEach(checkInput);

        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                checkInput(e.target);
                this.updateStepStatusUI(); // Dynamic Lock
            }
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    checkInput(mutation.target);
                }
            });
        });

        document.querySelectorAll('input, textarea, select').forEach(el => {
            observer.observe(el, { attributes: true });
        });

        const addressInput = document.getElementById('location-search');
        if (addressInput) {
            setInterval(() => checkInput(addressInput), 1000);
        }
    }

    setupFormGuard() {
        const form = document.getElementById('onboardingForm');
        if (!form) return;

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const activeEl = document.activeElement;
                if (activeEl && activeEl.tagName === 'TEXTAREA') return;
                if (form.contains(e.target)) {
                    e.preventDefault();
                    console.log('[Elite Guard] Neutralized Enter-to-Submit.');
                }
            }
        }, true);

        form.onsubmit = (e) => {
            const activeStepEl = document.querySelector('.onboarding-step.active');
            const isStep4 = activeStepEl && (activeStepEl.id === 'step-4' || activeStepEl.id === 'step-index-4');
            const isFinalBtn = e.submitter && e.submitter.id === 'finalSubmitBtn';

            if (!isStep4 || !isFinalBtn) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Clear draft on successful submission
            localStorage.removeItem(this.model.storageKey);
        };
    }

    initToast() {
        let toast = document.getElementById('onboarding-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'onboarding-toast';
            toast.className = 'onboarding-toast';
            document.body.appendChild(toast);
        }
        return toast;
    }

    showToast(message, type = 'error') {
        const icon = type === 'error' ? 'fa-exclamation-triangle' : 'fa-check-circle';
        
        // Update content
        this.toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        
        // Reset classes
        this.toast.className = 'onboarding-toast';
        if (type === 'success') this.toast.classList.add('success');
        
        // Trigger refined animation
        requestAnimationFrame(() => {
            this.toast.classList.add('show');
        });

        // Auto-hide with safety
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            this.toast.classList.remove('show');
        }, 5000);
    }

    /**
     * showSaaSModal - Spawns a professional guidance modal
     */
    showSaaSModal(options = {}) {
        const overlay = document.getElementById('saasModalOverlay');
        const iconContainer = document.getElementById('saasModalIcon');
        const titleEl = document.getElementById('saasModalTitle');
        const descEl = document.getElementById('saasModalDesc');
        const actionsEl = document.getElementById('saasModalActions');

        if (!overlay) return;

        // Reset & Set Content
        titleEl.textContent = options.title || 'Notification';
        descEl.textContent = options.message || '';
        iconContainer.innerHTML = `<i class="fas ${options.icon || 'fa-info-circle'}"></i>`;
        
        // Actions
        actionsEl.innerHTML = '';
        const buttons = options.buttons || [{ text: 'Got It', type: 'primary' }];
        
        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `saas-modal-btn ${btn.type || 'secondary'}`;
            b.textContent = btn.text;
            b.onclick = () => {
                overlay.classList.remove('show');
                if (btn.action) btn.action();
            };
            actionsEl.appendChild(b);
        });

        // Show Modal
        overlay.classList.add('show');
        document.body.classList.add('modal-open');
    }

    /**
     * showContextualPopup - Spawns a small, denotive popup near an element
     */
    showContextualPopup(el, options = {}) {
        // Remove existing popups first
        document.querySelectorAll('.contextual-popup-elite').forEach(p => p.remove());

        if (!el) return;

        const popup = document.createElement('div');
        popup.className = 'contextual-popup-elite';
        
        popup.innerHTML = `
            <div class="context-popup-header">
                <i class="fas ${options.icon || 'fa-info-circle'}"></i>
                <span>${options.title || 'Incomplete'}</span>
            </div>
            <div class="context-popup-body">
                ${options.message || 'Action required here.'}
            </div>
        `;

        document.body.appendChild(popup);

        // Position Logic: Pointing to the top-left of the target element
        const rect = el.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        popup.style.top = `${scrollY + rect.top + rect.height + 15}px`;
        popup.style.left = `${scrollX + rect.left + 20}px`;

        // If it's too close to the bottom, show it above
        if (rect.top + rect.height + 200 > window.innerHeight) {
            popup.style.top = `${scrollY + rect.top - popup.offsetHeight - 15}px`;
            popup.classList.add('is-above'); // You can add CSS for the arrow flip
        }

        // Auto-remove on next interaction
        const cleanup = () => {
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(10px) scale(0.9)';
            setTimeout(() => popup.remove(), 400);
            document.removeEventListener('mousedown', cleanup);
            document.removeEventListener('input', cleanup);
        };

        setTimeout(() => {
            document.addEventListener('mousedown', cleanup);
            document.addEventListener('input', cleanup);
        }, 100);

        // Safety timeout
        setTimeout(cleanup, 8000);
    }

    showStep(step, runGuard = true) {
        try {
            const activeStep = document.getElementById(`step-${step}`);
            if (!activeStep) return;

            if (runGuard && step > this.currentStep) {
                let firstInvalidStep = 0;
                for (let i = 1; i < step; i++) {
                    if (!this.validateStep(i, i === step - 1 ? false : true)) {
                        firstInvalidStep = i;
                        break;
                    }
                }

                if (firstInvalidStep > 0 && firstInvalidStep < step) {
                    this.showStep(firstInvalidStep, false);
                    return;
                }
            }

            this.steps.forEach(s => s.classList.remove('active'));
            activeStep.classList.add('active');

            // --- NEW: Step 2 Contextual SaaS Guidance (Denoted to Card) ---
            if (step === 2 && !this.hasShownStep2SaaSGuidance) {
                const roomList = document.getElementById('roomList');
                const addBtn = document.getElementById('addRoomBtn');
                if (roomList && roomList.children.length === 0 && addBtn) {
                    setTimeout(() => {
                        this.showContextualPopup(addBtn, {
                            title: 'Add Your First Room',
                            icon: 'fa-bed',
                            message: 'Click this card to add your first room category. You need at least one to proceed.'
                        });
                        
                        // Visual highlight on trigger card
                        addBtn.classList.add('guider-highlight');
                    }, 800);
                    this.hasShownStep2SaaSGuidance = true;
                }
            }

            // Progress Line Sync
            const progressLine = document.getElementById('stepper-progress-line');
            const themeColors = { 1: '#3b5bdb', 2: '#10b981', 3: '#f59e0b', 4: '#7c3aed' };
            if (progressLine) {
                const progress = (step - 1) / (this.steps.length - 1) * 100;
                progressLine.style.width = `calc(${progress}% - 80px)`;
                progressLine.style.setProperty('--active-step-color', themeColors[step]);
                progressLine.style.setProperty('--active-step-glow', `${themeColors[step]}4D`); // 30% alpha
                if (step === 1) progressLine.style.width = '0';
                else if (step === this.steps.length) progressLine.style.width = 'calc(100% - 80px)';
            }

            const stepIcons = { 1: 'fa-hotel', 2: 'fa-boxes-stacked', 3: 'fa-building-shield', 4: 'fa-file-invoice' };

            // --- Side Panel Monitor Update ---
            const sidePercent = document.getElementById('sideProgressPercent');
            const sideBar = document.getElementById('sideProgressBar');
            const sideStatus = document.getElementById('sideStatusText');

            if (sidePercent && sideBar && sideStatus) {
                const percent = step * 25;
                sidePercent.textContent = `${percent}%`;
                sideBar.style.width = `${percent}%`;
                sideStatus.textContent = `PHASE 0${step} ACTIVE`;
            }

            this.currentStep = step;
            this.model.setCurrentStep(step);
            this.model.syncFromDOM(); // Ensure state is synced on transition
            this.updateStepStatusUI(); // Ensure next button is synced
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('[Stepper] showStep failure:', err);
        }
    }

    stepIconsUpdate() {
        const step = this.currentStep;
        const stepIcons = { 1: 'fa-hotel', 2: 'fa-boxes-stacked', 3: 'fa-building-shield', 4: 'fa-file-invoice' };
        
        this.stepperIcons.forEach((s, idx) => {
            const stepIdx = idx + 1;
            const num = s.querySelector('.step-number');
            
            // Default classes
            s.classList.remove('active', 'completed', 'locked', 'in-progress');

            if (stepIdx === step) {
                s.classList.add('active', 'in-progress');
                if (num) num.innerHTML = `<i class="fas ${stepIcons[stepIdx]}"></i>`;
            } else if (stepIdx < step) {
                s.classList.add('completed');
                if (num) num.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                // Future steps are always locked until current is passed
                if (!this.validateStep(step, true)) {
                    s.classList.add('locked');
                    if (num) num.innerHTML = '<i class="fas fa-lock"></i>';
                } else {
                    if (num) num.innerHTML = `<i class="fas ${stepIcons[stepIdx]}"></i>`;
                }
            }
        });
    }

    showStep2Guidance() {
        const addBtn = document.getElementById('addRoomBtn');
        if (!addBtn) return;

        // Create Popover
        const popover = document.createElement('div');
        popover.className = 'guidance-popover';
        popover.innerHTML = '<i class="fas fa-hand-pointer"></i> <span>Click here to add your first room category!</span>';
        
        // Position it above the button
        document.body.appendChild(popover);
        const rect = addBtn.getBoundingClientRect();
        popover.style.top = `${window.scrollY + rect.top - 60}px`;
        popover.style.left = `${rect.left + rect.width / 2}px`;

        // Add Highlight
        addBtn.classList.add('guider-highlight');

        this.hasShownStep2Guidance = true;

        // Remove after interaction or 10 seconds
        const cleanup = () => {
            popover.remove();
            addBtn.classList.remove('guider-highlight');
            addBtn.removeEventListener('click', cleanup);
        };
        addBtn.addEventListener('click', cleanup);
        setTimeout(cleanup, 10000);
    }

    validateStep(stepIndex = this.currentStep, silent = false) {
        const stepContainer = document.getElementById(`step-${stepIndex}`);
        if (!stepContainer) return true;

        const inputs = Array.from(stepContainer.querySelectorAll('input[required], select[required], textarea[required]'))
            .filter(el => this.isVisible(el));

        let isValid = true;
        let firstErr = null;

        if (!silent) {
            stepContainer.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            stepContainer.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
            stepContainer.querySelectorAll('.invalid-feedback').forEach(el => el.remove());
        }

        inputs.forEach(input => {
            const group = input.closest('.input-group');

            const val = input.value ? input.value.trim().toLowerCase() : '';
            const isUnfilledHiddenOrSelect = (input.type === 'hidden' || input.tagName === 'SELECT') && (!val || val === 'select-category' || val === 'select category' || val === 'none');

            if (!input.checkValidity() || isUnfilledHiddenOrSelect) {
                if (!silent) {
                    input.classList.add('input-error');

                    if (input.type === 'hidden' && group) {
                        const customSelect = group.querySelector('.custom-select-container');
                        if (customSelect) customSelect.classList.add('input-error');
                    }

                    if (group) {
                        group.classList.add('has-error');

                        let feedback = document.createElement('span');
                        feedback.className = 'invalid-feedback';

                        let customMsg = input.dataset.errorMsg || input.validationMessage || 'This field is required.';
                        if ((input.validity && input.validity.valueMissing) || isUnfilledHiddenOrSelect) {
                            const label = group.querySelector('label');
                            let nameText = label ? label.textContent.trim() : 'This field';
                            customMsg = `<i class="fas fa-exclamation-circle"></i> ${nameText} is a required field.`;
                        } else {
                            customMsg = `<i class="fas fa-exclamation-circle"></i> ${customMsg}`;
                        }

                        feedback.innerHTML = customMsg;
                        group.appendChild(feedback);
                    }

                    // --- NEW: Expand Room Card if error is inside one ---
                    const roomCard = input.closest('.room-card-elite');
                    if (roomCard && !roomCard.classList.contains('is-open')) {
                        roomCard.classList.add('is-open');
                    }
                }
                isValid = false;
                if (!firstErr) firstErr = input;
            } else {
                input.classList.remove('input-error');
                if (group) {
                    group.classList.remove('has-error');
                }
            }
        });

        // Special Audits
        if (stepIndex === 1) {
            const openMapBtn = document.getElementById('open-map-btn');
            const latInput = document.getElementById('id_lat');
            const lngInput = document.getElementById('id_lng');

            if (openMapBtn && latInput && lngInput && !silent) {
                if (!latInput.value || !lngInput.value) {
                    openMapBtn.classList.add('has-error');
                    let group = openMapBtn.closest('.input-group') || openMapBtn.parentElement;
                    let feedback = group.querySelector('.invalid-feedback');
                    if (!feedback) {
                        feedback = document.createElement('span');
                        feedback.className = 'invalid-feedback';
                        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please select and confirm hotel location on map.';
                        group.appendChild(feedback);
                    }
                    isValid = false;
                    if (!firstErr) firstErr = openMapBtn;
                } else {
                    openMapBtn.classList.remove('has-error');
                    let group = openMapBtn.closest('.input-group') || openMapBtn.parentElement;
                    const feedback = group.querySelector('.invalid-feedback');
                    if (feedback) feedback.remove();
                }
            }
        }

        // Multi-Point SaaS Audit for Step 2
        if (stepIndex === 2) {
            const roomList = document.getElementById('roomList');
            if (!roomList || roomList.children.length === 0) {
                if (!silent) {
                    const addBtn = document.getElementById('addRoomBtn');
                    if (addBtn) {
                        this.showContextualPopup(addBtn, {
                            title: 'Inventory Missing',
                            icon: 'fa-boxes-stacked',
                            message: 'You must add at least one room category to proceed.'
                        });
                        addBtn.classList.add('guider-highlight');
                        setTimeout(() => addBtn.classList.remove('guider-highlight'), 3000);
                        
                        // Scroll to button
                        addBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
                isValid = false;
            } else if (roomList) {
                const roomCards = Array.from(roomList.querySelectorAll('.room-card-elite'));
                let photoError = false;
                let amenityError = false;
                let fieldError = false;

                roomCards.forEach(room => {
                    const idx = room.dataset.roomIndex;
                    
                    // 1. Check Fields
                    const requiredFields = room.querySelectorAll('input[required], select[required]');
                    requiredFields.forEach(f => {
                        const isPrice = f.name.includes('room_price');
                        const val = f.value.trim();
                        if (!val || val === 'none' || (isPrice && parseFloat(val) <= 0)) {
                            fieldError = true;
                            if (!silent) {
                                f.classList.add('input-error');
                                room.classList.add('is-open'); // Force expand
                                if (!firstErr) firstErr = f;
                            }
                        }
                    });

                    // 2. Check Photos (Strict Min 1)
                    const fileInput = room.querySelector(`[name="room_photos_${idx}"]`);
                    if (!fileInput || fileInput.files.length < 1) {
                        photoError = true;
                        if (!silent) {
                            const zone = room.querySelector('.room-upload-zone');
                            if (zone) zone.classList.add('has-error');
                            room.classList.add('is-open');
                        }
                    }

                    // 3. Check Amenities (Strict Min 1 checked)
                    const amenitiesInput = room.querySelector(`[name="room_amenities_${idx}"]`);
                    if (!amenitiesInput || JSON.parse(amenitiesInput.value).length === 0) {
                        amenityError = true;
                        if (!silent) {
                            const pillContainer = room.querySelector('.dynamic-pills-container');
                            if (pillContainer) pillContainer.classList.add('has-error');
                            room.classList.add('is-open');
                        }
                    }
                });

                if ((fieldError || photoError || amenityError) && !silent) {
                    isValid = false;
                    
                    const errorCard = roomCards.find(rc => {
                        const idx = rc.dataset.roomIndex;
                        const fErr = Array.from(rc.querySelectorAll('input[required], select[required]')).some(f => !f.value.trim() || f.value === 'none');
                        const pErr = rc.querySelector(`[name="room_photos_${idx}"]`)?.files.length < 1;
                        const aErr = JSON.parse(rc.querySelector(`[name="room_amenities_${idx}"]`)?.value || '[]').length === 0;
                        return fErr || pErr || aErr;
                    });

                    if (errorCard) {
                        let popupOptions = {
                            title: 'Details Required',
                            icon: 'fa-circle-exclamation',
                            message: 'Please complete all required info for this room.'
                        };

                        if (photoError && !fieldError && !amenityError) {
                            popupOptions.title = 'Photos Required';
                            popupOptions.message = 'At least 1 photo is needed for this category.';
                            popupOptions.icon = 'fa-camera';
                        } else if (amenityError && !fieldError && !photoError) {
                            popupOptions.title = 'Add Amenities';
                            popupOptions.message = 'Please select at least one amenity for this room.';
                            popupOptions.icon = 'fa-concierge-bell';
                        }

                        this.showContextualPopup(errorCard, popupOptions);
                    }
                }
                
                if (fieldError || photoError || amenityError) isValid = false;
            }

            // Gallery: soft warning only (at least 1 photo), non-blocking
            const galleryZone = document.getElementById('galleryUploadZone');
            const galleryPreview = document.getElementById('galleryPreviewContainer');
            if (galleryZone && galleryPreview && !silent) {
                if (galleryPreview.children.length < 5) {
                    galleryZone.classList.add('has-error');
                    let feedback = galleryZone.parentElement.querySelector('.invalid-feedback');
                    if (!feedback) {
                        feedback = document.createElement('span');
                        feedback.className = 'invalid-feedback';
                        feedback.innerHTML = '<i class="fas fa-exclamation-circle"></i> At least 5 hotel photos are required.';
                        galleryZone.parentElement.appendChild(feedback);
                    }
                    isValid = false;
                    if (!firstErr) firstErr = galleryZone;
                } else {
                    galleryZone.classList.remove('has-error');
                    const feedback = galleryZone.parentElement.querySelector('.invalid-feedback');
                    if (feedback) feedback.remove();
                }
            }
        }

        if (stepIndex === 3) {
            let zoneError = false;
            let firstZoneError = null;

            // 1. Text Field Validations for Step 3
            const requiredFields = document.getElementById('step-3').querySelectorAll('input[required]');
            let fieldError = false;
            let formatErrorMsg = null;

            requiredFields.forEach(f => {
                const val = f.value.trim();
                let isInvalidFormat = false;

                if (!val) {
                    fieldError = true;
                } else {
                    // Specific Format Validations
                    if (f.id === 'id_number_input') {
                        const fmt = f.dataset.format;
                        if (fmt === 'aadhaar' && !/^\d{4}\s\d{4}\s\d{4}$/.test(val) && !/^\d{12}$/.test(val.replace(/\s/g, ''))) {
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Aadhaar must be 12 digits.';
                        } else if (fmt === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val)) {
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Invalid PAN format. Example: ABCDE1234F';
                        } else if (fmt === 'raw' && val.length < 6) { // Passport
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Passport must be at least 6 characters.';
                        }
                    } else if (f.id === 'gst_number') {
                        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(val)) {
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Invalid GST format. Example: 27AAPFU0939F1ZV';
                        }
                    } else if (f.id === 'govt_reg_number') {
                        // Support standard state code prefixes, slashes, hyphens, etc.
                        // Examples: HTL-GJ-SURAT-2026-000458, TD/GJ/2025/HTL/00458, MH-TOURISM-HOTEL-2024-1023, DL/HTL/REG/2023/8891, KA-TD-HOTEL-2026-00091
                        if (!/^[A-Z0-9\-\/]{10,30}$/i.test(val)) {
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Invalid Certificate format. Format should be alphanumeric with hyphens or slashes.';
                        } else if (val.length < 5) {
                            fieldError = true; isInvalidFormat = true; formatErrorMsg = 'Registration number appears too short.';
                        }
                    }
                }

                if (fieldError && !silent) {
                    f.classList.add('input-error');
                    if (!firstErr) {
                        firstErr = f;
                        f.dataset.invalidFormatMsg = isInvalidFormat ? formatErrorMsg : '';
                    }
                }
            });

            if (fieldError && !silent && firstErr) {
                let fieldName = 'This field';
                const label = firstErr.closest('.input-group') || firstErr.closest('.col-6') || firstErr.parentElement;
                if (label) {
                    const l = label.querySelector('label');
                    if (l) fieldName = l.textContent.trim();
                }

                const specificMsg = firstErr.dataset.invalidFormatMsg;
                this.showContextualPopup(firstErr, {
                    title: specificMsg ? 'Invalid Format' : 'Missing Details',
                    icon: specificMsg ? 'fa-ban' : 'fa-triangle-exclamation',
                    message: specificMsg ? specificMsg : `Please complete the ${fieldName}.`
                });
                isValid = false;
            }

            // 2. Zone / File Validations
            const zones = ['doc-mandatory', 'doc-certificate', 'doc-gst'];
            zones.forEach((id) => {
                const zone = document.getElementById(`zone-${id}`);
                if (zone) {
                    if (!zone.classList.contains('has-file')) {
                        zoneError = true;
                        if (!silent) {
                            zone.classList.add('has-error');
                            if (!firstZoneError) firstZoneError = zone;
                        }
                    } else {
                        if (!silent) zone.classList.remove('has-error');
                    }
                }
            });

            if (zoneError) {
                isValid = false;
                if (!silent && firstZoneError && !fieldError) { // Show zone popup if no field error popped up
                    let docName = 'Identity Document';
                    if (firstZoneError.id === 'zone-doc-certificate') docName = 'Govt Registration Certificate';
                    if (firstZoneError.id === 'zone-doc-gst') docName = 'GST Certificate';

                    this.showContextualPopup(firstZoneError, {
                        title: 'Missing Document',
                        icon: 'fa-file-shield',
                        message: `Please upload your ${docName} to proceed.`
                    });
                    
                    if (!firstErr) firstErr = firstZoneError;
                }
            }
        }

        if (!isValid && !silent) {
            if (firstErr) {
                const scrollTarget = firstErr.offsetParent ? firstErr : firstErr.parentElement;
                scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Trigger a momentary focus to emphasize the error
                setTimeout(() => firstErr.focus(), 600);
            }
        }

        return isValid;
    }

    isVisible(el) {
        if (!el) return false;
        const stepParent = el.closest('.onboarding-step');
        if (!stepParent || !stepParent.classList.contains('active')) return false;

        // --- FIX: Ensure fields inside room cards are ALWAYS validated even if collapsed ---
        if (el.closest('.room-card-elite')) return true;

        // Always validate hidden inputs and selects used by custom components
        if (el.type === 'hidden') return true;
        if (el.classList.contains('d-none-important') || el.classList.contains('d-none')) {
            // Only validate if they are required and part of our custom components
            if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return true;
        }

        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null) {
            return false;
        }
        return true;
    }

    setupNavigation() {
        document.addEventListener('click', (e) => {
            const nextBtn = e.target.closest('.next-step');
            const prevBtn = e.target.closest('.prev-step');
            const stepIcon = e.target.closest('.step');

            if (nextBtn) {
                e.preventDefault();
                if (nextBtn.classList.contains('is-locked')) {
                    // Trigger audible/visual audit if user clicks while locked
                    console.warn('[Stepper] Audit Triggered: Investigating lock cause...');
                    this.validateStep(this.currentStep, false); // Trigger Modals
                    return;
                }
                if (this.validateStep()) {
                    this.showStep(this.currentStep + 1);
                    if (this.currentStep === 4 && window.summaryEngine) {
                        window.summaryEngine.render();
                    }
                }
            }

            if (prevBtn) {
                e.preventDefault();
                this.showStep(this.currentStep - 1, false);
            }

            if (stepIcon) {
                const targetStep = parseInt(stepIcon.id.replace('step-index-', ''));
                if (!isNaN(targetStep)) {
                    this.showStep(targetStep, targetStep > this.currentStep);
                }
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.stepperManager = new StepperManager();
});

// Global Helpers
window.closeGreetingModal = function () {
    const modal = document.getElementById('greetingModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }, 500);
    }
};
