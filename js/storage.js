/**
 * IndexedDB storage operations
 */

const Storage = {
    /**
     * Initialize IndexedDB
     */
    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
                
                if (!db.objectStoreNames.contains('messages')) {
                    const messageStore = db.createObjectStore('messages', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    messageStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = () => {
                AppState.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve(AppState.db);
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(request.error);
            };
        });
    },
    
    /**
     * Save a setting
     */
    async saveSetting(key, value) {
        if (!AppState.db) {
            console.error('Database not initialized');
            return false;
        }
        
        try {
            const transaction = AppState.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            await store.put({ key, value });
            return true;
        } catch (error) {
            console.error('Error saving setting:', error);
            return false;
        }
    },
    
    /**
     * Get a setting
     */
    async getSetting(key) {
        if (!AppState.db) {
            console.error('Database not initialized');
            return null;
        }
        
        return new Promise((resolve) => {
            const transaction = AppState.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            
            request.onerror = () => {
                console.error(`Error getting setting: ${key}`, request.error);
                resolve(null);
            };
        });
    },
    
    /**
     * Save a message
     */
    async saveMessage(message) {
        if (!AppState.db) return;
        
        try {
            const transaction = AppState.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            await store.add({
                ...message,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    },
    
    /**
     * Clear all messages
     */
    async clearMessages() {
        if (!AppState.db) return;
        
        try {
            const transaction = AppState.db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            await store.clear();
            console.log('Cleared all messages from IndexedDB');
        } catch (error) {
            console.error('Error clearing messages:', error);
        }
    },
    
    /**
     * Clear all settings
     */
    async clearSettings() {
        if (!AppState.db) return;
        
        try {
            const transaction = AppState.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            await store.clear();
        } catch (error) {
            console.error('Error clearing settings:', error);
        }
    },
    
    /**
     * Load all settings into UI
     */
    async loadSettings() {
        const settings = [
            'apiKey',
            'bot1Name', 'bot1Model', 'bot1Reasoning', 'bot1SystemPrompt', 'bot1Instructions',
            'bot2Name', 'bot2Model', 'bot2Reasoning', 'bot2SystemPrompt', 'bot2Instructions',
            'maxExchanges', 'customExchanges',
            'bot1MaxTokens', 'bot1Temperature', 'bot1TopP', 'bot1Verbosity',
            'bot2MaxTokens', 'bot2Temperature', 'bot2TopP', 'bot2Verbosity',
            'bot1WebSearch', 'bot2WebSearch', 'allowMutualTermination', 'enableDisplayNames'
        ];
        
        for (const setting of settings) {
            const value = await this.getSetting(setting);
            if (value !== null) {
                const element = document.getElementById(setting);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = value === 'true' || value === true;
                    } else {
                        // Special handling for embedded API key marker
                        if (setting === 'apiKey' && value === '__EMBEDDED__') {
                            element.value = 'chineseroom.org';
                        } else {
                            element.value = value;
                        }
                    }
                    
                    // Update display for model dropdowns
                    if (setting === 'bot1Model' || setting === 'bot2Model') {
                        const botId = setting === 'bot1Model' ? 'bot1' : 'bot2';
                        const display = document.getElementById(`${botId}ModelDisplay`);
                        if (display && AppState.openRouterModels) {
                            if (value === 'human') {
                                display.textContent = 'Human';
                            } else {
                                const modelData = AppState.openRouterModels[value];
                                if (modelData) {
                                    display.textContent = modelData.name;
                                }
                            }
                        }
                    }
                }
                
                // Update state variables
                if (setting === 'bot1WebSearch') {
                    AppState.webSearchEnabled.bot1 = value === 'true' || value === true;
                } else if (setting === 'bot2WebSearch') {
                    AppState.webSearchEnabled.bot2 = value === 'true' || value === true;
                } else if (setting === 'allowMutualTermination') {
                    AppState.allowMutualTermination = value === 'true' || value === true;
                } else if (setting === 'enableDisplayNames') {
                    AppState.enableDisplayNames = value === 'true' || value === true;
                }
            }
        }
        
        console.log('All settings loaded successfully');
    },
    
    /**
     * Save all current settings
     */
    async saveAllSettings() {
        const settings = [
            'apiKey', 'bot1Name', 'bot1Model', 'bot1Reasoning', 'bot1SystemPrompt', 'bot1Instructions',
            'bot2Name', 'bot2Model', 'bot2Reasoning', 'bot2SystemPrompt', 'bot2Instructions',
            'maxExchanges', 'customExchanges',
            'bot1MaxTokens', 'bot1Temperature', 'bot1TopP', 'bot1Verbosity',
            'bot2MaxTokens', 'bot2Temperature', 'bot2TopP', 'bot2Verbosity'
        ];
        
        let allSaved = true;
        for (const setting of settings) {
            const element = document.getElementById(setting);
            if (element) {
                const value = element.type === 'checkbox' ? element.checked : element.value;
                const success = await this.saveSetting(setting, value);
                if (!success) allSaved = false;
            }
        }
        
        // Save state variables
        await this.saveSetting('bot1WebSearch', AppState.webSearchEnabled.bot1);
        await this.saveSetting('bot2WebSearch', AppState.webSearchEnabled.bot2);
        await this.saveSetting('allowMutualTermination', AppState.allowMutualTermination);
        await this.saveSetting('enableDisplayNames', AppState.enableDisplayNames);
        
        return allSaved;
    },
    
    /**
     * Load collapse states
     */
    async loadCollapseStates() {
        try {
            const sectionsState = await this.getSetting('collapsedSections');
            const subsectionsState = await this.getSetting('collapsedSubsections');
            
            if (sectionsState) {
                AppState.collapsedSections = JSON.parse(sectionsState);
                Object.keys(AppState.collapsedSections).forEach(sectionId => {
                    const section = document.getElementById(sectionId);
                    if (section && AppState.collapsedSections[sectionId]) {
                        section.classList.add('collapsed');
                    } else if (section) {
                        section.classList.remove('collapsed');
                    }
                });
            }
            
            if (subsectionsState) {
                AppState.collapsedSubsections = JSON.parse(subsectionsState);
                Object.keys(AppState.collapsedSubsections).forEach(subsectionId => {
                    const content = document.getElementById(subsectionId);
                    const icon = document.getElementById(subsectionId + 'Icon');
                    if (content) {
                        if (AppState.collapsedSubsections[subsectionId]) {
                            content.classList.add('collapsed');
                            if (icon) icon.style.transform = 'rotate(-90deg)';
                        } else {
                            content.classList.remove('collapsed');
                            if (icon) icon.style.transform = 'rotate(0)';
                        }
                    }
                });
            }
        } catch (e) {
            console.log('Could not restore collapse states:', e);
        }
    }
};
