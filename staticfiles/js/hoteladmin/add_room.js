document.addEventListener('DOMContentLoaded', () => {
    // 1. Selector Handshake
    const form = document.getElementById('add-room-form');
    const amenitiesHidden = document.getElementById('amenities_hidden');
    const uploadZone = document.getElementById('roomUploadZone');
    const mediaInput = document.getElementById('roomMediaInput');
    const previewContainer = document.getElementById('roomMediaPreview');
    const previewImg = document.getElementById('preview-card-img');

    const customInput = document.getElementById('custom_amenity_input');
    const addBtn = document.getElementById('add_custom_amenity_btn');
    const tagsContainer = document.getElementById('custom_tags_container');
    const tagsCountDisplay = document.getElementById('custom_tags_count');

    const toggleHotelBtn = document.getElementById('toggleHotelSelect');
    const hotelWrapper = document.getElementById('hotelSelectWrapper');
    const hotelSelect = document.getElementById('hotelSelect');

    // --- Validation & Contextual Popup Engine (Global Scope for this script) ---
    const showContextualPopup = (el, options = {}) => {
        document.querySelectorAll('.contextual-popup-elite').forEach(p => p.remove());
        if (!el) return; // Robust check (removed offsetParent constraint)

        const popup = document.createElement('div');
        popup.className = 'contextual-popup-elite';
        popup.innerHTML = `
            <div class="context-popup-header">
                <i class="fas ${options.icon || 'fa-exclamation-circle'}"></i>
                <span>${options.title || 'Required'}</span>
            </div>
            <div class="context-popup-body">${options.message || 'Action required.'}</div>
        `;
        document.body.appendChild(popup);

        requestAnimationFrame(() => {
            const rect = el.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;

            const popupWidth = popup.offsetWidth || 240;
            const popupHeight = popup.offsetHeight || 80;

            const isLarge = rect.height > 150;
            let targetTop = isLarge ? (rect.top + 60) : (rect.top + rect.height);
            let top = scrollY + targetTop + 12;
            let left = scrollX + rect.left + (rect.width / 2) - (popupWidth / 2);

            if (targetTop + popupHeight + 40 > window.innerHeight) {
                top = scrollY + rect.top - popupHeight - 12;
                popup.classList.add('is-above');
            }

            popup.style.top = `${top}px`;
            popup.style.left = `${Math.max(20, Math.min(window.innerWidth - popupWidth - 20, left))}px`;
            popup.style.opacity = '1';
            popup.style.transform = 'translateY(0) scale(1)';
        });

        const cleanup = () => {
            popup.style.opacity = '0';
            popup.style.transform = 'translateY(5px) scale(0.95)';
            setTimeout(() => popup.remove(), 300);
            document.removeEventListener('mousedown', cleanupHandler);
            document.removeEventListener('input', cleanup);
        };

        const cleanupHandler = (e) => {
            if (!popup.contains(e.target)) cleanup();
        };

        setTimeout(() => {
            document.addEventListener('mousedown', cleanupHandler);
            document.addEventListener('input', cleanup);
        }, 150);
        setTimeout(cleanup, 5000);
    };

    const highlightField = (element, message, title = 'Missing Field') => {
        if (!element) return;
        element.classList.add('validation-error');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
            showContextualPopup(element, {
                title: title,
                message: message,
                icon: 'fa-hand-pointer'
            });
        }, 750);
        setTimeout(() => element.classList.remove('validation-error'), 4000);
    };

    // World-Class Media Attraction System (Element-Aware Scaling & Navigation)
    const showMediaAttraction = (targetEl, title, subtitle, scrollTargetId = null) => {
        if (!targetEl) return;

        // Anti-Spam
        if (targetEl.dataset.isAttracting === 'true') return;
        targetEl.dataset.isAttracting = 'true';
        setTimeout(() => targetEl.dataset.isAttracting = 'false', 2000);

        const popup = document.createElement('div');
        popup.className = `media-attraction-popup ${scrollTargetId ? 'is-navigation-trigger' : ''}`;
        popup.innerHTML = `
            <div class="media-attraction-content">
                <div class="media-attraction-icon">
                    <i class="fas ${scrollTargetId ? 'fa-arrow-down-long' : 'fa-expand-alt'}"></i>
                </div>
                <div class="media-attraction-text">
                    <span class="media-attraction-title">${title}</span>
                    <span class="media-attraction-subtitle">${subtitle}</span>
                </div>
                ${scrollTargetId ? '<div class="media-attraction-shortcut"><i class="fas fa-chevron-right"></i></div>' : ''}
            </div>
        `;

        document.body.appendChild(popup);

        const rect = targetEl.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;

        const top = scrollY + rect.top - popupRect.height - 15;
        const left = scrollX + rect.left + (rect.width / 2) - (popupRect.width / 2);

        popup.style.left = `${Math.max(20, Math.min(window.innerWidth - popupRect.width - 20, left))}px`;
        popup.style.top = `${top}px`;

        if (scrollTargetId) {
            popup.onclick = (e) => {
                e.stopPropagation();
                const target = document.getElementById(scrollTargetId);
                if (target) {
                    const offset = 100;
                    const elementPosition = target.getBoundingClientRect().top + window.pageYOffset;
                    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });

                    target.style.transition = 'box-shadow 0.5s ease';
                    target.style.boxShadow = '0 0 50px rgba(13, 36, 200, 0.2)';
                    setTimeout(() => target.style.boxShadow = '', 2000);
                }
                popup.remove();
            };
        }

        const duration = scrollTargetId ? 3000 : 1800;
        setTimeout(() => {
            if (!popup.parentNode) return;
            popup.style.opacity = '0';
            popup.style.transform = 'scale(0.9) translateY(10px)';
            popup.style.transition = 'all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)';
            setTimeout(() => popup.remove(), 400);
        }, duration);
    };


    // --- Elite Media Gallery Engine ---
    let currentGalleryMedia = [];
    let activeMediaIndex = 0;

    const openEliteGallery = (mediaList, roomName = 'Room Asset Media') => {
        if (!mediaList || mediaList.length === 0) return;

        // Autonomous Type Detection (Fixes Template Filter dependency)
        const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
        currentGalleryMedia = mediaList.map(item => {
            if (item.type) return item;
            const isV = videoExts.some(ext => item.src.toLowerCase().endsWith(ext));
            return { ...item, type: isV ? 'video' : 'image' };
        });

        activeMediaIndex = 0;


        const modal = document.getElementById('eliteGalleryModal');
        const nameDisplay = document.getElementById('gallery-room-name');

        if (nameDisplay) nameDisplay.textContent = roomName;
        renderGalleryThumbnails();
        showMediaAtIndex(0);

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const renderGalleryThumbnails = () => {
        const container = document.getElementById('galleryThumbnails');
        if (!container) return;

        container.innerHTML = '';
        currentGalleryMedia.forEach((item, index) => {
            const thumb = document.createElement('div');
            thumb.className = `gallery-thumb ${index === 0 ? 'active' : ''}`;
            thumb.setAttribute('data-index', index);

            if (item.type === 'image' || !item.type) {
                thumb.innerHTML = `<img src="${item.src}" alt="Thumb ${index}">`;
            } else if (item.type === 'video') {
                thumb.innerHTML = `
                    <div class="relative w-full h-full">
                        <video src="${item.src}" muted></video>
                        <i class="fas fa-play video-modal-indicator !text-xs"></i>
                    </div>
                `;
            }

            thumb.onclick = () => showMediaAtIndex(index);
            container.appendChild(thumb);
        });
    };

    const showMediaAtIndex = (index) => {
        if (index < 0 || index >= currentGalleryMedia.length) return;
        activeMediaIndex = index;

        const mainImg = document.getElementById('gallery-active-media');
        const videoContainer = document.getElementById('gallery-video-container');
        const item = currentGalleryMedia[index];

        // Update Thumbnails
        document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });

        if (item.type === 'image' || !item.type) {
            videoContainer.classList.add('hidden');
            videoContainer.innerHTML = '';
            mainImg.classList.remove('hidden');
            mainImg.src = item.src;
        } else if (item.type === 'video') {
            mainImg.classList.add('hidden');
            videoContainer.classList.remove('hidden');
            videoContainer.innerHTML = `<video src="${item.src}" controls autoplay class="w-full h-full rounded-[2.5rem] shadow-2xl"></video>`;
        }
    };

    // Close Gallery
    const closeEliteGallery = () => {
        const modal = document.getElementById('eliteGalleryModal');
        if (!modal) return;
        modal.classList.remove('active');
        document.body.style.overflow = '';
        const videoContainer = document.getElementById('gallery-video-container');
        if (videoContainer) videoContainer.innerHTML = '';
    };

    // Setup Gallery Event Handlers
    const closeBtn = document.getElementById('closeGalleryBtn');
    if (closeBtn) closeBtn.onclick = closeEliteGallery;

    const prevBtn = document.getElementById('galleryPrev');
    if (prevBtn) prevBtn.onclick = () => showMediaAtIndex(activeMediaIndex - 1);

    const nextBtn = document.getElementById('galleryNext');
    if (nextBtn) nextBtn.onclick = () => showMediaAtIndex(activeMediaIndex + 1);

    // Escape listener
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeEliteGallery();
        const modal = document.getElementById('eliteGalleryModal');
        if (modal && modal.classList.contains('active')) {
            if (e.key === 'ArrowLeft') showMediaAtIndex(activeMediaIndex - 1);
            if (e.key === 'ArrowRight') showMediaAtIndex(activeMediaIndex + 1);
        }
    });

    // 2. State & Persistence
    let customAmenities = [];

    // 3. Central Amenities Controller
    const getIcon = (item) => {
        const icons = {
            'Wi-Fi': '<i class="fas fa-wifi"></i>',
            'AC': '<i class="fas fa-snowflake"></i>',
            'Mini Bar': '<i class="fas fa-cocktail"></i>',
            'Room Service': '<i class="fas fa-concierge-bell"></i>',
            'Work Space': '<i class="fas fa-laptop-house"></i>',
            'Flat Screen TV': '<i class="fas fa-tv"></i>',
            'Sea View': '<i class="fas fa-water"></i>',
            'City View': '<i class="fas fa-city"></i>',
            'Rain Shower': '<i class="fas fa-shower"></i>',
            'Bathtub': '<i class="fas fa-bath"></i>',
            'Safe': '<i class="fas fa-vault"></i>',
            'Coffee Maker': '<i class="fas fa-coffee"></i>'
        };
        return icons[item] || '<i class="fas fa-star-of-life"></i>';
    };

    const addTag = (text) => {
        if (typeof text !== 'string') return;
        text = text.trim();

        // Validation: Empty or Duplicate
        if (!text || customAmenities.includes(text)) return;

        customAmenities.push(text);
        syncAndRender();
    };

    const removeTag = (text) => {
        customAmenities = customAmenities.filter(t => t !== text);
        syncAndRender();
    };

    const syncAndRender = () => {
        // Update Counter
        if (tagsCountDisplay) {
            tagsCountDisplay.textContent = `${customAmenities.length} ADDED`;
            tagsCountDisplay.classList.add('animate-pulse');
            setTimeout(() => tagsCountDisplay.classList.remove('animate-pulse'), 1000);
        }

        // Render Tags UI
        if (!tagsContainer) return;

        if (customAmenities.length === 0) {
            tagsContainer.innerHTML = '<div class="text-[11px] font-medium text-slate-400 italic">No custom amenities added yet...</div>';
        } else {
            tagsContainer.innerHTML = '';
            customAmenities.forEach(text => {
                const tag = document.createElement('div');
                tag.className = 'elite-tag group';
                tag.innerHTML = `
                    <span>${text}</span>
                    <i class="fas fa-times remove-tag ml-2 opacity-30 group-hover:opacity-100 hover:text-red-500 cursor-pointer transition-all" data-value="${text}"></i>
                `;
                tagsContainer.appendChild(tag);
            });
        }

        // Deep Sync with Hidden Input
        gatherAllAmenities();
    };

    const renderPredefined = () => {
        const container = document.getElementById('amenities_list');
        if (!container) return;

        const predefined = window.PREDEFINED_AMENITIES || [];
        const initial = window.INITIAL_AMENITIES || [];

        container.innerHTML = '';
        predefined.forEach((item, index) => {
            const isChecked = initial.includes(item);
            const label = document.createElement('label');
            label.className = 'group relative flex flex-col items-center justify-center p-5 rounded-3xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-600/10 cursor-pointer transition-all duration-500 backdrop-blur-md';
            label.innerHTML = `
                <input type="checkbox" name="amenity_check" value="${item}" class="d-none" id="amenity_${index}" ${isChecked ? 'checked' : ''}>
                <div class="check-indicator absolute top-4 right-4 w-5 h-5 rounded-full border-2 border-white/10 transition-all flex items-center justify-center overflow-hidden">
                    <i class="fas fa-check text-[10px] text-white opacity-0 transition-opacity"></i>
                </div>
                <div class="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-300 group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-all mb-3 text-lg shadow-inner shadow-black/20">
                    ${getIcon(item)}
                </div>
                <span class="text-[10px] font-black text-slate-300 group-hover:text-primary-400 uppercase tracking-widest text-center transition-colors">${item}</span>
            `;

            const input = label.querySelector('input');
            input.onchange = () => gatherAllAmenities();

            container.appendChild(label);
        });
    };

    const gatherAllAmenities = () => {
        const checked = document.querySelectorAll('input[name="amenity_check"]:checked');
        const standard = Array.from(checked).map(cb => cb.value);
        const all = [...standard, ...customAmenities];

        if (amenitiesHidden) {
            amenitiesHidden.value = JSON.stringify(all);
        }
    };

    // 4. Interaction Engine
    if (addBtn) {
        addBtn.onclick = (e) => {
            e.preventDefault();
            if (customInput) {
                const val = customInput.value.trim();
                if (!val) {
                    showContextualPopup(customInput, {
                        title: 'Amenity Name',
                        message: 'Please enter the name of the custom amenity you wish to add.',
                        icon: 'fa-tag'
                    });
                    return;
                }
                addTag(val);
                customInput.value = '';
                customInput.focus();
            }
        };
    }

    if (customInput) {
        customInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(customInput.value);
                customInput.value = '';
            }
        });
    }

    if (tagsContainer) {
        tagsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-tag')) {
                removeTag(e.target.dataset.value);
            }
        });
    }

    // 5. Initial Lifecycle
    const init = () => {
        try {
            const initial = window.INITIAL_AMENITIES || [];
            const predefined = window.PREDEFINED_AMENITIES || [];

            // Render UI
            renderPredefined();

            if (Array.isArray(initial)) {
                initial.forEach(item => {
                    if (item && !predefined.includes(item)) {
                        if (!customAmenities.includes(item)) customAmenities.push(item);
                    }
                });
                syncAndRender();
            }
        } catch (err) {
            console.error("Init failure:", err);
        }
    };

    // 6. Elite Select System (Bespoke Categories - esp- prefixed)
    const initEliteSelects = () => {
        console.log("Elite Select System Initializing...");
        const selectRoots = document.querySelectorAll('.esp-root');

        if (selectRoots.length === 0) {
            console.warn("No .esp-root elements found!");
            return;
        }

        selectRoots.forEach(root => {
            const trigger = root.querySelector('.esp-trigger');
            const hiddenInput = root.querySelector('input[type="hidden"]');
            const label = root.querySelector('.esp-trigger-label');
            const portalTrigger = root.querySelector('.esp-bespoke-add-trigger');
            const inputWrapper = root.querySelector('.esp-bespoke-input-wrapper');
            const bespokeField = root.querySelector('.esp-bespoke-field');
            const addBtn = root.querySelector('.esp-bespoke-add-btn');

            const optionsContainer = root.querySelector('.esp-options');

            if (!trigger || !optionsContainer) {
                console.error("Critical Elite Select sub-elements missing in root:", root);
                return;
            }

            // Toggle Dropdown
            trigger.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();

                const isActive = root.classList.contains('active');

                // Close all others
                selectRoots.forEach(r => r.classList.remove('active'));

                // Toggle this one
                if (!isActive) {
                    root.classList.add('active');
                    console.log("Dropdown Opened:", root.dataset.selectType || root.id);
                } else {
                    console.log("Dropdown Closed:", root.dataset.selectType || root.id);
                }
            };

            // Handle Option Clicks (Selection AND CRUD Actions)
            optionsContainer.onclick = (e) => {
                const opt = e.target.closest('.esp-option');
                if (!opt) return;

                // 1. Handle Delete Action
                const deleteBtn = e.target.closest('.esp-action-btn.delete');
                if (deleteBtn) {
                    e.stopPropagation();
                    const valToDelete = opt.getAttribute('data-value');
                    const isSelected = opt.classList.contains('selected');

                    opt.remove();
                    console.log("Deleted Category:", valToDelete);

                    if (isSelected) {
                        if (hiddenInput) hiddenInput.value = '';
                        if (label) label.textContent = root.dataset.selectType === 'type' ? 'Select Room Type' : 'Select Class';
                        const triggerIcon = trigger.querySelector('.esp-trigger-icon-box i');
                        if (triggerIcon) triggerIcon.className = `fas fa-${root.dataset.selectType === 'type' ? 'bed' : 'layer-group'}`;
                        if (hiddenInput) hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    return;
                }

                // 2. Handle Edit Action (Inline Renaming)
                const editBtn = e.target.closest('.esp-action-btn.edit');
                if (editBtn) {
                    e.stopPropagation();
                    const span = opt.querySelector('span');
                    if (!span || opt.querySelector('.esp-inline-edit-input')) return;

                    const originalVal = opt.getAttribute('data-value');
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'esp-inline-edit-input';
                    input.value = originalVal;

                    span.replaceWith(input);
                    input.focus();
                    input.select();

                    const finishEdit = (save) => {
                        const newVal = input.value.trim();
                        if (save && newVal && newVal !== originalVal) {
                            opt.setAttribute('data-value', newVal);
                            const newSpan = document.createElement('span');
                            newSpan.textContent = newVal;
                            input.replaceWith(newSpan);

                            // If this was the selected one, update trigger
                            if (opt.classList.contains('selected')) {
                                if (hiddenInput) hiddenInput.value = newVal;
                                if (label) label.textContent = newVal;
                                if (hiddenInput) hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            console.log(`Renamed category from "${originalVal}" to "${newVal}"`);
                        } else {
                            const oldSpan = document.createElement('span');
                            oldSpan.textContent = originalVal;
                            input.replaceWith(oldSpan);
                        }
                    };

                    input.onkeydown = (ev) => {
                        if (ev.key === 'Enter') { ev.preventDefault(); finishEdit(true); }
                        if (ev.key === 'Escape') { finishEdit(false); }
                    };
                    input.onclick = (ev) => ev.stopPropagation();
                    input.onblur = () => finishEdit(true);
                    return;
                }

                // 3. Handle Normal Selection
                e.stopPropagation();
                const val = opt.getAttribute('data-value');
                const iconClass = opt.getAttribute('data-icon') || 'fa-bed';

                // Handle Placeholder Selection ("Select Option")
                if (!val) {
                    root.classList.remove('active');

                    // UI Sync (Clear selection)
                    root.querySelectorAll('.esp-option').forEach(o => o.classList.remove('selected'));
                    opt.classList.add('selected');
                    if (hiddenInput) hiddenInput.value = '';
                    if (label) label.textContent = 'Select Option';

                    // Update Trigger Icon to default
                    const triggerIcon = trigger.querySelector('.esp-trigger-icon-box i');
                    if (triggerIcon) {
                        triggerIcon.className = `fas ${root.dataset.selectType === 'hotel' ? 'fa-hotel' : (root.dataset.selectType === 'type' ? 'fa-bed' : 'fa-layer-group')}`;
                    }

                    // Update Trigger Badge (Hide if placeholder)
                    const triggerBadge = trigger.querySelector('.esp-trigger-badge');
                    if (triggerBadge) triggerBadge.classList.add('hidden');

                    if (hiddenInput) hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }

                // 4. Handle Redirection (Property Context Switch)
                if (root.dataset.redirect === 'true') {
                    const url = opt.getAttribute('data-redirect-url');
                    if (url) {
                        console.log("Redirecting to property context:", url);
                        window.location.href = url;
                        return;
                    }
                }

                // 5. Regular Selection UI Sync
                root.querySelectorAll('.esp-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');

                if (hiddenInput) hiddenInput.value = val;
                if (label) label.textContent = val;

                // Update Trigger Icon
                const triggerIcon = trigger.querySelector('.esp-trigger-icon-box i');
                if (triggerIcon) {
                    triggerIcon.className = `fas ${iconClass}`;
                }

                root.classList.remove('active');
                console.log("Option Selected:", val);

                // Update Trigger Badge (Show if valid selection)
                const triggerBadge = trigger.querySelector('.esp-trigger-badge');
                if (triggerBadge) triggerBadge.classList.remove('hidden');

                // Trigger Live Sync manually
                if (hiddenInput) {
                    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            };

            // Handle Bespoke Portal (Add New)
            if (portalTrigger && inputWrapper && bespokeField && addBtn) {
                portalTrigger.onclick = (e) => {
                    e.stopPropagation();
                    portalTrigger.style.setProperty('display', 'none', 'important');
                    inputWrapper.classList.add('active');
                    bespokeField.focus();
                };

                addBtn.onclick = (e) => {
                    e.stopPropagation();
                    const newVal = bespokeField.value.trim();
                    if (!newVal) return;

                    const defaultIcon = root.dataset.selectType === 'type' ? 'fa-bed' : 'fa-layer-group';

                    // Create New Option
                    const newOpt = document.createElement('div');
                    newOpt.className = 'esp-option selected';
                    newOpt.setAttribute('data-value', newVal);
                    newOpt.setAttribute('data-icon', defaultIcon);
                    newOpt.innerHTML = `
                        <div class="flex items-center gap-3 pointer-events-none">
                            <div class="esp-opt-icon-box">
                                <i class="fas ${defaultIcon}"></i>
                            </div>
                            <span>${newVal}</span>
                        </div>
                        <div class="esp-option-actions">
                            <button type="button" class="esp-action-btn edit" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                            <button type="button" class="esp-action-btn delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
                        </div>
                        <i class="fas fa-check esp-check"></i>
                    `;

                    // Add to UI
                    optionsContainer.appendChild(newOpt);

                    // Sync State
                    root.querySelectorAll('.esp-option').forEach(o => o.classList.remove('selected'));
                    newOpt.classList.add('selected');
                    if (hiddenInput) hiddenInput.value = newVal;
                    if (label) label.textContent = newVal;

                    // Update Trigger Icon
                    const triggerIcon = trigger.querySelector('.esp-trigger-icon-box i');
                    if (triggerIcon) {
                        triggerIcon.className = `fas ${defaultIcon}`;
                    }

                    // Reset Portal
                    bespokeField.value = '';
                    inputWrapper.classList.remove('active');
                    portalTrigger.style.setProperty('display', 'flex', 'important');
                    root.classList.remove('active');

                    // Sync
                    if (hiddenInput) {
                        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    console.log("New Category Added:", newVal);
                };

                bespokeField.onclick = (e) => e.stopPropagation();
                bespokeField.onkeypress = (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addBtn.click();
                    }
                };
            }
        });

        // Close on outside click (robust)
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.esp-root')) {
                selectRoots.forEach(r => {
                    if (r.classList.contains('active')) {
                        r.classList.remove('active');
                        console.log("Dropdown closed by outside click");
                    }
                });
            }
        });
    };

    // 7. Media Management (1-3 Images, 1 Video + Removal Logic)
    if (uploadZone && mediaInput) {
        let selectedMediaFiles = []; // Persistent state for files

        const updateMediaInput = () => {
            const dt = new DataTransfer();
            selectedMediaFiles.forEach(file => dt.items.add(file));
            mediaInput.files = dt.files;
        };

        const renderPreviews = () => {
            if (!previewContainer) return;
            previewContainer.innerHTML = '';

            // Sync with first image to the preview card automatically
            const firstImage = selectedMediaFiles.find(f => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i));
            if (firstImage && previewImg) {
                const reader = new FileReader();
                reader.onload = (e) => previewImg.src = e.target.result;
                reader.readAsDataURL(firstImage);
            } else if (previewImg) {
                previewImg.src = '{% static "img/hoteladmin/room_placeholder.jpg" %}'; // Fallback
            }

            // Sync Video Badge visibility
            const videoBadge = document.getElementById('preview-video-badge');
            if (videoBadge) {
                const hasVideo = selectedMediaFiles.some(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|ogg|mov)$/i));
                videoBadge.classList.toggle('hidden', !hasVideo);
            }

            // Proactive Attraction (Auto-Show over the main PREVIEW CARD)
            const activePreview = document.querySelector('.preview-image-container');
            if (activePreview && selectedMediaFiles.length > 0) {
                const hasV = selectedMediaFiles.some(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|ogg|mov)$/i));
                setTimeout(() => {
                    showMediaAttraction(activePreview, 'Asset Synchronized', hasV ? 'Images & Video correctly formatted' : 'High-resolution images correctly processed');
                }, 800);
            }


            selectedMediaFiles.forEach((file, index) => {
                const isVideoFile = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);
                const reader = new FileReader();

                reader.onload = (ev) => {
                    const div = document.createElement('div');
                    div.className = "relative group aspect-square rounded-2xl overflow-hidden border-2 border-primary-100 shadow-md animate-in zoom-in duration-300";

                    let contentHtml = '';
                    let videoUrl = null;

                    if (isVideoFile) {
                        videoUrl = URL.createObjectURL(file);
                        contentHtml = `
                            <div class="w-full h-full bg-slate-900 flex items-center justify-center relative video-preview-container">
                                <video src="${videoUrl}" class="w-full h-full object-cover" muted loop></video>
                                <div class="absolute inset-0 flex items-center justify-center pointer-events-none play-overlay transition-opacity duration-300">
                                    <i class="fas fa-play-circle text-white text-4xl opacity-50"></i>
                                </div>
                                <span class="video-asset-badge">Video Asset</span>
                            </div>
                        `;
                    } else {
                        const isFirstImage = selectedMediaFiles.findIndex(f => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) === index;
                        contentHtml = `
                            <img src="${ev.target.result}" class="w-full h-full object-cover">
                            ${isFirstImage ? `
                                <div class="primary-media-badge shadow-lg">
                                    <i class="fas fa-crown"></i>
                                    <span>Cover Image</span>
                                </div>
                            ` : ''}
                        `;
                    }

                    div.innerHTML = `
                        ${contentHtml}
                        <button type="button" class="remove-media-btn">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="absolute inset-0 bg-primary-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <i class="fas fa-check-circle text-white text-3xl"></i>
                        </div>
                    `;

                    // Attach Dynamic Events
                    const deleteBtn = div.querySelector('.remove-media-btn');
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (videoUrl) URL.revokeObjectURL(videoUrl);
                        selectedMediaFiles.splice(index, 1);
                        updateMediaInput();
                        renderPreviews();
                    };

                    if (isVideoFile) {
                        const video = div.querySelector('video');
                        const playOverlay = div.querySelector('.play-overlay');
                        div.onmouseenter = () => {
                            video.play().catch(() => { });
                            if (playOverlay) playOverlay.style.opacity = '0';
                        };
                        div.onmouseleave = () => {
                            video.pause();
                            video.currentTime = 0;
                            if (playOverlay) playOverlay.style.opacity = '1';
                        };
                    }

                    previewContainer.appendChild(div);
                };
                reader.readAsDataURL(file);
            });
        };

        uploadZone.addEventListener('click', () => mediaInput.click());

        mediaInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // Check Limits against current state
            let currentImages = selectedMediaFiles.filter(f => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)).length;
            let currentVideos = selectedMediaFiles.filter(f => f.type.startsWith('video/') || f.name.match(/\.(mp4|webm|ogg|mov)$/i)).length;

            let newImages = 0;
            let newVideos = 0;
            const isImage = (file) => file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            const isVideo = (file) => file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);

            const validNewFiles = [];

            for (const file of files) {
                if (isImage(file)) {
                    if (currentImages + newImages < 10) {
                        newImages++;
                        validNewFiles.push(file);
                    } else {
                        highlightField(uploadZone, 'Limit exceeded: Maximum 10 images allowed.', 'Image Limit');
                    }
                } else if (isVideo(file)) {
                    if (currentVideos + newVideos < 2) {
                        newVideos++;
                        validNewFiles.push(file);
                    } else {
                        highlightField(uploadZone, 'Limit reached: Only 2 optional videos allowed.', 'Video Limit');
                    }
                }
            }

            if (validNewFiles.length > 0) {
                selectedMediaFiles = [...selectedMediaFiles, ...validNewFiles];
                updateMediaInput();
                renderPreviews();
            } else {
                mediaInput.value = ''; // Reset if nothing added
            }
        });

        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.style.borderColor = '#0d24c8';
            uploadZone.style.background = 'white';
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.borderColor = 'rgba(13, 36, 200, 0.1)';
            uploadZone.style.background = 'rgba(248, 250, 252, 0.5)';
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            const droppedFiles = e.dataTransfer.files;

            // Trigger the change logic by manually setting files and dispatching
            const dt = new DataTransfer();
            Array.from(droppedFiles).forEach(f => dt.items.add(f));
            mediaInput.files = dt.files;
            mediaInput.dispatchEvent(new Event('change'));
        });
    }


    // 8. Elite Live Sync Manager (Professional Preview)
    const previewName = document.getElementById('preview-card-name');
    const previewPrice = document.getElementById('preview-card-price');
    const previewClass = document.getElementById('preview-card-class');
    const previewGuests = document.getElementById('preview-card-guests');
    const previewUnits = document.getElementById('preview-card-units');
    const inputName = document.getElementById('room_name_input');
    const inputPrice = document.getElementById('base_price_input');
    const inputClass = document.getElementById('room_class_input');
    const inputType = document.getElementById('room_type_input');
    const inputGuests = document.getElementById('max_guests_input');
    const inputUnits = document.getElementById('inventory_count_input');

    const syncField = (element, value, defaultValue = '') => {
        if (!element) return;
        element.textContent = value || defaultValue;

        // Premium micro-animation (Subtle scale instead of color)
        element.style.transition = 'transform 0.3s ease';
        element.style.transform = 'scale(1.05)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    };

    const updateAutomatedName = () => {
        if (!inputName || !inputClass || !inputType) return;

        const className = inputClass.value || '';
        const typeName = inputType.value || '';

        if (className || typeName) {
            const automatedName = `${className} ${typeName}`.trim();
            inputName.value = automatedName;
            syncField(previewName, automatedName, 'Deluxe Suite');
            console.log("Automated Name Generated:", automatedName);
        }
    };

    if (inputPrice) {
        inputPrice.addEventListener('input', (e) => {
            const val = e.target.value || '0';
            const formatted = new Intl.NumberFormat('en-IN').format(parseFloat(val));
            syncField(previewPrice, formatted, '4500');
        });
    }

    if (inputGuests) {
        inputGuests.addEventListener('input', (e) => syncField(previewGuests, e.target.value, '2'));
    }

    if (inputUnits) {
        inputUnits.addEventListener('input', (e) => syncField(previewUnits, e.target.value, '1'));
    }

    if (inputClass) {
        inputClass.addEventListener('change', (e) => {
            const val = e.target.value;
            updateAutomatedName();
            syncField(previewClass, val, 'DELUXE');

            // Dynamic theme update for badge and card
            const container = document.getElementById('preview-card-container');
            if (container) {
                container.dataset.category = val.toUpperCase();
            }

            if (previewClass) {
                const colors = {
                    'Deluxe': 'bg-blue-600 shadow-blue-500/40',
                    'Standard': 'bg-slate-600 shadow-slate-500/40',
                    'Suite': 'bg-indigo-600 shadow-indigo-500/40',
                    'Luxury': 'bg-rose-600 shadow-rose-500/40',
                    'Economy': 'bg-emerald-600 shadow-emerald-500/40',
                    'Premium': 'bg-emerald-500 shadow-emerald-400/40'
                };
                previewClass.className = `px-5 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all duration-500 ${colors[val] || 'bg-blue-600 shadow-blue-500/40'}`;
            }

            // Enhanced visibility for secondary badges
            const secondaryBadges = [previewGuests, previewUnits];
            secondaryBadges.forEach(el => {
                if (el) {
                    const badgeParent = el.closest('div');
                    if (badgeParent) {
                        badgeParent.className = "flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm transition-all duration-500";
                        const icon = badgeParent.querySelector('i');
                        if (icon) icon.className = icon.className.replace('text-slate-400', 'text-white');
                        const span = badgeParent.querySelector('span');
                        if (span) span.className = span.className.replace('text-slate-600', 'text-white');
                    }
                }
            });
        });
    }

    if (inputType) {
        inputType.addEventListener('change', () => {
            updateAutomatedName();
        });
    }


    // Initialize Preview on Load
    const initPreview = () => {
        if (inputName && inputName.value) syncField(previewName, inputName.value, 'Deluxe Suite');
        if (inputPrice && inputPrice.value) {
            const formatted = new Intl.NumberFormat('en-IN').format(parseFloat(inputPrice.value));
            syncField(previewPrice, formatted, '4500');
        }
        if (inputGuests && inputGuests.value) syncField(previewGuests, inputGuests.value, '2');
        if (inputUnits && inputUnits.value) syncField(previewUnits, inputUnits.value, '1');
        if (inputClass && inputClass.value) {
            const val = inputClass.value;
            syncField(previewClass, val, 'DELUXE');

            const container = document.getElementById('preview-card-container');
            if (container) {
                container.dataset.category = val.toUpperCase();
            }

            if (previewClass) {
                const colors = {
                    'Deluxe': 'bg-blue-600 shadow-blue-500/40',
                    'Standard': 'bg-slate-600 shadow-slate-500/40',
                    'Suite': 'bg-indigo-600 shadow-indigo-500/40',
                    'Luxury': 'bg-rose-600 shadow-rose-500/40',
                    'Economy': 'bg-emerald-600 shadow-emerald-500/40',
                    'Premium': 'bg-emerald-500 shadow-emerald-400/40'
                };
                previewClass.className = `px-5 py-2 rounded-full text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all duration-500 ${colors[val] || 'bg-blue-600 shadow-blue-500/40'}`;
            }

            // Sync secondary badge aesthetics for initial load
            const secondaryBadges = [previewGuests, previewUnits];
            secondaryBadges.forEach(el => {
                if (el) {
                    const badgeParent = el.closest('div');
                    if (badgeParent) {
                        badgeParent.className = "flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white shadow-sm transition-all duration-500";
                        const icon = badgeParent.querySelector('i');
                        if (icon) icon.className = icon.className.replace('text-slate-400', 'text-white');
                        const span = badgeParent.querySelector('span');
                        if (span) span.className = span.className.replace('text-slate-600', 'text-white');
                    }
                }
            });
        }
    };

    // 11. Elite Form Orchestrator (AJAX & Dynamic Integration)
    const resetForm = () => {
        console.log("Elite Reset Sequence Initiated...");

        // 1. Reset Native Inputs
        if (form) form.reset();
        if (mediaInput) mediaInput.value = '';
        if (inputName) inputName.value = '';

        // 2. Reset Amenities
        customAmenities.length = 0;
        syncAndRender();

        // 3. Reset Elite Selects
        document.querySelectorAll('.esp-root').forEach(root => {
            const hiddenInput = root.querySelector('input[type="hidden"]');
            const label = root.querySelector('.esp-trigger-label');
            const iconBox = root.querySelector('.esp-trigger-icon-box i');
            const type = root.dataset.selectType;

            // Skip hotel context if present
            if (type === 'hotel') return;

            if (hiddenInput) hiddenInput.value = '';
            if (label) label.textContent = type === 'type' ? 'Select Room Type' : 'Select Class';
            if (iconBox) iconBox.className = `fas fa-${type === 'type' ? 'bed' : 'layer-group'}`;

            // Clear selections in dropdown
            root.querySelectorAll('.esp-option').forEach(opt => opt.classList.remove('selected'));
        });

        // 4. Reset Preview Card
        initPreview();
        if (previewImg) {
            previewImg.src = 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?q=80&w=400&auto=format&fit=crop';
        }
        const videoBadge = document.getElementById('preview-video-badge');
        if (videoBadge) videoBadge.classList.add('hidden');

        // 5. Reset Editing State
        const editingIdInput = document.getElementById('editing_room_id');
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        const modeLabel = document.getElementById('form-mode-label');
        if (editingIdInput) editingIdInput.value = '';
        if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
        if (modeLabel) {
            modeLabel.textContent = 'New Asset Configuration';
            modeLabel.classList.remove('text-amber-600');
            modeLabel.classList.add('text-primary-600');
        }

        console.log("Form Reset Complete.");
    };

    const showNotification = (message, type = 'success') => {
        const notify = document.createElement('div');
        notify.className = `fixed bottom-10 right-10 z-[2000] px-8 py-5 rounded-2xl shadow-2xl animate-reveal flex items-center gap-4 border ${type === 'success' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-rose-50 border-rose-100 text-rose-600'}`;
        notify.innerHTML = `
            <div class="w-8 h-8 rounded-xl ${type === 'success' ? 'bg-primary-600' : 'bg-rose-600'} flex items-center justify-center text-white">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
            </div>
            <span class="text-[11px] font-black uppercase tracking-widest">${message}</span>
        `;
        document.body.appendChild(notify);
        setTimeout(() => notify.classList.add('fade-out'), 4000);
        setTimeout(() => notify.remove(), 4500);
    };

    const updateInventoryVisibility = () => {
        const liveGrid = document.getElementById('live-assets-grid');
        const verifiedGrid = document.getElementById('verified-assets-grid');
        const liveSection = document.getElementById('live-portfolio-section');
        const verifiedSection = document.getElementById('verified-drafts-section');
        const emptyState = document.getElementById('empty-dynamic-state');
        const masterShell = document.getElementById('inventory-master-shell');

        const hasLive = liveGrid && liveGrid.children.length > 0;
        const hasVerified = verifiedGrid && verifiedGrid.children.length > 0;

        if (liveSection) {
            hasLive ? liveSection.classList.remove('d-none') : liveSection.classList.add('d-none');
        }
        if (verifiedSection) {
            hasVerified ? verifiedSection.classList.remove('d-none') : verifiedSection.classList.add('d-none');
        }

        if (emptyState) {
            (hasLive || hasVerified) ? emptyState.classList.add('d-none') : emptyState.classList.remove('d-none');
        }

        // Master Shell Aesthetic Toggles
        if (masterShell) {
            if (hasLive || hasVerified) {
                masterShell.classList.remove('border-slate-200', 'bg-slate-50/30');
                masterShell.classList.add('border-slate-100', 'bg-white', 'shadow-2xl', 'shadow-slate-200/50');
            } else {
                masterShell.classList.add('border-slate-200', 'bg-slate-50/30');
                masterShell.classList.remove('border-slate-100', 'bg-white', 'shadow-2xl', 'shadow-slate-200/50');
            }
        }
    };

    const handleToggleStatus = async (roomCard) => {
        const toggleUrl = roomCard.dataset.toggleUrl;
        const deployBtn = roomCard.querySelector('.deploy-room-btn');
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        if (!toggleUrl || !deployBtn) return;

        try {
            // Visual feedback loop
            deployBtn.disabled = true;
            deployBtn.style.opacity = '0.5';
            const icon = deployBtn.querySelector('i');
            if (icon) icon.className = 'fas fa-spinner fa-spin';

            const response = await fetch(toggleUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();

            if (data.status === 'success') {
                showNotification(data.message);

                // Real-time Card Transformation
                const isActive = data.is_active;
                roomCard.classList.remove('status-live', 'status-draft', 'border-emerald-500/30', 'border-amber-500/30');
                roomCard.classList.add(isActive ? 'status-live' : 'status-draft');
                roomCard.classList.add(isActive ? 'border-emerald-500/30' : 'border-amber-500/30');

                // Re-render button state
                if (isActive) {
                    deployBtn.className = 'deploy-room-btn flex-grow py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-50 hover:border-amber-100 hover:text-amber-600 transition-all flex items-center justify-center gap-2 group/btn';
                    deployBtn.innerHTML = `<i class="fas fa-check-double group-hover/btn:hidden"></i><i class="fas fa-pause hidden group-hover/btn:inline"></i><span class="group-hover/btn:hidden">DEPLOYED</span><span class="hidden group-hover/btn:inline">SET TO DRAFT</span>`;
                } else {
                    deployBtn.className = 'deploy-room-btn flex-grow py-3.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 hover:bg-emerald-600 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group/btn';
                    deployBtn.innerHTML = `<i class="fas fa-bolt-lightning text-amber-400 group-hover/btn:text-white transition-colors"></i>DEPLOY LIVE`;
                }

                // Move card to correct grid if necessary
                const targetGridId = isActive ? 'live-assets-grid' : 'verified-assets-grid';
                const targetGrid = document.getElementById(targetGridId);
                if (targetGrid && !targetGrid.contains(roomCard)) {
                    roomCard.classList.add('fade-out');
                    setTimeout(() => {
                        targetGrid.insertBefore(roomCard, targetGrid.firstChild);
                        roomCard.classList.remove('fade-out');
                        roomCard.classList.add('animate-reveal');
                        updateInventoryVisibility();
                    }, 400);
                }
            }
        } catch (err) {
            showNotification('Status Update Failed', 'error');
        } finally {
            deployBtn.disabled = false;
            deployBtn.style.opacity = '1';
        }
    };

    const handleDynamicDelete = async (roomCard) => {
        const deleteUrl = roomCard.dataset.deleteUrl;
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        if (!confirm('Are you sure you want to decommission this asset?')) return;

        try {
            const response = await fetch(deleteUrl, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': csrfToken
                }
            });
            const data = await response.json();
            if (data.status === 'success') {
                showNotification(data.message);
                roomCard.classList.add('fade-out');
                setTimeout(() => {
                    roomCard.remove();
                    updateInventoryVisibility();
                }, 500);
            }
        } catch (err) {
            showNotification('Deletion Failed', 'error');
        }
    };

    const handleDynamicEdit = async (roomCard) => {
        const url = roomCard.dataset.editUrl;
        if (!url) return;

        try {
            const response = await fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            const result = await response.json();
            if (result.status === 'success') {
                const data = result.data;

                // Set editing state
                document.getElementById('editing_room_id').value = data.id;
                document.getElementById('cancel-edit-btn').classList.remove('hidden');
                const modeLabel = document.getElementById('form-mode-label');
                if (modeLabel) {
                    modeLabel.textContent = `Revoking & Re-deploying: ${data.name}`;
                    modeLabel.classList.add('text-amber-600');
                }

                // Populate Form
                if (inputName) inputName.value = data.name;
                if (inputPrice) {
                    inputPrice.value = data.base_price;
                    inputPrice.dispatchEvent(new Event('input'));
                }
                if (inputGuests) {
                    inputGuests.value = data.max_guests;
                    inputGuests.dispatchEvent(new Event('input'));
                }
                if (inputUnits) {
                    inputUnits.value = data.inventory_count;
                    inputUnits.dispatchEvent(new Event('input'));
                }

                // Populate Elite Selects
                if (data.room_class) {
                    const classRoot = document.querySelector('.esp-root[data-select-type="class"]');
                    if (classRoot) {
                        const opt = classRoot.querySelector(`.esp-option[data-value="${data.room_class.toUpperCase()}"]`) ||
                            classRoot.querySelector(`.esp-option[data-value="${data.room_class}"]`);
                        if (opt) opt.click();
                    }
                }

                // Populate Amenities
                customAmenities.length = 0;
                if (Array.isArray(data.amenities)) {
                    data.amenities.forEach(a => {
                        const predefined = window.PREDEFINED_AMENITIES || [];
                        if (!predefined.includes(a) && !customAmenities.includes(a)) {
                            customAmenities.push(a);
                        }
                    });
                }
                syncAndRender();

                window.scrollTo({ top: 0, behavior: 'smooth' });
                showNotification(`Loaded ${data.name} for revision`);
            }
        } catch (err) {
            showNotification('Edit Failed to Load', 'error');
        }
    };

    // Event Delegation for Grid Actions
    const inventorySection = document.getElementById('live-inventory-section');
    if (inventorySection) {
        inventorySection.addEventListener('click', (e) => {
            const roomCard = e.target.closest('.room-card');
            if (!roomCard) return;

            const deployBtn = e.target.closest('.deploy-room-btn');
            const editBtn = e.target.closest('.edit-room-btn');
            const deleteBtn = e.target.closest('.delete-room-btn');

            if (deployBtn) {
                handleToggleStatus(roomCard);
            } else if (editBtn) {
                handleDynamicEdit(roomCard);
            } else if (deleteBtn) {
                handleDynamicDelete(roomCard);
            }
        });
    }

    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            resetForm();
            showNotification('Revision Cancelled');
        });
    }

    // --- Delegation for Media Gallery Triggers ---
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.media-gallery-trigger');
        if (!trigger) return;

        e.stopPropagation();

        // Check if it's the preview trigger
        if (trigger.id === 'preview-gallery-trigger') {
            const previewItems = Array.from(previewContainer.children);
            const mediaList = previewItems.map(item => {
                const img = item.querySelector('img');
                const video = item.querySelector('video');
                if (img) return { src: img.src, type: 'image' };
                if (video) return { src: video.src, type: 'video' };
                return null;
            }).filter(i => i !== null);

            if (mediaList.length === 0) {
                showNotification('No media available for preview', 'warning');
                return;
            }
            openEliteGallery(mediaList, 'Live Preview Asset');
        } else {
            // It's a standard inventory card trigger
            try {
                const mediaData = JSON.parse(trigger.getAttribute('data-media') || '[]');
                const roomName = trigger.getAttribute('data-room-name') || 'Room Asset Media';
                openEliteGallery(mediaData, roomName);
            } catch (err) {
                console.error("Gallery Data Error:", err);
            }
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // 1. Precise Validation Layer
            const propertyInput = document.getElementById('hotel_context_input');
            const rcInput = document.getElementById('room_class_input');
            const rtInput = document.getElementById('room_type_input');
            const mgInput = document.getElementById('max_guests_input');
            const icInput = document.getElementById('inventory_count_input');
            const bpInput = document.getElementById('base_price_input');

            if (!propertyInput.value) {
                highlightField(propertyInput.closest('.esp-root').querySelector('.esp-trigger'), 'Please select a hotel name from the context menu to continue.', 'Active Asset Context');
                return;
            }

            if (!rcInput.value) {
                highlightField(rcInput.closest('.esp-root').querySelector('.esp-trigger'), 'Please select a room class category for this asset.', 'Room Class');
                return;
            }
            if (!rtInput.value) {
                highlightField(rtInput.closest('.esp-root').querySelector('.esp-trigger'), 'Please select a specific room type (e.g. Deluxe, Suite) to proceed.', 'Room Type');
                return;
            }
            if (!mgInput.value || parseInt(mgInput.value) <= 0) {
                highlightField(mgInput, 'Please specify the maximum guest capacity for this room.', 'Max Guests');
                return;
            }
            if (!icInput.value || parseInt(icInput.value) <= 0) {
                highlightField(icInput, 'Please enter the total number of rooms available for this category.', 'Inventory Count');
                return;
            }
            if (!bpInput.value || parseFloat(bpInput.value) <= 0) {
                highlightField(bpInput, 'Please set a base price per night for this room category.', 'Price Per Night');
                return;
            }

            // 2. Amenities Controller (Sync state before packing)
            gatherAllAmenities();

            // 3. Media Validation (Refined: 1-3 Images, 1 optional Video)
            const editingId = document.getElementById('editing_room_id').value;
            const previewItems = Array.from(document.getElementById('roomMediaPreview').children);
            const mediaFiles = Array.from(mediaInput.files || []);

            // Count current state (Preview + New Files)
            let imageCount = 0;
            let videoCount = 0;

            // Helper to check file types
            const isImage = (file) => file.type.startsWith('image/') || file.name.match(/\.(jpg|jpeg|png|webp|gif)$/i);
            const isVideo = (file) => file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|ogg|mov)$/i);

            // 3.1 Check existing preview items (if any, though we usually clear on reset/load)
            previewItems.forEach(item => {
                if (item.querySelector('img')) imageCount++;
                if (item.querySelector('video')) videoCount++;
            });

            // 3.2 Check new files
            mediaFiles.forEach(file => {
                if (isImage(file)) imageCount++;
                if (isVideo(file)) videoCount++;
            });

            const mediaBox = uploadZone || mediaInput;

            if (imageCount < 1) {
                highlightField(mediaBox, 'Please upload at least 1 image (Max 3) to configure this asset.', 'Media Required');
                return;
            }
            if (imageCount > 10) {
                highlightField(mediaBox, 'Strict limit: Maximum 10 images allowed for a professional display.', 'Image Limit');
                return;
            }
            if (videoCount > 2) {
                highlightField(mediaBox, 'Limit reached: You can upload only 2 optional video highlights.', 'Video Limit');
                return;
            }

            // 4. Data Packing
            const formData = new FormData(form);

            // Determine dynamic action URL
            let actionUrl = window.location.href;
            if (editingId) {
                actionUrl = `/rooms/edit/${editingId}/`;
            }

            try {
                // Visual feedback on buttons
                const submitBtns = form.querySelectorAll('button[type="submit"]');
                submitBtns.forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.7';
                    const icon = btn.querySelector('.fa-bolt-lightning');
                    if (icon) icon.classList.add('fa-spin', 'text-amber-400');
                });

                const response = await fetch(actionUrl, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    }
                });

                const data = await response.json();

                if (data.status === 'success') {
                    showNotification(data.message);

                    // Dynamic Categorized Injection
                    const targetGridId = data.hotel_is_live ? 'live-assets-grid' : 'verified-assets-grid';
                    const targetGrid = document.getElementById(targetGridId);

                    if (targetGrid && data.room_html) {
                        if (data.is_edit) {
                            // Find and replace existing card in ANY grid
                            const oldCard = document.querySelector(`.room-card[data-edit-url$="/edit/${data.room_id}/"]`);
                            if (oldCard) {
                                const temp = document.createElement('div');
                                temp.innerHTML = data.room_html;
                                const newCard = temp.firstElementChild;
                                newCard.classList.add('animate-reveal');
                                oldCard.replaceWith(newCard);
                            }
                        } else {
                            const temp = document.createElement('div');
                            temp.innerHTML = data.room_html;
                            const newCard = temp.firstElementChild;
                            newCard.classList.add('animate-reveal');
                            targetGrid.insertBefore(newCard, targetGrid.firstChild);
                        }

                        updateInventoryVisibility();

                        // Expert-Level Scroll Focus
                        const targetSection = document.getElementById('live-inventory-section');
                        if (targetSection) {
                            setTimeout(() => {
                                const offset = 100; // Professional framing offset
                                const elementPosition = targetSection.getBoundingClientRect().top + window.pageYOffset;
                                const offsetPosition = elementPosition - offset;

                                window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                });
                            }, 450); // Optimized timing for animation sync
                        }
                    }

                    resetForm();
                } else {
                    showNotification(data.message || 'Deployment Failed', 'error');
                }
            } catch (err) {
                console.error("Submission Error:", err);
                showNotification('Network Handshake Failed', 'error');
            } finally {
                const submitBtns = form.querySelectorAll('button[type="submit"]');
                submitBtns.forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    const icon = btn.querySelector('.fa-bolt-lightning');
                    if (icon) icon.classList.remove('fa-spin');
                });
            }
        });
    }

    const setupAttractionLifecycle = () => {
        // 1. Dashboard Inventory Triggers (Focus on Visual Assets)
        const masterShell = document.getElementById('inventory-master-shell');
        if (masterShell) {
            masterShell.addEventListener('mouseover', (e) => {
                const asset = e.target.closest('.visual-asset');
                if (asset) {
                    const roomCard = asset.closest('.room-card');
                    if (roomCard) {
                        const hasV = roomCard.dataset.hasVideo === 'true';
                        showMediaAttraction(asset, 'Elite Inventory Card', hasV ? 'Images & Video Synchronized' : 'High-Resolution Media Display');
                    }
                }
            });
        }

        // 2. Form Preview Attraction (Navigation Shortcut)
        const previewEl = document.querySelector('.preview-image-container');
        if (previewEl) {
            previewEl.addEventListener('mouseenter', () => {
                showMediaAttraction(previewEl, 'Asset Perspective', 'Click to modify visual documentation', 'visual-assets-section');
            });
        }

        // 3. Form Input Attribution (Professional Guidance)
        const fieldTargets = [
            { id: 'max_guests_input', title: 'Capacity Protocol', sub: 'Specify architectural guest occupancy.', nextId: 'inventory-count-input' },
            { id: 'inventory_count_input', title: 'Inventory Scaling', sub: 'Define total units for this category.', nextId: 'economics-section' },
            { id: 'base_price_input', title: 'Yield Strategy', sub: 'Set optimal night-rate for this tier.', nextId: 'amenities-section' }
        ];

        fieldTargets.forEach(target => {
            const el = document.getElementById(target.id);
            if (el) {
                el.addEventListener('mouseenter', () => {
                    // Suppress if already filled
                    if (el.value && el.value.trim() !== '' && el.value !== '0') return;

                    showContextualPopup(el, { title: target.title, message: target.sub, icon: 'fa-info-circle' });
                });
            }
        });

        // 4. Elite Select Attribution
        const selectRoots = document.querySelectorAll('.esp-root');
        selectRoots.forEach(root => {
            const trigger = root.querySelector('.esp-trigger');
            const hiddenInput = root.querySelector('input[type="hidden"]');

            if (trigger) {
                trigger.addEventListener('mouseenter', () => {
                    // Suppress if already selected
                    if (hiddenInput && hiddenInput.value && hiddenInput.value.trim() !== '') return;

                    const type = root.dataset.selectType;
                    let title = 'Asset Attribute';
                    let sub = 'Configure professional room properties.';
                    let next = null;

                    if (type === 'hotel') { title = 'Portfolio Context'; sub = 'Select property for this asset.'; next = 'identity-section'; }
                    if (type === 'class') { title = 'Asset Tier'; sub = 'Classify the room category.'; }
                    if (type === 'type') { title = 'Configuration'; sub = 'Specify the architectural layout.'; }

                    showContextualPopup(trigger, { title, message: sub, icon: 'fa-fingerprint' });
                });
            }
        });
    };

    // Execute Lifecycle
    const run = () => {
        init();
        initEliteSelects();
        initPreview();
        setupAttractionLifecycle();
    };
    run();
});

