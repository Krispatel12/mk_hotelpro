/**
 * PropertyGalleryManager - Professional Gallery Management
 * Handles multi-file uploads, drag-and-drop, and professional lightbox previews.
 */
class PropertyGalleryManager {
    constructor() {
        this.uploadZone = document.getElementById('galleryUploadZone');
        this.input = document.getElementById('galleryInput');
        this.previewGrid = document.getElementById('galleryPreviewContainer');
        this.galleryFiles = [];

        this.init();
    }

    init() {
        if (!this.uploadZone || !this.input || !this.previewGrid) return;

        // ── NEW: Force file list synchronization ──
        this.syncFileInput = () => {
            const dt = new DataTransfer();
            this.galleryFiles.forEach(f => {
                if (f.file) dt.items.add(f.file);
            });
            this.input.files = dt.files;
            console.log(`[Gallery] Input synchronized: ${this.input.files.length} file(s) ready.`);
        };


        // Trigger input on zone click
        this.uploadZone.addEventListener('click', (e) => {
            if (!e.target.closest('.preview-item')) this.input.click();
        });

        // Handle Drag & Drop
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('drag-active');
        });

        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('drag-active');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('drag-active');
            if (e.dataTransfer.files.length) {
                this.handleFiles(e.dataTransfer.files);
            }
        });

        // Handle normal selection
        this.input.addEventListener('change', () => {
            this.handleFiles(this.input.files);
        });
    }

    /**
     * Adds existing photos to the gallery (for Edit Mode)
     * @param {Array} photos - Array of {url, id} objects
     */
    addExistingPhotos(photos) {
        photos.forEach(p => {
            this.galleryFiles.push({
                url: p.url,
                id: p.id,
                isExisting: true
            });
        });
        this.renderGallery();
    }

    renderGallery() {
        if (!this.previewGrid) return;
        this.previewGrid.innerHTML = '';

        this.galleryFiles.forEach((fileObj, idx) => {
            const isHidden = idx > 5; // Show more in Master Editor
            const isLastVisible = idx === 5;
            const hasMore = this.galleryFiles.length > 6 && isLastVisible;
            const moreCount = this.galleryFiles.length - 6;

            const div = document.createElement('div');
            div.className = `preview-item card-look ${hasMore ? 'has-more lightbox-trigger' : ''}`;
            if (isHidden) div.style.display = 'none';
            if (hasMore) div.setAttribute('data-more', `+${moreCount} More`);

            const isVideo = fileObj.file ? (fileObj.file.type.startsWith('video/') || fileObj.file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) : fileObj.url.match(/\.(mp4|mov|webm|mkv|avi)$/i);
            const mediaTag = isVideo 
                ? `<video src="${fileObj.url}" class="lightbox-trigger" autoplay muted loop style="width:100%; height:100%; object-fit:cover; border-radius:inherit;"></video>`
                : `<img src="${fileObj.url}" class="lightbox-trigger" alt="Preview">`;

            div.innerHTML = `
                ${mediaTag}
                ${fileObj.isExisting ?
                    '<div class="edit-photo-badge"><i class="fas fa-history"></i></div>' :
                    '<div class="preview-remove"><i class="fas fa-times"></i></div>'}
            `;

            const removeBtn = div.querySelector('.preview-remove');
            if (removeBtn) {
                removeBtn.onclick = (event) => {
                    event.stopPropagation();
                    this.galleryFiles.splice(idx, 1);
                    this.syncFileInput();
                    this.renderGallery();
                };
            }

            // Click anywhere on item (except remove btn) to open Lightbox
            div.style.cursor = 'pointer';
            div.onclick = (e) => {
                const assets = this.galleryFiles.map(f => ({
                    url: f.url,
                    type: (f.file ? (f.file.type.startsWith('video/') || f.file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) : f.url.match(/\.(mp4|mov|webm|mkv|avi)$/i)) ? 'video' : 'image',
                    name: f.file ? f.file.name : f.url.split('/').pop()
                }));
                if (window.openLightbox) {
                    window.openLightbox(assets, idx, (removeIdx) => {
                        this.galleryFiles.splice(removeIdx, 1);
                        this.syncFileInput();
                        this.renderGallery();
                    });
                }
            };

            this.previewGrid.appendChild(div);
        });
    }

    handleFiles(files) {
        let added = 0;
        const MAX_PHOTOS = 10;
        const MAX_VIDEOS = 3;
        const MAX_FILE_SIZE_MB = 5;
        const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
        
        let skippedLimit = false;
        let skippedSize = false;
        let skippedType = false;
        let skippedVideos = false;

        Array.from(files).forEach(file => {
            const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|gif|webp)$/i);
            const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i);
            
            if (!isImage && !isVideo) {
                skippedType = true;
                return;
            }

            // Size Check
            if (file.size > MAX_FILE_SIZE_BYTES) {
                skippedSize = true;
                return;
            }
            
            const currentPhotos = this.galleryFiles.filter(f => f.file ? (f.file.type.startsWith('image/') || f.file.name.match(/\.(png|jpe?g|gif|webp)$/i)) : (!f.url.match(/\.(mp4|mov|webm|mkv|avi)$/i))).length;
            const currentVideos = this.galleryFiles.filter(f => f.file ? (f.file.type.startsWith('video/') || f.file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i)) : f.url.match(/\.(mp4|mov|webm|mkv|avi)$/i)).length;
            
            if (isImage && currentPhotos >= MAX_PHOTOS) {
                skippedLimit = true;
                return;
            }
            
            if (isVideo && currentVideos >= MAX_VIDEOS) {
                skippedVideos = true;
                return;
            }
            
            this.galleryFiles.push({
                file: file,
                url: URL.createObjectURL(file),
                isExisting: false
            });
            added++;
        });
        
        // --- Show Contextual Popup if files were skipped ---
        if (skippedLimit || skippedSize || skippedType || skippedVideos) {
            let errorMsg = "";
            if (skippedLimit) errorMsg += `• Photo limit reached (${MAX_PHOTOS})\n`;
            if (skippedVideos) errorMsg += `• Video limit reached (${MAX_VIDEOS})\n`;
            if (skippedSize) errorMsg += `• Some files exceed ${MAX_FILE_SIZE_MB}MB\n`;
            if (skippedType) errorMsg += `• Unsupported format skipped\n`;

            if (window.stepperManager && typeof window.stepperManager.showContextualPopup === 'function') {
                window.stepperManager.showContextualPopup(this.uploadZone, {
                    title: 'Upload Management',
                    icon: 'fa-cloud-upload-alt',
                    message: errorMsg
                });
            }
        }

        // Always sync the input, even if 0 were added (resets invalid selections)
        this.syncFileInput(); 
        if (added > 0) {
            this.renderGallery();
        }
    }
}

// Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    window.propertyGalleryManager = new PropertyGalleryManager();
});
