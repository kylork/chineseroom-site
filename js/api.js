/**
 * OpenRouter API operations
 */

const API = {
    /**
     * Decode API key (handles embedded key)
     */
    decodeApiKey(storedKey) {
        if (storedKey === '__EMBEDDED__' || storedKey === 'chineseroom.org') {
            return CONFIG.EMBEDDED_KEY.decode();
        }
        return storedKey;
    },
    
    /**
     * Fetch models from OpenRouter
     */
    async fetchModels() {
        try {
            UI.showStatus('Loading models...');
            console.log('Fetching models from OpenRouter...');
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);
            
            const response = await fetch(CONFIG.MODELS_ENDPOINT, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch models: ${response.status}`);
            }
            
            const data = await response.json();
            const models = data.data || [];
            
            // Build lookup map
            AppState.openRouterModels = {};
            models.forEach(model => {
                AppState.openRouterModels[model.id] = model;
            });
            
            console.log(`Received ${models.length} models from OpenRouter`);
            return models;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error('OpenRouter request timed out');
                UI.showToast('Model loading timed out. Using Human mode only.', 'error');
            } else {
                console.error('Error fetching models:', error);
                UI.showToast('Failed to load models from OpenRouter. Using Human mode only.', 'error');
            }
            return [];
        }
    },
    
    /**
     * Call OpenRouter API
     */
    async callOpenRouter(messages, model, botId, reasoning, signal) {
        const apiKeyInput = document.getElementById('apiKey');
        const storedKey = apiKeyInput?.value?.trim();
        
        if (!storedKey) {
            throw new Error('Please enter your OpenRouter API key in settings');
        }
        
        const apiKey = this.decodeApiKey(storedKey);
        const modelWithSearch = AppState.webSearchEnabled[botId] ? `${model}:online` : model;
        
        const maxTokensInput = document.getElementById(`${botId}MaxTokens`);
        const temperatureInput = document.getElementById(`${botId}Temperature`);
        const topPInput = document.getElementById(`${botId}TopP`);
        
        const payload = {
            model: modelWithSearch,
            messages: messages,
            stream: true,
            max_tokens: parseInt(maxTokensInput?.value) || 2000,
            temperature: parseFloat(temperatureInput?.value) || 1.0,
            top_p: parseFloat(topPInput?.value) || 1.0
        };
        
        const response = await fetch(CONFIG.OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.href,
                'X-Title': 'Chinese Room'
            },
            body: JSON.stringify(payload),
            signal
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }
        
        return response;
    },
    
    /**
     * Process streaming response
     */
    async processStream(response, onChunk, signal) {
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');
        
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        
        try {
            while (true) {
                if (signal?.aborted) {
                    reader.releaseLock();
                    throw new Error('Aborted');
                }
                
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices?.[0]?.delta?.content) {
                                const content = parsed.choices[0].delta.content;
                                fullContent += content;
                                onChunk(content);
                            }
                        } catch (e) {
                            console.error('Error parsing streaming data:', e);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        return fullContent;
    }
};
