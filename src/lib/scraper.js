import { chromium } from 'playwright';
import * as cheerio from 'cheerio';

export class Scraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless !== false,
      timeout: options.timeout || 30000,
      delay: options.delay || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 2000,
      userAgent: options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      viewport: options.viewport || { width: 1920, height: 1080 },
      blockResources: options.blockResources || ['image', 'font', 'media'],
      debug: options.debug || false
    };
    
    this.browser = null;
    this.context = null;
  }

  async initialize() {
    try {
      this.log('🚀 Initializing browser...');
      
      this.browser = await chromium.launch({
        headless: this.options.headless,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });

      this.context = await this.browser.newContext({
        userAgent: this.options.userAgent,
        viewport: this.options.viewport,
        ignoreHTTPSErrors: true
      });

      if (this.options.blockResources.length > 0) {
        await this.context.route('**/*', (route) => {
          const resourceType = route.request().resourceType();
          if (this.options.blockResources.includes(resourceType)) {
            return route.abort();
          }
          return route.continue();
        });
      }

      this.log('✅ Browser initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error.message}`);
    }
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.log('🔚 Browser closed');
      }
    } catch (error) {
      this.log(`Error closing browser: ${error.message}`);
    }
  }

  async scrapeUrls(urls, schema) {
    if (!this.context) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    const results = [];
    const totalUrls = urls.length;

    this.log(`🎯 Starting to scrape ${totalUrls} URLs...`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const progress = `[${i + 1}/${totalUrls}]`;
      
      this.log(`${progress} Processing: ${url}`);

      try {
        const data = await this.scrapeWithRetry(url, schema);
        results.push(data);
        this.log(`${progress} ✅ Success`);
      } catch (error) {
        this.log(`${progress} ❌ Failed: ${error.message}`);
        results.push({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      if (i < urls.length - 1) {
        await this.delay(this.options.delay);
      }
    }

    return results;
  }

  async scrapeWithRetry(url, schema, attempt = 1) {
    try {
      return await this.scrapePage(url, schema);
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        this.log(`🔄 Retry ${attempt}/${this.options.maxRetries} for ${url}`);
        await this.delay(this.options.retryDelay * attempt);
        return await this.scrapeWithRetry(url, schema, attempt + 1);
      }
      throw error;
    }
  }

  async scrapePage(url, schema) {
    const page = await this.context.newPage();
    
    try {
      page.setDefaultTimeout(this.options.timeout);
      
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeout 
      });

      if (schema.pageSettings?.waitForSelector) {
        await page.waitForSelector(schema.pageSettings.waitForSelector, {
          timeout: schema.pageSettings.waitTimeout || 10000
        });
      }

      if (schema.pageSettings?.removeScripts) {
        await page.evaluate(() => {
          document.querySelectorAll('script').forEach(script => script.remove());
        });
      }

      const html = await page.content();
      const $ = cheerio.load(html);
      
      const result = { url, timestamp: new Date().toISOString() };

      for (const column of schema.columns) {
        try {
          const value = await this.extractData($, column, url);
          result[column.name] = value;
        } catch (extractError) {
          this.log(`⚠️  Failed to extract ${column.name}: ${extractError.message}`);
          result[column.name] = column.default || '';
        }
      }

      if (schema.pageSettings?.screenshot) {
        const screenshotPath = `data/screenshots/${this.sanitizeFilename(url)}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        result.screenshot_path = screenshotPath;
      }

      return result;

    } catch (error) {
      throw new Error(`Page scraping failed: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  async extractData($, column, url) {
    if (column.attribute === 'url') {
      const value = column.transform ? this.transformValue(url, column.transform) : url;
      return value;
    }

    if (!column.selector || column.selector === null) {
      return column.default || '';
    }

    const selectors = Array.isArray(column.selector) ? column.selector : [column.selector];
    
    for (const selector of selectors) {
      try {
        const elements = $(selector);
        
        if (elements.length === 0) {
          continue;
        }

        let value = '';
        
        switch (column.attribute) {
          case 'text':
          case 'innerText':
            value = elements.first().text().trim();
            break;
            
          case 'html':
          case 'innerHTML':
            value = elements.first().html();
            break;
            
          case 'outerHTML':
            value = $.html(elements.first());
            break;
            
          case 'href':
            value = elements.first().attr('href');
            break;
            
          case 'src':
            value = elements.first().attr('src');
            if (value && !value.startsWith('http')) {
              value = new URL(value, url).href;
            }
            break;
            
          case 'content':
            value = elements.first().attr('content');
            break;
            
          default:
            if (column.attribute.startsWith('data-')) {
              value = elements.first().attr(column.attribute);
            } else {
              value = elements.first().attr(column.attribute);
            }
        }

        if (value !== undefined && value !== null && value !== '') {
          value = this.transformValue(value, column.transform);
          return value;
        }
        
      } catch (selectorError) {
        this.log(`⚠️  Selector error for ${column.name} with "${selector}": ${selectorError.message}`);
        continue;
      }
    }

    return column.default || '';
  }

  transformValue(value, transform) {
    if (!transform || typeof value !== 'string') {
      return value;
    }

    switch (transform) {
      case 'trim':
        return value.trim();
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'number':
        const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? value : num;
      case 'slugFromUrl':
        try {
          const url = new URL(value);
          return url.pathname.replace(/^\//, '').replace(/\/$/, '');
        } catch {
          return value.replace(/^\//, '').replace(/\/$/, '') || value;
        }
      default:
        return value;
    }
  }

  sanitizeFilename(url) {
    return url
      .replace(/https?:\/\//, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 100);
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message) {
    if (this.options.debug || process.env.DEBUG === 'true') {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] ${message}`);
    } else if (!message.startsWith('⚠️') && !message.startsWith('🔄')) {
      console.log(message);
    }
  }

  async getPageInfo(url) {
    if (!this.context) {
      throw new Error('Browser not initialized');
    }

    const page = await this.context.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      const info = await page.evaluate(() => ({
        title: document.title,
        url: document.URL,
        statusCode: 200,
        loadTime: performance.now()
      }));

      return info;
    } catch (error) {
      return {
        url,
        error: error.message,
        statusCode: 0
      };
    } finally {
      await page.close();
    }
  }

  async testSelectors(url, selectors) {
    if (!this.context) {
      throw new Error('Browser not initialized');
    }

    const page = await this.context.newPage();
    const results = {};
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const html = await page.content();
      const $ = cheerio.load(html);

      for (const [name, selector] of Object.entries(selectors)) {
        try {
          const elements = $(selector);
          results[name] = {
            found: elements.length,
            first_text: elements.first().text().trim().substring(0, 100),
            selector
          };
        } catch (error) {
          results[name] = {
            error: error.message,
            selector
          };
        }
      }
      
      return results;
    } finally {
      await page.close();
    }
  }
}