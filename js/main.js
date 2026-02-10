/**
 * Main entry point - initializes the application
 */

const UI = {
    /**
     * Show status message
     */
    showStatus(text) {
        AppState.status = text;
        const statusEl = document.getElementById('statusText');
        if (statusEl) statusEl.textContent = text;
    },
    
    /**
     * Update message count display
     */
    updateMessageCount() {
        const container = document.getElementById('chatMessages');
        const count = container?.querySelectorAll('.message:not(.streaming):not(.system)').length || 0;
        const countEl = document.getElementById('messageCount');
        if (countEl) countEl.textContent = `Messages: ${count}`;
    },
    
    /**
     * Update play/pause button
     */
    updatePlayPauseButton() {
        const btn = document.getElementById('playPauseBtn');
        if (!btn) return;
        
        if (AppState.conversationActive && !AppState.conversationPaused) {
            btn.textContent = '⏸';
            btn.title = 'Pause conversation';
        } else {
            btn.textContent = '▶';
            btn.title = AppState.conversationActive ? 'Resume conversation' : 'Start conversation';
        }
    },
    
    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    /**
     * Adjust font size
     */
    adjustFontSize(delta) {
        AppState.fontSizeDelta += delta;
        AppState.fontSizeDelta = Math.max(-4, Math.min(4, AppState.fontSizeDelta));
        
        const root = document.documentElement;
        const baseSizes = { xs: 12, sm: 14, base: 16, lg: 18 };
        
        root.style.setProperty('--text-xs', `${Math.max(8, Math.min(16, baseSizes.xs + AppState.fontSizeDelta))}px`);
        root.style.setProperty('--text-sm', `${Math.max(10, Math.min(18, baseSizes.sm + AppState.fontSizeDelta))}px`);
        root.style.setProperty('--text-base', `${Math.max(12, Math.min(20, baseSizes.base + AppState.fontSizeDelta))}px`);
        root.style.setProperty('--text-lg', `${Math.max(14, Math.min(24, baseSizes.lg + AppState.fontSizeDelta))}px`);
    },
    
    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {
                this.showToast('Fullscreen not supported', 'error');
            });
        } else {
            document.exitFullscreen();
        }
    }
};

/**
 * Initialize the application
 */
async function initApp() {
    console.log('Initializing Chinese Room...');
    
    try {
        // Initialize storage
        await Storage.initDB();
        
        // Fetch models
        const models = await API.fetchModels();
        
        // Initialize UI components
        Messages.init();
        Sidebar.init();
        ChatInput.init();
        CustomSelect.init(models);
        
        // Load saved settings
        await Storage.loadSettings();
        await Storage.loadCollapseStates();
        
        // Update UI based on loaded settings
        Sidebar.updateDisplayNameVisibility();
        Sidebar.updateMaxExchanges();
        ['bot1', 'bot2'].forEach(botId => Sidebar.updateModelSettings(botId));
        
        // Setup header controls
        document.getElementById('playPauseBtn')?.addEventListener('click', () => Conversation.togglePlayPause());
        document.getElementById('copyConversationBtn')?.addEventListener('click', () => Messages.copyConversation());
        document.getElementById('fontSizeDown')?.addEventListener('click', () => UI.adjustFontSize(-1));
        document.getElementById('fontSizeUp')?.addEventListener('click', () => UI.adjustFontSize(1));
        document.getElementById('fullscreenBtn')?.addEventListener('click', () => UI.toggleFullscreen());
        
        // Setup checkboxes
        document.getElementById('allowMutualTermination')?.addEventListener('change', (e) => {
            AppState.allowMutualTermination = e.target.checked;
            Storage.saveSetting('allowMutualTermination', e.target.checked);
        });
        
        document.getElementById('enableDisplayNames')?.addEventListener('change', (e) => {
            AppState.enableDisplayNames = e.target.checked;
            Storage.saveSetting('enableDisplayNames', e.target.checked);
            Sidebar.updateDisplayNameVisibility();
        });
        
        ['bot1', 'bot2'].forEach(botId => {
            document.getElementById(`${botId}WebSearch`)?.addEventListener('change', (e) => {
                AppState.webSearchEnabled[botId] = e.target.checked;
                Storage.saveSetting(`${botId}WebSearch`, e.target.checked);
            });
        });
        
        // Add welcome message
        Messages.addMessage('System', 'Welcome to Chinese Room! Configure your chatbots in the settings panel, select models, then type a topic below to begin.', 'system');
        
        UI.showStatus('Ready');
        console.log('Chinese Room initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        UI.showToast('Failed to initialize application', 'error');
        Messages.addMessage('System', 'Welcome to Chinese Room! There was an error initializing the application, but you can still use the app.', 'system');
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
