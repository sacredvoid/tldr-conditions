// Content script for Terms Summarize Chrome Extension

// Performance monitoring class
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      scanStart: 0,
      scanEnd: 0,
      linksFound: 0,
      buttonsCreated: 0
    };
  }

  startScan() {
    this.metrics.scanStart = performance.now();
    console.log('TL;DR Conditions: Starting page scan...');
  }

  endScan(linksFound, buttonsCreated) {
    this.metrics.scanEnd = performance.now();
    this.metrics.linksFound = linksFound;
    this.metrics.buttonsCreated = buttonsCreated;
    
    const scanTime = this.metrics.scanEnd - this.metrics.scanStart;
    
    console.log(`TL;DR Conditions: Scan completed in ${scanTime.toFixed(2)}ms`);
    console.log(`TL;DR Conditions: Found ${linksFound} links, created ${buttonsCreated} buttons`);
    
    // Warn if scan took too long
    if (scanTime > 100) {
      console.warn('TL;DR Conditions: Slow scan detected! Consider optimizing.');
    }
  }
}

class TermsDetector {
  constructor() {
    this.summarizeButtons = new Map();
    this.summaryModal = null;
    this.scanTimeout = null;
    this.isScanning = false;
    this.performanceMonitor = new PerformanceMonitor();
    this.init();
  }

  init() {
    // Only run on pages that might have T&C content
    if (!this.shouldScanPage()) {
      return;
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.debouncedScan());
    } else {
      this.debouncedScan();
    }

