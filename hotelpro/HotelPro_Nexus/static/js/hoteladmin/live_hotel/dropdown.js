document.addEventListener('DOMContentLoaded', () => {
    console.log('[Dropdown] Global listener initialized.');

    // --- Curated Property Categories (Step 1) ---
    const INITIAL_TYPES = [
        { id: 'HOTEL', label: 'Hotel', icon: 'fas fa-hotel', color: 'var(--primary)' },
        { id: 'RESORT', label: 'Resort', icon: 'fas fa-umbrella-beach', color: 'var(--secondary)' },
        { id: 'BOUTIQUE', label: 'Boutique Hotel', icon: 'fas fa-gem', color: 'var(--accent)' },
        { id: 'LUXURY', label: 'Luxury Hotel', icon: 'fas fa-crown', color: '#fbbf24' },
        { id: 'BUSINESS', label: 'Business Hotel', icon: 'fas fa-briefcase', color: '#475569' },
        { id: 'HERITAGE', label: 'Heritage Property', icon: 'fas fa-landmark', color: '#b45309' },
        { id: 'VILLA', label: 'Private Villa', icon: 'fas fa-house-chimney', color: 'var(--secondary)' },
        { id: 'HOMESTAY', label: 'Homestay', icon: 'fas fa-house-chimney-user', color: '#16a34a' },
        { id: 'GUEST_HOUSE', label: 'Guest House', icon: 'fas fa-person-shelter', color: '#f97316' },
        { id: 'HOSTEL', label: 'Hostel / Backpacker', icon: 'fas fa-bed', color: '#8b5cf6' },
        { id: 'SERVICED_APT', label: 'Serviced Apartments', icon: 'fas fa-building', color: '#64748b' }
    ];

    // --- Star Rating Options (Step 1) ---
    const STAR_OPTIONS = [
        { id: '7.0', label: '7 Star Ultra-Luxury', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '6.0', label: '6 Star Elite', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '5.0', label: '5 Star Luxury', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '4.0', label: '4 Star Premium', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '3.0', label: '3 Star Business', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '2.0', label: '2 Star Standard', icon: 'fas fa-star', color: '#fbbf24' },
        { id: '1.0', label: '1 Star Budget', icon: 'fas fa-star', color: '#fbbf24' }
    ];

    // --- Room Class & Category Mappings (Step 2) ---
    const ROOM_VARIANTS = {
        'STANDARD': ['Standard Room', 'Standard City View', 'Standard Garden View', 'Standard Pool View', 'Standard Twin Room', 'Standard Double Room'],
        'DELUXE': ['Deluxe Room', 'Deluxe Garden View', 'Deluxe Sea View', 'Deluxe Pool View', 'Deluxe Balcony Room', 'Deluxe King Room', 'Deluxe Twin Room'],
        'SUITE': ['Junior Suite', 'Executive Suite', 'Family Suite', 'Honeymoon Suite', 'Duplex Suite', 'Penthouse Suite'],
        'LUXURY': ['Luxury Room', 'Luxury Suite', 'Presidential Suite', 'Royal Suite', 'Maharaja Suite', 'Imperial Suite'],
        'ECONOMY': ['Economy Room', 'Single Room', 'Small Double'],
        'PREMIUM': ['Premium Room', 'Premium City View', 'Premium Balcony'],
        'EXECUTIVE': ['Executive Room', 'Executive Club Room', 'Business Suite'],
        'CLUB': ['Club Room', 'Club Deluxe', 'Executive Club'],
        'PRESIDENTIAL': ['Presidential Suite', 'Grand Presidential', 'Penthouse Presidential'],
        'ROYAL': ['Royal Suite', 'Royal King Suite', 'Palace Suite'],
        'FAMILY': ['Family Room', 'Family Suite', 'Family Interconnecting'],
        'SPECIALTY': ['Studio Room', 'Connecting Rooms', 'Accessible Room', 'Pet-Friendly Room', 'Smoking Room', 'Non-Smoking Room']
    };

    const GUEST_DEFAULTS = {
        'STANDARD': 2, 'DELUXE': 3, 'SUITE': 4, 'LUXURY': 4, 'ECONOMY': 1,
        'PREMIUM': 2, 'EXECUTIVE': 2, 'CLUB': 2, 'PRESIDENTIAL': 6, 'ROYAL': 6, 'FAMILY': 6
    };

    const AMENITY_SUGGESTIONS = {
        'STANDARD': ['Free WiFi', 'Air Conditioning', 'Smart TV', 'Mini Fridge', 'Work Desk', 'Tea/Coffee Maker'],
        'DELUXE': ['Bathtub', 'Balcony', 'Sea View', 'Rain Shower', 'Premium Toiletries', 'Sofa Seating'],
        'LUXURY': ['Private Pool', 'Jacuzzi', 'Butler Service', 'Private Lounge Access', 'Walk-in Closet', 'Dining Area'],
        'SUITE': ['Living Room', 'Powder Room', 'Pantry', 'Walk-in Closet', 'City View']
    };

    const CLASS_METADATA = {
        'STANDARD': { icon: 'fas fa-bed', color: '#fbbf24' },
        'DELUXE': { icon: 'fas fa-crown', color: '#fbbf24' },
        'SUITE': { icon: 'fas fa-couch', color: '#fbbf24' },
        'LUXURY': { icon: 'fas fa-gem', color: '#fbbf24' },
        'ECONOMY': { icon: 'fas fa-wallet', color: 'var(--text-muted)' },
        'PREMIUM': { icon: 'fas fa-star', color: '#fbbf24' },
        'EXECUTIVE': { icon: 'fas fa-briefcase', color: '#fbbf24' },
        'CLUB': { icon: 'fas fa-key', color: '#fbbf24' },
        'PRESIDENTIAL': { icon: 'fas fa-medal', color: '#fbbf24' },
        'ROYAL': { icon: 'fas fa-landmark', color: '#fbbf24' },
        'FAMILY': { icon: 'fas fa-people-roof', color: '#fbbf24' },
        'SPECIALTY': { icon: 'fas fa-shapes', color: '#fbbf24' },
        'CUSTOM': { icon: 'fas fa-plus-circle', color: '#fbbf24' }
    };

    // CRITICAL: Force categories reset if the user wants "all options"
    let allTypes = INITIAL_TYPES;
    localStorage.setItem('hotepro_property_types', JSON.stringify(allTypes));

    const renderDropdownItems = (filterText = '') => {
        const list = document.getElementById('property-type-items');
        if (!list) return;

        const filtered = allTypes.filter(t =>
            t.label.toLowerCase().includes(filterText.toLowerCase())
        );

        let html = `
            <div class="select-search-box">
                <div class="search-inner">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search categories..." class="dropdown-search-input" value="${filterText}">
                </div>
            </div>
            <div class="items-list-container">`;

        if (filtered.length === 0) {
            html += `<div class="select-no-results">
                        <i class="fas fa-magnifying-glass mb-2" style="font-size: 1.5rem; opacity: 0.3;"></i>
                        <br>No matches for "${filterText}"
                     </div>`;
        } else {
            filtered.forEach((t, index) => {
                const isDefault = INITIAL_TYPES.some(it => it.id === t.id);
                const color = t.color || 'var(--secondary)';

                html += `
                    <div class="select-item-wrapper animate-up" style="animation-delay: ${index * 0.02}s">
                        <div class="select-item" data-value="${t.id}">
                            <div class="item-icon-box">
                                <i class="${t.icon}" style="color:${color};"></i>
                            </div>
                            <span class="item-text">${t.label}</span>
                        </div>
                        ${!isDefault ? `
                            <div class="inline-actions">
                                <button class="inline-edit-btn property-type-edit" data-index="${index}" title="Edit"><i class="fas fa-pen"></i></button>
                                <button class="inline-delete-btn property-type-delete" data-index="${index}" title="Remove"><i class="fas fa-times"></i></button>
                            </div>
                        ` : ''}
                    </div>`;
            });
        }

        html += `</div>`; // Close items-list-container

        html += `
            <div class="select-search-box secondary-action">
                <div class="select-item manage-types-btn" id="manage-types-trigger" data-value="OTHER">
                    <div class="item-icon-box" style="background: var(--primary); border: none;">
                        <i class="fas fa-sliders" style="color: white; font-size: 0.8rem;"></i>
                    </div>
                    <span class="item-text" style="color: var(--primary); font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.8rem;">Manage Categories</span>
                </div>
            </div>`;

        list.innerHTML = html;

        // Re-focus search if it was active
        if (filterText) {
            const input = list.querySelector('.dropdown-search-input');
            if (input) {
                input.focus();
                input.setSelectionRange(filterText.length, filterText.length);
            }
        }

        // Add search listener
        const searchInput = list.querySelector('.dropdown-search-input');
        if (searchInput) {
            searchInput.addEventListener('click', e => e.stopPropagation());
            searchInput.addEventListener('input', (e) => {
                renderDropdownItems(e.target.value);
            });
        }

        // Synchronize display text
        const customTypeSelect = document.getElementById('customTypeSelect');
        if (customTypeSelect) {
            const targetId = customTypeSelect.dataset.target;
            const hidden = document.getElementById(targetId);
            if (hidden && hidden.value) {
                const selectedType = allTypes.find(t => t.id === hidden.value);
                const textEl = customTypeSelect.querySelector('.selected-text');

                if (selectedType) {
                    const color = selectedType.color || 'var(--secondary)';
                    if (textEl) {
                        textEl.innerHTML = `
                            <div class="item-icon-box">
                                <i class="${selectedType.icon}" style="color:${color};"></i>
                            </div>
                            <span class="item-text text-truncate">${selectedType.label}</span>
                        `;
                    }
                }
            }
        }
    };

    // --- Room Custom Management ---
    let customRoomClasses = JSON.parse(localStorage.getItem('hotepro_custom_classes')) || [];
    let customRoomVariants = JSON.parse(localStorage.getItem('hotepro_custom_variants')) || {};

    window.updateRoomCategoryOptions = (row, filterText = '') => {
        const classVal = row.querySelector('input[name^="room_class"], select[name^="room_class"]').value;
        const catSelectContainer = row.querySelector('.category-name-select-container');
        if (!catSelectContainer) return;

        const baseVariants = ROOM_VARIANTS[classVal] || ROOM_VARIANTS['STANDARD'] || [];
        const customVariants = customRoomVariants[classVal] || [];
        const combined = [...baseVariants, ...customVariants];
        const filtered = combined.filter(v => v.toLowerCase().includes(filterText.toLowerCase()));

        const list = catSelectContainer.querySelector('.select-items');
        const meta = CLASS_METADATA[classVal] || CLASS_METADATA['STANDARD'];

        let html = `
            <div class="select-search-box">
                <div class="search-inner">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search variants..." class="dropdown-search-input" value="${filterText}">
                </div>
            </div>
            <div class="items-list-container">`;

        if (filtered.length === 0) {
            html += `<div class="select-no-results">No matches for "${filterText}"</div>`;
        } else {
            filtered.forEach((v, idx) => {
                const isCustom = customVariants.includes(v);
                const isFirstBase = idx === 0 && !isCustom;
                const extraStyle = isFirstBase ? `color: ${meta.color}; font-weight: 800;` : '';

                if (!isCustom) {
                    html += `
                        <div class="select-item" data-value="${v}" style="${extraStyle}">
                            <div class="item-icon-box">
                                <i class="${meta.icon}" style="color:${meta.color};"></i>
                            </div>
                            <span class="item-text">${v}</span>
                        </div>`;
                } else {
                    html += `
                        <div class="select-item-wrapper animate-up" style="animation-delay: ${idx * 0.02}s">
                            <div class="select-item" data-value="${v}">
                                <div class="item-icon-box">
                                    <i class="${meta.icon}" style="color:${meta.color};"></i>
                                </div>
                                <span class="item-text">${v}</span>
                            </div>
                            <div class="inline-actions">
                                <button class="inline-edit-btn room-variant-edit" data-class="${classVal}" data-index="${customVariants.indexOf(v)}" title="Edit"><i class="fas fa-pen"></i></button>
                                <button class="inline-delete-btn room-variant-delete" data-class="${classVal}" data-index="${customVariants.indexOf(v)}" title="Remove"><i class="fas fa-times"></i></button>
                            </div>
                        </div>`;
                }
            });
        }

        html += `</div>`; // items-list-container

        // Add "Other Category..." trigger
        html += `
            <div class="select-search-box secondary-action">
                <div class="select-item manage-types-btn custom-cat-trigger" data-value="OTHER">
                    <div class="item-icon-box" style="background: var(--secondary); border: none;">
                        <i class="fas fa-plus" style="color: white; font-size: 0.8rem;"></i>
                    </div>
                    <span class="item-text" style="color: var(--secondary); font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-size: 0.8rem;">Add Custom Category</span>
                </div>
            </div>`;
        list.innerHTML = html;

        // Add search listener
        const searchInput = list.querySelector('.dropdown-search-input');
        if (searchInput) {
            searchInput.addEventListener('click', e => e.stopPropagation());
            searchInput.addEventListener('input', (e) => {
                window.updateRoomCategoryOptions(row, e.target.value);
            });
            if (filterText) {
                searchInput.focus();
                searchInput.setSelectionRange(filterText.length, filterText.length);
            }
        }

        // Auto-populate Max Guests if not manually changed
        const guestInput = row.querySelector('input[name^="room_guests"]');
        if (guestInput) {
            guestInput.value = GUEST_DEFAULTS[classVal] || 2;
        }

        // Auto-suggest Amenities (Elite Feature)
        const amenityContainer = row.querySelector('.dynamic-pills-container');
        if (amenityContainer && AMENITY_SUGGESTIONS[classVal]) {
            // Only add if container is empty or we want to overwrite
            const currentPills = amenityContainer.querySelectorAll('.pill-label');
            if (currentPills.length === 0) {
                AMENITY_SUGGESTIONS[classVal].forEach(amenity => {
                    const label = document.createElement('label');
                    label.className = 'pill-label';
                    label.innerHTML = `
                        <input type="checkbox" value="${amenity}" checked style="display:none;">
                        <i class="fas fa-check-circle" style="color:var(--secondary);"></i>
                        ${amenity}
                    `;
                    amenityContainer.appendChild(label);
                });
                // Trigger hidden field update if available
                const hiddenAmenities = row.querySelector('input[name^="room_amenities"]');
                if (hiddenAmenities) {
                    const pills = AMENITY_SUGGESTIONS[classVal];
                    hiddenAmenities.value = JSON.stringify(pills);
                }
            }
        }
    };

    window.updateRoomClassOptions = (container) => {
        const list = container.querySelector('.select-items');
        if (!list) return;

        const standardClasses = Object.keys(CLASS_METADATA).filter(k => k !== 'CUSTOM');

        let html = '';
        standardClasses.forEach(c => {
            const meta = CLASS_METADATA[c];
            html += `
                <div class="select-item" data-value="${c}">
                    <div class="item-icon-box">
                        <i class="${meta.icon}" style="color:${meta.color};"></i>
                    </div>
                    <span class="item-text">${c.charAt(0) + c.slice(1).toLowerCase()}</span>
                </div>`;
        });

        customRoomClasses.forEach((c, idx) => {
            const meta = CLASS_METADATA['CUSTOM'];
            html += `
                <div class="select-item-wrapper">
                    <div class="select-item" data-value="${c}">
                        <div class="item-icon-box">
                            <i class="${meta.icon}" style="color:${meta.color};"></i>
                        </div>
                        <span class="item-text">${c}</span>
                    </div>
                    <div class="inline-actions">
                        <button class="inline-edit-btn room-class-edit" data-index="${idx}" title="Edit"><i class="fas fa-pen"></i></button>
                        <button class="inline-delete-btn room-class-delete" data-index="${idx}" title="Remove"><i class="fas fa-times"></i></button>
                    </div>
                </div>`;
        });

        html += `
            <div class="select-item manage-types-btn custom-class-trigger" data-value="CUSTOM">
                <div class="item-icon-box">
                    <i class="fas fa-ellipsis" style="color:var(--text-muted);"></i>
                </div>
                <span class="item-text">+ Add Custom Class...</span>
            </div>`;
        list.innerHTML = html;
    };

    // --- Room Manager Modal Logic ---
    let currentRoomContext = null; // { type: 'class' | 'category', classVal?: string, container?: element }
    let editingRoomIndex = null; // Tracks index of the custom entry being edited

    window.openRoomManager = (type, classVal = null, container = null) => {
        currentRoomContext = { type, classVal, container };
        editingRoomIndex = null; // Reset edit mode
        const popup = document.getElementById('roomManagerPopup');
        const title = document.getElementById('roomManagerTitle');
        const formTitle = document.getElementById('roomFormTitle');
        const listTitle = document.getElementById('roomManagerListTitle');
        const saveBtn = document.getElementById('save-room-type-btn');
        const labelInput = document.getElementById('room-type-label');

        if (!popup) return;
        if (labelInput) labelInput.value = ''; // Clear input

        if (type === 'class') {
            title.innerHTML = '<i class="fas fa-layer-group"></i> Room Tier Registry';
            formTitle.innerText = 'Add New Room Tier';
            listTitle.innerHTML = '<i class="fas fa-list-check"></i> Current Tiers';
            saveBtn.innerHTML = 'Save Room Classification <i class="fas fa-check-circle"></i>';
        } else {
            title.innerHTML = `<i class="fas fa-tag"></i> ${classVal} Categories`;
            formTitle.innerText = `New ${classVal} Category`;
            listTitle.innerHTML = '<i class="fas fa-list-check"></i> Existing Variants';
            saveBtn.innerHTML = 'Save Category Variant <i class="fas fa-check-circle"></i>';
        }

        renderRoomManagerList();
        popup.style.display = 'flex';
    };

    const renderRoomManagerList = () => {
        const list = document.getElementById('room-manager-list');
        if (!list || !currentRoomContext) return;

        const { type, classVal } = currentRoomContext;
        let html = '';

        if (type === 'class') {
            const standardClasses = Object.keys(CLASS_METADATA).filter(k => k !== 'CUSTOM');
            standardClasses.forEach((c, idx) => {
                const meta = CLASS_METADATA[c];
                html += `
                    <div class="management-item is-default animate-up" style="animation-delay: ${idx * 0.05}s">
                        <div class="icon-plate">
                            <i class="${meta.icon}" style="color:${meta.color};"></i>
                        </div>
                        <div class="item-info">
                            <span>${c.charAt(0) + c.slice(1).toLowerCase()}</span>
                        </div>
                    </div>`;
            });

            customRoomClasses.forEach((c, index) => {
                const meta = CLASS_METADATA['CUSTOM'];
                html += `
                    <div class="management-item animate-up" style="animation-delay: ${(standardClasses.length + index) * 0.05}s">
                        <div class="item-actions">
                            <button class="action-btn edit-btn" onclick="editRoomCustom(${index})"><i class="fas fa-pen"></i></button>
                            <button class="action-btn delete-btn" onclick="deleteRoomCustom(${index})"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="icon-plate">
                            <i class="${meta.icon}" style="color:${meta.color};"></i>
                        </div>
                        <div class="item-info">
                            <span>${c}</span>
                        </div>
                    </div>`;
            });
        } else {
            const standardVariants = ROOM_VARIANTS[classVal] || ROOM_VARIANTS['STANDARD'] || [];
            const meta = CLASS_METADATA[classVal] || CLASS_METADATA['STANDARD'];
            standardVariants.forEach((v, idx) => {
                html += `
                    <div class="management-item is-default animate-up" style="animation-delay: ${idx * 0.05}s">
                        <div class="icon-plate">
                            <i class="${meta.icon}" style="color:${meta.color};"></i>
                        </div>
                        <div class="item-info">
                            <span>${v}</span>
                        </div>
                    </div>`;
            });

            const customVariants = customRoomVariants[classVal] || [];
            customVariants.forEach((v, index) => {
                html += `
                    <div class="management-item animate-up" style="animation-delay: ${(standardVariants.length + index) * 0.05}s">
                        <div class="item-actions">
                            <button class="action-btn edit-btn" onclick="editRoomCustom(${index})"><i class="fas fa-pen"></i></button>
                            <button class="action-btn delete-btn" onclick="deleteRoomCustom(${index})"><i class="fas fa-trash"></i></button>
                        </div>
                        <div class="icon-plate">
                            <i class="${meta.icon}" style="color:${meta.color};"></i>
                        </div>
                        <div class="item-info">
                            <span>${v}</span>
                        </div>
                    </div>`;
            });
        }

        list.innerHTML = html;
    };

    window.editRoomCustom = (index) => {
        editingRoomIndex = index;
        const items = (currentRoomContext.type === 'class') ? customRoomClasses : (customRoomVariants[currentRoomContext.classVal] || []);
        const labelInput = document.getElementById('room-type-label');
        const saveBtn = document.getElementById('save-room-type-btn');
        if (labelInput) labelInput.value = items[index];
        if (saveBtn) saveBtn.innerHTML = 'Update Entry <i class="fas fa-check-circle"></i>';
    };

    window.deleteRoomCustom = (index) => {
        if (!currentRoomContext) return;
        if (confirm('Permanently remove this custom entry?')) {
            if (currentRoomContext.type === 'class') {
                customRoomClasses.splice(index, 1);
                localStorage.setItem('hotepro_custom_classes', JSON.stringify(customRoomClasses));
            } else {
                customRoomVariants[currentRoomContext.classVal].splice(index, 1);
                localStorage.setItem('hotepro_custom_variants', JSON.stringify(customRoomVariants));
            }
            renderRoomManagerList();
            // Refresh relevant dropdowns
            if (currentRoomContext.container) {
                if (currentRoomContext.type === 'class') window.updateRoomClassOptions(currentRoomContext.container);
                else {
                    const row = currentRoomContext.container.closest('.room-card-elite');
                    if (row) window.updateRoomCategoryOptions(row);
                }
            }
        }
    };

    const renderManagementList = () => {
        const list = document.getElementById('type-list');
        if (!list) return;

        let html = '';
        allTypes.forEach((t, index) => {
            const isDefault = INITIAL_TYPES.some(it => it.id === t.id);
            const color = t.color || 'var(--secondary)';
            html += `
                <div class="management-item ${isDefault ? 'is-default' : ''} animate-up" style="animation-delay: ${index * 0.05}s">
                    ${!isDefault ? `
                    <div class="item-actions">
                        <button class="action-btn edit-btn" onclick="editType(${index})"><i class="fas fa-pen"></i></button>
                        <button class="action-btn delete-btn" onclick="deleteType(${index})"><i class="fas fa-trash"></i></button>
                    </div>` : ''}
                    <div class="icon-plate">
                        <i class="${t.icon}" style="color:${color};"></i>
                    </div>
                    <div class="item-info">
                        <span>${t.label}</span>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    };

    window.saveTypes = () => {
        localStorage.setItem('hotepro_property_types', JSON.stringify(allTypes));
        renderDropdownItems();
        renderManagementList();
    };

    window.editType = (index) => {
        const type = allTypes[index];
        const labelInput = document.getElementById('new-type-label');
        const iconInput = document.getElementById('new-type-icon');
        const addBtn = document.getElementById('add-type-btn');

        if (labelInput) labelInput.value = type.label;
        if (iconInput) iconInput.value = type.icon;
        if (addBtn) {
            addBtn.innerText = 'Update Classification';
            addBtn.dataset.editIndex = index;
        }

        // Scroll to form
        if (labelInput) labelInput.focus();
    };

    window.deleteType = (index) => {
        if (confirm('Permanently remove this classification?')) {
            allTypes.splice(index, 1);
            saveTypes();
        }
    };

    // Initial Render
    renderDropdownItems();

    // --- Star Rating Custom Dropdown ---
    const renderStarRatingItems = () => {
        const list = document.getElementById('star-rating-items');
        if (!list) return;

        let html = '<div class="items-list-container">';
        STAR_OPTIONS.forEach((s, index) => {
            html += `
                <div class="select-item animate-up" data-value="${s.id}" style="animation-delay: ${index * 0.05}s">
                    <div class="item-icon-box">
                        <i class="${s.icon}" style="color:${s.color};"></i>
                    </div>
                    <span class="item-text">${s.label}</span>
                </div>`;
        });
        html += '</div>';
        list.innerHTML = html;

        // Synchronize display with hidden select value
        const customStarSelect = document.getElementById('customStarSelect');
        if (customStarSelect) {
            const targetId = customStarSelect.dataset.target;
            const hidden = document.getElementById(targetId);
            if (hidden && hidden.value) {
                const val = parseFloat(hidden.value).toFixed(1);
                const selected = STAR_OPTIONS.find(s => s.id === val);
                const textEl = customStarSelect.querySelector('.selected-text');
                if (selected && textEl) {
                    textEl.innerHTML = `
                        <div class="item-icon-box">
                            <i class="${selected.icon}" style="color:${selected.color};"></i>
                        </div>
                        <span class="item-text">${selected.label}</span>
                    `;
                }
            }
        }
    };

    renderStarRatingItems();

    // --- Event Listeners ---
    document.addEventListener('click', (e) => {
        const container = e.target.closest('.custom-select-container');
        const selected = e.target.closest('.select-selected');
        const item = e.target.closest('.select-item');
        const deleteBtn = e.target.closest('.inline-delete-btn');
        const editBtn = e.target.closest('.inline-edit-btn');

        // Handle inline editing
        if (editBtn) {
            e.stopPropagation();
            const index = parseInt(editBtn.dataset.index);
            if (editBtn.classList.contains('room-class-edit')) {
                window.openRoomManager('class', null, container);
                window.editRoomCustom(index);
            } else if (editBtn.classList.contains('room-variant-edit')) {
                const classVal = editBtn.dataset.class;
                window.openRoomManager('category', classVal, container);
                window.editRoomCustom(index);
            } else if (editBtn.classList.contains('property-type-edit')) {
                const popup = document.getElementById('typeManagerPopup');
                if (popup) {
                    popup.style.display = 'flex';
                    renderManagementList();
                    window.editType(index);
                }
            }
            return;
        }

        // Handle inline deletion
        if (deleteBtn) {
            e.stopPropagation();
            const index = deleteBtn.dataset.index;

            if (deleteBtn.classList.contains('room-class-delete')) {
                if (confirm('Remove this custom room class?')) {
                    customRoomClasses.splice(index, 1);
                    localStorage.setItem('hotepro_custom_classes', JSON.stringify(customRoomClasses));
                    window.updateRoomClassOptions(container);
                }
            } else if (deleteBtn.classList.contains('room-variant-delete')) {
                const classVal = deleteBtn.dataset.class;
                if (confirm('Remove this custom category?')) {
                    customRoomVariants[classVal].splice(index, 1);
                    localStorage.setItem('hotepro_custom_variants', JSON.stringify(customRoomVariants));
                    const row = container.closest('.room-card-elite') || container.closest('.room-row');
                    if (row) window.updateRoomCategoryOptions(row);
                }
            } else if (confirm('Remove this custom classification?')) {
                allTypes.splice(index, 1);
                window.saveTypes();
            }
            return;
        }

        // Toggle Type Manager Modal (Step 1)
        if (item && item.id === 'manage-types-trigger') {
            const popup = document.getElementById('typeManagerPopup');
            if (popup) {
                popup.style.display = 'flex';
                renderManagementList();
            }
            if (container) {
                const items = container.querySelector('.select-items');
                if (items) items.classList.remove('show');
            }
            return;
        }

        // Toggle Room Manager Modal (Step 2)
        if (item && item.classList.contains('custom-cat-trigger')) {
            const row = container.closest('.room-card-elite') || container.closest('.room-row');
            const classVal = row ? row.querySelector('input[name^="room_class"], select[name^="room_class"]').value : 'STANDARD';
            window.openRoomManager('category', classVal, container);
            if (container.querySelector('.select-items')) container.querySelector('.select-items').classList.remove('show');
            return;
        }

        if (item && item.classList.contains('custom-class-trigger')) {
            window.openRoomManager('class', null, container);
            if (container.querySelector('.select-items')) container.querySelector('.select-items').classList.remove('show');
            return;
        }

        // Reset all row elevations first
        document.querySelectorAll('.col-12, .col-8, .col-6, .col-4').forEach(c => c.classList.remove('focused-row'));

        if (!container) {
            document.querySelectorAll('.select-items.show').forEach(items => items.classList.remove('show'));
            document.querySelectorAll('.select-selected.active').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.input-group.focused').forEach(group => {
                const hiddenId = group.querySelector('.custom-select-container')?.dataset.target;
                const hidden = hiddenId ? document.getElementById(hiddenId) : null;
                if (!hidden?.value) group.classList.remove('focused');
            });
            return;
        }

        // Toggle dropdown
        if (selected) {
            const items = container.querySelector('.select-items');
            const group = container.closest('.input-group');
            const col = container.closest('.col-12, .col-8, .col-6, .col-4');

            const isClosing = selected.classList.contains('active');

            // Definitively close all other menus and reset elevations
            document.querySelectorAll('.select-items.show').forEach(el => el.classList.remove('show'));
            document.querySelectorAll('.select-selected.active').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.col-12.focused-row, .col-8.focused-row, .col-6.focused-row, .col-4.focused-row').forEach(el => el.classList.remove('focused-row'));
            document.querySelectorAll('.input-group.focused').forEach(el => {
                // Only remove focused class if there's no value in the hidden input
                const hiddenId = el.querySelector('.custom-select-container')?.dataset.target;
                const hidden = hiddenId ? document.getElementById(hiddenId) : null;
                if (!hidden?.value) el.classList.remove('focused');
            });

            if (!isClosing && items) {
                // Open new dropdown with Absolute Row Authority
                if (container.classList.contains('room-class-select-container')) {
                    window.updateRoomClassOptions(container);
                }
                items.classList.add('show');
                selected.classList.add('active');
                if (col) col.classList.add('focused-row');
                if (group) group.classList.add('focused');
            }
        }

        // Handle selection
        if (item && !item.classList.contains('manage-types-btn')) {
            const val = item.dataset.value;
            const text = item.innerHTML;

            const targetId = container.dataset.target;
            const hidden = document.getElementById(targetId);
            const textEl = container.querySelector('.selected-text');

            // If it's a room category or class, try to preserve icon in selection display
            if (container.classList.contains('category-name-select-container') || container.classList.contains('room-class-select-container')) {
                if (textEl) textEl.innerHTML = text; // 'text' already contains the <i> from item.innerHTML
            } else {
                if (textEl) textEl.innerHTML = text;
            }

            if (hidden) {
                hidden.value = val;
                hidden.dispatchEvent(new Event('change'));

                // Toggle floating label state
                const group = container.closest('.input-group');
                if (group) {
                    if (val) group.classList.add('not-empty');
                    else group.classList.remove('not-empty');
                }
            }

            if (container.querySelector('.select-items')) container.querySelector('.select-items').classList.remove('show');
            if (container.querySelector('.select-selected')) container.querySelector('.select-selected').classList.remove('active');

            // Trigger dependency updates (like Max Guests)
            const row = container.closest('.room-card-elite') || container.closest('.room-row');
            if (row && container.dataset.target.includes('room_class')) {
                window.updateRoomCategoryOptions(row);
            }
        }
    });

    // Add/Update Type (Step 1)
    const addBtn = document.getElementById('add-type-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const labelInput = document.getElementById('new-type-label');
            const iconInput = document.getElementById('new-type-icon');
            const label = labelInput.value.trim();
            const icon = iconInput.value.trim() || 'fas fa-hotel';
            const editIndex = addBtn.dataset.editIndex;

            if (!label) return alert('Please enter a classification label.');

            if (editIndex !== undefined) {
                allTypes[editIndex] = { id: label.toUpperCase().replace(/\s/g, '_'), label, icon, color: allTypes[editIndex].color };
                delete addBtn.dataset.editIndex;
                addBtn.innerText = 'Save Classification';
            } else {
                allTypes.push({ id: label.toUpperCase().replace(/\s/g, '_'), label, icon });
            }

            labelInput.value = ''; iconInput.value = ''; saveTypes();
        });
    }

    // Room Save Classification (Step 2)
    const saveRoomBtn = document.getElementById('save-room-type-btn');
    if (saveRoomBtn) {
        saveRoomBtn.addEventListener('click', () => {
            const labelInput = document.getElementById('room-type-label');
            const label = labelInput.value.trim();
            if (!label || !currentRoomContext) return alert('Please enter a label.');

            if (editingRoomIndex !== null) {
                // Update existing
                if (currentRoomContext.type === 'class') {
                    customRoomClasses[editingRoomIndex] = label;
                    localStorage.setItem('hotepro_custom_classes', JSON.stringify(customRoomClasses));
                    if (currentRoomContext.container) window.updateRoomClassOptions(currentRoomContext.container);
                } else {
                    const cv = currentRoomContext.classVal;
                    customRoomVariants[cv][editingRoomIndex] = label;
                    localStorage.setItem('hotepro_custom_variants', JSON.stringify(customRoomVariants));
                    if (currentRoomContext.container) {
                        const row = currentRoomContext.container.closest('.room-card-elite') || currentRoomContext.container.closest('.room-row');
                        if (row) window.updateRoomCategoryOptions(row);
                    }
                }
                editingRoomIndex = null;
                saveRoomBtn.innerHTML = (currentRoomContext.type === 'class') ? 'Save Room Classification <i class="fas fa-check-circle"></i>' : 'Save Category Variant <i class="fas fa-check-circle"></i>';
            } else {
                // Add new
                if (currentRoomContext.type === 'class') {
                    if (!customRoomClasses.includes(label)) {
                        customRoomClasses.push(label);
                        localStorage.setItem('hotepro_custom_classes', JSON.stringify(customRoomClasses));
                    }
                    if (currentRoomContext.container) window.updateRoomClassOptions(currentRoomContext.container);
                } else {
                    const cv = currentRoomContext.classVal;
                    if (!customRoomVariants[cv]) customRoomVariants[cv] = [];
                    if (!customRoomVariants[cv].includes(label)) {
                        customRoomVariants[cv].push(label);
                        localStorage.setItem('hotepro_custom_variants', JSON.stringify(customRoomVariants));
                    }
                    if (currentRoomContext.container) {
                        const row = currentRoomContext.container.closest('.room-card-elite') || currentRoomContext.container.closest('.room-row');
                        if (row) window.updateRoomCategoryOptions(row);
                    }
                }
            }

            labelInput.value = '';
            renderRoomManagerList();
        });
    }

    // Modal Closing
    const closeBtn = document.getElementById('close-type-manager-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const popup = document.getElementById('typeManagerPopup');
            if (popup) popup.style.display = 'none';
        });
    }

    const closeRoomBtn = document.getElementById('close-room-manager-btn');
    if (closeRoomBtn) {
        closeRoomBtn.addEventListener('click', () => {
            const popup = document.getElementById('roomManagerPopup');
            if (popup) popup.style.display = 'none';
        });
    }

    // Keyboard Accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.select-items').forEach(items => items.classList.remove('show'));
            document.querySelectorAll('.select-selected').forEach(s => s.classList.remove('active'));
            const p1 = document.getElementById('typeManagerPopup'); if (p1) p1.style.display = 'none';
            const p2 = document.getElementById('roomManagerPopup'); if (p2) p2.style.display = 'none';
        }
    });

    // Initial State Check for floating labels on custom selects
    document.querySelectorAll('.custom-select-container').forEach(container => {
        const targetId = container.dataset.target;
        const hidden = document.getElementById(targetId);
        const itemText = container.querySelector('.selected-text .item-text')?.textContent.trim();

        if (hidden && (hidden.value || (itemText && itemText !== 'Select Category' && itemText !== 'Select Room Category'))) {
            const group = container.closest('.input-group');
            if (group) group.classList.add('not-empty');
        }
    });

    // --- Custom Time Picker Logic (AM/PM) ---
    const initTimePickers = () => {
        document.querySelectorAll('.custom-time-picker').forEach(picker => {
            const hoursCol = picker.querySelector('.hours-col');
            const minutesCol = picker.querySelector('.minutes-col');
            const hiddenInput = document.getElementById(picker.dataset.target);

            // Populate hours
            let hoursHtml = '';
            for (let i = 1; i <= 12; i++) {
                const val = i.toString().padStart(2, '0');
                hoursHtml += `<div class="time-unit-item" data-value="${val}">${val}</div>`;
            }
            if (hoursCol) hoursCol.innerHTML = hoursHtml;

            // Populate minutes (00 to 59)
            let minutesHtml = '';
            for (let i = 0; i <= 59; i++) {
                const val = i.toString().padStart(2, '0');
                minutesHtml += `<div class="time-unit-item" data-value="${val}">${val}</div>`;
            }
            if (minutesCol) minutesCol.innerHTML = minutesHtml;

            // Set initial state from hidden location
            if (hiddenInput && hiddenInput.value) {
                const [h24, mStr] = hiddenInput.value.split(':');
                let h12 = parseInt(h24);
                const ap = h12 >= 12 ? 'PM' : 'AM';
                if (h12 > 12) h12 -= 12;
                if (h12 === 0) h12 = 12;
                const hStr = h12.toString().padStart(2, '0');
                
                // Active classes setup
                picker.querySelectorAll('.time-unit-item.active').forEach(el => el.classList.remove('active'));
                
                const hEl = picker.querySelector(`.hours-col [data-value="${hStr}"]`);
                if (hEl) hEl.classList.add('active');
                
                const mEl = picker.querySelector(`.minutes-col [data-value="${mStr}"]`);
                if (mEl) mEl.classList.add('active');

                const apEl = picker.querySelector(`.ampm-col [data-value="${ap}"]`);
                if (apEl) apEl.classList.add('active');

                // Set initial text
                const displayValue = picker.querySelector('.time-value');
                if (displayValue) displayValue.innerText = `${hStr}:${mStr} ${ap}`;
            }
        });
    };

    initTimePickers();

    // Global listener for ALL time picker interactions (Event Delegation)
    document.addEventListener('click', e => {
        const timeDisplay = e.target.closest('.time-display');
        const picker = e.target.closest('.custom-time-picker');
        const timeItem = e.target.closest('.time-unit-item');

        // 1. If clicking the display button to open/close
        if (timeDisplay && picker) {
            e.preventDefault();
            e.stopPropagation();

            const isActive = picker.classList.contains('active');

            // Close all others first
            document.querySelectorAll('.custom-time-picker.active').forEach(p => {
                p.classList.remove('active');
                p.closest('.input-group')?.style.setProperty('z-index', '');
                p.closest('.col-12, .col-8, .col-6, .col-4')?.style.setProperty('z-index', '');
            });

            // Toggle logic
            if (!isActive) {
                picker.classList.add('active');
                picker.closest('.input-group')?.style.setProperty('z-index', '99999', 'important');
                picker.closest('.col-12, .col-8, .col-6, .col-4')?.style.setProperty('z-index', '99999', 'important');
            }
            return;
        }

        // 2. If clicking a time value inside the dropdown
        if (timeItem && picker) {
            e.preventDefault();
            e.stopPropagation(); // Do not close picker
            
            const col = timeItem.closest('.time-col');
            if (col) {
                // Swap active state
                col.querySelectorAll('.time-unit-item.active').forEach(el => el.classList.remove('active'));
                timeItem.classList.add('active');
                
                // Update Time Logic
                const h = picker.querySelector('.hours-col .active')?.dataset.value || '12';
                const m = picker.querySelector('.minutes-col .active')?.dataset.value || '00';
                const ap = picker.querySelector('.ampm-col .active')?.dataset.value || 'PM';
                const displayValue = picker.querySelector('.time-value');
                
                if (displayValue) displayValue.innerText = `${h}:${m} ${ap}`;

                // Update Backend Hidden Input
                const hiddenInput = document.getElementById(picker.dataset.target);
                if (hiddenInput) {
                    let hour24 = parseInt(h);
                    if (ap === 'PM' && hour24 < 12) hour24 += 12;
                    if (ap === 'AM' && hour24 === 12) hour24 = 0;
                    hiddenInput.value = `${hour24.toString().padStart(2, '0')}:${m}`;
                    hiddenInput.dispatchEvent(new Event('change'));
                }
            }
            return;
        }

        // 3. Extraneous click anywhere else: Close all pickers
        if (!picker) {
            document.querySelectorAll('.custom-time-picker.active').forEach(p => {
                p.classList.remove('active');
                p.closest('.input-group')?.style.setProperty('z-index', '');
                p.closest('.col-12, .col-8, .col-6, .col-4')?.style.setProperty('z-index', '');
            });
        }
    });
});
