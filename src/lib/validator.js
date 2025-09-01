import Joi from 'joi';
import fs from 'fs';

export class Validator {
  constructor() {
    this.schemaValidationSchema = this.createSchemaValidationSchema();
  }

  createSchemaValidationSchema() {
    const columnSchema = Joi.object({
      name: Joi.string().required().pattern(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
      selector: Joi.alternatives().try(
        Joi.string().allow(null),
        Joi.array().items(Joi.string())
      ).allow(null),
      attribute: Joi.string().valid(
        'text', 'html', 'innerText', 'innerHTML', 'outerHTML',
        'href', 'src', 'alt', 'title', 'value', 'content',
        'data-*', 'url'
      ).required(),
      required: Joi.boolean().default(false),
      description: Joi.string().optional(),
      default: Joi.string().optional(),
      transform: Joi.string().pattern(/^(\w+(?:\([^)]*\))?)(\s*,\s*(\w+(?:\([^)]*\))?))*$/).optional()
    });

    const configSchema = Joi.object({
      scraper: Joi.object({
        delay: Joi.number().min(0).default(1000),
        timeout: Joi.number().min(1000).max(120000).default(30000),
        maxRetries: Joi.number().min(0).max(10).default(3),
        retryDelay: Joi.number().min(0).default(2000),
        userAgent: Joi.string().optional()
      }).optional(),
      browser: Joi.object({
        headless: Joi.boolean().default(true),
        viewport: Joi.object({
          width: Joi.number().min(100).max(4000).default(1920),
          height: Joi.number().min(100).max(4000).default(1080)
        }).optional(),
        blockResources: Joi.array().items(
          Joi.string().valid('image', 'font', 'media', 'stylesheet', 'script')
        ).default(['image', 'font', 'media'])
      }).optional(),
      output: Joi.object({
        filename: Joi.string().default('scraped-data'),
        format: Joi.string().valid('csv').default('csv'),
        includeTimestamp: Joi.boolean().default(true),
        createBackup: Joi.boolean().default(true)
      }).optional()
    }).optional();

    const pageSettingsSchema = Joi.object({
      waitForSelector: Joi.string().optional(),
      waitTimeout: Joi.number().min(1000).max(60000).default(10000),
      screenshot: Joi.boolean().default(false),
      removeScripts: Joi.boolean().default(true)
    }).optional();

    return Joi.object({
      version: Joi.string().required(),
      description: Joi.string().optional(),
      config: configSchema,
      columns: Joi.array().items(columnSchema).min(1).required(),
      pageSettings: pageSettingsSchema
    });
  }

  async validateSchema(schemaPath) {
    try {
      if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
      }

      const schemaContent = fs.readFileSync(schemaPath, 'utf8');
      let schema;
      
      try {
        schema = JSON.parse(schemaContent);
      } catch (parseError) {
        throw new Error(`Invalid JSON in schema file: ${parseError.message}`);
      }

      const { error, value } = this.schemaValidationSchema.validate(schema, {
        abortEarly: false,
        allowUnknown: false
      });

      if (error) {
        const details = error.details.map(detail => detail.message).join('; ');
        throw new Error(`Schema validation failed: ${details}`);
      }

      this.validateColumnNames(value.columns);
      this.validateSelectors(value.columns);

      console.log('✅ Schema validation passed');
      return value;
    } catch (error) {
      throw new Error(`Schema validation error: ${error.message}`);
    }
  }

  validateColumnNames(columns) {
    const names = columns.map(col => col.name);
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    
    if (duplicates.length > 0) {
      throw new Error(`Duplicate column names found: ${[...new Set(duplicates)].join(', ')}`);
    }

    const reservedNames = ['constructor', 'prototype', '__proto__', 'toString'];
    const conflicts = names.filter(name => reservedNames.includes(name));
    
    if (conflicts.length > 0) {
      throw new Error(`Column names conflict with reserved words: ${conflicts.join(', ')}`);
    }
  }

  validateSelectors(columns) {
    const invalidSelectors = [];
    
    for (const column of columns) {
      if (column.selector && column.selector !== null) {
        const selectors = Array.isArray(column.selector) ? column.selector : [column.selector];
        
        for (const selector of selectors) {
          if (selector && typeof selector === 'string') {
            if (!this.isValidCssSelector(selector)) {
              invalidSelectors.push(`${column.name}: "${selector}"`);
            }
          }
        }
      }
    }
    
    if (invalidSelectors.length > 0) {
      throw new Error(`Invalid CSS selectors found: ${invalidSelectors.join(', ')}`);
    }
  }

  isValidCssSelector(selector) {
    try {
      const testElement = document.createElement('div');
      testElement.querySelector(selector);
      return true;
    } catch {
      return /^[a-zA-Z0-9\s\[\]="':.,#\-_()>+~*^$|]+$/.test(selector);
    }
  }

  validateUrl(url) {
    const urlSchema = Joi.string().uri({
      scheme: ['http', 'https']
    });

    const { error } = urlSchema.validate(url);
    return { isValid: !error, error: error?.message };
  }

  validateUrls(urls) {
    const results = {
      valid: [],
      invalid: [],
      total: urls.length
    };

    urls.forEach((url, index) => {
      const validation = this.validateUrl(url);
      if (validation.isValid) {
        results.valid.push(url);
      } else {
        results.invalid.push({
          url,
          index: index + 1,
          error: validation.error
        });
      }
    });

    return results;
  }

  validateScrapedData(data, schema) {
    const results = {
      valid: [],
      invalid: [],
      warnings: []
    };

    const requiredColumns = schema.columns.filter(col => col.required);

    data.forEach((row, index) => {
      const validation = {
        rowIndex: index + 1,
        errors: [],
        warnings: []
      };

      for (const column of requiredColumns) {
        const value = row[column.name];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          validation.errors.push(`Missing required field: ${column.name}`);
        }
      }

      for (const [key, value] of Object.entries(row)) {
        if (value && typeof value === 'string' && value.length > 10000) {
          validation.warnings.push(`Large content in ${key} (${value.length} chars)`);
        }
      }

      if (validation.errors.length > 0) {
        results.invalid.push({ ...row, _validation: validation });
      } else {
        results.valid.push(row);
      }

      if (validation.warnings.length > 0) {
        results.warnings.push({
          rowIndex: index + 1,
          url: row.url,
          warnings: validation.warnings
        });
      }
    });

    return results;
  }

  logValidationResults(results) {
    console.log(`\n🔍 Validation Results:`);
    console.log(`   Valid records: ${results.valid.length}`);
    console.log(`   Invalid records: ${results.invalid.length}`);
    console.log(`   Warnings: ${results.warnings.length}`);

    if (results.invalid.length > 0) {
      console.log('\n❌ Invalid records:');
      results.invalid.forEach(record => {
        const errors = record._validation?.errors || [];
        console.log(`   Row ${record._validation?.rowIndex}: ${errors.join(', ')}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      results.warnings.forEach(warning => {
        console.log(`   Row ${warning.rowIndex}: ${warning.warnings.join(', ')}`);
      });
    }
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-zA-Z0-9\-_\.]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  validateOutputPath(outputPath) {
    try {
      const dir = outputPath.substring(0, outputPath.lastIndexOf('/'));
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      return true;
    } catch {
      return false;
    }
  }
}