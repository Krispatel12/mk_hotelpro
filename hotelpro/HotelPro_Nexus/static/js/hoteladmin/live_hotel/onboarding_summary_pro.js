/**
 * SummaryEngine - Renders the final review page in Step 4.
 */
class SummaryEngine {
    constructor() {
        this.container = document.getElementById('summaryContainer');
        this.isLoading = false;
        this.setupEventListeners();
    }

    /**
     * Extracts values from input fields by name
     */
    getVal(name, multiple = false) {
        if (multiple) {
            const checked = document.querySelectorAll(`input[name="${name}"]:checked`);
            return Array.from(checked).map(i => i.closest('label')?.textContent.trim() || i.value);
        }

        const input = document.querySelector(`[name="${name}"]`);
        if (!input) return 'Not Provided';

        if (input.type === 'radio') {
            const checked = document.querySelector(`input[name="${name}"]:checked`);
            return checked ? checked.closest('label')?.querySelector('span')?.textContent.trim() || checked.value : 'Not Provided';
        }

        if (input.tagName === 'SELECT') {
            return input.options[input.selectedIndex]?.text || '';
        }

        return input.value || '';
    }

    /**
     * Standardizes ID formatting
     */
    formatID(str) {
        if (!str || str === 'Not Provided') return str;
        return str.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || str;
    }

    /**
     * Renders a standardized summary section
     */
    renderSection(id, title, items) {
        return `
            <div class="summary-module">
                <div class="module-header">
                    <div class="module-number">${id}</div>
                    <h4 style="font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">${title}</h4>
                </div>
                <div class="dense-grid" style="gap: 30px;">
                    ${items}
                </div>
            </div>
        `;
    }

    /**
     * Renders the final review with a loading animation
     */
    render() {
        if (!this.container || this.isLoading) return;

        this.isLoading = true;
        this.showLoadingSequence(() => {
            this.executeFinalRender();
            this.isLoading = false;
        });
    }

