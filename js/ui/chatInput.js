/**
 * Chat input handling
 */

const ChatInput = {
    input: null,
    sendBtn: null,
    
    /**
     * Initialize chat input
     */
    init() {
        this.input = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        
        this.setupInput();
        this.setupSendButton();
        this.setupScrollButton();
        this.setupScrollTracking();
    },
    
    /**
     * Setup textarea input handling
     */
    setupInput() {
        if (!this.input) return;
        
        // Auto-resize
        this.input.addEventListener('input', () => {
            this.input.style.height = 'auto';
            this.input.style.height = Math.min(this.input.scrollHeight, 210) + 'px';
        });
        
        // Enter key handling
        this.input.addEventListener('keydown', (e) => {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
                || window.matchMedia('(max-width: 768px)').matches;
            
            if (e.key === 'Enter') {
                if (!isMobile && !e.shiftKey) {
                    e.preventDefault();
                    this.send();
                }
            }
        });
    },
    
    /**
     * Setup send button
     */
    setupSendButton() {
        this.sendBtn?.addEventListener('click', () => this.send());
    },
    
    /**
     * Setup scroll-to-latest button
     */
    setupScrollButton() {
        const scrollBtn = document.getElementById('scrollToLatestBtn');
        scrollBtn?.addEventListener('click', () => {
            AppState.autoScrollEnabled = true;
            scrollBtn.classList.add('hidden');
            Messages.scrollToBottom();
        });
    },
    
    /**
     * Setup scroll tracking for auto-scroll
     */
    setupScrollTracking() {
        const container = document.getElementById('chatMessages');
        const scrollBtn = document.getElementById('scrollToLatestBtn');
        
        if (!container) return;
        
        container.addEventListener('scroll', () => {
            const atBottom = Messages.isScrolledToBottom(10);
            AppState.autoScrollEnabled = atBottom;
            scrollBtn?.classList.toggle('hidden', atBottom);
        });
    },
    
    /**
     * Get current input value
     */
    getValue() {
        return this.input?.value || '';
    },
    
    /**
     * Clear input
     */
    clear() {
        if (this.input) {
            this.input.value = '';
            this.input.style.height = 'auto';
        }
    },
    
    /**
     * Focus input
     */
    focus() {
        this.input?.focus();
    },
    
    /**
     * Send message
     */
    async send() {
        const message = this.getValue().trim();
        if (!message) return;
        
        // Handle human input during active conversation
        if (AppState.waitingForHumanInput && AppState.conversationActive) {
            const botName = AppState.getBotDisplayName(AppState.currentTurn);
            const botId = AppState.currentTurn;
            const fullMessage = this.getValue(); // Use original value, not trimmed
            
            Messages.addMessage(botName, fullMessage, botId);
            AppState.chatHistory.push({
                sender: botName,
                content: fullMessage,
                type: botId
            });
            
            // Trim history if needed
            if (AppState.chatHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
                AppState.chatHistory = AppState.chatHistory.slice(-CONFIG.MAX_HISTORY_ITEMS);
            }
            
            AppState.currentExchangeCount++;
            AppState.waitingForHumanInput = false;
            AppState.currentTurn = AppState.currentTurn === 'bot1' ? 'bot2' : 'bot1';
            
            const messageContent = fullMessage;
            this.clear();
            
            setTimeout(() => {
                if (AppState.conversationActive && !AppState.conversationPaused) {
                    Conversation.continue(messageContent);
                }
            }, 500);
            
            return;
        }
        
        // Start new conversation
        if (!AppState.conversationActive) {
            const topicContent = this.getValue();
            this.clear();
            await Conversation.start(topicContent);
            return;
        }
        
        // Add user message during conversation
        const fullMessage = this.getValue();
        Messages.addMessage('You', fullMessage, 'human');
        AppState.chatHistory.push({
            sender: 'You',
            content: fullMessage,
            type: 'human'
        });
        
        // Trim history if needed
        if (AppState.chatHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
            AppState.chatHistory = AppState.chatHistory.slice(-CONFIG.MAX_HISTORY_ITEMS);
        }
        
        const messageContent = fullMessage;
        this.clear();
        
        await Conversation.continue(messageContent);
    },
    
    /**
     * Update placeholder based on state
     */
    updatePlaceholder() {
        if (!this.input) return;
        
        if (AppState.waitingForHumanInput && AppState.conversationActive) {
            const botName = AppState.getBotDisplayName(AppState.currentTurn);
            this.input.placeholder = `${botName} (Human): Type your response...`;
        } else {
            this.input.placeholder = 'Enter topic or join the conversation...';
        }
    }
};
