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
└── src/lib/
    ├── scraper.js                # Main scraping logic with Playwright
    ├── csvHandler.js             # CSV file operations
    └── validator.js              # Schema and data validation
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
The `input-schema.json` has four main sections:
1. `config.scraper` - timing, retries, user agent
2. `config.browser` - headless mode, viewport, blocked resources
3. `config.output` - filename, timestamp, backup settings
4. `columns` - data extraction definitions with CSS selectors

### Universal Design
- No hardcoded selectors or website-specific logic
- All data extraction is driven by the JSON schema
- Multiple fallback selectors supported for robustness
- Generic examples use example.com domains

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

## Development Guidelines

- Keep non-technical user experience simple - they should only need to edit `data/` folder
- Maintain backward compatibility when changing schema structure
- Test with various selector combinations to ensure robustness
- Follow existing patterns for error handling and logging