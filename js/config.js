/**
 * Configuration constants for Chinese Room
 */

const CONFIG = {
    // Database
    DB_NAME: 'ChatArenaDB',
    DB_VERSION: 2,
    
    // Limits
    MAX_RENDERED_MESSAGES: 400,
    MAX_HISTORY_ITEMS: 2000,
    CONSECUTIVE_END_THRESHOLD: 4,
    FETCH_TIMEOUT: 10000,
    BOTTOM_THRESHOLD: 40,
    
    // API
    OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',
    MODELS_ENDPOINT: 'https://openrouter.ai/api/v1/models',
    
    // Default values
    DEFAULT_MODEL: 'human',
    DEFAULT_MODEL_NAME: 'Human',
    DEFAULT_MAX_TOKENS: 16384,
    
    // Embedded API key (same as original)
    EMBEDDED_KEY: {
        p1: [115, 107, 45, 111, 114, 45, 118, 49, 45],
        p2: 'ZTE2Y2YyMmNjZDZhMWRiNTI2NzM2MmI2MzY5YjVmNGU=',
        p3: [57, 57, 48, 51, 57, 53, 56, 49, 101, 53, 52, 48, 100, 97, 102, 49, 97, 56, 49, 98, 54, 99, 51, 100, 52, 50, 50, 50, 102, 97, 53, 56],
        decode() {
            const a = String.fromCharCode(...this.p1);
            const b = atob(this.p2);
            const c = String.fromCharCode(...this.p3);
            return a + b + c;
        }
    }
};

// Default bot configuration
const DEFAULT_BOT_CONFIG = {
    name: '',
    model: 'human',
    reasoning: 'medium',
    verbosity: 'medium',
    maxTokens: 16000,
    temperature: 1,
    topP: 1,
    systemPrompt: '',
    instructions: '',
    webSearch: false
};

// Default chat settings
const DEFAULT_CHAT_SETTINGS = {
    maxExchanges: 10,
    customExchanges: 1,
    allowMutualTermination: false,
    enableDisplayNames: false
};

// Default collapsed subsections
const DEFAULT_COLLAPSED_SUBSECTIONS = {
    bot1Params: false,
    bot1Prompts: false,
    bot2Params: false,
    bot2Prompts: false
};
