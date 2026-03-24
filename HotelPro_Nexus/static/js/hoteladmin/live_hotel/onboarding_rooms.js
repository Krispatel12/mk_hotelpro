class RoomManager {

    constructor() {
        this.roomList = document.getElementById('roomList');
        this.addRoomBtn = document.getElementById('addRoomBtn');
        this.template = document.getElementById('room-row-template');
        this.roomIndex = 0;
        this.rooms = new Map();
        this.isEdit = !!document.querySelector('.edit-mode-badge');
        this.init();
    }

    init() {

        if (this.addRoomBtn) {
            this.addRoomBtn.addEventListener('click', () => this.addRoom());
        }

        /* Auto-room disabled to allow SaaS Guidance Modal to trigger on empty state */

        this.setupLightbox();

    }

    addRoom(data = null) {

        if (!this.template) return;

        const html = this.template.innerHTML.replace(/__prefix__/g, this.roomIndex);
        const div = document.createElement('div');
        div.innerHTML = html;

        const row = div.firstElementChild;
        this.roomList.appendChild(row);

        if (data) {

            const name = row.querySelector(`[name="room_name_${this.roomIndex}"]`);
            const cls = row.querySelector(`[name="room_class_${this.roomIndex}"]`);
            const guests = row.querySelector(`[name="room_guests_${this.roomIndex}"]`);
            const price = row.querySelector(`[name="room_price_${this.roomIndex}"]`);
            const count = row.querySelector(`[name="room_count_${this.roomIndex}"]`);
            const amenities = row.querySelector(`[name="room_amenities_${this.roomIndex}"]`);

            if (name) {
                name.value = data.name || '';
                name.dispatchEvent(new Event('input', { bubbles: true }));
                name.dispatchEvent(new Event('change', { bubbles: true }));
                const display = row.querySelector(`[id^="display_name_"]`);
                if (display) display.textContent = data.name || 'Details Needed';
            }
            if (cls) {
                cls.value = data.class || '';
                cls.dispatchEvent(new Event('input', { bubbles: true }));
                cls.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (guests) {
                guests.value = data.guests || 2;
                guests.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (price) {
                price.value = data.price || 0;
                price.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (count) {
                count.value = data.count || 1;
                count.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (amenities && data.amenities) {
                amenities.value = JSON.stringify(data.amenities);
                amenities.dispatchEvent(new Event('change', { bubbles: true }));
                // Sync checkboxes in the UI
                const container = row.querySelector('.dynamic-pills-container');
                if (container) {
                    data.amenities.forEach(amenity => {
                        const cb = container.querySelector(`input[value="${amenity}"]`);
                        if (cb) cb.checked = true;
                    });
                }
            }


            // Sync custom selects if data is provided
            if (data.name) {
                const nameContainer = row.querySelector('.category-name-select-container');
                if (nameContainer) this.syncCustomSelect(nameContainer, data.name);
            }
            if (data.class) {
                const classContainer = row.querySelector('.room-class-select-container');
                if (classContainer) this.syncCustomSelect(classContainer, data.class);
            }
        }

        this.setupRoomInteractions(row);
        
        // --- NEW: Contextual SaaS Guidance on New Card Creation ---
        if (!data && window.stepperManager && typeof window.stepperManager.showContextualPopup === 'function') {
            setTimeout(() => {
                window.stepperManager.showContextualPopup(row, {
                    title: 'Configure Room',
                    icon: 'fa-hand-pointer',
                    message: 'Click this card to configure details, photos, and amenities.'
                });
                row.classList.add('guider-highlight');
                // Remove highlight after a few seconds
                setTimeout(() => row.classList.remove('guider-highlight'), 5000);
            }, 600); // Slight delay for smooth animation
        }

        this.roomIndex++;
        this.reorderRooms(); // Ensure sequential numbering is applied immediately
    }

    reorderRooms() {
        if (!this.roomList) return;
        const rows = this.roomList.querySelectorAll('.room-card-elite,.room-row');

        rows.forEach((row, newIdx) => {

            row.dataset.roomIndex = newIdx;
            const numDisplay = row.querySelector('.room-num-display');
            if (numDisplay) numDisplay.textContent = newIdx + 1;

            row.querySelectorAll('input,select,textarea').forEach(el => {

                let name = el.getAttribute('name');
                let id = el.getAttribute('id');

                if (name) {
                    // Replaces both __prefix__ and any existing numeric suffix (e.g., room_name_0 -> room_name_1)
                    name = name.replace(/(__prefix__|\d+)$/, newIdx);
                    el.setAttribute('name', name);
                }

                if (id) {
                    id = id.replace(/(__prefix__|\d+)$/, newIdx);
                    el.setAttribute('id', id);
                }

            });

            // Update data-target for custom selects
            row.querySelectorAll('.custom-select-container').forEach(container => {
                let target = container.dataset.target;
                if (target) {
                    container.dataset.target = target.replace(/(__prefix__|\d+)$/, newIdx);
                }
            });

        });

        this.roomIndex = rows.length;
        this.updateCounters();

    }

    updateCounters() {

        const rows = this.roomList.querySelectorAll('.room-card-elite');
        let totalInventory = 0;

        rows.forEach(row => {

            const countInput = row.querySelector('[name^="room_count"]');
            if (countInput) {
                totalInventory += parseInt(countInput.value) || 0;
            }

        });

        const cat = document.getElementById('total_categories_count');
        const inv = document.getElementById('total_inventory_count');

        if (cat) cat.textContent = rows.length;
        if (inv) inv.textContent = totalInventory;

    }

    restoreRooms(roomsData) {
        if (!this.roomList) {
            console.warn('[RoomManager] Skipping restore - roomList not found on this step.');
            return;
        }
        if (!roomsData || !Array.isArray(roomsData)) return;

        // Restore rooms that have at least some data (name or price or amenities)
        const validRooms = roomsData.filter(r => 
            (r.name && r.name.trim() !== '') || 
            (r.price && r.price > 0) || 
            (r.amenities && r.amenities.length > 0)
        );

        // If nothing meaningful was saved, skip restore – let the default 1-card init() handle it
        if (validRooms.length === 0) return;

        this.roomList.innerHTML = '';
        this.roomIndex = 0;

        validRooms.forEach(room => {
            try {
                this.addRoom(room);
            } catch (err) {
                console.error('[RoomManager] Failed to restore individual room card:', err);
            }
        });
    }

    syncCustomSelect(container, value) {

        const items = container.querySelectorAll('.select-item');

        items.forEach(item => {
            if (item.dataset.value === value) {

                const text = container.querySelector('.selected-text');
                if (text) text.innerHTML = item.innerHTML;

            }

        });

    }

    setupRoomInteractions(row) {

        /* remove room */

        const remove = row.querySelector('.remove-room');

        if (remove) {

            remove.addEventListener('click', () => {

                if (confirm('Delete this room category?')) {
                    row.remove();
                    this.reorderRooms();
                }

            });

        }

        /* DYNAMIC TITLE SYNC */
        const nameInput = row.querySelector('[name^="room_name"]');
        const displayName = row.querySelector('[id^="display_name_"]');
        if (nameInput && displayName) {
            const updateTitle = () => {
                displayName.textContent = nameInput.value.trim() || 'Details Needed';
            };
            nameInput.addEventListener('input', updateTitle);
            nameInput.addEventListener('change', updateTitle);
        }

        /* CUSTOM SELECT FIX */

        row.querySelectorAll('.custom-select-container').forEach(container => {

            const hiddenId = container.dataset.target;
            const hiddenInput = row.querySelector(`#${hiddenId}`);

            if (!hiddenInput) return;

            container.querySelectorAll('.select-item').forEach(item => {

                item.addEventListener('click', () => {

                    const value = item.dataset.value;

                    hiddenInput.value = value;

                    /* important */

                    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));

                    /* update UI */

                    const text = container.querySelector('.selected-text');
                    if (text) text.innerHTML = item.innerHTML;

                });

            });

        });

        /* SMART DEFAULTS */

        const nameSelect = row.querySelector('.category-name-select-container');

        if (nameSelect) {

            nameSelect.addEventListener('click', (e) => {

                const item = e.target.closest('.select-item');
                if (!item) return;

                const val = item.dataset.value;

                const defaults = {

                    'Standard Room': { class: 'STANDARD', guests: 2, price: 2500 },
                    'Deluxe Room': { class: 'DELUXE', guests: 3, price: 4500 },
                    'Suite': { class: 'SUITE', guests: 4, price: 7000 }

                };

                const data = defaults[val];
                if (!data) return;

                const classInput = row.querySelector('[name^="room_class"]');
                const guests = row.querySelector('[name^="room_guests"]');
                const price = row.querySelector('[name^="room_price"]');

                if (classInput) {

                    classInput.value = data.class;

                    classInput.dispatchEvent(new Event('change', { bubbles: true }));

                    const classContainer = row.querySelector('.room-class-select-container');

                    if (classContainer) {
                        this.syncCustomSelect(classContainer, data.class);
                    }

                }

                if (guests) guests.value = data.guests;

                if (price && !price.value) price.value = data.price;

            });

        }

        this.setupAmenities(row);
        this.setupMedia(row);

        const count = row.querySelector('[name^="room_count"]');
        if (count) {
            count.addEventListener('input', () => this.updateCounters());
        }

    }

    /* AMENITIES */

    setupAmenities(row) {

        const container = row.querySelector('.dynamic-pills-container');
        const hidden = row.querySelector('[name^="room_amenities"]');

        if (!container || !hidden) return;

        const sync = () => {

            const values = [...container.querySelectorAll('input:checked')].map(x => x.value);
            hidden.value = JSON.stringify(values);

        };

        container.addEventListener('change', sync);
        sync();

    }

    /* MEDIA */

    setupMedia(row) {

        const uploadBtn = row.querySelector('.room-upload-btn');
        const fileInput = row.querySelector('[name^="room_photos"]');
        const preview = row.querySelector('.room-preview-box');

        let files = [];

        const sync = () => {

            const dt = new DataTransfer();
            files.forEach(f => dt.items.add(f.file));
            fileInput.files = dt.files;

        };

        const render = () => {
            preview.innerHTML = '';
            files.forEach((fileObj, index) => {
                const isImage = fileObj.file.type.startsWith('image/') || (fileObj.file.name && fileObj.file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i));
                const isVideo = !isImage;
                const div = document.createElement('div');
                div.className = 'preview-item card-look';
                
                if (isVideo) {
                    div.innerHTML = `
                        <video src="${fileObj.url}" muted loop playsinline></video>
                        <div class="video-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="preview-remove"><i class="fas fa-times"></i></div>
                    `;
                } else {
                    div.innerHTML = `
                        <img src="${fileObj.url}">
                        <div class="preview-remove"><i class="fas fa-xmark"></i></div>
                    `;
                }

                // Click to open Lightbox
                div.style.cursor = 'pointer';
                div.onclick = (e) => {
                    if (e.target.closest('.preview-remove')) return;
                    const assets = files.map(f => ({
                        url: f.url,
                        type: (!f.file.type.startsWith('image/') && !(f.file.name && f.file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i))) ? 'video' : 'image',
                        name: f.file.name
                    }));
                    if (window.openLightbox) {
                        window.openLightbox(assets, index, (removeIdx) => {
                            files.splice(removeIdx, 1);
                            sync();
                            render();
                        });
                    }
                };

                div.querySelector('.preview-remove').onclick = (e) => {
                    e.stopPropagation();
                    URL.revokeObjectURL(files[index].url);
                    files.splice(index, 1);
                    sync();
                    render();
                };

                preview.appendChild(div);
            });
        };

        uploadBtn.addEventListener('click', (e) => {
            if (e.target.closest('.preview-item') || e.target.closest('.preview-remove')) return;
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {

            let added = 0;
            const MAX_ROOM_PHOTOS = 3;
            const MAX_ROOM_VIDEOS = 1;
            const MAX_FILE_SIZE_MB = 5;
            const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

            let skippedLimit = false;
            let skippedSize = false;
            let skippedVideos = false;

            [...fileInput.files].forEach(file => {
                const isImage = file.type.startsWith('image/') || (file.name && file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i));
                const isVideo = !isImage;

                const currentPhotos = files.filter(f => f.file.type.startsWith('image/') || (f.file.name && f.file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i))).length;
                const currentVideos = files.filter(f => !f.file.type.startsWith('image/') && !(f.file.name && f.file.name.match(/\.(png|jpe?g|gif|webp|svg)$/i))).length;

                if (isImage && currentPhotos >= MAX_ROOM_PHOTOS) {
                    skippedLimit = true;
                    return;
                }

                if (isVideo && currentVideos >= MAX_ROOM_VIDEOS) {
                    skippedVideos = true;
                    return;
                }

                if (file.size > MAX_FILE_SIZE_BYTES) {
                    skippedSize = true;
                    return;
                }

                files.push({
                    file: file,
                    url: URL.createObjectURL(file)
                });
                added++;

            });

            // --- Contextual Room Error Reporting ---
            if (skippedLimit || skippedSize || skippedVideos) {
                let errorMsg = "";
                if (skippedLimit) errorMsg += `• Photo limit reached (${MAX_ROOM_PHOTOS})\n`;
                if (skippedVideos) errorMsg += `• Video limit reached (${MAX_ROOM_VIDEOS})\n`;
                if (skippedSize) errorMsg += `• Some files exceed ${MAX_FILE_SIZE_MB}MB`;

                if (window.stepperManager && typeof window.stepperManager.showContextualPopup === 'function') {
                    window.stepperManager.showContextualPopup(uploadBtn, {
                        title: 'Media Limit',
                        icon: 'fa-images',
                        message: errorMsg
                    });
                }
            }

            // Always sync the input, even if 0 were added (resets invalid selections)
            sync();
            if (added > 0) {
                render();
            }

        });

    }

    /* LIGHTBOX */

    setupLightbox() {

        const modal = document.getElementById('lightboxModal');
        if (!modal) return;

    }

}

document.addEventListener('DOMContentLoaded', () => {

    window.roomManager = new RoomManager();

});