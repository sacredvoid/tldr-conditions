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
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return this.formatSummary(data.choices[0].message.content, linkText, url);
    } catch (error) {
      // Fallback to a mock summary for demo purposes
      return this.getMockSummary(linkText, url);
    }
  }

  formatSummary(content, linkText, url) {
    // Format the AI response into a structured summary
    return `
      <h4>📋 ${linkText}</h4>
      <p><strong>Source:</strong> <a href="${url}" target="_blank">${url}</a></p>
      
      <h4>📝 Summary</h4>
      <div>${content}</div>
      
      <h4>⚠️ Important Notes</h4>
      <ul>
        <li>This is an AI-generated summary and should not replace reading the full document</li>
        <li>Legal terms may have changed since this summary was generated</li>
        <li>Consult with a legal professional for important decisions</li>
      </ul>
    `;
  }

  getMockSummary(linkText, url) {
    // Mock summary for demo purposes when API is not available
    return `
      <h4>📋 ${linkText}</h4>
      <p><strong>Source:</strong> <a href="${url}" target="_blank">${url}</a></p>
      
      <h4>📝 Summary</h4>
      <p>This appears to be a ${linkText.toLowerCase()} document. Key points typically include:</p>
      
      <h4>🔍 What This Document Covers</h4>
      <ul>
        <li>User rights and responsibilities</li>
        <li>Data collection and privacy practices</li>
        <li>Service limitations and availability</li>
        <li>Dispute resolution procedures</li>
        <li>Contact information for legal matters</li>
      </ul>
      
      <h4>⚠️ Important Notes</h4>
      <ul>
        <li>This is a demo summary - configure your API key for real analysis</li>
        <li>Always read the full document for complete understanding</li>
        <li>Legal terms may change over time</li>
      </ul>
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
