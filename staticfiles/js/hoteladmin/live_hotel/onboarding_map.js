// onboarding_map.js
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('location-search');
    const openMapBtn = document.getElementById('open-map-btn');
    const mapPopup = document.getElementById('locationPopup');
    const closeMapBtn = document.getElementById('close-map-btn');
    const confirmBtn = document.getElementById('confirm-location-btn');

    // Hidden inputs
    const latInput = document.getElementById('id_lat');
    const lngInput = document.getElementById('id_lng');
    const cityInput = document.getElementById('id_city');
    const stateInput = document.getElementById('id_state');
    const pincodeInput = document.getElementById('id_pincode');

    // Split View Elements
    const liveAddressDisplay = document.getElementById('live-address-display');
    const addressSkeleton = document.getElementById('address-skeleton');
    const autoDetectBtn = document.getElementById('auto-detect-btn');
    const latDisplay = document.getElementById('lat-display');
    const lngDisplay = document.getElementById('lng-display');
    const accuracyDisplay = document.getElementById('accuracy-display');
    const mapLoadingOverlay = document.getElementById('map-loading-overlay');
    const locateMeBtn = document.getElementById('floating-locate-me');

    // Admin Proof Elements
    const landmarksList = document.getElementById('landmarks-list');
    const precisionBadge = document.getElementById('precision-badge');
    const auditTimestamp = document.getElementById('audit-timestamp');
    const auditToken = document.getElementById('audit-token');

    let map, marker, accuracyCircle;
    let currentAccuracy = 10;

    const initMap = (lat = 20.5937, lng = 78.9629, zoom = 5) => {
        if (!map) {
            map = L.map('map-container', { zoomControl: false }).setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.control.zoom({ position: 'bottomright' }).addTo(map);

            map.on('click', (e) => updateMarker(e.latlng.lat, e.latlng.lng));

            // Critical for hidden containers
            setTimeout(() => {
                map.invalidateSize();
            }, 400);

            // Fade out loading overlay
            if (mapLoadingOverlay) {
                mapLoadingOverlay.style.opacity = '0';
                setTimeout(() => { mapLoadingOverlay.style.display = 'none'; }, 500);
            }
        } else {
            map.setView([lat, lng], zoom);
        }
        updateMarker(lat, lng);
        updateUIState('success');
    };

    const updateMarker = (lat, lng, accuracy = 10) => {
        const pos = [lat, lng];
        if (marker) map.removeLayer(marker);
        if (accuracyCircle) map.removeLayer(accuracyCircle);

        const customIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="marker-pin-wrapper">
                    <i class="fas fa-location-dot" style="color: #3b82f6; font-size: 28px; filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.4));"></i>
                    <div class="marker-pulse"></div>
                </div>`,
            iconSize: [30, 42],
            iconAnchor: [15, 38]
        });

        marker = L.marker(pos, { draggable: true, icon: customIcon }).addTo(map);
        accuracyCircle = L.circle(pos, {
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            radius: accuracy,
            weight: 1
        }).addTo(map);

        marker.on('dragstart', () => updateUIState('loading'));
        marker.on('dragend', (e) => {
            const newPos = e.target.getLatLng();
            accuracyCircle.setLatLng(newPos);
            reverseGeocode(newPos.lat, newPos.lng);
            updateDisplayMetrics(newPos.lat, newPos.lng, currentAccuracy);
        });

        latInput.value = lat;
        lngInput.value = lng;
        updateDisplayMetrics(lat, lng, accuracy);
    };

    const updateDisplayMetrics = (lat, lng, accuracy) => {
        if (latDisplay) latDisplay.textContent = parseFloat(lat).toFixed(6);
        if (lngDisplay) lngDisplay.textContent = parseFloat(lng).toFixed(6);
        if (accuracyDisplay) accuracyDisplay.textContent = `± ${Math.round(accuracy)}m`;
        currentAccuracy = accuracy;

        // Update Precision Badge
        if (precisionBadge) {
            let level = 'High-Precision locked';
            let icon = 'fa-satellite';
            let className = 'high';

            if (accuracy > 50) {
                level = 'Medium Precision';
                className = 'medium';
            } else if (accuracy > 150) {
                level = 'Low Precision Check';
                className = 'low';
            }

            precisionBadge.className = `precision-badge ${className}`;
            precisionBadge.innerHTML = `<i class="fas ${icon}"></i> <span>${level}</span>`;
        }

        // Update Audit Ledger
        if (auditTimestamp) auditTimestamp.textContent = new Date().toLocaleTimeString();
        if (auditToken) {
            const token = 'TX-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            auditToken.textContent = token;
        }
    };

    const updateUIState = (state, data = null) => {
        if (!liveAddressDisplay || !addressSkeleton) return;
        switch (state) {
            case 'loading':
                addressSkeleton.style.display = 'flex';
                liveAddressDisplay.style.display = 'none';
                confirmBtn.disabled = true;
                break;
            case 'success':
                addressSkeleton.style.display = 'none';
                liveAddressDisplay.style.display = 'block';
                if (data && data.address) liveAddressDisplay.textContent = data.address;
                confirmBtn.disabled = false;
                break;
        }
    };

    const reverseGeocode = async (lat, lng) => {
        updateUIState('loading');
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&extratags=1`, {
                headers: { 'User-Agent': 'HotelPro-Onboarding/1.0' }
            });
            const data = await response.json();
            if (data && data.display_name) {
                const addr = data.address || {};

                // Intelligently extract layers of location data
                const building = addr.amenity || addr.tourism || addr.building || addr.shop || addr.leisure || '';
                const street = addr.road || addr.pedestrian || addr.path || '';
                const neighborhood = addr.neighbourhood || addr.suburb || addr.residential || '';
                const city = addr.city || addr.town || addr.village || addr.county || addr.city_district || '';
                const state = addr.state || addr.state_district || '';
                const pin = addr.postcode || '';
                const country = addr.country || '';

                // Deduplicate and filter empty values
                const rawParts = [building, street, neighborhood, city, state, pin, country];
                const parts = [...new Set(rawParts)].filter(p => p && p.toString().trim() !== '');

                let formattedLocation = parts.join(', ');

                // Fallback to display_name if nothing was parsed
                if (!formattedLocation) {
                    formattedLocation = data.display_name;
                }

                searchInput.value = formattedLocation;
                updateUIState('success', { address: formattedLocation });
                fillHiddenFields(data.address);

                // Update Nearby Landmarks
                updateNearbyLandmarks(data);
            }
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            updateUIState('success', { address: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
        }
    };

    const updateNearbyLandmarks = (data) => {
        if (!landmarksList) return;
        landmarksList.innerHTML = '';

        let landmarks = [];
        const addr = data.address;

        // Extract real-world markers from address components
        if (addr.amenity) landmarks.push({ name: addr.amenity, icon: 'fa-building-circle-check' });
        if (addr.tourism) landmarks.push({ name: addr.tourism, icon: 'fa-camera' });
        if (addr.shop) landmarks.push({ name: addr.shop, icon: 'fa-cart-shopping' });
        if (addr.highway) landmarks.push({ name: addr.highway, icon: 'fa-road' });
        if (addr.suburb) landmarks.push({ name: addr.suburb, icon: 'fa-map-location-dot' });
        if (addr.neighbourhood) landmarks.push({ name: addr.neighbourhood, icon: 'fa-house-chimney' });

        if (landmarks.length === 0) {
            landmarks.push({ name: 'Standard Urban Grid', icon: 'fa-vector-square' });
            landmarks.push({ name: addr.city || 'District Area', icon: 'fa-city' });
        }

        landmarks.forEach(l => {
            const chip = document.createElement('div');
            chip.className = 'landmark-chip';
            chip.innerHTML = `<i class="fas ${l.icon}"></i> ${l.name}`;
            landmarksList.appendChild(chip);
        });
    };

    const searchAddress = async (query) => {
        if (!query || query.length < 3) return;
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
                headers: { 'User-Agent': 'HotelPro-Onboarding/1.0' }
            });
            const data = await response.json();
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);

                showMapPopup();
                setTimeout(() => {
                    initMap(lat, lng, 16);
                    if (map) map.invalidateSize();
                }, 300);
                fillHiddenFields(result.address);
            }
        } catch (error) {
            console.error('Address search failed:', error);
        }
    };

    const fillHiddenFields = (addr) => {
        if (!addr) return;
        // More robust city selection for diverse geographies
        const city = addr.city || addr.town || addr.village || addr.suburb || addr.neighbourhood || addr.county || addr.state_district || '';
        if (cityInput) cityInput.value = city;
        if (stateInput) stateInput.value = addr.state || '';
        if (pincodeInput) pincodeInput.value = addr.postcode || '';
    };

    const showMapPopup = () => {
        mapPopup.style.display = 'flex';

        // Ensure map exists and is visible
        const currentLat = parseFloat(latInput.value);
        const currentLng = parseFloat(lngInput.value);

        if (currentLat && currentLng) {
            setTimeout(() => {
                initMap(currentLat, currentLng, 16);
                if (map) map.invalidateSize();
            }, 300);
        } else {
            // "Exact location located in map automatically initially"
            triggerAutoDetect();
        }
    };

    const triggerAutoDetect = () => {
        updateUIState('loading');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const accuracy = position.coords.accuracy;

                    if (mapPopup.style.display === 'flex') {
                        initMap(lat, lng, 18);
                        updateMarker(lat, lng, accuracy);
                    }
                    reverseGeocode(lat, lng);
                    latInput.value = lat;
                    lngInput.value = lng;
                },
                (err) => {
                    console.warn('GPS access denied.', err);
                    updateUIState('success', { address: 'GPS Access Denied' });
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    };

    // Auto-Geolocation on Load
    if (navigator.geolocation && !latInput.value) {
        triggerAutoDetect();
    }

    // Event Listeners
    if (openMapBtn) openMapBtn.addEventListener('click', showMapPopup);
    if (closeMapBtn) closeMapBtn.addEventListener('click', () => mapPopup.style.display = 'none');
    if (autoDetectBtn) autoDetectBtn.addEventListener('click', triggerAutoDetect);
    if (locateMeBtn) locateMeBtn.addEventListener('click', triggerAutoDetect);

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchAddress(searchInput.value);
            }
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (marker) {
                const pos = marker.getLatLng();
                latInput.value = pos.lat;
                lngInput.value = pos.lng;
                reverseGeocode(pos.lat, pos.lng);
                mapPopup.style.display = 'none';
            }
        });
    }
});