    /**
     * Loading sequence for the review page
     */
    showLoadingSequence(callback) {
        this.container.innerHTML = `
            <div class="summary-loading-state">
                <div class="loading-seal">
                    <i class="fas fa-file-shield fa-beat"></i>
                </div>
                <h3 class="loading-title">Preparing your Review</h3>
                <p class="loading-desc">
                    Gathering your hotel info, rooms, and documents for a final check.
                </p>
                <div class="loading-steps-stack" id="loading-steps-stack">
                    <div class="loading-step-row active" data-index="0">
                        <i class="fas fa-circle-notch fa-spin"></i>
                        <span>Gathering Hotel Info...</span>
                    </div>
                    <div class="loading-step-row" data-index="1">
                        <i class="fas fa-circle"></i>
                        <span>Checking Room Details...</span>
                    </div>
                    <div class="loading-step-row" data-index="2">
                        <i class="fas fa-circle"></i>
                        <span>Processing Documents...</span>
                    </div>
                    <div class="loading-step-row" data-index="3">
                        <i class="fas fa-circle"></i>
                        <span>Preparing Final Review...</span>
                    </div>
                </div>
                <div class="loading-progress-bar">
                    <div class="progress-fill" id="loading-progress-fill" style="width: 0%;"></div>
                </div>
            </div>
        `;

        const steps = this.container.querySelectorAll('.loading-step-row');
        const progressFill = this.container.querySelector('#loading-progress-fill');
        let currentStep = 0;

        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                steps[currentStep].classList.add('completed');
                steps[currentStep].querySelector('i').className = 'fas fa-check-circle';

                currentStep++;
                if (currentStep < steps.length) {
                    steps[currentStep].classList.add('active');
                    steps[currentStep].querySelector('i').className = 'fas fa-circle-notch fa-spin';
                }

                progressFill.style.width = `${(currentStep / steps.length) * 100}%`;
            } else {
                clearInterval(interval);
                setTimeout(callback, 500);
            }
        }, 800);
    }

    /**
     * The actual rendering of the rich dossier content
     */
    executeFinalRender() {
        if (!this.container) return;

        const data = {
            hotelName: this.getVal('hotel_name'),
            hotelType: this.getVal('hotel_type'),
            address: this.getVal('address'),
            city: this.getVal('city') || this.getVal('address').split(',')[1]?.trim() || 'Central',
            pincode: this.getVal('pincode'),
            idType: this.getVal('id_type'),
            idNumber: this.getVal('id_number'),
            gstNumber: this.getVal('gst_number'),
            checkIn: this.getVal('check_in'),
            checkOut: this.getVal('check_out'),
            cancellation: this.getVal('cancellation_policy'),
            services: this.getVal('services', true),
            govtRegNumber: this.getVal('govt_reg_number')
        };

        const propertyPhotos = this.getAllFilePreviews('#galleryInput');
        const idDocs = this.getAllFilePreviews('input[name="doc_mandatory"]');
        const gstDocs = this.getAllFilePreviews('input[name="doc_gst"]');
        const regDocs = this.getAllFilePreviews('input[name="doc_certificate"]');

        this.container.innerHTML = `
            <div class="summary-dossier-wrapper">
                <div class="summary-dossier">
                    <!-- 1. Review Summary -->
                    <div class="dossier-cover">
                        <div class="cover-glow"></div>
                        <div class="holographic-seal-elite">
                            <i class="fas fa-shield-check"></i>
                            <div class="seal-text">READY</div>
                        </div>
                        
                        <div class="cover-content">
                            <div class="cover-branding">
                                <div class="mini-logo">
                                    <i class="fas fa-hotel"></i>
                                    <span>HOTELPRO</span>
                                </div>
                                <div class="dossier-id">ID: ${String(Math.floor(Math.random() * 900000 + 100000))}</div>
                            </div>
                            
                            <div class="cover-main">
                                <span class="enrollment-tag">PENDING HOTEL REGISTRATION</span>
                                <h2 class="property-title-cover">${(!data.hotelName || data.hotelName === 'Not Provided') ? 'HOTEL NAME PENDING' : data.hotelName}</h2>
                                <div class="location-summary">
                                    <i class="fas fa-map-marker-alt"></i>
                                    ${this.extractCleanCity(data.city, data.address)} | PENDING
                                </div>
                            </div>

                            <div class="completeness-board">
                                <div class="metric-item">
                                    <span class="metric-label">Profile Status</span>
                                    <span class="metric-value verified"><i class="fas fa-check-circle"></i> READY</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">Completion level</span>
                                    <span class="metric-value tier-premium">STEP 4</span>
                                </div>
                                <div class="metric-item">
                                    <span class="metric-label">Date</span>
                                    <span class="metric-value">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="dossier-body">
                        <!-- 2. Quality & Completeness Gauge -->
                        <div class="completeness-dashboard">
                            <div class="completeness-main">
                                <div class="gauge-wrap">
                                    <svg viewBox="0 0 100 100">
                                        <circle class="gauge-bg" cx="50" cy="50" r="45"></circle>
                                        <circle class="gauge-fill" cx="50" cy="50" r="45" style="stroke-dasharray: ${this.calculateCompleteness(data) * 2.83}, 283;"></circle>
                                    </svg>
                                    <div class="gauge-text">
                                        <span class="pct">${this.calculateCompleteness(data)}%</span>
                                        <span class="lbl">COMPLETE</span>
                                    </div>
                                </div>
                                <div class="completeness-intel">
                                    <h4>Profile Completion Level</h4>
                                    <p>Your hotel profile is almost ready! We've checked your details for quality.</p>
                                    <div class="loyalty-pills">
                                        <span class="pill"><i class="fas fa-star"></i> GUEST READY</span>
                                        <span class="pill"><i class="fas fa-bolt"></i> VERIFIED</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 3. Property Foundation Section -->
                        ${this.renderSection('01', 'Hotel Info & Location', `
                            <div class="col-12">
                                <div class="audit-card-elite">
                                    <div class="audit-card-header">
                                        <div class="audit-icon-wrap"><i class="fas fa-building-columns"></i></div>
                                        <div>
                                            <span class="audit-meta-tag">HOTEL NAME & LOCATION</span>
                                            <h4 class="audit-main-title">${data.hotelName || 'Hotel Name'}</h4>
                                        </div>
                                        <div class="audit-tier-chip">
                                            <i class="fas fa-hotel"></i>
                                            <span>${data.hotelType}</span>
                                        </div>
                                    </div>
                                    <div class="audit-card-content">
                                        <div class="audit-address-block">
                                            <i class="fas fa-location-dot"></i>
                                            <p>${data.address}</p>
                                        </div>
                                        
                                        <div class="audit-media-showcase">
                                            <div class="showcase-header">
                                                <span><i class="fas fa-images"></i> HOTEL PHOTOS</span>
                                                <span class="asset-count">${propertyPhotos.length} PHOTOS</span>
                                            </div>
                                            <div class="summary-media-grid" style="grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));">
                                                ${propertyPhotos.length > 0
                ? propertyPhotos.map((fileObj, idx) => {
                                                        const isImage = fileObj.type.startsWith('image/') || (fileObj.name && fileObj.name.match(/\.(png|jpe?g|gif|webp|svg)$/i));
                                                        const isVideo = !isImage;
                                                        if (isVideo) {
                                                            return `
                                                            <div class="summary-media-item lightbox-trigger" style="position: relative;">
                                                                <div class="video-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2;"><i class="fas fa-play-circle" style="font-size: 1.5rem; color: white;"></i></div>
                                                                <video src="${fileObj.url}" style="width:100%; height:100%; object-fit:cover; position: relative; z-index: 1;" loop muted playsinline></video>
                                                                <div class="media-badge" style="z-index: 3;">VIDEO-${idx + 1}</div>
                                                            </div>
                                                            `;
                                                        } else {
                                                            return `
                                                            <div class="summary-media-item lightbox-trigger">
                                                                <img src="${fileObj.url}" class="lightbox-trigger">
                                                                <div class="media-badge">PHOTO-${idx + 1}</div>
                                                            </div>
                                                            `;
                                                        }
                                                    }).join('')
                : `
                                                    <div class="empty-dossier-media">
                                                        <i class="fas fa-image-slash"></i>
                                                        <p>No photos uploaded yet.</p>
                                                    </div>
                                                  `
            }
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `)}

                        <!-- 3. Operational Inventory -->
                        ${this.renderSection('02', 'Rooms & Details', `
                            <div class="col-12">
                                <div class="audit-inventory-container">
                                    <div id="summary-room-list" style="display: grid; gap: 20px;">
                                        ${this.renderRoomSummary()}
                                    </div>
                                </div>
                            </div>
                        `)}

                        <!-- 4. Elite Services & Standards -->
                        <div class="dense-grid" style="gap: 32px; margin-top: 50px;">
                            <div class="col-6">
                                <div class="module-header luxury-line">
                                    <div class="module-number">03</div>
                                    <h4 class="luxury-title">Hotel Services</h4>
                                </div>
                                <div class="audit-card-elite service-card-min">
                                    <div class="elite-pills-container highlight-active">
                                        ${data.services.length > 0
                ? data.services.map(s => `<div class="elite-pill-item-modern"><i class="fas fa-check-double"></i> ${s}</div>`).join('')
                : `
                                                <div class="empty-pill-state">
                                                    <i class="fas fa-cubes-stacked"></i>
                                                    <span>No services selected yet.</span>
                                                </div>
                                              `
            }
                                    </div>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="module-header luxury-line">
                                    <div class="module-number">04</div>
                                    <h4 class="luxury-title">Check-in & Rules</h4>
                                </div>
                                <div class="audit-protocol-stack">
                                    <div class="protocol-row-elite">
                                        <div class="p-icon"><i class="fas fa-clock-rotate-left"></i></div>
                                        <div class="p-info">
                                            <span class="p-label">Check-In Time</span>
                                            <h5 class="p-value">${data.checkIn}</h5>
                                        </div>
                                    </div>
                                    <div class="protocol-row-elite">
                                        <div class="p-icon"><i class="fas fa-hourglass-end"></i></div>
                                        <div class="p-info">
                                            <span class="p-label">Check-Out Time</span>
                                            <h5 class="p-value">${data.checkOut}</h5>
                                        </div>
                                    </div>
                                    <div class="policy-footer">
                                        <div class="policy-pill">
                                            <i class="fas fa-shield-halved"></i>
                                            <span>${this.formatPolicy(data.cancellation)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 6. Compliance & Business Authentication -->
                        ${this.renderSection('05', 'Identification & Documents', `
                            <div class="col-12">
                                <div class="authentication-dashboard">
                                    <div class="auth-box primary-id">
                                        <div class="auth-icon"><i class="fas fa-passport"></i></div>
                                        <div class="auth-details">
                                            <span class="auth-label">${data.idType}</span>
                                            <h4 class="auth-value">${this.formatID(data.idNumber)}</h4>
                                            <div class="auth-status"><i class="fas fa-check-double"></i> READY</div>
                                        </div>
                                        <div class="auth-preview-seal">
                                            ${this.renderFilePreview(idDocs[0], 'fa-file-invoice')}
                                        </div>
                                    </div>

                                    <div class="auth-column">
                                        <div class="auth-mini-box">
                                            <div class="auth-mini-content">
                                                <span class="auth-label">Tax Detail (GST)</span>
                                                <h5 class="auth-mini-value">${data.gstNumber || 'NONE'}</h5>
                                            </div>
                                            <div class="auth-mini-icon">
                                                ${this.renderFilePreview(gstDocs[0], 'fa-building-circle-check')}
                                            </div>
                                        </div>
                                        <div class="auth-mini-box">
                                            <div class="auth-mini-content">
                                                <span class="auth-label">Govt. Registration</span>
                                                <h5 class="auth-mini-value">${data.govtRegNumber || 'NONE'}</h5>
                                            </div>
                                            <div class="auth-mini-icon">
                                                ${this.renderFilePreview(regDocs[0], 'fa-gavel')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `)}

                        <!-- 7. Protocol Compliance Certificate (Elite Enhancement) -->
                        ${this.renderSection('07', 'Verification Summary', `
                            <div class="col-12">
                                <div class="protocol-certificate-elite animate-up">
                                    <div class="certificate-glow"></div>
                                    <div class="certificate-content-wrap">
                                        <div class="certificate-seal-badge">
                                            <i class="fas fa-certificate fa-spin" style="animation-duration: 15s;"></i>
                                            <div class="seal-inner-icon"><i class="fas fa-crown"></i></div>
                                        </div>
                                        <div class="certificate-text-box">
                                            <h3 class="protocol-title">Ready for <b>Review</b></h3>
                                            <p class="protocol-desc">Your hotel details have been successfully prepared for review by our team.</p>
                                        </div>
                                        <div class="protocol-meta-grid">
                                            <div class="protocol-node">
                                                <span class="node-label">Review ID</span>
                                                <span class="node-value">HP-${Math.random().toString(36).substring(7).toUpperCase()}</span>
                                            </div>
                                            <div class="protocol-node highlight">
                                                <span class="node-label">Profile Accuracy</span>
                                                <span class="node-value">High</span>
                                            </div>
                                            <div class="protocol-node">
                                                <span class="node-label">Status</span>
                                                <span class="node-value">OFFICIAL</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="blockchain-ledger-row">
                                        <div class="ledger-pulse"></div>
                                        <i class="fas fa-network-wired"></i>
                                        <span>Your information is securely stored and protected.</span>
                                    </div>
                                </div>
                            </div>
                        `)}
                    </div>

                    <!-- 6. Dossier Footer (Elite Centered Edition) -->
                    <div class="summary-footer-elite centered-footer">
                        <div class="footer-seal-center animate-pulse-elite">
                            <i class="fas fa-certificate"></i>
                            <div class="seal-check"><i class="fas fa-check"></i></div>
                        </div>
                        <div class="footer-content-center">
                            <h4 class="footer-brand-title">HotelPro Partner</h4>
                            <p class="footer-brand-desc">This is a summary of the hotel details you are submitting for approval.</p>
                            <div class="footer-verification-badge">
                                <i class="fas fa-shield-halved"></i> <span>DETAILS READY</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderRoomSummary() {
        const roomRows = document.querySelectorAll('.room-card-elite');
        return Array.from(roomRows).map((row) => {
            const index = row.dataset.roomIndex;
            const name = row.querySelector(`[name="room_name_${index}"]`)?.value || 'Standard Category';
            const price = row.querySelector(`[name="room_price_${index}"]`)?.value || '0';
            const type = row.querySelector(`[name="room_class_${index}"]`)?.value || 'Room';
            const amenitiesJson = row.querySelector(`[name="room_amenities_${index}"]`)?.value || '[]';
            let amenities = [];
            try { amenities = JSON.parse(amenitiesJson); } catch (e) { amenities = []; }

            // Extract room-specific photos (Objects with url and isVideo tags)
            const roomPreviewBox = row.querySelector('.room-preview-box');
            const roomMediaData = Array.from(roomPreviewBox.querySelectorAll('img, video')).map(media => {
                return {
                    url: media.src,
                    isVideo: media.tagName === 'VIDEO'
                };
            }).filter(data => data.url && !data.url.startsWith('blob:null'));

            return `
                <div class="summary-room-item" style="align-items: flex-start; gap: 25px;">
                    <div class="summary-media-grid" style="width: 220px; grid-template-columns: repeat(2, 1fr); flex-shrink: 0;">
                        ${roomMediaData.map((dataObj, mIdx) => {
                return `
                                <div class="summary-media-item lightbox-trigger" style="border-radius: 12px; overflow: hidden; position: relative; width: 100%; aspect-ratio: 16/9;">
                                    ${dataObj.isVideo
                        ? `<div class="video-overlay" style="position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 2;"><i class="fas fa-play-circle" style="font-size: 1.5rem; color: white;"></i></div><video src="${dataObj.url}" style="width:100%; height:100%; object-fit:cover; position: relative; z-index: 1;" loop muted playsinline></video>`
                        : `<img src="${dataObj.url}" class="lightbox-trigger" style="width: 100%; height: 100%; object-fit: cover;">`
                    }
                                </div>
                            `;
            }).join('')}
                        ${roomMediaData.length === 0 ? '<div class="summary-media-item" style="display:flex; align-items:center; justify-content:center; background:#f8fafc; border: 1px dashed var(--border); width: 100%; aspect-ratio: 16/9; border-radius: 12px;"><i class="fas fa-image" style="color:var(--text-muted); opacity:0.3;"></i></div>' : ''}
                    </div>

                    <div style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <span style="font-size: 0.65rem; font-weight: 800; color: var(--secondary); text-transform: uppercase;">${type}</span>
                                <h5 style="font-size: 1.1rem; font-weight: 800; margin: 2px 0;">${name}</h5>
                                <div style="font-size: 0.9rem; font-weight: 700; color: var(--primary);">₹${parseFloat(price).toLocaleString('en-IN')} / night</div>
                            </div>
                            <div style="font-size: 0.75rem; font-weight: 800; color: #22c55e; background: rgba(34, 197, 94, 0.1); padding: 5px 12px; border-radius: 8px;">
                                <i class="fas fa-check-circle"></i> READY
                            </div>
                        </div>
                        
                        <div class="elite-pills-container" style="margin-top: 12px; gap: 6px;">
                            ${amenities.map(a => `<span style="font-size: 0.65rem; background: rgba(15, 23, 42, 0.05); padding: 4px 10px; border-radius: 50px; font-weight: 700; color: var(--primary);"><i class="fas fa-check" style="color:var(--secondary); font-size: 0.6rem;"></i> ${a}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getAllFilePreviews(selector) {
        const input = document.querySelector(selector);
        if (!input?.files) return [];
        return Array.from(input.files).map(f => ({
            url: URL.createObjectURL(f),
            type: f.type,
            name: f.name
        }));
    }

    /**
     * Professional file preview renderer
     */
    renderFilePreview(fileObj, fallbackIcon) {
        if (!fileObj) return `<i class="fas ${fallbackIcon}" style="opacity:0.2; font-size:1.8rem;"></i>`;

        const viewerAttr = `data-document-url="${fileObj.url}" data-file-type="${fileObj.type}" title="Click to view full document"`;

        if (fileObj.type.startsWith('image/')) {
            return `<img src="${fileObj.url}" class="lightbox-trigger" ${viewerAttr} style="width:100\%; height:100\%; object-fit:cover;">`;
        }

        const icon = fileObj.type === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-lines';
        const color = fileObj.type === 'application/pdf' ? '#ef4444' : 'var(--secondary)';

        return `
            <div class="document-view-trigger" ${viewerAttr} style="display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; width:100\%; height:100\%; justify-content:center;">
                <i class="fas ${icon}" style="color:${color}; font-size:2rem;"></i>
                <span style="font-size:0.5rem; font-weight:800; opacity:0.6; text-transform:uppercase;">DOCUMENT</span>
            </div>
        `;
    }

    /**
     * Set up global event listeners for the summary
     */
    setupEventListeners() {
        // Doc Preview
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-document-url]');
            if (!trigger) return;

            const url = trigger.getAttribute('data-document-url');
            const type = trigger.getAttribute('data-file-type');

            if (type === 'application/pdf') {
                e.preventDefault();
                e.stopPropagation();
                window.open(url, '_blank');
            }
        }, true);

        // Final Submission Work - Handshake Confirmation
        const submitBtn = document.getElementById('finalSubmitBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', (e) => {
                if (submitBtn.classList.contains('securing')) return;

                e.preventDefault();
                const form = document.getElementById('onboardingForm');

                // === CSRF SECURITY PATCH ===
                // Refresh the CSRF token from the live browser cookie before submission.
                // This prevents 403 errors caused by stale tokens from localStorage,
                // session changes after login, or tab restores.
                const freshCsrfToken = this.getCsrfFromCookie();
                if (freshCsrfToken) {
                    const csrfInput = form.querySelector('[name="csrfmiddlewaretoken"]');
                    if (csrfInput) {
                        csrfInput.value = freshCsrfToken;
                        console.log('[Security] CSRF token refreshed from live cookie before submission.');
                    }
                }

                this.showSubmitHandshake(submitBtn, () => {
                    form.submit();
                });
            });
        }
    }

    /**
     * Reads the Django CSRF token from the browser cookie.
     * Django issues 'csrftoken' as a readable cookie by default.
     */
    getCsrfFromCookie() {
        const name = 'csrftoken';
        const cookieStr = document.cookie;
        const cookies = cookieStr.split(';');
        for (let c of cookies) {
            c = c.trim();
            if (c.startsWith(name + '=')) {
                return decodeURIComponent(c.substring(name.length + 1));
            }
        }
        return null;
    }

    /**
     * Professional Final Confirmation Animation
     */
    showSubmitHandshake(btn, callback) {
        btn.classList.add('securing');
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Submitting Hotel...`;
        btn.style.opacity = '0.8';
        btn.style.pointerEvents = 'none';

        // Add an overlay to step 4 content
        const body = this.container.querySelector('.dossier-body');
        const overlay = document.createElement('div');
        overlay.className = 'final-handshake-overlay';
        overlay.innerHTML = `
            <div class="handshake-content">
                <i class="fas fa-shield-check"></i>
                <h3>Finalizing Registration</h3>
                <p>Saving your hotel details and preparing for review.</p>
            </div>
        `;
        this.container.appendChild(overlay);

        setTimeout(() => {
            btn.innerHTML = `<i class="fas fa-check"></i> Success`;
            setTimeout(callback, 500);
        }, 2200);
    }

    /**
     * Calculate profile completeness pct
     */
    calculateCompleteness(data) {
        let score = 0;
        const weights = {
            hotelName: 10,
            hotelType: 10,
            address: 15,
            services: 15,
            idNumber: 20,
            gstNumber: 15,
            govtRegNumber: 15
        };

        if (data.hotelName && data.hotelName !== 'Not Provided') score += weights.hotelName;
        if (data.hotelType && data.hotelType !== 'Not Provided') score += weights.hotelType;
        if (data.address && data.address !== 'Not Provided') score += weights.address;
        if (data.services.length > 0) score += weights.services;
        if (data.idNumber && data.idNumber !== 'Not Provided') score += weights.idNumber;
        if (data.gstNumber && data.gstNumber !== 'Not Provided') score += weights.gstNumber;
        if (data.govtRegNumber && data.govtRegNumber !== 'Not Provided') score += weights.govtRegNumber;

        return Math.min(score, 100);
    }

    /**
     * Professional policy text formatter
     */
    formatPolicy(text) {
        if (!text || text.toLowerCase() === 'no' || text.length < 5) {
            return 'Standard Property Security & Refund Protocols Apply.';
        }
        return `Compliance: ${text}`;
    }

    /**
     * Refined city extraction for header
     */
    extractCleanCity(city, address) {
        if (city && city !== 'Not Provided' && city.length > 2) return city;
        const parts = address.split(',').map(p => p.trim());
        if (parts.length > 2) {
            return parts[1] || parts[0];
        }
        return parts[0] || 'Property Location';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.summaryEngine = new SummaryEngine();
});
