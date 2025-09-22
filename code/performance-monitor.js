// Performance monitoring for Terms Summarize Extension
// Add this to content.js for debugging

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      scanStart: 0,
      scanEnd: 0,
      linksFound: 0,
      buttonsCreated: 0,
      domQueries: 0
    };
    this.init();
  }

  init() {
    // Monitor performance
    this.observePerformance();
  }

  observePerformance() {
    // Override console methods to track performance
    const originalLog = console.log;
    console.log = (...args) => {
      if (args[0] && args[0].includes('Terms Summarize')) {
        this.logPerformance(args[0]);
      }
      originalLog.apply(console, args);
    };
  }

  startScan() {
    this.metrics.scanStart = performance.now();
    console.log('Terms Summarize: Starting page scan...');
  }

  endScan(linksFound, buttonsCreated) {
    this.metrics.scanEnd = performance.now();
    this.metrics.linksFound = linksFound;
    this.metrics.buttonsCreated = buttonsCreated;
    
    const scanTime = this.metrics.scanEnd - this.metrics.scanStart;
    
    console.log(`Terms Summarize: Scan completed in ${scanTime.toFixed(2)}ms`);
    console.log(`Terms Summarize: Found ${linksFound} links, created ${buttonsCreated} buttons`);
    
    // Warn if scan took too long
    if (scanTime > 100) {
      console.warn('Terms Summarize: Slow scan detected! Consider optimizing.');
    }
  }

  logPerformance(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  getMetrics() {
    return {
      ...this.metrics,
      scanDuration: this.metrics.scanEnd - this.metrics.scanStart
    };
  }
}

// Export for use in content.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PerformanceMonitor;
} else {
  window.PerformanceMonitor = PerformanceMonitor;
}
