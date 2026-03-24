/**
 * onboarding_lightbox.js
 * Professional Global Media Previewer for HotelPro Elite
 * Supports: Images, Videos, PDFs
 * Features: Gallery navigation, secure asset handling, professional transitions
 */

let onRemoveCallback = null;

/**
 * Open Lightbox with a single file or a collection
 * @param {string|Array} assets - A single URL or array of {url, type, name}
 * @param {number} index - Starting index if assets is an array
 * @param {function} onRemove - Optional callback when an item is removed
 */
window.openLightbox = function(assets, index = 0, onRemove = null) {
    const modal = document.getElementById('lightboxModal');
    if (!modal) return;

    onRemoveCallback = onRemove;

    if (Array.isArray(assets)) {
        currentGallery = assets;
        currentIndex = index;
    } else {
        // Single asset mode
        const type = assets.toLowerCase().endsWith('.mp4') ? 'video' : (assets.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image');
        currentGallery = [{ url: assets, type: type, name: assets.split('/').pop() }];
        currentIndex = 0;
    }

    modal.classList.remove('d-none');
    modal.style.display = 'flex';
    updateLightboxContent();

    // Security Token Mock (Professional Audit Look)
    const tokenEl = document.getElementById('viewer-token');
    if (tokenEl) {
        tokenEl.textContent = 'TOKEN: ' + Math.random().toString(36).substring(2, 15).toUpperCase();
    }
};

/**
 * Remove the asset currently being viewed
 */
window.removeCurrentAsset = function() {
    if (!onRemoveCallback || !currentGallery[currentIndex]) return;

    const confirmDelete = confirm("Are you sure you want to remove this media?");
    if (!confirmDelete) return;

    // Call the external removal logic
    onRemoveCallback(currentIndex);

    // Update internal lightbox state
    currentGallery.splice(currentIndex, 1);

    if (currentGallery.length === 0) {
        closeLightbox();
    } else {
        // Move to next or previous if available
        if (currentIndex >= currentGallery.length) {
            currentIndex = currentGallery.length - 1;
        }
        updateLightboxContent();
    }
};

/**
 * Close the global lightbox
 */
window.closeLightbox = function() {
    const modal = document.getElementById('lightboxModal');
    if (!modal) return;

    modal.classList.add('d-none');
    modal.style.display = 'none';

    // Stop video if playing
    const video = document.getElementById('lightboxVideo');
    if (video) {
        video.pause();
        video.src = '';
    }
    
    // Clear iframe/image
    document.getElementById('lightboxImage').src = '';
    document.getElementById('lightboxPDF').src = '';
};

/**
 * Navigate through the current gallery
 * @param {number} direction - 1 for next, -1 for prev
 */
window.changeSlide = function(direction) {
    if (currentGallery.length <= 1) return;

    currentIndex = (currentIndex + direction + currentGallery.length) % currentGallery.length;
    updateLightboxContent();
};

/**
 * Internal: Update DOM based on current assets
 */
function updateLightboxContent() {
    const asset = currentGallery[currentIndex];
    if (!asset) return;

    const img = document.getElementById('lightboxImage');
    const video = document.getElementById('lightboxVideo');
    const pdf = document.getElementById('lightboxPDF');
    const caption = document.getElementById('lightboxCaption');

    // Reset visibility
    [img, video, pdf].forEach(el => el.classList.add('d-none'));

    // Update Caption
    if (caption) caption.textContent = asset.name || 'document_asset';

    // Show appropriate player
    if (asset.type === 'video' || (asset.file && asset.file.type.startsWith('video/'))) {
        video.src = asset.url;
        video.classList.remove('d-none');
        video.play().catch(e => console.log('Auto-play blocked'));
    } else if (asset.type === 'pdf' || (asset.file && asset.file.type === 'application/pdf')) {
        pdf.src = asset.url;
        pdf.classList.remove('d-none');
    } else {
        img.src = asset.url;
        img.classList.remove('d-none');
    }

    // Nav Visibility
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    if (prevBtn && nextBtn) {
        if (currentGallery.length > 1) {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        } else {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }
    }
}

/**
 * Legacy Support: For onboarding_docs.js
 */
window.previewSingleFile = function(url, filename, extension) {
    let type = 'image';
    if (extension === 'pdf') type = 'pdf';
    else if (extension === 'mp4') type = 'video';
    
    window.openLightbox([{ url, type, name: filename }], 0);
};

// Key Listeners for UX
document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightboxModal');
    if (modal && !modal.classList.contains('d-none')) {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') changeSlide(1);
        if (e.key === 'ArrowLeft') changeSlide(-1);
    }
});
