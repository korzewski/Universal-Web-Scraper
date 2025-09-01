#!/usr/bin/env node

import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { Scraper } from './src/lib/scraper.js';
import { CsvHandler } from './src/lib/csvHandler.js';
import { Validator } from './src/lib/validator.js';

class UniversalScraper {
  constructor() {
    this.config = {
      urlsPath: process.env.URLS_PATH || './data/input-urls.csv',
      schemaPath: process.env.SCHEMA_PATH || './data/input-schema.json',
      dataDir: process.env.DATA_DIR || './data',
      debug: process.env.DEBUG === 'true',
      verboseLogging: process.env.VERBOSE_LOGGING === 'true'
    };

    this.scraper = null;
    this.csvHandler = new CsvHandler();
    this.validator = new Validator();
    this.schema = null;
  }

  async run() {
    console.log('🚀 Universal Web Scraper Starting...\n');
    
    try {
      await this.validateEnvironment();
      this.schema = await this.loadSchema();
      const urls = await this.loadUrls();
      
      await this.initializeScraper();
      const results = await this.scrapeData(urls, this.schema);
      await this.saveResults(results);
      
      console.log('\n✅ Scraping completed successfully!');
      
    } catch (error) {
      console.error(`\n❌ Scraping failed: ${error.message}`);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    const requiredFiles = [
      { path: this.config.urlsPath, name: 'URLs file' },
      { path: this.config.schemaPath, name: 'Schema file' }
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file.path)) {
        throw new Error(`${file.name} not found: ${file.path}`);
      }
    }

    if (!this.validator.validateOutputPath(this.config.dataDir)) {
      throw new Error(`Cannot create data directory: ${this.config.dataDir}`);
    }

