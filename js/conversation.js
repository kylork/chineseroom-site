/**
 * Conversation logic - bot turns, streaming, conversation loop
 */

const Conversation = {
    /**
     * Start a new conversation
     */
    async start(topic, suppressUserMessage = false) {
        const cleanedTopic = topic?.trim() || 'Start conversation';
        
        // Reset state
        AppState.resetConversation();
        AppState.conversationActive = true;
        AppState.lastConversationTopic = cleanedTopic;
        AppState.chatHistory = [{
            sender: 'User',
            content: cleanedTopic,
            type: 'user'
        }];
        
        // Clear display and add user message
        Messages.clear();
        if (!suppressUserMessage) {
            Messages.addMessage('User', cleanedTopic, 'user');
        }
        
        UI.showStatus('Starting conversation...');
        UI.updatePlayPauseButton();
        
        // Start the loop
        await this.continue(cleanedTopic);
    },
    
    /**
     * Continue the conversation (process next bot turn)
     */
    async continue(topic) {
        if (!AppState.conversationActive) return;
        
        AppState.lastConversationTopic = topic;
        
        // Check if paused
        if (AppState.conversationPaused) {
            AppState.pendingTopic = topic;
            UI.showStatus('Paused');
            return;
        }
        
        // Check max exchanges
        const maxExchanges = AppState.getMaxExchanges();
        if (maxExchanges !== 'unlimited' && AppState.currentExchangeCount >= maxExchanges) {
            this.stop();
            Messages.addMessage('System', 'Conversation completed. Maximum exchanges reached.', 'system');
            UI.showStatus('Conversation completed');
            UI.updatePlayPauseButton();
            return;
        }
        
        const botId = AppState.currentTurn;
        const botName = AppState.getBotDisplayName(botId);
        const model = document.getElementById(`${botId}Model`)?.value;
        
        // Handle human input
        if (model === 'human') {
            AppState.waitingForHumanInput = true;
            UI.showStatus(`Waiting for ${botName} to respond...`);
            Messages.addMessage('System', `${botName} (Human): Please type your response in the chat input below.`, 'system');
            ChatInput.updatePlaceholder();
            return;
        }
        
        UI.showStatus(`${botName} is thinking...`);
        
        try {
            // Build messages for API
            const messages = this.buildMessages(botId);
            
            // Create abort controller
            const controller = new AbortController();
            AppState.streamingControllers.set(botId, controller);
            
            // Add streaming message placeholder
            Messages.addMessage(botName, '', botId, true);
            
            // Call API
            const response = await API.callOpenRouter(messages, model, botId, 'medium', controller.signal);
            
            // Process stream
            let fullContent = '';
            await API.processStream(
                response,
                (chunk) => {
                    fullContent += chunk;
                    Messages.updateStreamingMessage(botName, fullContent, botId);
                },
                controller.signal
            );
            
            // Finalize message
            Messages.finalizeStreamingMessage(botName, fullContent, botId);
            AppState.streamingControllers.delete(botId);
            
            // Add to history
            AppState.chatHistory.push({
                sender: botName,
                content: fullContent,
                type: botId
            });
            
            // Trim history if needed
            if (AppState.chatHistory.length > CONFIG.MAX_HISTORY_ITEMS) {
                AppState.chatHistory = AppState.chatHistory.slice(-CONFIG.MAX_HISTORY_ITEMS);
            }
            
            // Check for end signal
            if (AppState.detectEndSignal(fullContent)) {
                AppState.consecutiveEndSignals++;
                AppState.endSignals[botId] = true;
                console.log(`${botId} signaled end (${AppState.consecutiveEndSignals}/${CONFIG.CONSECUTIVE_END_THRESHOLD} consecutive)`);
                
                if (AppState.checkMutualTermination()) {
                    this.stop();
                    Messages.addMessage('System', 'Conversation ended by mutual agreement.', 'system');
                    UI.showStatus('Conversation completed');
                    UI.updatePlayPauseButton();
                    return;
                }
            } else {
                // Reset consecutive counter
                if (AppState.consecutiveEndSignals > 0) {
                    console.log(`End signal streak broken at ${AppState.consecutiveEndSignals}`);
                    AppState.resetEndSignals();
                }
            }
            
            // Switch turns and continue
            AppState.currentExchangeCount++;
            AppState.currentTurn = AppState.currentTurn === 'bot1' ? 'bot2' : 'bot1';
            UI.showStatus('Ready');
            
            setTimeout(() => {
                if (AppState.conversationActive && !AppState.conversationPaused) {
                    this.continue(topic);
                }
            }, 1000);
            
        } catch (error) {
            AppState.streamingControllers.delete(botId);
            
            if (error.name === 'AbortError' || error.message === 'Aborted') {
                UI.showStatus('Request canceled');
                this.stop();
            } else {
                UI.showToast(`Error: ${error.message}`, 'error');
                UI.showStatus('Error occurred');
                this.stop();
            }
        }
    },
    
    /**
     * Build messages array for API call
     */
    buildMessages(botId) {
        const systemPrompt = document.getElementById(`${botId}SystemPrompt`)?.value || '';
        const instructions = document.getElementById(`${botId}Instructions`)?.value || '';
        const botName = AppState.getBotDisplayName(botId);
        
        const messages = [];
        
        // Termination hint
        const terminationHint = AppState.allowMutualTermination
            ? '\n\nWhen you feel the conversation has reached a natural conclusion, include [END] in your response. The conversation will close when both participants have signaled completion.'
            : '';
        
        // System prompt
        if (systemPrompt.trim()) {
            messages.push({
                role: 'system',
                content: systemPrompt.trim() + terminationHint
            });
        } else if (terminationHint) {
            messages.push({
                role: 'system',
                content: terminationHint.trim()
            });
        }
        
        // Developer instructions
        if (instructions.trim()) {
            messages.push({
                role: 'developer',
                content: instructions.trim()
            });
        }
        
        // Conversation history (last 200 messages)
        const recentHistory = AppState.chatHistory.slice(-200);
        recentHistory.forEach(msg => {
            if (msg.sender !== 'System') {
                messages.push({
                    role: msg.sender === botName ? 'assistant' : 'user',
                    content: msg.content
                });
            }
        });
        
        return messages;
    },
    
    /**
     * Stop the conversation
     */
    stop() {
        // Abort all ongoing streams
        AppState.streamingControllers.forEach(controller => {
            try {
                controller.abort();
            } catch (e) {
                // Ignore
            }
        });
        AppState.streamingControllers.clear();
        
        AppState.conversationActive = false;
        AppState.conversationPaused = false;
        AppState.waitingForHumanInput = false;
        UI.updatePlayPauseButton();
        ChatInput.updatePlaceholder();
    },
    
    /**
     * Pause the conversation
     */
    pause() {
        if (!AppState.conversationActive) return;
        
        AppState.conversationPaused = true;
        UI.showStatus('Paused');
        UI.updatePlayPauseButton();
    },
    
    /**
     * Resume the conversation
     */
    resume() {
        if (!AppState.conversationActive || !AppState.conversationPaused) return;
        
        AppState.conversationPaused = false;
        UI.showStatus('Resuming...');
        UI.updatePlayPauseButton();
        
        const resumeTopic = AppState.pendingTopic || AppState.lastConversationTopic || 'Start conversation';
        AppState.pendingTopic = null;
        
        setTimeout(() => {
            if (AppState.conversationActive) {
                this.continue(resumeTopic);
            }
        }, 100);
    },
    
    /**
     * Toggle play/pause
     */
    togglePlayPause() {
        if (!AppState.conversationActive) {
            // Start new conversation
            const input = document.getElementById('messageInput');
            const topicContent = input?.value || '';
            const hasUserText = topicContent.trim().length > 0;
            
            if (input) {
                input.value = '';
                input.style.height = 'auto';
            }
            
            AppState.conversationPaused = false;
            AppState.pendingTopic = null;
            this.start(topicContent, { suppressUserMessage: !hasUserText });
        } else if (AppState.conversationPaused) {
            this.resume();
        } else {
            this.pause();
        }
    }
};
