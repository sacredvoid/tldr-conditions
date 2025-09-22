// Background service worker for Terms Summarize Chrome Extension

class TermsSummarizeAPI {
  constructor() {
    this.apiKey = null;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions'; // Default to OpenAI
    this.init();
  }

  async init() {
    // Load saved settings
    const settings = await chrome.storage.sync.get(['apiKey', 'apiUrl']);
    this.apiKey = settings.apiKey;
    if (settings.apiUrl) {
      this.apiUrl = settings.apiUrl;
    }
  }

  async summarize(url, linkText) {
    try {
      // Check if we have an API key
      if (!this.apiKey) {
        throw new Error('API key not configured. Please set your API key in the extension popup.');
      }

      // For MVP, we'll use a simple text-based approach
      // In production, you'd fetch the actual content from the URL
      const summary = await this.generateSummary(url, linkText);
      
      return {
        success: true,
        summary: summary
      };
    } catch (error) {
      console.error('Summarization error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateSummary(url, linkText) {
    // This is a simplified version for MVP
    // In production, you'd:
    // 1. Fetch the actual content from the URL
    // 2. Parse and clean the HTML
    // 3. Send to your backend API or directly to an LLM
    
    const prompt = `Please provide a brief summary of what users should know about this ${linkText} document from ${url}. 
    Focus on key points like data collection, user rights, service limitations, and important obligations. 
    Format as a structured summary with clear sections.`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that summarizes legal documents in a clear, user-friendly way. Focus on the most important points that users need to know.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment before trying again, or check your API usage limits.');
        } else if (response.status === 401) {
          throw new Error('Invalid API key. Please check your API key in the extension settings.');
        } else if (response.status === 403) {
          throw new Error('API access forbidden. Please check your API key permissions.');
        } else {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      return this.formatSummary(data.choices[0].message.content, linkText, url);
    } catch (error) {
      // Fallback to a mock summary for demo purposes
      return this.getMockSummary(linkText, url);
    }
  }

  formatSummary(content, linkText, url) {
    // Clean and format the AI response
    const cleanContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    return `
      <div class="summary-header">
        <div class="document-icon">📄</div>
        <div class="document-info">
          <h3>${linkText}</h3>
          <p class="source-link">
            <span class="source-label">Source:</span>
            <a href="${url}" target="_blank" class="source-url">${url}</a>
          </p>
        </div>
      </div>
      
      <div class="summary-content">
        <h4 class="section-title">
          <span class="section-icon">📝</span>
          Summary
        </h4>
        <div class="summary-text">${cleanContent}</div>
      </div>
      
      <div class="summary-footer">
        <h4 class="section-title">
          <span class="section-icon">⚠️</span>
          Important Notes
        </h4>
        <div class="notes-list">
          <div class="note-item">
            <span class="note-icon">🤖</span>
            <span class="note-text">This is an AI-generated summary and should not replace reading the full document</span>
          </div>
          <div class="note-item">
            <span class="note-icon">⏰</span>
            <span class="note-text">Legal terms may have changed since this summary was generated</span>
          </div>
          <div class="note-item">
            <span class="note-icon">⚖️</span>
            <span class="note-text">Consult with a legal professional for important decisions</span>
          </div>
        </div>
      </div>
    `;
  }

  getMockSummary(linkText, url) {
    // Mock summary for demo purposes when API is not available
    return `
      <div class="summary-header">
        <div class="document-icon">📄</div>
        <div class="document-info">
          <h3>${linkText}</h3>
          <p class="source-link">
            <span class="source-label">Source:</span>
            <a href="${url}" target="_blank" class="source-url">${url}</a>
          </p>
        </div>
      </div>
      
      <div class="summary-content">
        <h4 class="section-title">
          <span class="section-icon">📝</span>
          Summary
        </h4>
        <div class="summary-text">
          <p>This appears to be a <strong>${linkText.toLowerCase()}</strong> document. Key points typically include:</p>
          
          <h4 style="color: #1a73e8; margin: 16px 0 8px 0; font-size: 14px;">🔍 What This Document Covers</h4>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>User rights and responsibilities</li>
            <li>Data collection and privacy practices</li>
            <li>Service limitations and availability</li>
            <li>Dispute resolution procedures</li>
            <li>Contact information for legal matters</li>
          </ul>
        </div>
      </div>
      
      <div class="summary-footer">
        <h4 class="section-title">
          <span class="section-icon">⚠️</span>
          Important Notes
        </h4>
        <div class="notes-list">
          <div class="note-item">
            <span class="note-icon">🤖</span>
            <span class="note-text">This is a demo summary - configure your API key for real analysis</span>
          </div>
          <div class="note-item">
            <span class="note-icon">📖</span>
            <span class="note-text">Always read the full document for complete understanding</span>
          </div>
          <div class="note-item">
            <span class="note-icon">⏰</span>
            <span class="note-text">Legal terms may change over time</span>
          </div>
        </div>
      </div>
    `;
  }

  async updateSettings(apiKey, apiUrl) {
    this.apiKey = apiKey;
    if (apiUrl) {
      this.apiUrl = apiUrl;
    }
    
    await chrome.storage.sync.set({
      apiKey: apiKey,
      apiUrl: apiUrl || this.apiUrl
    });
  }
}

// Initialize the API handler
const apiHandler = new TermsSummarizeAPI();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'summarize') {
    apiHandler.summarize(request.url, request.linkText)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'updateSettings') {
    apiHandler.updateSettings(request.apiKey, request.apiUrl)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['apiKey', 'apiUrl'])
      .then(settings => sendResponse({ success: true, settings }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      apiKey: '',
      apiUrl: 'https://api.openai.com/v1/chat/completions'
    });
  }
});
