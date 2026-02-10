/**
 * Sidebar UI operations
 */

const Sidebar = {
    sidebar: null,
    overlay: null,
    resizer: null,
    isResizing: false,
    
    /**
     * Initialize sidebar
     */
    init() {
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('sidebarOverlay');
        this.resizer = document.getElementById('sidebarResizer');
        
        this.setupToggle();
        this.setupResizer();
        this.setupCollapsibleSections();
        this.setupApiKeyButtons();
        this.setupSettingsButtons();
        this.setupMaxExchanges();
        this.setupSliders();
        this.setupEditableValues();
    },
    
    /**
     * Toggle sidebar visibility (mobile)
     */
    toggle() {
        if (window.innerWidth < 768) {
            this.sidebar?.classList.toggle('active');
            this.overlay?.classList.toggle('active');
        }
    },
    
    /**
     * Setup sidebar toggle button
     */
    setupToggle() {
        const toggleBtn = document.getElementById('toggleSidebarBtn');
        toggleBtn?.addEventListener('click', () => this.toggle());
        
        this.overlay?.addEventListener('click', () => this.toggle());
    },
    
    /**
     * Setup sidebar resizer (desktop)
     */
    setupResizer() {
        if (!this.resizer) return;
        
        this.resizer.addEventListener('mousedown', (e) => {
            if (window.innerWidth < 768) return;
            e.preventDefault();
            this.isResizing = true;
            this.resizer.classList.add('dragging');
            
            const startX = e.clientX;
            const startWidth = this.sidebar.getBoundingClientRect().width;
            
            const onMouseMove = (e) => {
                if (!this.isResizing) return;
                const delta = e.clientX - startX;
                const newWidth = Math.max(320, Math.min(800, startWidth + delta));
                document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            };
            
            const onMouseUp = () => {
                if (!this.isResizing) return;
                this.isResizing = false;
                this.resizer.classList.remove('dragging');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // Reset on window resize to mobile
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768) {
                document.documentElement.style.setProperty('--sidebar-width', '480px');
            }
        });
    },
    
    /**
     * Setup collapsible sections
     */
    setupCollapsibleSections() {
        // Main sections
        document.querySelectorAll('.settings-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const sectionId = header.dataset.section;
                if (!sectionId) return;
                
                const section = document.getElementById(sectionId);
                if (!section) return;
                
                section.classList.toggle('collapsed');
                AppState.collapsedSections[sectionId] = section.classList.contains('collapsed');
                Storage.saveSetting('collapsedSections', JSON.stringify(AppState.collapsedSections));
            });
        });
        
        // Subsections
        document.querySelectorAll('.subsection-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const subsectionId = header.dataset.subsection;
                if (!subsectionId) return;
                
                const content = document.getElementById(subsectionId);
                const icon = document.getElementById(subsectionId + 'Icon');
                if (!content) return;
                
                content.classList.toggle('collapsed');
                if (icon) {
                    icon.style.transform = content.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0)';
                }
                
                AppState.collapsedSubsections[subsectionId] = content.classList.contains('collapsed');
                Storage.saveSetting('collapsedSubsections', JSON.stringify(AppState.collapsedSubsections));
            });
        });
    },
    
    /**
     * Setup API key buttons
     */
    setupApiKeyButtons() {
        document.getElementById('saveApiKeyBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('apiKey');
            const keyToSave = input?.value === 'chineseroom.org' ? '__EMBEDDED__' : input?.value;
            
            const success = await Storage.saveSetting('apiKey', keyToSave);
            UI.showToast(success ? 'API key saved!' : 'Failed to save API key', success ? 'success' : 'error');
        });
        
        document.getElementById('clearApiKeyBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('apiKey');
            if (input) input.value = '';
            await Storage.saveSetting('apiKey', '');
            UI.showToast('API key cleared', 'success');
        });
    },
    
    /**
     * Setup settings buttons
     */
    setupSettingsButtons() {
        // Clear chat
        document.getElementById('clearChatBtn')?.addEventListener('click', async () => {
            Conversation.stop();
            Messages.clear();
            await Storage.clearMessages();
            UI.showToast('Chat cleared', 'success');
        });
        
        // Reset settings
        document.getElementById('resetSettingsBtn')?.addEventListener('click', async () => {
            await this.resetSettings();
        });
        
        // Save settings
        document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
            const success = await Storage.saveAllSettings();
            UI.showToast(success ? 'All settings saved!' : 'Some settings failed to save', success ? 'success' : 'error');
        });
    },
    
    /**
     * Reset all settings to defaults
     */
    async resetSettings() {
        // Clear storage
        await Storage.clearSettings();
        await Storage.clearMessages();
        
        // Reset inputs
        document.getElementById('apiKey').value = '';
        document.getElementById('maxExchanges').value = '10';
        document.getElementById('customExchanges').value = '1';
        document.getElementById('allowMutualTermination').checked = false;
        document.getElementById('enableDisplayNames').checked = false;
        
        // Reset bot configs
        ['bot1', 'bot2'].forEach(botId => {
            document.getElementById(`${botId}Name`).value = '';
            document.getElementById(`${botId}Model`).value = 'human';
            document.getElementById(`${botId}ModelDisplay`).textContent = 'Human';
            document.getElementById(`${botId}Reasoning`).value = 'medium';
            document.getElementById(`${botId}SystemPrompt`).value = '';
            document.getElementById(`${botId}Instructions`).value = '';
            document.getElementById(`${botId}MaxTokens`).value = 16000;
            document.getElementById(`${botId}TokenDisplay`).textContent = '16000';
            document.getElementById(`${botId}Temperature`).value = 1;
            document.getElementById(`${botId}TempDisplay`).textContent = '1';
            document.getElementById(`${botId}TopP`).value = 1.0;
            document.getElementById(`${botId}TopPDisplay`).textContent = '1.0';
            document.getElementById(`${botId}Verbosity`).value = 'medium';
            document.getElementById(`${botId}WebSearch`).checked = false;
        });
        
        // Reset state
        AppState.webSearchEnabled = { bot1: false, bot2: false };
        AppState.allowMutualTermination = false;
        AppState.enableDisplayNames = false;
        
        // Update UI
        this.updateDisplayNameVisibility();
        this.updateMaxExchanges();
        
        // Reset conversation
        Conversation.stop();
        Messages.clear();
        
        UI.showToast('Settings reset to defaults', 'success');
    },
    
    /**
     * Setup max exchanges dropdown
     */
    setupMaxExchanges() {
        const select = document.getElementById('maxExchanges');
        select?.addEventListener('change', () => this.updateMaxExchanges());
    },
    
    /**
     * Update max exchanges UI
     */
    updateMaxExchanges() {
        const select = document.getElementById('maxExchanges');
        const customGroup = document.getElementById('customExchangeGroup');
        
        if (select?.value === 'custom') {
            customGroup?.classList.remove('hidden');
        } else {
            customGroup?.classList.add('hidden');
        }
    },
    
    /**
     * Setup sliders with value displays
     */
    setupSliders() {
        ['bot1', 'bot2'].forEach(botId => {
            // Max tokens
            const maxTokensSlider = document.getElementById(`${botId}MaxTokens`);
            const maxTokensDisplay = document.getElementById(`${botId}TokenDisplay`);
            const maxTokensValue = document.getElementById(`${botId}TokenValue`);
            
            maxTokensSlider?.addEventListener('input', () => {
                const value = maxTokensSlider.value;
                if (maxTokensDisplay) maxTokensDisplay.textContent = value;
                if (maxTokensValue) {
                    const model = document.getElementById(`${botId}Model`)?.value;
                    const modelMax = AppState.getModelMaxTokens(model);
                    maxTokensValue.textContent = `${value} (max: ${modelMax.toLocaleString()})`;
                }
            });
            
            // Temperature
            const tempSlider = document.getElementById(`${botId}Temperature`);
            const tempDisplay = document.getElementById(`${botId}TempDisplay`);
            const tempValue = document.getElementById(`${botId}TempValue`);
            
            tempSlider?.addEventListener('input', () => {
                const value = Math.round(parseFloat(tempSlider.value) * 100) / 100;
                if (tempDisplay) tempDisplay.textContent = value;
                if (tempValue) tempValue.textContent = value;
            });
            
            // Top P
            const topPSlider = document.getElementById(`${botId}TopP`);
            const topPDisplay = document.getElementById(`${botId}TopPDisplay`);
            const topPValue = document.getElementById(`${botId}TopPValue`);
            
            topPSlider?.addEventListener('input', () => {
                const value = Math.round(parseFloat(topPSlider.value) * 100) / 100;
                if (topPDisplay) topPDisplay.textContent = value;
                if (topPValue) topPValue.textContent = value;
            });
        });
    },
    
    /**
     * Setup editable value fields
     */
    setupEditableValues() {
        document.querySelectorAll('.editable-value').forEach(element => {
            // Prevent newlines on Enter
            element.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    element.blur();
                }
            });
            
            // Select all on focus
            element.addEventListener('focus', () => {
                const range = document.createRange();
                range.selectNodeContents(element);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
            
            // Handle value change on blur
            element.addEventListener('blur', () => {
                let value = element.textContent.trim();
                const botId = element.id.startsWith('bot1') ? 'bot1' : 'bot2';
                const param = element.id.includes('Token') ? 'MaxTokens' : 
                              element.id.includes('Temp') ? 'Temperature' : 'TopP';
                
                if (param === 'MaxTokens') {
                    value = parseInt(value) || 0;
                    if (value < 0) value = 0;
                    if (value > 999999) value = 999999;
                    element.textContent = value;
                    
                    const slider = document.getElementById(`${botId}${param}`);
                    if (slider && value >= slider.min && value <= slider.max) {
                        slider.value = value;
                    }
                } else if (param === 'Temperature' || param === 'TopP') {
                    value = parseFloat(value);
                    const min = 0;
                    const max = param === 'Temperature' ? 2 : 1;
                    
                    if (isNaN(value) || value < min) value = min;
                    if (value > max) value = max;
                    
                    value = Math.round(value * 10000) / 10000;
                    element.textContent = value;
                    
                    const slider = document.getElementById(`${botId}${param}`);
                    if (slider) slider.value = Math.round(value * 100) / 100;
                    
                    const label = document.getElementById(`${botId}${param === 'Temperature' ? 'Temp' : 'TopP'}Value`);
                    if (label) label.textContent = value;
                }
            });
            
            // Only allow numeric input
            element.addEventListener('input', () => {
                const param = element.id.includes('Token') ? 'MaxTokens' : 
                              element.id.includes('Temp') ? 'Temperature' : 'TopP';
                let text = element.textContent;
                
                if (param === 'MaxTokens') {
                    text = text.replace(/[^0-9]/g, '');
                } else {
                    text = text.replace(/[^0-9.]/g, '');
                    const parts = text.split('.');
                    if (parts.length > 2) {
                        text = parts[0] + '.' + parts.slice(1).join('');
                    }
                }
                
                if (element.textContent !== text) {
                    element.textContent = text;
                    const range = document.createRange();
                    const selection = window.getSelection();
                    range.selectNodeContents(element);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            });
        });
    },
    
    /**
     * Update display name field visibility
     */
    updateDisplayNameVisibility() {
        const enabled = document.getElementById('enableDisplayNames')?.checked;
        document.getElementById('bot1NameGroup')?.classList.toggle('hidden', !enabled);
        document.getElementById('bot2NameGroup')?.classList.toggle('hidden', !enabled);
    },
    
    /**
     * Update model-dependent UI for a bot
     */
    updateModelSettings(botId) {
        const model = document.getElementById(`${botId}Model`)?.value;
        const isHuman = model === 'human';
        
        // Hide/show parameter groups
        const groups = [
            `${botId}MaxTokens`,
            `${botId}Temperature`,
            `${botId}TopP`,
            `${botId}Reasoning`,
            `${botId}Verbosity`
        ];
        
        groups.forEach(id => {
            const el = document.getElementById(id);
            const group = el?.closest('.form-group');
            if (group) {
                group.style.display = isHuman ? 'none' : '';
            }
        });
        
        // Update max tokens slider
        if (!isHuman) {
            const slider = document.getElementById(`${botId}MaxTokens`);
            const modelMax = AppState.getModelMaxTokens(model);
            if (slider) {
                slider.max = modelMax;
                if (parseInt(slider.value) > modelMax) {
                    slider.value = Math.min(modelMax, 2000);
                }
            }
        }
        
        // Update name placeholder
        const nameInput = document.getElementById(`${botId}Name`);
        const botNumber = botId === 'bot1' ? '1' : '2';
        const modelDisplay = document.getElementById(`${botId}ModelDisplay`)?.textContent;
        
        if (nameInput) {
            nameInput.placeholder = isHuman 
                ? `Bot ${botNumber}: Human`
                : `Bot ${botNumber}: ${modelDisplay || model}`;
        }
    }
};
