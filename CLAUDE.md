# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Universal Web Scraper project - a configurable Node.js tool for extracting data from websites and exporting to CSV format. The project is designed to be universal and adaptable to any website structure through JSON schema configuration.

## Project Structure

```
universal-web-scraper/
├── data/
│   ├── input-urls.csv            # URLs to scrape (user-editable)
│   ├── input-schema.json         # Column definitions + configuration (user-editable)
│   ├── output-scraped-data.csv   # Generated results
│   └── output-invalid-data.csv   # Generated errors (if any)
├── src/
│   ├── lib/
│   │   ├── scraper.js            # Playwright browser automation
│   │   ├── csvHandler.js         # CSV file operations
│   │   └── validator.js          # Schema and data validation
│   └── transforms/               # Data transformation functions
│       ├── trim.js               # Remove whitespace
│       ├── lowercase.js          # Convert to lowercase
│       ├── uppercase.js          # Convert to uppercase
│       ├── number.js             # Extract numbers from text
│       ├── slugFromUrl.js        # Extract URL path as slug
│       ├── cleanHTML.js          # Clean HTML content
│       └── removeSuffix.js       # Remove text suffixes
└── index.js                      # Main entry point
```

## Key Architecture Points

### Configuration Consolidation
- All user configuration is consolidated into `data/input-schema.json`
- This includes scraper settings, browser config, output settings, and column definitions
- The `.env` file only contains API keys and debug flags
- This design makes it simple for non-technical users who only need to edit files in the `data/` folder

### File Naming Convention
- Input files use `input-` prefix (input-urls.csv, input-schema.json)
- Output files use `output-` prefix (output-scraped-data.csv)
- This makes it immediately clear which files are user-editable vs generated

### Schema Structure
The `input-schema.json` has five main sections:
1. `config.scraper` - timing, retries, user agent
2. `config.browser` - headless mode, viewport, blocked resources
3. `config.output` - filename, timestamp, backup settings
4. `pageSettings` - page loading behavior and options
5. `columns` - data extraction definitions with CSS selectors and transforms

### Universal Design
- No hardcoded selectors or website-specific logic
- All data extraction is driven by the JSON schema
- Multiple fallback selectors supported for robustness
- Modular transform system for data processing
- Generic examples use example.com domains
- Extensible architecture allows custom transforms

## Common Development Tasks

### Running the scraper
```bash
npm start
```

### Testing configuration
```bash
node index.js test-schema
node index.js test-urls
node index.js test-selectors https://example.com
```

### Key classes and methods
- `UniversalScraper` - main orchestration class
- `Scraper` - handles Playwright browser automation
- `CsvHandler` - manages CSV file I/O and validation
- `Validator` - validates schemas and scraped data

## Important Notes

- The project uses ES modules (`"type": "module"` in package.json)
- Playwright is used for browser automation (handles JS-heavy sites)
- Cheerio is used for HTML parsing and CSS selector matching
- All file paths should be absolute when using tools
- The project is designed to be product-agnostic and publicly shareable
- Error handling includes retry logic and detailed logging

## Transform System

The project uses a modular transform system located in `src/transforms/`. Each transform is a separate ES module that exports a default function.

### Transform Function Pattern
```javascript
/**
 * Brief description of what this transform does
 * 
 * Usage: "transformName(param1,param2)"
 * Input: "example input" → Output: "expected output"
 */
export default function transformName(value, param1, param2) {
  if (typeof value !== 'string') return value;
  
  // Transform logic here
  return transformedValue;
}
```

### Available Transforms
- `trim` - Remove whitespace
- `lowercase/uppercase` - Case conversion
- `number` - Extract numeric values
- `slugFromUrl` - Extract URL paths
- `cleanHTML(tags;skipSelectors)` - Clean HTML content
- `removeSuffix(suffix)` - Remove text suffixes

### Transform Usage
In schema: `"transform": "trim,lowercase"` or `"transform": "removeSuffix( home delivery)"`

## Claude Code Best Practices

### File Operations
- Always use absolute paths with Read/Write/Edit tools
- Use Glob for file discovery, then Read for content
- Prefer Edit over Write for existing files
- Use MultiEdit for multiple changes to same file

### Code Analysis
- Use Grep extensively for code search and understanding
- Search for patterns, not just exact strings
- Use context flags (-C) to understand surrounding code
- Check multiple files to understand architecture

### Development Workflow
1. **Understand First** - Use Grep/Read to analyze existing code patterns
2. **Plan** - Use TodoWrite for complex tasks
3. **Implement** - Follow existing patterns and conventions
4. **Test** - Use project's test commands when available

### Transform Development
- Always handle non-string inputs gracefully: `if (typeof value !== 'string') return value;`
- Include comprehensive JSDoc with usage examples
- Make functions pure (no side effects)
- Test edge cases and invalid inputs
- Follow existing naming conventions

### Schema Modifications
- Maintain backward compatibility
- Test changes with `node index.js test-schema`
- Validate with real URLs using `test-selectors`
- Consider fallback selectors for robustness

## Development Guidelines

- Keep non-technical user experience simple - they should only need to edit `data/` folder
- Maintain backward compatibility when changing schema structure
- Test with various selector combinations to ensure robustness
- Follow existing patterns for error handling and logging
- All transform functions should handle non-string inputs gracefully
- Use descriptive function names and include usage examples in comments
- Transforms should be pure functions without side effects