/**
 * edit_hotel.js - Master Property Editor Logic
 * Handles dynamic UI, tab switching, and data intelligence.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ─────────────── TAB SWITCHING LOGIC ───────────────
    // Hum tabs switch karne ke liye buttons aur content panels fetch kar rahe hain
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');

            // Deactivate all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Activate target
            btn.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');

            // If map tab, refresh map
            if (target === 'identity' && window.editMap) {
                setTimeout(() => window.editMap.invalidateSize(), 100);
            }
        });
    });

    // ─────────────── DYNAMIC ROOM MANAGEMENT ───────────────
    // Naya room type add karne ka logic aur purane delete karne ka handles
    const roomContainer = document.getElementById('room-editor-container');
    const addRoomBtn = document.getElementById('add-room-btn');
    let roomCounter = parseInt(roomContainer.getAttribute('data-next-index')) || 0;

    addRoomBtn.addEventListener('click', () => {
        roomCounter++;
        const template = document.getElementById('room-template').content.cloneNode(true);

        // Update indices in the new card
        template.querySelectorAll('[name*="__prefix__"]').forEach(el => {
            el.name = el.name.replace('__prefix__', roomCounter);
        });
        template.querySelectorAll('[id*="__prefix__"]').forEach(el => {
            el.id = el.id.replace('__prefix__', roomCounter);
        });
        template.querySelector('.room-num-display').textContent = roomCounter;
        template.querySelector('.room-editor-card').setAttribute('data-index', roomCounter);

        roomContainer.appendChild(template);
    });

    // Room remove karna (Hinglish: Room ko portfolio se hatana)
    roomContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-room-btn')) {
            const card = e.target.closest('.room-editor-card');
            if (confirm('Are you sure you want to remove this room category?')) {
                card.classList.add('scale-75', 'opacity-0');
                setTimeout(() => card.remove(), 300);
            }
        }
    });

    // ─────────────── MAP INTELLIGENCE ───────────────
    // Map setup taaki exact location choose ki ja sake
    const mapEl = document.getElementById('edit-map');
    if (mapEl) {
        const initialLat = parseFloat(document.getElementById('lat').value) || 20.5937;
        const initialLng = parseFloat(document.getElementById('lng').value) || 78.9629;

        window.editMap = L.map('edit-map').setView([initialLat, initialLng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.editMap);

        let marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(window.editMap);

        marker.on('dragend', () => {
            const pos = marker.getLatLng();
            document.getElementById('lat').value = pos.lat.toFixed(6);
            document.getElementById('lng').value = pos.lng.toFixed(6);
        });

        window.editMap.on('click', (e) => {
            marker.setLatLng(e.latlng);
            document.getElementById('lat').value = e.latlng.lat.toFixed(6);
            document.getElementById('lng').value = e.latlng.lng.toFixed(6);
        });
    }

    // ─────────────── AMENITIES PILL LOGIC ───────────────
    // Custom amenities ko JSON format me convert karke backend bhejna
    roomContainer.addEventListener('click', (e) => {
        if (e.target.closest('.pill-toggle')) {
            const pill = e.target.closest('.pill-toggle');
            pill.classList.toggle('active');
            updateAmenities(pill.closest('.room-editor-card'));
        }
    });

    function updateAmenities(card) {
        const activePills = card.querySelectorAll('.pill-toggle.active');
        const amenities = Array.from(activePills).map(p => p.getAttribute('data-value'));
        const hiddenInput = card.querySelector('input[name*="room_amenities_"]');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(amenities);
        }
    }

    // ─────────────── FORM PRE-SUBMISSION ───────────────
    // Submit hone se pehle checking (Hinglish: Akhiri baar sab check karna)
    const form = document.getElementById('masterEditForm');
    form.addEventListener('submit', (e) => {
        const saveStatus = document.getElementById('save-status');
        saveStatus.textContent = 'Syncing Global Dossier... Wait for protocol completion.';
        saveStatus.classList.add('text-primary-600');
    });
});