    console.log('✅ Environment validation passed\n');
  }

  async loadSchema() {
    console.log('📋 Loading and validating schema...');
    const schema = await this.validator.validateSchema(this.config.schemaPath);
    console.log(`✅ Schema loaded with ${schema.columns.length} columns\n`);
    return schema;
  }

  async loadUrls() {
    console.log('🔗 Loading URLs...');
    
    await this.csvHandler.validateCsvStructure(this.config.urlsPath, ['url']);
    const urls = await this.csvHandler.readUrls(this.config.urlsPath);
    
    if (urls.length === 0) {
      throw new Error('No valid URLs found in the CSV file');
    }

    const urlValidation = this.validator.validateUrls(urls);
    
    if (urlValidation.invalid.length > 0) {
      console.log('⚠️  Invalid URLs found:');
      urlValidation.invalid.forEach(invalid => {
        console.log(`   Line ${invalid.index}: ${invalid.url} - ${invalid.error}`);
      });
    }

    console.log(`✅ Loaded ${urlValidation.valid.length} valid URLs\n`);
    return urlValidation.valid;
  }

  async initializeScraper() {
    console.log('🌐 Initializing scraper...');
    
    const config = this.schema.config || {};
    const scraperConfig = config.scraper || {};
    const browserConfig = config.browser || {};
    
    this.scraper = new Scraper({
      headless: browserConfig.headless !== false,
      timeout: scraperConfig.timeout || 30000,
      delay: scraperConfig.delay || 1000,
      maxRetries: scraperConfig.maxRetries || 3,
      retryDelay: scraperConfig.retryDelay || 2000,
      debug: this.config.debug,
      userAgent: scraperConfig.userAgent,
      viewport: browserConfig.viewport || { width: 1920, height: 1080 },
      blockResources: browserConfig.blockResources || ['image', 'font', 'media']
    });

    await this.scraper.initialize();
    console.log('');
  }

  async scrapeData(urls, schema) {
    console.log('🕷️  Starting data extraction...\n');
    
    const startTime = Date.now();
    const results = await this.scraper.scrapeUrls(urls, schema);
    const endTime = Date.now();
    
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`\n⏱️  Scraping completed in ${duration} seconds`);
    
    return results;
  }

  async saveResults(results) {
    console.log('\n💾 Saving results...');
    
    if (results.length === 0) {
      console.log('⚠️  No results to save');
      return;
    }

    const validation = this.validator.validateScrapedData(results, this.schema);
    this.validator.logValidationResults(validation);

    const outputConfig = this.schema.config?.output || {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = outputConfig.filename || 'scraped-data';
    const includeTimestamp = outputConfig.includeTimestamp !== false;
    
    const filename = includeTimestamp ? 
      `output-${baseFilename}_${timestamp}.csv` : 
      `output-${baseFilename}.csv`;
    
    const outputPath = path.join(this.config.dataDir, filename);

    if (outputConfig.createBackup && fs.existsSync(outputPath)) {
      this.csvHandler.createBackup(outputPath);
    }

    await this.csvHandler.writeResults(results, outputPath, this.schema.columns);
    this.csvHandler.logStats(results);

    if (validation.invalid.length > 0) {
      const invalidFilename = includeTimestamp ? 
        `output-${baseFilename}_invalid_${timestamp}.csv` : 
        `output-${baseFilename}_invalid.csv`;
      const invalidPath = path.join(this.config.dataDir, invalidFilename);
      await this.csvHandler.writeResults(validation.invalid, invalidPath, this.schema.columns);
      console.log(`📋 Invalid records saved to: ${invalidFilename}`);
    }

    console.log(`📁 Results saved to: ${filename}`);
  }

  async cleanup() {
    if (this.scraper) {
      await this.scraper.close();
    }
  }

  static async validateCommand(command, args) {
    switch (command) {
      case 'test-schema':
        return await UniversalScraper.testSchema(args[0]);
      case 'test-urls':
        return await UniversalScraper.testUrls(args[0]);
      case 'test-selectors':
        return await UniversalScraper.testSelectors(args[0], args[1]);
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  static async testSchema(schemaPath = './data/input-schema.json') {
    console.log(`🧪 Testing schema: ${schemaPath}`);
    const validator = new Validator();
    const schema = await validator.validateSchema(schemaPath);
    console.log(`✅ Schema is valid with ${schema.columns.length} columns`);
    
    console.log('\n📋 Columns:');
    schema.columns.forEach(col => {
      console.log(`   ${col.name}: ${col.selector} (${col.attribute})`);
    });

    if (schema.config) {
      console.log('\n⚙️  Configuration:');
      console.log(`   Scraper delay: ${schema.config.scraper?.delay || 1000}ms`);
      console.log(`   Browser headless: ${schema.config.browser?.headless !== false}`);
      console.log(`   Max retries: ${schema.config.scraper?.maxRetries || 3}`);
    }
  }

  static async testUrls(urlsPath = './data/input-urls.csv') {
    console.log(`🧪 Testing URLs: ${urlsPath}`);
    const csvHandler = new CsvHandler();
    const validator = new Validator();
    
    const urls = await csvHandler.readUrls(urlsPath);
    const validation = validator.validateUrls(urls);
    
    console.log(`✅ Found ${validation.valid.length} valid URLs`);
    if (validation.invalid.length > 0) {
      console.log(`❌ Found ${validation.invalid.length} invalid URLs`);
    }
  }

  static async testSelectors(url, schemaPath = './data/input-schema.json') {
    console.log(`🧪 Testing selectors on: ${url}`);
    
    const validator = new Validator();
    const schema = await validator.validateSchema(schemaPath);
    
    const config = schema.config || {};
    const scraperConfig = config.scraper || {};
    const browserConfig = config.browser || {};
    
    const scraper = new Scraper({ 
      headless: browserConfig.headless !== false, 
      debug: true,
      timeout: scraperConfig.timeout || 30000,
      blockResources: browserConfig.blockResources || ['image', 'font', 'media']
    });
    
    await scraper.initialize();
    
    try {
      const selectors = {};
      schema.columns.forEach(col => {
        if (col.selector) {
          selectors[col.name] = Array.isArray(col.selector) ? col.selector[0] : col.selector;
        }
      });
      
      const results = await scraper.testSelectors(url, selectors);
      
      console.log('\n📊 Selector test results:');
      Object.entries(results).forEach(([name, result]) => {
        if (result.error) {
          console.log(`   ❌ ${name}: ${result.error}`);
        } else {
          console.log(`   ✅ ${name}: ${result.found} elements found`);
          if (result.first_text) {
            console.log(`      Text: "${result.first_text}"`);
          }
        }
      });
      
    } finally {
      await scraper.close();
    }
  }

  static showHelp() {
    console.log(`
🕷️  Universal Web Scraper

Usage:
  node index.js                    Run the scraper
  node index.js test-schema        Test schema validation
  node index.js test-urls          Test URLs validation  
  node index.js test-selectors <url>   Test selectors on a URL

File Structure:
  data/
    ├── input-urls.csv             URLs to scrape
    ├── input-schema.json          Column definitions and configuration
    ├── output-scraped-data.csv    Generated results
    └── output-invalid-data.csv    Failed records (if any)

Environment variables (.env):
  API_KEY               API key for integrations
  SITE_ID               Site ID for integrations
  COLLECTION_ID         Collection ID for integrations
  DEBUG                  Enable debug logging (default: false)

Examples:
  npm start
  node index.js test-schema
  node index.js test-selectors https://example.com/products/laptop

Note: All configuration is now in the input-schema.json file.
`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'help' || command === '--help' || command === '-h') {
    UniversalScraper.showHelp();
    return;
  }

  if (command && command.startsWith('test-')) {
    try {
      await UniversalScraper.validateCommand(command, args.slice(1));
    } catch (error) {
      console.error(`❌ Command failed: ${error.message}`);
      process.exit(1);
    }
    return;
  }

  const scraper = new UniversalScraper();
  await scraper.run();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}