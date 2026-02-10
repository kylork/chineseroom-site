/**
 * Message rendering and chat UI
 */

const Messages = {
    container: null,
    
    /**
     * Initialize messages container reference
     */
    init() {
        this.container = document.getElementById('chatMessages');
    },
    
    /**
     * Escape HTML to prevent injection
     */
    escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },
    
    /**
     * Normalize math delimiters
     */
    normalizeMathText(text) {
        const segments = [];
        const codeRegex = /(```[\s\S]*?```|`[^`]*`)/g;
        let lastIndex = 0;
        let match;
        
        while ((match = codeRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
            }
            segments.push({ type: 'code', value: match[0] });
            lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < text.length) {
            segments.push({ type: 'text', value: text.slice(lastIndex) });
        }
        
        const normalizeSegment = (segmentText) => {
            let t = segmentText;
            t = t.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, content) => `$$${content.trim()}$$`);
            t = t.replace(/\\\(([\s\S]*?)\\\)/g, (_, content) => `$${content.trim()}$`);
            t = t.replace(/\$\$\s*\n([\s\S]*?)\n\s*\$\$/g, (_, content) => `$$${content.trim()}$$`);
            return t;
        };
        
        return segments.map(seg => seg.type === 'text' ? normalizeSegment(seg.value) : seg.value).join('');
    },
    
    /**
     * Format markdown text
     */
    formatMarkdown(text) {
        if (!text) return '';
        
        const normalized = this.normalizeMathText(text);
        const safe = this.escapeHTML(normalized);
        
        if (window.marked) {
            return marked.parse(safe, {
                gfm: true,
                breaks: true
            });
        }
        return safe.replace(/\n/g, '<br>');
    },
    
    /**
     * Render math in element
     */
    renderMath(element) {
        if (window.renderMathInElement && element) {
            renderMathInElement(element, {
                delimiters: [
                    { left: '$$', right: '$$', display: true },
                    { left: '\\[', right: '\\]', display: true },
                    { left: '$', right: '$', display: false },
                    { left: '\\(', right: '\\)', display: false }
                ],
                throwOnError: false
            });
        }
    },
    
    /**
     * Check if scrolled to bottom
     */
    isScrolledToBottom(threshold = CONFIG.BOTTOM_THRESHOLD) {
        if (!this.container) return true;
        const scrollPosition = this.container.scrollTop + this.container.clientHeight;
        const scrollHeight = this.container.scrollHeight;
        return scrollHeight - scrollPosition <= threshold;
    },
    
    /**
     * Scroll to bottom
     */
    scrollToBottom() {
        if (this.container && AppState.autoScrollEnabled) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    },
    
    /**
     * Prune old messages from DOM
     */
    pruneRenderedMessages() {
        if (!this.container) return;
        const messages = this.container.querySelectorAll('.message');
        if (messages.length > CONFIG.MAX_RENDERED_MESSAGES) {
            const excess = messages.length - CONFIG.MAX_RENDERED_MESSAGES;
            for (let i = 0; i < excess; i++) {
                messages[i].remove();
            }
        }
    },
    
    /**
     * Add a message to the chat
     */
    addMessage(sender, content, type = '', streaming = false) {
        if (!this.container) this.init();
        
        const wasAtBottom = this.isScrolledToBottom();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type} ${streaming ? 'streaming' : ''}`;
        messageDiv.dataset.sender = sender;
        messageDiv.dataset.type = type;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const safeSender = this.escapeHTML(sender);
        
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${safeSender}${streaming ? ' <span class="typing-indicator"></span>' : ''}</span>
                <div class="message-time">
                    ${timeStr}
                    ${!streaming ? `<button class="copy-btn" title="Copy message">❐</button>` : ''}
                </div>
            </div>
            <div class="message-content"></div>
        `;
        
        // Set content
        const contentElement = messageDiv.querySelector('.message-content');
        if (!streaming && content) {
            contentElement.innerHTML = this.formatMarkdown(content);
            this.renderMath(contentElement);
            contentElement.setAttribute('data-original-content', content);
            
            // Handle image load scrolling
            const imgs = contentElement.querySelectorAll('img');
            imgs.forEach(img => {
                img.addEventListener('load', () => {
                    if (AppState.autoScrollEnabled || wasAtBottom) {
                        this.scrollToBottom();
                    }
                });
            });
        }
        
        // Add copy button listener
        const copyBtn = messageDiv.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyMessage(copyBtn));
        }
        
        this.container.appendChild(messageDiv);
        
        if (wasAtBottom || AppState.autoScrollEnabled) {
            this.scrollToBottom();
        }
        
        this.pruneRenderedMessages();
        UI.updateMessageCount();
        
        return messageDiv;
    },
    
    /**
     * Update a streaming message
     */
    updateStreamingMessage(sender, content, type) {
        if (!this.container) return;
        
        // Find the streaming message from this sender
        const messages = this.container.querySelectorAll('.message');
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.dataset.sender === sender && msg.dataset.type === type && msg.classList.contains('streaming')) {
                const contentElement = msg.querySelector('.message-content');
                if (contentElement) {
                    contentElement.textContent = content;
                    if (AppState.autoScrollEnabled || this.isScrolledToBottom()) {
                        this.scrollToBottom();
                    }
                }
                return;
            }
        }
    },
    
    /**
     * Finalize a streaming message (apply markdown, add copy button)
     */
    finalizeStreamingMessage(sender, content, type) {
        if (!this.container) return;
        
        // Find the streaming message
        const messages = this.container.querySelectorAll('.message');
        for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i];
            if (msg.dataset.sender === sender && msg.dataset.type === type && msg.classList.contains('streaming')) {
                msg.classList.remove('streaming');
                
                // Remove typing indicator
                const indicator = msg.querySelector('.typing-indicator');
                if (indicator) indicator.remove();
                
                // Apply markdown
                const contentElement = msg.querySelector('.message-content');
                if (contentElement) {
                    contentElement.innerHTML = this.formatMarkdown(content);
                    contentElement.setAttribute('data-original-content', content);
                    this.renderMath(contentElement);
                }
                
                // Add copy button
                const messageTime = msg.querySelector('.message-time');
                if (messageTime && !messageTime.querySelector('.copy-btn')) {
                    const copyBtn = document.createElement('button');
                    copyBtn.className = 'copy-btn';
                    copyBtn.title = 'Copy message';
                    copyBtn.textContent = '❐';
                    copyBtn.addEventListener('click', () => this.copyMessage(copyBtn));
                    messageTime.appendChild(copyBtn);
                }
                
                // Save to storage
                Storage.saveMessage({ sender, content, type, conversationId: 'current' });
                UI.updateMessageCount();
                
                if (AppState.autoScrollEnabled || this.isScrolledToBottom()) {
                    this.scrollToBottom();
                }
                return;
            }
        }
    },
    
    /**
     * Copy a message to clipboard
     */
    async copyMessage(button) {
        const messageElement = button.closest('.message');
        const contentElement = messageElement?.querySelector('.message-content');
        
        if (!contentElement) return;
        
        const content = contentElement.getAttribute('data-original-content') || contentElement.textContent;
        
        try {
            await navigator.clipboard.writeText(content);
            const originalText = button.textContent;
            button.textContent = '✓';
            button.style.color = 'var(--success-color)';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.color = '';
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
            UI.showToast('Failed to copy message', 'error');
        }
    },
    
    /**
     * Copy entire conversation
     */
    async copyConversation() {
        if (!this.container) return;
        
        const messages = this.container.querySelectorAll('.message:not(.streaming)');
        
        if (messages.length === 0) {
            UI.showToast('No messages to copy', 'error');
            return;
        }
        
        let text = '';
        
        messages.forEach(messageDiv => {
            const senderElement = messageDiv.querySelector('.message-sender');
            const timeElement = messageDiv.querySelector('.message-time');
            const contentElement = messageDiv.querySelector('.message-content');
            
            if (!senderElement || !timeElement || !contentElement) return;
            
            const senderName = senderElement.textContent.trim();
            const timeClone = timeElement.cloneNode(true);
            const button = timeClone.querySelector('.copy-btn');
            if (button) button.remove();
            const timeText = timeClone.textContent.trim();
            const content = contentElement.getAttribute('data-original-content') || contentElement.textContent;
            
            text += `${senderName}, ${timeText}\n${content}\n\n`;
        });
        
        try {
            await navigator.clipboard.writeText(text.trim());
            UI.showToast('Conversation copied to clipboard!', 'success');
        } catch (err) {
            console.error('Failed to copy conversation:', err);
            UI.showToast('Failed to copy conversation', 'error');
        }
    },
    
    /**
     * Clear all messages from display
     */
    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        UI.updateMessageCount();
    }
};
