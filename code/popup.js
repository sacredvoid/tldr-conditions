// Popup script for Terms Summarize Chrome Extension

class SettingsManager {
  constructor() {
    this.init();
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI based on provider selection
    this.updateProviderUI();
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSettings' });
      if (response.success) {
        const settings = response.settings;
        
        // Set API key
        if (settings.apiKey) {
          document.getElementById('apiKey').value = settings.apiKey;
        }
        
        // Set API URL
        if (settings.apiUrl) {
          document.getElementById('apiUrl').value = settings.apiUrl;
        }
        
        // Determine provider based on URL
        if (settings.apiUrl && !settings.apiUrl.includes('openai.com')) {
          document.getElementById('custom').checked = true;
        } else {
          document.getElementById('openai').checked = true;
        }
      }
    } catch (error) {
      this.showStatus('Error loading settings: ' + error.message, 'error');
    }
  }

  setupEventListeners() {
    // Provider selection
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
      radio.addEventListener('change', () => this.updateProviderUI());
    });

    // Provider option clicks
    document.querySelectorAll('.provider-option').forEach(option => {
      option.addEventListener('click', () => {
        const radio = option.querySelector('input[type="radio"]');
        radio.checked = true;
        this.updateProviderUI();
      });
    });

    // Save button
    document.getElementById('saveBtn').addEventListener('click', () => this.saveSettings());

    // Test button
    document.getElementById('testBtn').addEventListener('click', () => this.testAPI());

    // Help link
    document.getElementById('helpLink').addEventListener('click', (e) => {
      e.preventDefault();
      this.showHelp();
    });
  }

  updateProviderUI() {
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
    const apiUrlGroup = document.getElementById('apiUrlGroup');
    const apiUrlInput = document.getElementById('apiUrl');
    
    if (selectedProvider === 'openai') {
      apiUrlGroup.style.display = 'none';
      apiUrlInput.value = 'https://api.openai.com/v1/chat/completions';
    } else {
      apiUrlGroup.style.display = 'block';
      if (!apiUrlInput.value || apiUrlInput.value.includes('openai.com')) {
        apiUrlInput.value = '';
        apiUrlInput.placeholder = 'https://your-api.com/v1/summarize';
      }
    }
  }

  async saveSettings() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;

    // Validation
    if (!apiKey) {
      this.showStatus('Please enter an API key', 'error');
      return;
    }

    if (selectedProvider === 'custom' && !apiUrl) {
      this.showStatus('Please enter a custom API URL', 'error');
      return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveBtn');
    const originalText = saveBtn.querySelector('.btn-text').textContent;
    saveBtn.querySelector('.btn-text').innerHTML = '<span class="loading"></span>Saving...';
    saveBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'updateSettings',
        apiKey: apiKey,
        apiUrl: selectedProvider === 'openai' ? 'https://api.openai.com/v1/chat/completions' : apiUrl
      });

      if (response.success) {
        this.showStatus('Settings saved successfully!', 'success');
      } else {
        this.showStatus('Error saving settings: ' + response.error, 'error');
      }
    } catch (error) {
      this.showStatus('Error saving settings: ' + error.message, 'error');
    } finally {
      // Reset button state
      saveBtn.querySelector('.btn-text').textContent = originalText;
      saveBtn.disabled = false;
    }
  }

  async testAPI() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const apiUrl = document.getElementById('apiUrl').value.trim();
    const selectedProvider = document.querySelector('input[name="provider"]:checked').value;

    if (!apiKey) {
      this.showStatus('Please enter an API key first', 'error');
      return;
    }

    // Show loading state
    const testBtn = document.getElementById('testBtn');
    const originalText = testBtn.textContent;
    testBtn.innerHTML = '<span class="loading"></span>Testing...';
    testBtn.disabled = true;

    try {
      // Test with a simple request
      const testUrl = selectedProvider === 'openai' ? 
        'https://api.openai.com/v1/chat/completions' : apiUrl;
      
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 5
        })
      });

      if (response.ok) {
        this.showStatus('✅ API connection successful!', 'success');
      } else {
        let errorMessage = `❌ API test failed: ${response.status} ${response.statusText}`;
        if (response.status === 429) {
          errorMessage = '❌ Rate limit exceeded. Please wait a moment and try again.';
        } else if (response.status === 401) {
          errorMessage = '❌ Invalid API key. Please check your API key.';
        } else if (response.status === 403) {
          errorMessage = '❌ API access forbidden. Please check your API key permissions.';
        }
        this.showStatus(errorMessage, 'error');
      }
    } catch (error) {
      this.showStatus(`❌ API test failed: ${error.message}`, 'error');
    } finally {
      // Reset button state
      testBtn.textContent = originalText;
      testBtn.disabled = false;
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');

    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        statusEl.classList.add('hidden');
      }, 3000);
    }
  }

  showHelp() {
    const helpContent = `
TL;DR Conditions - Help

Getting Started:
1. Get an API key from OpenAI (openai.com) or your preferred AI provider
2. Paste the key in the settings above
3. Save your settings
4. Visit any website with Terms & Conditions
5. Look for blue "📄 Summarize" buttons next to T&C links
6. Click to get instant AI-powered summaries!

Supported Document Types:
- Terms of Service
- Privacy Policy
- User Agreements
- Legal Notices
- Terms and Conditions

Features:
- AI-powered summarization
- Key points extraction
- Mobile-friendly interface
- Copy/share functionality
- Privacy-focused (API key stored locally)

Troubleshooting:
- Make sure your API key is valid
- Check your internet connection
- Try refreshing the page if buttons don't appear
- Contact support if issues persist
    `;
    
    alert(helpContent);
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});
