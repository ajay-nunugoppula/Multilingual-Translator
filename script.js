class SarvamTranslator {
    constructor() {
        this.apiKey = null;
        this.translationHistory = [];
        this.currentTranslation = null;
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
        // Since we don't have access to the actual Sarvam AI SDK, 
        // we'll simulate the API call structure as described
        try {
            // Simulating the SDK structure provided in the user query
            const response = await this.makeAPIRequest({
                input: text,
                source_language_code: sourceLanguage === 'auto' ? 'en-IN' : sourceLanguage,
                target_language_code: targetLanguage,
                speaker_gender: "Male"
            });

            if (response && response.translated_text) {
                return response.translated_text;
            } else if (response && response.choices && response.choices[0]) {
                return response.choices[0].message.content;
            } else {
                throw new Error('Invalid response format from translation service');
            }
        } catch (error) {
            console.error('API call failed:', error);
            throw new Error('Translation service is currently unavailable. Please check your API key and try again.');
        }
    }

    async makeAPIRequest(params) {
        // This would be the actual API call to Sarvam AI
        // For now, we'll create a mock response to demonstrate functionality
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Mock translation responses for demonstration
                const mockTranslations = {
                    'Hello, how are you?': {
                        'hi-IN': 'नमस्ते, आप कैसे हैं?',
                        'ta-IN': 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?',
                        'te-IN': 'నమస్కారం, మీరు ఎలా ఉన్నారు?',
                        'bn-IN': 'হ্যালো, আপনি কেমন আছেন?'
                    },
                    'Good morning': {
                        'hi-IN': 'शुभ प्रभात',
                        'ta-IN': 'காலை வணக्கम்',
                        'te-IN': 'శుభోదయం',
                        'bn-IN': 'সুপ্রভাত'
                    }
                };

                // Check if we have a mock translation
                const mockResult = mockTranslations[params.input];
                if (mockResult && mockResult[params.target_language_code]) {
                    resolve({
                        translated_text: mockResult[params.target_language_code]
                    });
                } else {
                    // Generate a mock translation for demonstration
                    resolve({
                        translated_text: `[Translated to ${this.getLanguageName(params.target_language_code)}] ${params.input}`
                    });
                }
            }, 1000 + Math.random() * 2000); // Simulate API delay
        });
    }

    getLanguageName(code) {
        const languages = {
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
                <div class="source-text">${item.original}</div>
                <div class="translated-text">${item.translated}</div>
                <div class="language-info">
                    <span>
                        ${this.getLanguageName(item.sourceLang)} → ${this.getLanguageName(item.targetLang)}
                        <small class="text-muted ms-2">${item.duration}s</small>
                    </span>
                    <button class="btn btn--outline copy-btn" onclick="translator.copyHistoryItem('${item.translated}')">
                        <i class="bi bi-clipboard me-1"></i>Copy
                    </button>
                </div>
            </div>
        `).join('');
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
