/**
 * Global application state
 */

const AppState = {
    // Conversation state
    currentExchangeCount: 0,
    maxExchangeCount: 10,
    conversationActive: false,
    currentTurn: 'bot1',
    chatHistory: [],
    waitingForHumanInput: false,
    conversationPaused: false,
    pendingTopic: null,
    lastConversationTopic: '',
    
    // UI state
    isFullscreen: false,
    autoScrollEnabled: true,
    fontSizeDelta: 0,
    
    // Streaming
    streamingControllers: new Map(),
    
    // Web search
    webSearchEnabled: {
        bot1: false,
        bot2: false
    },
    
    // Mutual termination
    endSignals: { bot1: false, bot2: false },
    consecutiveEndSignals: 0,
    allowMutualTermination: false,
    
    // Collapse states
    collapsedSections: {},
    collapsedSubsections: { ...DEFAULT_COLLAPSED_SUBSECTIONS },
    
    // Display names
    enableDisplayNames: false,
    
    // Models
    defaultModelId: 'human',
    defaultModelName: 'Human',
    openRouterModels: {},
    
    // Database
    db: null,
    
    // Status
    status: 'Ready',
    
    /**
     * Reset conversation state
     */
    resetConversation() {
        this.currentExchangeCount = 0;
        this.conversationActive = false;
        this.currentTurn = 'bot1';
        this.waitingForHumanInput = false;
        this.conversationPaused = false;
        this.pendingTopic = null;
        this.endSignals = { bot1: false, bot2: false };
        this.consecutiveEndSignals = 0;
        this.chatHistory = [];
    },
    
    /**
     * Get max exchanges value
     */
    getMaxExchanges() {
        const select = document.getElementById('maxExchanges');
        const customGroup = document.getElementById('customExchangeGroup');
        const customInput = document.getElementById('customExchanges');
        
        if (!select) return 10;
        
        const value = select.value;
        if (value === 'unlimited') return 'unlimited';
        if (value === 'custom') {
            customGroup?.classList.remove('hidden');
            return parseInt(customInput?.value) || 1;
        }
        customGroup?.classList.add('hidden');
        return parseInt(value);
    },
    
    /**
     * Get bot display name
     */
    getBotDisplayName(botId) {
        const nameInput = document.getElementById(`${botId}Name`);
        const modelInput = document.getElementById(`${botId}Model`);
        const customName = nameInput?.value?.trim();
        
        if (customName) return customName;
        
        const botNumber = botId === 'bot1' ? '1' : '2';
        const model = modelInput?.value;
        
        if (model === 'human') return `Bot ${botNumber}: Human`;
        
        const modelDisplay = document.getElementById(`${botId}ModelDisplay`)?.textContent;
        return `Bot ${botNumber}: ${modelDisplay || model}`;
    },
    
    /**
     * Get model max tokens
     */
    getModelMaxTokens(modelId) {
        const model = this.openRouterModels[modelId];
        if (model) {
            return model.top_provider?.max_completion_tokens || model.context_length || CONFIG.DEFAULT_MAX_TOKENS;
        }
        return CONFIG.DEFAULT_MAX_TOKENS;
    },
    
    /**
     * Detect end signal in content
     */
    detectEndSignal(content) {
        if (!this.allowMutualTermination) return false;
        const pattern = /\[(END|DONE|COMPLETE|FINISHED|CONVERSATION\s*(ENDS?|COMPLETE|FINISHED)|SIGNAL\s*ENDS?|CLOSING|TERMINATE|EXIT)\]/i;
        return pattern.test(content);
    },
    
    /**
     * Check if mutual termination threshold reached
     */
    checkMutualTermination() {
        return this.consecutiveEndSignals >= CONFIG.CONSECUTIVE_END_THRESHOLD;
    },
    
    /**
     * Reset end signals
     */
    resetEndSignals() {
        this.endSignals = { bot1: false, bot2: false };
        this.consecutiveEndSignals = 0;
    }
};
