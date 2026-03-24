/**
 * ZenithSelector: Enterprise Custom Select Orchestrator (v44.0)
 * High-performance, accessible dropdown replacement for the Zenith UI.
 */
class ZenithSelector {
    constructor(selectId, options = {}) {
        this.rawSelect = document.getElementById(selectId);
        if (!this.rawSelect) return;

        this.options = {
            placeholder: options.placeholder || 'Select Option...',
            icon: options.icon || 'fa-layer-group',
            ...options
        };

        this.mount();
        this.bindEvents();
    }

    mount() {
        // Create the Zenith UI Mount
        this.mountPoint = this.rawSelect.parentElement;
        this.rawSelect.classList.add('hidden');

        const selectedOption = this.rawSelect.options[this.rawSelect.selectedIndex];
        const initialText = selectedOption ? selectedOption.text : this.options.placeholder;

        this.zenithWrapper = document.createElement('div');
        this.zenithWrapper.className = 'zenith-selector-wrapper group relative';
        this.zenithWrapper.innerHTML = `
            <div class="zenith-trigger flex items-center justify-between gap-4 px-6 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 hover:bg-white/10 transition-all cursor-pointer">
                <div class="flex items-center gap-3">
                    <i class="fas ${this.options.icon} text-slate-500 group-hover:text-emerald-400 transition-colors text-xs"></i>
                    <span class="zenith-label text-xs font-bold text-white tracking-tight">${initialText}</span>
                </div>
                <i class="fas fa-chevron-down text-[10px] text-slate-600 group-hover:text-emerald-400 transition-transform duration-300"></i>
            </div>
            <div class="zenith-dropdown hidden absolute top-full left-0 right-0 mt-3 p-2 rounded-[1.5rem] bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-[100] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                ${Array.from(this.rawSelect.options).map(opt => `
                    <div class="zenith-option px-5 py-3 rounded-xl hover:bg-white/5 text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between group/opt" data-value="${opt.value}">
                        ${opt.text}
                        ${opt.selected ? '<i class="fas fa-check text-emerald-400 text-[10px]"></i>' : ''}
                    </div>
                `).join('')}
            </div>
        `;

        this.mountPoint.appendChild(this.zenithWrapper);
        this.trigger = this.zenithWrapper.querySelector('.zenith-trigger');
        this.dropdown = this.zenithWrapper.querySelector('.zenith-dropdown');
        this.label = this.zenithWrapper.querySelector('.zenith-label');
    }

    bindEvents() {
        this.trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = this.dropdown.classList.contains('hidden');
            
            // Close all other ZenithSelectors first
            document.querySelectorAll('.zenith-dropdown').forEach(d => d.classList.add('hidden'));
            document.querySelectorAll('.zenith-trigger i.fa-chevron-down').forEach(i => i.classList.remove('rotate-180'));

            if (isHidden) {
                this.dropdown.classList.remove('hidden');
                this.trigger.querySelector('.fa-chevron-down').classList.add('rotate-180');
            }
        });

        this.zenithWrapper.querySelectorAll('.zenith-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const value = opt.getAttribute('data-value');
                this.rawSelect.value = value;
                this.label.textContent = opt.textContent.trim();
                
                // Update UI state
                this.zenithWrapper.querySelectorAll('.zenith-option i.fa-check').forEach(i => i.remove());
                opt.insertAdjacentHTML('beforeend', '<i class="fas fa-check text-emerald-400 text-[10px]"></i>');

                this.dropdown.classList.add('hidden');
                this.trigger.querySelector('.fa-chevron-down').classList.remove('rotate-180');

                // Dispatch change event to the raw select so other scripts can listen
                this.rawSelect.dispatchEvent(new Event('change'));
            });
        });

        // Close on click outside
        document.addEventListener('click', () => {
            this.dropdown.classList.add('hidden');
            this.trigger.querySelector('.fa-chevron-down').classList.remove('rotate-180');
        });
    }
}

window.ZenithSelector = ZenithSelector;
