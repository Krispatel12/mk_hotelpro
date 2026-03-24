/**
 * onboarding_docs.js  v2
 * Step 3: Identity & Legal Document Upload Handler
 *
 * Features:
 *   - Click zone  → open file picker
 *   - Drag & drop → attach file
 *   - After select: show badge with file name / size / ext badge
 *   - View button : open image in lightbox, PDF in new tab
 *   - Remove btn  : reset zone to placeholder state
 *   - ID type toggle: swap label, placeholder, and auto-format
 */

document.addEventListener('DOMContentLoaded', () => {

    /* ═══════════════════════════════════════════════════════
       1.  UPLOAD ZONE ENGINE
       Each zone has:
         #zone-<key>         .upload-dossier-zone wrapper
         #input-<key>        hidden <input type="file">
         #ph-<key>           .upload-placeholder
         #badge-<key>        .file-status-badge
         #icon-<key>         icon <i> inside badge
         #name-<key>         filename <span>
         #meta-<key>         size / ext <span>
         .view-document-btn[data-zone]
         .remove-file-btn[data-zone]
    ══════════════════════════════════════════════════════ */

    const ZONES = ['doc-mandatory', 'doc-certificate', 'doc-gst'];

    // Track object URLs so we can revoke them on remove
    const _objectURLs = {};

    function initZone(key) {
        const zone = document.getElementById(`zone-${key}`);
        const fileInput = document.getElementById(`input-${key}`);
        const ph = document.getElementById(`ph-${key}`);
        const badge = document.getElementById(`badge-${key}`);
        const iconEl = document.getElementById(`icon-${key}`);
        const nameEl = document.getElementById(`name-${key}`);
        const metaEl = document.getElementById(`meta-${key}`);

        if (!zone || !fileInput) return;

        // ── Single-Trigger Authority ──
        zone.addEventListener('click', (e) => {
            if (e.target.closest('.status-actions') || e.target.closest('.file-status-badge')) {
                return;
            }
            if (zone.classList.contains('has-file')) return;
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        // ── Native Input Capture ──
        fileInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // ── File input change ──
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) attachFile(fileInput.files[0]);
        });

        // ── Drag events ──
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-active');
        });
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-active');
        });
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-active');
            const file = e.dataTransfer.files[0];
            if (file) {
                const dt = new DataTransfer();
                dt.items.add(file);
                fileInput.files = dt.files;
                attachFile(file);
            }
        });

        // ── View button ──
        zone.querySelector('.view-document-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = _objectURLs[key];
            if (!url) return;

            const file = fileInput.files[0];
            if (!file) return;

            // Use the professional global preview logic
            if (window.previewSingleFile) {
                const ext = file.name.split('.').pop().toLowerCase();
                window.previewSingleFile(url, file.name, ext);
            } else {
                window.open(url, '_blank');
            }
        });

        // ── Remove button ──
        zone.querySelector('.remove-file-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetZone();
        });

        // ── Elite Attachment Processor ──
        function attachFile(file) {
            // Validation: Enterprise Standards (5 MB Limit)
            if (file.size > 5 * 1024 * 1024) {
                if (window.stepperManager && typeof window.stepperManager.showContextualPopup === 'function') {
                    window.stepperManager.showContextualPopup(zone, {
                        title: 'File Too Large',
                        icon: 'fa-weight-hanging',
                        message: 'File size exceeds the 5MB maximum limit.'
                    });
                } else {
                    showToast(`Executive Protocol Error: File size exceeds the 5MB professional threshold.`, 'error');
                }
                fileInput.value = '';
                return;
            }

            // Validation: Strictly enforced file type validation (Block .mp4, etc)
            const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'image/webp', 'image/heic'];
            if (!allowedTypes.includes(file.type)) {
                if (window.stepperManager && window.stepperManager.showContextualPopup) {
                    window.stepperManager.showContextualPopup(zone, {
                        title: 'Invalid Format',
                        icon: 'fa-file-circle-xmark',
                        message: `The uploaded format (${file.name.split('.').pop()}) is not allowed here. Please upload JPG, PNG, or PDF files.`,
                    });
                } else {
                    showToast(`Invalid file format. Please use JPG, PNG, or PDF.`, 'error');
                }
                fileInput.value = '';
                return;
            }

            // Cleanup & Secure Reference
            if (_objectURLs[key]) URL.revokeObjectURL(_objectURLs[key]);
            _objectURLs[key] = URL.createObjectURL(file);

            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            const ext = file.name.split('.').pop().toUpperCase();

            // High-Fidelity UI Presentation
            let iconClass = 'fas fa-file-certified'; // Custom font-awesome if available, else fallback
            let iconColor = 'var(--primary)';

            if (file.type === 'application/pdf') {
                iconClass = 'fas fa-file-pdf'; iconColor = '#ef4444';
            } else if (file.type.startsWith('image/')) {
                iconClass = 'fas fa-file-image'; iconColor = 'var(--secondary)';
            } else {
                iconClass = 'fas fa-file-invoice';
            }

            if (iconEl) {
                iconEl.className = `${iconClass} animate-draw`;
                iconEl.style.color = iconColor;
            }
            if (nameEl) nameEl.textContent = file.name;
            if (metaEl) {
                metaEl.innerHTML = `
                    <div class="file-meta-rhythm">
                        <span class="file-success-dot"><i class="fas fa-circle-check"></i> Verified Asset</span>
                        <span class="file-separator">/</span>
                        <span class="file-size-elite">${sizeMB} MB</span>
                        <span class="file-separator">/</span>
                        <span class="file-ext-elite">${ext} Legal Dossier</span>
                        <span class="file-verified-badge"><i class="fas fa-shield-check"></i> Encrypted</span>
                    </div>
                `;
            }

            // UI Transitions
            if (ph) ph.style.display = 'none';
            badge?.classList.add('active');
            zone.classList.add('has-file', 'upload-completed');

            console.log(`[Elite Dossier] ${key} securely attached: ${file.name}`);
        }

        function resetZone() {
            fileInput.value = '';
            if (_objectURLs[key]) {
                URL.revokeObjectURL(_objectURLs[key]);
                delete _objectURLs[key];
            }
            if (ph) ph.style.display = 'flex';
            badge?.classList.remove('active');
            zone.classList.remove('has-file', 'upload-completed');
        }
    }

    ZONES.forEach(initZone);


    /* ═══════════════════════════════════════════════════════
       2.  ID TYPE RADIO TOGGLE
    ══════════════════════════════════════════════════════ */

    const ID_CONFIG = {
        AADHAAR: { label: 'Aadhaar Number', ph: 'e.g. 1234 5678 9012', format: 'aadhaar' },
        PAN: { label: 'PAN Card Number', ph: 'e.g. ABCDE1234F', format: 'pan' },
        PASSPORT: { label: 'Passport Number', ph: 'e.g. J1234567', format: 'raw' },
    };

    const idInput = document.getElementById('id_number_input');
    const idLabelTxt = document.getElementById('idTypeLabelText');

    function applyIDType(type, isUserChange = true) {
        const cfg = ID_CONFIG[type];
        if (!cfg) return;

        if (idInput) {
            idInput.placeholder = cfg.ph;
            idInput.dataset.format = cfg.format;
            if (cfg.format === 'aadhaar') idInput.maxLength = 14;
            else if (cfg.format === 'pan') idInput.maxLength = 10;
            else idInput.maxLength = 9;

            if (isUserChange) idInput.value = '';
        }

        if (idLabelTxt) idLabelTxt.textContent = cfg.label;

        if (isUserChange) {
            // Also reset the uploaded document for identity proof
            const removeBtn = document.querySelector('#zone-doc-mandatory .remove-file-btn');
            if (removeBtn) removeBtn.click();
        }
    }

    document.querySelectorAll('input[name="id_type"]').forEach(radio => {
        radio.addEventListener('change', () => applyIDType(radio.value, true));
    });

    // Initialise from pre-checked radio
    const checked = document.querySelector('input[name="id_type"]:checked');
    if (checked) applyIDType(checked.value, false);

    // Auto-formatter for Identity
    if (idInput) {
        idInput.addEventListener('input', () => {
            const fmt = idInput.dataset.format;
            if (fmt === 'aadhaar') {
                // Remove all non-digits
                let rawDigits = idInput.value.replace(/\D/g, '');
                
                // Truncate cleanly to 12 digits
                if (rawDigits.length > 12) {
                    rawDigits = rawDigits.substring(0, 12);
                }
                
                // Insert spaces every 4 digits
                idInput.value = rawDigits.replace(/(\d{4})(?=\d)/g, '$1 ');
            } else if (fmt === 'pan') {
                let v = idInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                idInput.value = v.substring(0, 10);
            } else {
                let v = idInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                idInput.value = v.substring(0, 9);
            }
        });
    }

    // Auto-formatter for GST Number
    const gstInput = document.getElementById('gst_number');
    if (gstInput) {
        gstInput.addEventListener('input', () => {
            let v = gstInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            gstInput.value = v.substring(0, 15);
        });
    }

    // Auto-formatter for Govt Registration Number
    const regInput = document.getElementById('govt_reg_number');
    if (regInput) {
        regInput.addEventListener('input', () => {
            let v = regInput.value.toUpperCase().replace(/[^A-Z0-9\-\/]/g, '');
            regInput.value = v.substring(0, 30);
        });
    }


    /* ═══════════════════════════════════════════════════════
       3.  MINI TOAST HELPER  (reuses existing if present)
    ══════════════════════════════════════════════════════ */

    function showToast(msg, type = 'info') {
        // If project already has a toast system, use it
        if (window.showNotification) { window.showNotification(msg, type); return; }

        const t = document.createElement('div');
        t.textContent = msg;
        Object.assign(t.style, {
            position: 'fixed', bottom: '32px', right: '32px', zIndex: 9999,
            background: type === 'error' ? '#ef4444' : 'var(--primary)',
            color: 'white', padding: '12px 20px', borderRadius: '12px',
            fontWeight: '700', fontSize: '0.85rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            animation: 'slideUpFadeIn 0.4s ease',
        });
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }

});
