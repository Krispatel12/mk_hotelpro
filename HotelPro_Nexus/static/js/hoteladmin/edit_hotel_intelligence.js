/**
 * Master Editor Intelligence Protocol
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Map Setup ---
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('id_lat') ? document.getElementById('id_lat') : latInput; // Support both naming conventions
    const realLat = document.getElementById('lat');
    const realLng = document.getElementById('lng');

    if (typeof L !== 'undefined' && document.getElementById('edit-map')) {
        const latVal = parseFloat(realLat?.value) || 20.5937;
        const lngVal = parseFloat(realLng?.value) || 78.9629;

        const map = L.map('edit-map').setView([latVal, lngVal], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        let marker = L.marker([latVal, lngVal], { draggable: true }).addTo(map);

        marker.on('dragend', () => {
            const p = marker.getLatLng();
            if (realLat) realLat.value = p.lat.toFixed(6);
            if (realLng) realLng.value = p.lng.toFixed(6);
        });
    }

    // --- Service Pill Intelligence ---
    const servicesGrid = document.getElementById('servicesGrid');
    const servicesInput = document.getElementById('id_services');

    if (servicesGrid && servicesInput) {
        servicesGrid.addEventListener('click', (e) => {
            const item = e.target.closest('.pill-item');
            if (item) {
                item.classList.toggle('active');
                const active = Array.from(servicesGrid.querySelectorAll('.pill-item.active'))
                    .map(i => i.dataset.val);
                servicesInput.value = JSON.stringify(active);
            }
        });
    }

    // --- Universal Media Deletion Intelligence ---
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('.photo-del-btn');
        if (btn) {
            const type = btn.dataset.type;
            const photoId = btn.dataset.id;
            const roomIdx = btn.dataset.roomIdx;
            const card = btn.closest('.media-item');
            const overlay = card.querySelector('.photo-deleted-overlay');

            let targetInput;
            if (type === 'gallery') {
                targetInput = document.getElementById('id_deleted_gallery_photos');
            } else {
                targetInput = document.getElementById(`id_deleted_room_photos_${roomIdx}`);
            }

            if (!targetInput) return;

            let deletedIds = JSON.parse(targetInput.value || '[]');
            if (deletedIds.includes(parseInt(photoId))) {
                deletedIds = deletedIds.filter(id => id !== parseInt(photoId));
                overlay.style.opacity = '0';
                btn.classList.remove('bg-emerald-500');
                btn.style.background = 'rgba(2, 6, 23, 0.6)';
            } else {
                deletedIds.push(parseInt(photoId));
                overlay.style.opacity = '1';
                btn.style.background = '#10b981'; // Logic: "Click again to Restore"
            }
            targetInput.value = JSON.stringify(deletedIds);
        }
    });

    const roomContainer = document.getElementById('roomContainer');

    window.reorderRooms = () => {
        if (!roomContainer) return;
        const cards = roomContainer.querySelectorAll('.room-card');
        cards.forEach((card, idx) => {
            card.dataset.idx = idx;
            const badge = card.querySelector('.room-badge');
            if (badge) badge.textContent = `Category Node: ${idx + 1}`;

            // Update all inputs in this card
            card.querySelectorAll('input, select, textarea').forEach(el => {
                const name = el.getAttribute('name');
                if (name && /_\d+$/.test(name)) {
                    el.setAttribute('name', name.replace(/_\d+$/, `_${idx + 1}`));
                }
                const id = el.getAttribute('id');
                if (id && /_\d+$/.test(id)) {
                    el.setAttribute('id', id.replace(/_\d+$/, `_${idx + 1}`));
                }
                // Update data-target for amenities
                if (el.dataset.target) {
                    el.dataset.target = el.dataset.target.replace(/_\d+$/, `_${idx + 1}`);
                }
            });

            // Update photo deletion buttons
            card.querySelectorAll('.photo-del-btn').forEach(btn => {
                btn.dataset.roomIdx = idx + 1;
            });
        });
    };

    window.addRoomCategory = () => {
        if (!roomContainer) return;
        const nextIdx = roomContainer.querySelectorAll('.room-card').length + 1;
        const template = `
            <div class="room-card group/card animate-in fade-in slide-in-from-bottom-4 duration-500" data-idx="${nextIdx}">
                <div class="room-badge bg-cyan-600 border border-cyan-400">New Category Proposal</div>
                <button type="button"
                    class="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-100/50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center remove-room-trigger"
                    onclick="if(confirm('Permanently decommission this inventory node?')) { this.closest('.room-card').remove(); window.reorderRooms(); }">
                    <i class="fas fa-trash-can"></i>
                </button>
                
                <div class="grid-12">
                    <div class="col-8 input-group">
                        <label><i class="fas fa-layer-group text-cyan-500"></i> Category Protocol Name</label>
                        <input type="text" name="room_name_${nextIdx}" class="input-field font-bold text-lg" placeholder="e.g., Executive Elite Suite" required>
                    </div>
                    <div class="col-4 input-group">
                        <label><i class="fas fa-crown text-amber-500"></i> Class Tier Registry</label>
                        <select name="room_class_${nextIdx}" class="input-field font-semibold">
                            <option value="STANDARD">Standard Level</option>
                            <option value="DELUXE">Deluxe Premier</option>
                            <option value="SUITE">Luxury Suite</option>
                            <option value="LUXURY">Ultra Luxury</option>
                            <option value="VILLA">Private Villa</option>
                            <option value="ECONOMY">Economy Basic</option>
                        </select>
                    </div>

                    <div class="col-4 input-group">
                        <label><i class="fas fa-users text-slate-400"></i> Max Occupancy</label>
                        <input type="number" name="room_guests_${nextIdx}" value="2" class="input-field" min="1">
                    </div>
                    <div class="col-4 input-group">
                        <label><i class="fas fa-coins text-emerald-500"></i> Base Price Node (INR)</label>
                        <input type="number" name="room_price_${nextIdx}" value="2500" class="input-field font-mono" step="0.01">
                    </div>
                    <div class="col-4 input-group">
                        <label><i class="fas fa-cubes text-blue-500"></i> Inventory Delta (Units)</label>
                        <input type="number" name="room_count_${nextIdx}" value="5" class="input-field" min="0">
                    </div>

                    <div class="col-12 mt-4 pt-4 border-t border-slate-50">
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-[0.2em]">Utility Configuration</label>
                        <div class="pill-box room-amenities-box flex flex-wrap gap-3" data-target="room_amenities_${nextIdx}">
                            <div class="pill-item active" data-val="High-speed WiFi"><i class="fas fa-wifi"></i> High-speed WiFi</div>
                            <div class="pill-item active" data-val="Air Conditioning"><i class="fas fa-snowflake"></i> Air Conditioning</div>
                            <div class="pill-item" data-val="Smart TV"><i class="fas fa-tv"></i> Smart TV</div>
                            <div class="pill-item" data-val="Mini Bar"><i class="fas fa-glass-martini"></i> Mini Bar</div>
                            <div class="pill-item" data-val="Private Balcony"><i class="fas fa-mountain-sun"></i> Private Balcony</div>
                            <div class="pill-item" data-val="Electronic Safe"><i class="fas fa-vault"></i> Electronic Safe</div>
                        </div>
                        <input type="hidden" name="room_amenities_${nextIdx}" id="id_room_amenities_${nextIdx}" value='["High-speed WiFi", "Air Conditioning"]'>
                        <input type="hidden" name="deleted_room_photos_${nextIdx}" id="id_deleted_room_photos_${nextIdx}" value="[]">
                    </div>

                    <div class="col-12 mt-6">
                        <label class="text-[10px] font-black uppercase text-slate-400 mb-4 block tracking-[0.2em]">Asset Library: Category Visuals</label>
                        <div class="gallery-grid grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                            <label class="media-item aspect-square border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-slate-900 hover:bg-slate-50 transition-all group/upload">
                                <i class="fas fa-plus text-slate-300 group-hover/upload:text-slate-900 transition-colors"></i>
                                <span class="text-[8px] font-bold text-slate-400 mt-2 uppercase">Add Media</span>
                                <input type="file" name="room_photos_${nextIdx}" multiple class="hidden">
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;
        roomContainer.insertAdjacentHTML('beforeend', template);
        roomContainer.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // --- Unified Amenity Toggle Intelligence ---
    document.body.addEventListener('click', (e) => {
        const item = e.target.closest('.pill-item');
        if (item) {
            const parent = item.closest('.pill-box');
            if (!parent) return;
            const targetName = parent.dataset.target;

            if (parent.id === 'servicesGrid') {
                item.classList.toggle('active');
                const activePills = Array.from(parent.querySelectorAll('.pill-item.active')).map(i => i.dataset.val);
                const servicesInput = document.getElementById('id_services');
                if (servicesInput) servicesInput.value = JSON.stringify(activePills);
                return;
            }

            if (targetName) {
                item.classList.toggle('active');
                const targetEl = document.getElementById(`id_${targetName}`) || document.getElementsByName(targetName)[0];
                const activePills = Array.from(parent.querySelectorAll('.pill-item.active')).map(i => i.dataset.val);
                if (targetEl) targetEl.value = JSON.stringify(activePills);
            }
        }
    });

    // --- Section Selection & Aura Persistence ---
    const allCards = document.querySelectorAll('.royale-card');

    const selectNode = (targetId) => {
        const target = document.getElementById(targetId);
        if (!target) return;

        allCards.forEach(c => c.classList.remove('selected-node'));
        target.classList.add('selected-node');
    };

    allCards.forEach(card => {
        card.addEventListener('mousedown', () => {
            card.classList.add('pressure-tap');
            selectNode(card.id);
        });
        card.addEventListener('mouseup', () => card.classList.remove('pressure-tap'));
        card.addEventListener('mouseleave', () => card.classList.remove('pressure-tap'));
    });

    // --- Navigation Scroll Spy Refined ---
    window.scrollToSection = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            selectNode(id);
        }
    };

    const sections = document.querySelectorAll('.editor-section');
    if (sections.length > 0) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('id');
                    document.querySelectorAll('.sidebar-nav-item').forEach(i => {
                        const onclick = i.getAttribute('onclick');
                        if (onclick && onclick.includes(id)) {
                            i.classList.add('active');
                            selectNode(id);
                        } else {
                            i.classList.remove('active');
                        }
                    });
                }
            });
        }, { threshold: 0.3, rootMargin: '-10% 0px -60% 0px' });

        sections.forEach(s => observer.observe(s));
    }

    // --- 🌪️ Zenith Absolute: Kinetic 3D Perspective Engine ---
    let liquidAngle = 0;
    const animateLiquid = () => {
        liquidAngle = (liquidAngle + 2) % 360;
        document.querySelectorAll('.royale-card').forEach(card => {
            card.style.setProperty('--liquid-angle', `${liquidAngle}deg`);
        });
        requestAnimationFrame(animateLiquid);
    };
    animateLiquid();

    const handlePerspective = (e, card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -6; // Sovereign Mass: Max 6 deg
        const rotateY = ((x - centerX) / centerX) * 6; 
        
        card.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px) scale(1.02)`;
        card.style.boxShadow = `
            ${-rotateY * 3}px ${rotateX * 3}px 80px -20px var(--royale-glow, rgba(0,0,0,0.15)),
            0 60px 120px -30px rgba(2,6,23,0.08)
        `;

        // Void Parallax Intensity Upgrade
        if (card.id === 'inventory') {
            const layers = card.querySelectorAll('[class*="parallax-layer-"]');
            layers.forEach(layer => {
                const match = layer.className.match(/parallax-layer-(\d+)/);
                if (match) {
                    const depth = parseInt(match[1]);
                    layer.style.transform = `translateZ(${depth * 2}px) translate(${-rotateY * 0.5}px, ${rotateX * 0.5}px)`;
                }
            });
        }
        
        // Atmospheric Ray Tracking
        const ray = card.querySelector('.light-sweep-overlay');
        if (ray) {
            ray.style.transform = `translateX(${(x / rect.width) * 20 - 10}px) translateY(${(y / rect.height) * 20 - 10}px)`;
        }

        // Imperial Corner Glows
        const gl = card.querySelector('.cg-tl');
        const gr = card.querySelector('.cg-tr');
        if (gl) gl.style.transform = `translate3d(${x * 0.1}px, ${y * 0.1}px, 50px)`;
        if (gr) gr.style.transform = `translate3d(${(x - rect.width) * 0.1}px, ${y * 0.1}px, 50px)`;
    };

    const resetPerspective = (card) => {
        card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)`;
        if (card.classList.contains('selected-node')) {
            card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1.02)`;
        }
    };

    allCards.forEach(card => {
        card.addEventListener('mousemove', (e) => handlePerspective(e, card));
        card.addEventListener('mouseleave', () => resetPerspective(card));
    });

    // Magnetic Pull Logic
    const magneticElements = document.querySelectorAll('.sidebar-nav-item, .pill-item, button[type="submit"]');
    magneticElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            el.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.05)`;
        });
        el.addEventListener('mouseleave', () => {
            el.style.transform = `translate(0, 0) scale(1)`;
        });
    });
});
