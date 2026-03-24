document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('chat-messages');

    if (!chatForm || !userInput || !messagesContainer) return;

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function addMessage(content, isUser = false) {
        const wrapper = document.createElement('div');
        wrapper.className = `flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300 gap-3`;

        const avatar = isUser ?
            `<div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white text-xs flex-shrink-0 mt-1 border border-white/10 order-2 font-bold">GM</div>` :
            `<div class="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0 mt-1 order-1">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L14.4 9.6L21 12L14.4 14.4L12 21L9.6 14.4L3 12L9.6 9.6L12 3Z"/></svg>
             </div>`;

        const bubble = document.createElement('div');
        bubble.className = isUser ?
            'bg-primary-500 text-white p-4 rounded-2xl rounded-tr-none shadow-lg text-sm leading-relaxed order-1' :
            'bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm leading-relaxed order-2';

        bubble.innerHTML = content;

        wrapper.innerHTML = isUser ? bubble.outerHTML + avatar : avatar + bubble.outerHTML;
        messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function addLoading() {
        const wrapper = document.createElement('div');
        wrapper.id = 'loading-indicator';
        wrapper.className = 'flex justify-start mb-6 gap-3';
        wrapper.innerHTML = `
            <div class="w-10 h-10 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-400 flex-shrink-0 mt-1">
                <svg class="w-5 h-5 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L14.4 9.6L21 12L14.4 14.4L12 21L9.6 14.4L3 12L9.6 9.6L12 3Z"/></svg>
            </div>
            <div class="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-700 flex space-x-1.5 items-center h-10">
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
                <div class="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
            </div>
        `;
        messagesContainer.appendChild(wrapper);
        scrollToBottom();
    }

    function removeLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.remove();
    }

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, true);
        userInput.value = '';

        // Show loading state
        addLoading();

        try {
            // Get CSRF token from the data attribute on the form or from cookie
            const csrfToken = chatForm.getAttribute('data-csrf');
            const response = await fetch('#', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            removeLoading();

            if (data.response) {
                addMessage(data.response);
            } else if (data.error) {
                addMessage(`Error: ${data.error}`);
            } else {
                addMessage("I apologize, but I encountered an unknown error.");
            }
        } catch (error) {
            removeLoading();
            addMessage("I apologize, but I am having trouble connecting to the server.");
            console.error(error);
        }
    });
});
