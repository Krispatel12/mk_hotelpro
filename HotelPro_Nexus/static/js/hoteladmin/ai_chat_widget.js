document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('ai-chat-toggle');
    const widget = document.getElementById('ai-chat-widget');
    const closeBtn = document.getElementById('close-chat-widget');
    const widgetForm = document.getElementById('widget-chat-form');
    const widgetInput = document.getElementById('widget-user-input');
    const widgetMessages = document.getElementById('widget-messages');

    if (!toggleBtn || !widget) return;

    // Handle Toggle
    function toggleChat() {
        const isOpen = widget.classList.contains('open');
        if (isOpen) {
            widget.classList.remove('open');
        } else {
            widget.classList.add('open');
            if (widgetInput) setTimeout(() => widgetInput.focus(), 300);
        }
    }

    if (toggleBtn) toggleBtn.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', () => widget.classList.remove('open'));

    // Auto-scroll
    function scrollToBottomWidget() {
        if (widgetMessages) widgetMessages.scrollTop = widgetMessages.scrollHeight;
    }

    // Message Helper
    function addWidgetMessage(content, isUser = false) {
        if (!widgetMessages) return;
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} widget-message-bubble space-x-3 mb-6`;

        const avatar = isUser ? '' :
            `<div class="w-10 h-10 rounded-xl flex items-center justify-center text-primary-400 text-xs flex-shrink-0 mt-1 bg-primary-500/10 border border-primary-500/20 shadow-inner">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L14.4 9.6L21 12L14.4 14.4L12 21L9.6 14.4L3 12L9.6 9.6L12 3Z"/></svg>
             </div>`;

        const bubble = document.createElement('div');
        bubble.className = isUser ?
            'text-white p-5 rounded-3xl rounded-br-sm shadow-xl text-sm leading-relaxed max-w-[80%] bg-gradient-to-br from-primary-500 to-primary-600 shadow-primary-500/20' :
            'p-5 rounded-3xl rounded-tl-sm shadow-sm text-slate-700 dark:text-slate-100 text-sm leading-relaxed max-w-[80%] bg-slate-100/50 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/5';

        bubble.innerHTML = content;

        wrapper.innerHTML = isUser ? bubble.outerHTML : avatar + bubble.outerHTML;
        widgetMessages.appendChild(wrapper);
        scrollToBottomWidget();
    }

    // Loading Helper
    function addWidgetLoading() {
        if (!widgetMessages) return;
        const wrapper = document.createElement('div');
        wrapper.id = 'widget-loading';
        wrapper.className = 'flex justify-start widget-message-bubble space-x-3 mb-6';
        wrapper.innerHTML = `
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-primary-400 text-xs flex-shrink-0 mt-1 bg-primary-500/10 border border-primary-500/20">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L14.4 9.6L21 12L14.4 14.4L12 21L9.6 14.4L3 12L9.6 9.6L12 3Z"/></svg>
            </div>
            <div class="p-4 rounded-2xl rounded-tl-sm shadow-sm flex space-x-1.5 items-center h-12 bg-slate-100/50 dark:bg-white/[0.05] border border-slate-200/50 dark:border-white/5">
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
        `;
        widgetMessages.appendChild(wrapper);
        scrollToBottomWidget();
    }

    function removeWidgetLoading() {
        const loader = document.getElementById('widget-loading');
        if (loader) loader.remove();
    }

    // Handle Submit
    if (widgetForm) {
        widgetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = widgetInput.value.trim();
            if (!message) return;

            // Add user message
            addWidgetMessage(message, true);
            widgetInput.value = '';

            // Show loading
            addWidgetLoading();

            try {
                // Use the correct URL for the chat API
                const response = await fetch('/api/ai/guest/chat/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Use the data-csrf-token from body if we add it, or cookie
                        'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || ''
                    },
                    body: JSON.stringify({ query: message })
                });

                const data = await response.json();
                removeWidgetLoading();

                if (data.response) {
                    addWidgetMessage(data.response);
                } else if (data.error) {
                    addWidgetMessage(`Error: ${data.error}`);
                } else {
                    addWidgetMessage("I apologize, but I encountered an unknown error.");
                }
            } catch (error) {
                removeWidgetLoading();
                addWidgetMessage("Network error. Please try again.");
                console.error(error);
            }
        });
    }
});
