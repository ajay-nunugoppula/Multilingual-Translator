class SarvamTranslator {
    constructor() {
        this.apiKey = null;
        this.translationHistory = [];
        this.currentTranslation = null;
        this.apiEndpoint = 'https://api.sarvam.ai/translate';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadApiKey();
        this.updateCharCount();
        this.updateButtonStates();
    }

    setupEventListeners() {
        // API Key management
        document.getElementById('saveApiKey').addEventListener('click', () => this.saveApiKey());
        document.getElementById('apiKey').addEventListener('input', () => this.validateApiKey());

        // Language controls
        document.getElementById('swapLanguages').addEventListener('click', () => this.swapLanguages());
        document.getElementById('sourceLanguage').addEventListener('change', () => this.updateButtonStates());
        document.getElementById('targetLanguage').addEventListener('change', () => this.updateButtonStates());

        // Text input/output
        document.getElementById('inputText').addEventListener('input', () => {
            this.updateCharCount();
            this.updateButtonStates();
        });
        document.getElementById('inputText').addEventListener('paste', () => {
            setTimeout(() => {
                this.updateCharCount();
                this.updateButtonStates();
            }, 10);
        });

        // Action buttons
        document.getElementById('translateBtn').addEventListener('click', () => this.translateText());
        document.getElementById('clearInput').addEventListener('click', () => this.clearInput());
        document.getElementById('clearOutput').addEventListener('click', () => this.clearOutput());
        document.getElementById('copyTranslation').addEventListener('click', () => this.copyTranslation());

        // Enter key support
        document.getElementById('inputText').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.translateText();
            }
        });

        // API key enter support
        document.getElementById('apiKey').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.saveApiKey();
            }
        });
    }

    loadApiKey() {
        const savedKey = sessionStorage.getItem('sarvam_api_key');
        if (savedKey) {
            this.apiKey = savedKey;
            document.getElementById('apiKey').value = savedKey;
            this.showApiKeyStatus('API key loaded', 'success');
            this.updateButtonStates();
        }
    }

    saveApiKey() {
        const keyInput = document.getElementById('apiKey');
        const key = keyInput.value.trim();

        if (!key) {
            this.showAlert('Please enter an API key', 'danger');
            return;
        }

        if (key.length < 10) {
            this.showAlert('API key seems too short. Please check and try again.', 'warning');
            return;
        }

        this.apiKey = key;
        sessionStorage.setItem('sarvam_api_key', key);
        this.showApiKeyStatus('API key saved successfully', 'success');
        this.showAlert('API key saved successfully!', 'success');
        this.updateButtonStates();
    }

    validateApiKey() {
        const key = document.getElementById('apiKey').value.trim();
        if (key && key.length >= 10) {
            this.showApiKeyStatus('Ready to save', 'info');
        } else if (key) {
            this.showApiKeyStatus('API key seems incomplete', 'warning');
        } else {
            this.clearApiKeyStatus();
        }
    }

    showApiKeyStatus(message, type) {
        const statusDiv = document.getElementById('apiKeyStatus');
        const statusClass = type === 'success' ? 'success' : 
                          type === 'warning' ? 'warning' : 
                          type === 'error' ? 'error' : 'info';
        
        statusDiv.innerHTML = `<div class="status-indicator ${statusClass}">
            <i class="bi bi-${this.getStatusIcon(type)} me-1"></i>${message}
        </div>`;
    }

    clearApiKeyStatus() {
        document.getElementById('apiKeyStatus').innerHTML = '';
    }

    getStatusIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    updateCharCount() {
        const input = document.getElementById('inputText');
        const charCount = document.getElementById('charCount');
        const count = input.value.length;
        const maxLength = 5000;

        charCount.textContent = `${count} characters`;

        if (count > maxLength * 0.9) {
            charCount.classList.add('error');
            charCount.classList.remove('warning');
        } else if (count > maxLength * 0.8) {
            charCount.classList.add('warning');
            charCount.classList.remove('error');
        } else {
            charCount.classList.remove('warning', 'error');
        }
    }

    updateButtonStates() {
        const hasApiKey = !!this.apiKey;
        const hasText = document.getElementById('inputText').value.trim().length > 0;
        const hasSourceLang = document.getElementById('sourceLanguage').value !== '';
        const hasTargetLang = document.getElementById('targetLanguage').value !== '';
        
        const translateBtn = document.getElementById('translateBtn');
        translateBtn.disabled = !(hasApiKey && hasText && hasSourceLang && hasTargetLang);

        // Update copy and clear buttons for output
        const hasTranslation = this.currentTranslation !== null;
        document.getElementById('copyTranslation').disabled = !hasTranslation;
        document.getElementById('clearOutput').disabled = !hasTranslation;
    }

    swapLanguages() {
        const sourceSelect = document.getElementById('sourceLanguage');
        const targetSelect = document.getElementById('targetLanguage');

        // Can't swap if source is auto-detect
        if (sourceSelect.value === 'auto') {
            this.showAlert('Cannot swap languages when using auto-detect', 'warning');
            return;
        }

        const sourceValue = sourceSelect.value;
        const targetValue = targetSelect.value;

        sourceSelect.value = targetValue;
        targetSelect.value = sourceValue;

        // Also swap the text if there's a current translation
        if (this.currentTranslation) {
            const inputText = document.getElementById('inputText');
            const outputDiv = document.getElementById('translationOutput');
            
            const currentInput = inputText.value;
            const currentOutput = this.currentTranslation;

            inputText.value = currentOutput;
            this.displayTranslation(currentInput);
            this.currentTranslation = currentInput;
        }

        this.updateButtonStates();
    }

    async translateText() {
        const inputText = document.getElementById('inputText').value.trim();
        const sourceLanguage = document.getElementById('sourceLanguage').value;
        const targetLanguage = document.getElementById('targetLanguage').value;

        if (!inputText || !this.apiKey || !targetLanguage) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        if (sourceLanguage === targetLanguage) {
            this.showAlert('Source and target languages cannot be the same', 'warning');
            return;
        }

        this.setTranslatingState(true);
        const startTime = Date.now();

        try {
            const translation = await this.callTranslationAPI(inputText, sourceLanguage, targetLanguage);
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(1);

            this.displayTranslation(translation);
            this.currentTranslation = translation;
            this.addToHistory(inputText, translation, sourceLanguage, targetLanguage, duration);
            this.updateTranslationTime(duration);
            this.showAlert('Translation completed successfully!', 'success');

        } catch (error) {
            console.error('Translation error:', error);
            this.displayError(error.message);
            this.showAlert(`Translation failed: ${error.message}`, 'danger');
        } finally {
            this.setTranslatingState(false);
            this.updateButtonStates();
        }
    }

    async callTranslationAPI(text, sourceLanguage, targetLanguage) {
        try {
            const response = await this.makeAPIRequest({
                input: text,
                source_language_code: sourceLanguage === 'auto' ? 'en-IN' : sourceLanguage,
                target_language_code: targetLanguage,
                speaker_gender: "Male",
                model: "mayura:v1"
            });

            // Handle different response formats
            if (response && response.translated_text) {
                return response.translated_text;
            } else if (response && response.choices && response.choices[0]) {
                return response.choices[0].message.content;
            } else if (response && response.translation) {
                return response.translation;
            } else if (response && typeof response === 'string') {
                return response;
            } else {
                throw new Error('Invalid response format from translation service');
            }
        } catch (error) {
            console.error('API call failed:', error);
            
            // Provide more specific error messages
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                throw new Error('Invalid API key. Please check your Sarvam AI API key.');
            } else if (error.message.includes('429') || error.message.includes('rate limit')) {
                throw new Error('Rate limit exceeded. Please try again in a moment.');
            } else if (error.message.includes('400') || error.message.includes('bad request')) {
                throw new Error('Invalid request. Please check your input text and selected languages.');
            } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your internet connection.');
            } else {
                throw new Error(error.message || 'Translation service is currently unavailable.');
            }
        }
    }

    async makeAPIRequest(params) {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'API-Subscription-Key': this.apiKey
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
                } catch {
                    errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network Error: Unable to connect to translation service');
            }
            throw error;
        }
    }

    getLanguageName(code) {
        const languages = {
            'auto': 'Auto-detect',
            'en-IN': 'English',
            'hi-IN': 'Hindi',
            'bn-IN': 'Bengali',
            'ta-IN': 'Tamil',
            'te-IN': 'Telugu',
            'mr-IN': 'Marathi',
            'gu-IN': 'Gujarati',
            'kn-IN': 'Kannada',
            'ml-IN': 'Malayalam',
            'pa-IN': 'Punjabi',
            'od-IN': 'Odia',
            'as-IN': 'Assamese',
            'ur-IN': 'Urdu',
            'sa-IN': 'Sanskrit',
            'ne-IN': 'Nepali',
            'ks-IN': 'Kashmiri',
            'kok-IN': 'Konkani',
            'mni-IN': 'Manipuri',
            'brx-IN': 'Bodo',
            'doi-IN': 'Dogri',
            'mai-IN': 'Maithili',
            'sat-IN': 'Santali',
            'sd-IN': 'Sindhi'
        };
        return languages[code] || code;
    }

    setTranslatingState(isTranslating) {
        const translateBtn = document.getElementById('translateBtn');
        const spinner = document.getElementById('loadingSpinner');
        const icon = document.getElementById('translateIcon');
        const text = document.getElementById('translateBtnText');
        const output = document.getElementById('translationOutput');

        if (isTranslating) {
            translateBtn.disabled = true;
            spinner.classList.remove('d-none');
            icon.classList.add('d-none');
            text.textContent = 'Translating...';
            output.classList.add('loading');
            output.innerHTML = '<div class="placeholder-text"><p class="text-muted">Translating...</p></div>';
        } else {
            translateBtn.disabled = false;
            spinner.classList.add('d-none');
            icon.classList.remove('d-none');
            text.textContent = 'Translate';
            output.classList.remove('loading');
        }
    }

    displayTranslation(translation) {
        const output = document.getElementById('translationOutput');
        output.classList.remove('loading', 'error');
        output.classList.add('has-content', 'success');
        output.textContent = translation;
    }

    displayError(errorMessage) {
        const output = document.getElementById('translationOutput');
        output.classList.remove('loading', 'has-content', 'success');
        output.classList.add('error');
        output.innerHTML = `
            <div class="placeholder-text">
                <i class="bi bi-exclamation-triangle display-4 text-danger"></i>
                <p class="text-danger mt-2">${errorMessage}</p>
            </div>
        `;
    }

    updateTranslationTime(duration) {
        const timeElement = document.getElementById('translationTime');
        timeElement.textContent = `Completed in ${duration}s`;
    }

    addToHistory(original, translated, sourceLang, targetLang, duration) {
        const historyItem = {
            id: Date.now(),
            original,
            translated,
            sourceLang,
            targetLang,
            duration,
            timestamp: new Date()
        };

        this.translationHistory.unshift(historyItem);
        
        // Keep only last 10 translations
        if (this.translationHistory.length > 10) {
            this.translationHistory = this.translationHistory.slice(0, 10);
        }

        this.renderHistory();
    }

    renderHistory() {
        const historyContainer = document.getElementById('translationHistory');
        
        if (this.translationHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-clock-history display-4"></i>
                    <p class="mt-2">No translations yet</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = this.translationHistory.map(item => `
            <div class="history-item">
                <div class="source-text">${this.escapeHtml(item.original)}</div>
                <div class="translated-text">${this.escapeHtml(item.translated)}</div>
                <div class="language-info">
                    <span>
                        ${this.getLanguageName(item.sourceLang)} → ${this.getLanguageName(item.targetLang)}
                        <small class="text-muted ms-2">${item.duration}s</small>
                    </span>
                    <button class="btn btn--outline copy-btn" onclick="translator.copyHistoryItem('${this.escapeHtml(item.translated)}')">
                        <i class="bi bi-clipboard me-1"></i>Copy
                    </button>
                </div>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    copyHistoryItem(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showAlert('Translation copied to clipboard!', 'success');
        }).catch(() => {
            this.showAlert('Failed to copy to clipboard', 'danger');
        });
    }

    clearInput() {
        document.getElementById('inputText').value = '';
        this.updateCharCount();
        this.updateButtonStates();
        document.getElementById('inputText').focus();
    }

    clearOutput() {
        const output = document.getElementById('translationOutput');
        output.classList.remove('has-content', 'success', 'error');
        output.innerHTML = `
            <div class="placeholder-text">
                <i class="bi bi-translate display-4 text-muted"></i>
                <p class="text-muted">Your translation will appear here</p>
            </div>
        `;
        this.currentTranslation = null;
        document.getElementById('translationTime').textContent = '';
        this.updateButtonStates();
    }

    copyTranslation() {
        if (!this.currentTranslation) {
            this.showAlert('No translation to copy', 'warning');
            return;
        }

        navigator.clipboard.writeText(this.currentTranslation).then(() => {
            const copyBtn = document.getElementById('copyTranslation');
            const originalHTML = copyBtn.innerHTML;
            
            copyBtn.innerHTML = '<i class="bi bi-check me-1"></i>Copied!';
            copyBtn.classList.add('btn-copied');
            
            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
                copyBtn.classList.remove('btn-copied');
            }, 2000);

            this.showAlert('Translation copied to clipboard!', 'success');
        }).catch(() => {
            this.showAlert('Failed to copy to clipboard', 'danger');
        });
    }

    showAlert(message, type) {
        const alertsContainer = document.getElementById('alertsContainer');
        const alertId = 'alert_' + Date.now();
        
        const alertHTML = `
            <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show" role="alert">
                <i class="bi bi-${this.getStatusIcon(type)} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        alertsContainer.insertAdjacentHTML('beforeend', alertHTML);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            const alert = document.getElementById(alertId);
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 5000);
    }
}

// Initialize the translator when the page loads
let translator;
document.addEventListener('DOMContentLoaded', () => {
    translator = new SarvamTranslator();
});

// Add some helpful keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus on input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('inputText').focus();
    }
    
    // Escape to clear focus
    if (e.key === 'Escape') {
        document.activeElement.blur();
    }
});