    // Re-scan when page content changes (for SPAs) - with debouncing
    const observer = new MutationObserver(() => {
      this.debouncedScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  shouldScanPage() {
    // Only scan pages that likely have T&C content
    const url = window.location.href.toLowerCase();
    const pageText = document.body.textContent.toLowerCase();
    
    const termsKeywords = [
      'terms', 'privacy', 'agreement', 'conditions', 'policy',
      'legal', 'service', 'user', 'conditions'
    ];
    
    return termsKeywords.some(keyword => 
      url.includes(keyword) || pageText.includes(keyword)
    );
  }

  debouncedScan() {
    // Clear existing timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
    }
    
    // Debounce scanning to avoid blocking main thread
    this.scanTimeout = setTimeout(() => {
      this.scanPage();
    }, 500); // Wait 500ms after last DOM change
  }

  scanPage() {
    // Prevent multiple simultaneous scans
    if (this.isScanning) {
      return;
    }
    
    this.isScanning = true;
    this.performanceMonitor.startScan();
    
    try {
      // Remove existing buttons
      this.summarizeButtons.forEach(button => button.remove());
      this.summarizeButtons.clear();

      // Find potential T&C links with limited scope
      const links = this.findTermsLinks();
      
      // Limit number of buttons to prevent UI clutter
      const maxButtons = 5;
      const limitedLinks = links.slice(0, maxButtons);
      
      limitedLinks.forEach(link => this.addSummarizeButton(link));
      
      this.performanceMonitor.endScan(links.length, limitedLinks.length);
    } finally {
      this.isScanning = false;
    }
  }

  findTermsLinks() {
    const termsKeywords = [
      'terms of service', 'terms and conditions', 'terms of use',
      'privacy policy', 'privacy notice', 'privacy statement',
      'user agreement', 'user terms', 'service agreement',
      'legal notice', 'legal terms', 'conditions of use'
    ];

    const links = [];
    
    // Use more specific selectors to limit DOM traversal
    const linkSelectors = [
      'a[href*="terms"]',
      'a[href*="privacy"]', 
      'a[href*="agreement"]',
      'a[href*="policy"]',
      'a[href*="legal"]',
      'a[href*="conditions"]'
    ];
    
    // Get links using specific selectors first
    const candidateLinks = new Set();
    linkSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(link => candidateLinks.add(link));
      } catch (e) {
        // Ignore invalid selectors
      }
    });

    // Check each candidate link
    candidateLinks.forEach(link => {
      const text = link.textContent.toLowerCase().trim();
      const href = link.href.toLowerCase();

      // Check if link text or href contains terms-related keywords
      const isTermsLink = termsKeywords.some(keyword => 
        text.includes(keyword) || href.includes(keyword.replace(/\s+/g, ''))
      );

      if (isTermsLink && this.isValidUrl(link.href)) {
        links.push(link);
      }
    });

    return links;
  }

  isValidUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  addSummarizeButton(link) {
    // Skip if button already exists
    if (link.querySelector('.terms-summarize-btn')) return;

    const button = document.createElement('button');
    button.className = 'terms-summarize-btn';
    button.textContent = '📄 Summarize';
    button.title = 'Summarize this Terms & Conditions document';
    
    // Style the button
    Object.assign(button.style, {
      position: 'absolute',
      marginLeft: '8px',
      padding: '4px 8px',
      fontSize: '12px',
      backgroundColor: '#4285f4',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      zIndex: '10000',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      fontFamily: 'Arial, sans-serif'
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleSummarizeClick(link.href, link.textContent.trim());
    });

    // Position button next to the link
    const linkRect = link.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    button.style.position = 'absolute';
    button.style.top = `${linkRect.top + scrollTop}px`;
    button.style.left = `${linkRect.right + scrollLeft + 8}px`;

    document.body.appendChild(button);
    this.summarizeButtons.set(link, button);
  }

  async handleSummarizeClick(url, linkText) {
    try {
      // Show loading state
      this.showSummaryModal('Loading summary...', true);

      // Send request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'summarize',
        url: url,
        linkText: linkText
      });

      if (response.success) {
        this.showSummaryModal(response.summary, false, url);
      } else {
        this.showSummaryModal(`Error: ${response.error}`, false);
      }
    } catch (error) {
      this.showSummaryModal(`Error: ${error.message}`, false);
    }
  }

  showSummaryModal(content, isLoading = false, originalUrl = null) {
    // Remove existing modal
    if (this.summaryModal) {
      this.summaryModal.remove();
    }

    // Create modal
    this.summaryModal = document.createElement('div');
    this.summaryModal.className = 'terms-summary-modal';
    this.summaryModal.innerHTML = `
      <div class="terms-summary-content">
        <div class="terms-summary-header">
          <h3>📄 Terms Summary</h3>
          <button class="terms-summary-close">&times;</button>
        </div>
        <div class="terms-summary-body">
          ${isLoading ? '<div class="loading">⏳ Analyzing document...</div>' : content}
        </div>
        <div class="terms-summary-footer">
          ${originalUrl ? `<a href="${originalUrl}" target="_blank" class="read-original">Read Original</a>` : ''}
          <button class="copy-summary">Copy Summary</button>
          <button class="close-summary">Close</button>
        </div>
      </div>
    `;

    // Add event listeners
    this.summaryModal.querySelector('.terms-summary-close').addEventListener('click', () => this.hideSummaryModal());
    this.summaryModal.querySelector('.close-summary').addEventListener('click', () => this.hideSummaryModal());
    this.summaryModal.querySelector('.copy-summary').addEventListener('click', () => this.copySummary());
    
    // Close on backdrop click
    this.summaryModal.addEventListener('click', (e) => {
      if (e.target === this.summaryModal) {
        this.hideSummaryModal();
      }
    });

    document.body.appendChild(this.summaryModal);
  }

  hideSummaryModal() {
    if (this.summaryModal) {
      this.summaryModal.remove();
      this.summaryModal = null;
    }
  }

  async copySummary() {
    const summaryText = this.summaryModal.querySelector('.terms-summary-body').textContent;
    try {
      await navigator.clipboard.writeText(summaryText);
      // Show brief success message
      const copyBtn = this.summaryModal.querySelector('.copy-summary');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy summary:', error);
    }
  }
}

// Initialize the detector
new TermsDetector();
