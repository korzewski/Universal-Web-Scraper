# Universal Web Scraper

A configurable Node.js tool for extracting data from websites and exporting to CSV format. Designed to be universal and adaptable to any website structure through JSON schema configuration.

## Features

- ✅ Universal scraping with configurable JSON schemas
- ✅ All configuration consolidated in one file
- ✅ CSS selector support with fallback options
- ✅ Advanced data transformation system
- ✅ Retry logic and comprehensive error handling
- ✅ Input/output data validation with detailed reporting
- ✅ Automatic file naming with timestamps
- ✅ Built-in testing tools for debugging
- ✅ Playwright browser automation with resource blocking

## Installation

```bash
# Clone repository
git clone <repo-url>
cd universal-web-scraper

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium

# Copy and configure .env file
cp .env.example .env
```

## Project Structure

```
universal-web-scraper/
├── data/                          # All user data in one place
│   ├── input-urls.csv            # URLs to scrape (user-editable)
│   ├── input-schema.json         # Schema + configuration (user-editable)
│   ├── output-scraped-data.csv   # Generated results
│   └── output-invalid-data.csv   # Failed records (if any)
├── src/
│   ├── lib/                      # Core scraping logic
│   │   ├── scraper.js            # Playwright browser automation
│   │   ├── csvHandler.js         # CSV file operations
│   │   └── validator.js          # Schema and data validation
│   └── transforms/               # Data transformation functions
│       ├── trim.js               # Remove whitespace
│       ├── lowercase.js          # Convert to lowercase
│       ├── number.js             # Extract numbers
│       ├── cleanHTML.js          # Clean HTML content
│       ├── slugFromUrl.js        # Extract URL slugs
│       └── removeSuffix.js       # Remove text suffixes
└── index.js                      # Main entry point
```

## Usage for Non-Technical Users

### Everything you need to edit is in the `data/` folder

### 1. Configure URLs

Edit `data/input-urls.csv`:
```csv
url
https://example.com/page-1
https://example.com/page-2
https://example.com/page-3
```

### 2. Configure Schema and All Settings

Edit `data/input-schema.json` - **this is the only configuration file**:
```json
{
  "version": "1.0",
  "description": "Universal web scraper configuration",
  "config": {
    "scraper": {
      "delay": 1000,
      "timeout": 30000,
      "maxRetries": 3,
      "retryDelay": 2000
    },
    "browser": {
      "headless": true,
      "viewport": { "width": 1920, "height": 1080 },
      "blockResources": ["image", "font", "media"]
    },
    "output": {
      "filename": "scraped-data",
      "includeTimestamp": true,
      "createBackup": true,
      "includeInvalidInOutput": false
    }
  },
  "pageSettings": {
    "waitForSelector": "h1",
    "waitTimeout": 10000,
    "screenshot": false,
    "removeScripts": true
  },
  "columns": [
    {
      "name": "title",
      "selector": "h1, .page-title, .main-title",
      "attribute": "text",
      "required": true
    },
    {
      "name": "url",
      "selector": null,
      "attribute": "url",
      "required": true
    }
  ]
}
```

### 3. Run the Scraper

```bash
npm start
```

**Results will be in the `data/` folder with `output-` prefix**

## Commands

```bash
# Run scraper
npm start

# Test configuration
node index.js test-schema          # Validate schema file
node index.js test-urls            # Validate URLs file
node index.js test-selectors <url> # Test selectors on specific URL

# Help
node index.js help
```

## Configuration in schema.json

### "config" Section - Scraper Settings

```json
{
  "config": {
    "scraper": {
      "delay": 1000,           // Delay between pages (ms)
      "timeout": 30000,        // Timeout per page (ms)
      "maxRetries": 3,         // How many retries on error
      "retryDelay": 2000,      // Delay before retry (ms)
      "userAgent": "..."       // Browser User Agent (optional)
    },
    "browser": {
      "headless": true,        // Hidden browser (recommended: true)
      "viewport": {
        "width": 1920,         // Browser window width
        "height": 1080         // Browser window height
      },
      "blockResources": ["image", "font", "media"]  // Blocked resources for speed
    },
    "output": {
      "filename": "scraped-data",     // Output filename
      "includeTimestamp": true,       // Add timestamp to filename
      "createBackup": true            // Create backups
    }
  }
}
```

### "columns" Section - Column Definitions

```json
{
  "columns": [
    {
      "name": "column_name",             // Column name in CSV
      "selector": "h1, .title",         // CSS selector(s) - see fallback explanation below
      "attribute": "text",              // What to extract (text/html/href/src/etc.)
      "required": true,                 // Is field required
      "description": "Description",     // Description (optional)
      "default": "Default value",       // Default value (optional)
      "transform": "trim"               // Transformation (optional)
    }
  ]
}
```

#### Fallback Selectors
Comma-separated selectors work as **fallback options** - the scraper tries them in order:

```json
"selector": "h1, .page-title, .product-title, .article-title"
```

**Process:**
1. Try `h1` first - if found, use it and stop
2. If no `h1`, try `.page-title` - if found, use it and stop  
3. If no `.page-title`, try `.product-title` - if found, use it and stop
4. Continue until a match is found or return empty/default value

This makes your scraper work across different website structures with one configuration!

### Available Attributes

- `text` - Element text (most commonly used)
- `html` - Inner HTML
- `href` - Link (for `<a>`)
- `src` - Source (for `<img>`)
- `content` - Content of meta tags
- `url` - Source page URL
- `alt`, `title`, `value` - Other HTML attributes

### Available Transformations

#### Text Transformations
- `trim` - Remove whitespace from start/end
- `lowercase` - Convert to lowercase
- `uppercase` - Convert to uppercase
- `removeSuffix(text)` - Remove specific suffix from end of string

#### Data Extraction
- `number` - Extract numeric value from text (e.g., "$29.99" → 29.99)
- `slugFromUrl` - Extract URL path as slug (e.g., "/blog/post" → "blog/post")

#### HTML Processing
- `cleanHTML(tags)` - Extract specific HTML tags and clean content
- `cleanHTML(h1,p)` - Extract only h1 and p tags
- `cleanHTML(h1,p;.skip,.ads)` - Extract h1,p but skip elements matching .skip,.ads

#### Chaining Transformations
You can chain multiple transformations with commas:
```json
"transform": "removeSuffix( home delivery),trim,lowercase"
```

### "pageSettings" Section - Page Loading Settings

```json
{
  "pageSettings": {
    "waitForSelector": "h1",      // Wait for element to appear
    "waitTimeout": 10000,         // Wait timeout (ms)
    "screenshot": false,          // Take screenshots
    "removeScripts": true         // Remove JS scripts (recommended)
  }
}
```

## Schema Examples

### Basic Data Extraction

```json
{
  "columns": [
    {
      "name": "title",
      "selector": "h1, .main-title, .page-title",
      "attribute": "text",
      "required": true
    },
    {
      "name": "price", 
      "selector": ".price, .cost, .amount",
      "attribute": "text",
      "transform": "number"
    },
    {
      "name": "description",
      "selector": ".description, .content p",
      "attribute": "text",
      "transform": "trim"
    },
    {
      "name": "image_url",
      "selector": ".main-image img, .hero-image img",
      "attribute": "src"
    }
  ]
}
```

### SEO and Metadata Extraction

```json
{
  "columns": [
    {
      "name": "page_title",
      "selector": "title",
      "attribute": "text"
    },
    {
      "name": "meta_description", 
      "selector": "meta[name='description']",
      "attribute": "content"
    },
    {
      "name": "canonical_url",
      "selector": "link[rel='canonical']",
      "attribute": "href"
    },
    {
      "name": "page_slug",
      "selector": null,
      "attribute": "url",
      "transform": "slugFromUrl"
    }
  ]
}
```

### Content with Transformations

```json
{
  "columns": [
    {
      "name": "clean_title",
      "selector": "h1, .title",
      "attribute": "text",
      "transform": "removeSuffix( - Company Name),trim"
    },
    {
      "name": "clean_content",
      "selector": ".main-content, .article-body",
      "attribute": "html",
      "transform": "cleanHTML(h2,h3,p;.ads,.sidebar)"
    },
    {
      "name": "normalized_text",
      "selector": ".category, .tag",
      "attribute": "text",
      "transform": "trim,lowercase"
    }
  ]
}
```

## Output Files

Scraper generates in the `data/` folder:

1. **Main file** - `output-scraped-data_TIMESTAMP.csv`
2. **Errors** - `output-scraped-data_invalid_TIMESTAMP.csv` (if any occur)
3. **Screenshots** - `data/screenshots/` (if enabled)

## Environment Configuration (.env) - Optional

```bash
# File paths (override defaults)
URLS_PATH=./data/input-urls.csv
SCHEMA_PATH=./data/input-schema.json
DATA_DIR=./data

# Debug options
DEBUG=false
VERBOSE_LOGGING=false

# API Keys (for future integrations)
API_KEY=your_api_key
SITE_ID=your_site_id
COLLECTION_ID=your_collection_id
```

## Troubleshooting

### Not Finding Elements
1. Use `node index.js test-selectors <url>` to check selectors
2. Verify CSS selector is correct
3. Add alternative selectors: `"h1, .title, .main-heading"`

### Slow Performance
1. Increase `blockResources` in configuration
2. Decrease `timeout` if pages load quickly
3. Increase `delay` to avoid overloading servers

### Installation Issues
```bash
rm -rf node_modules package-lock.json
npm install
npx playwright install --force
```

### Debug Mode
```bash
DEBUG=true node index.js
```

## Development

### Creating New Transform Functions

1. Create a new file in `src/transforms/myTransform.js`:
```javascript
/**
 * Description of what this transform does
 * 
 * Usage: "myTransform(param1,param2)"
 * Input: "example input" → Output: "expected output"
 */
export default function myTransform(value, param1, param2) {
  if (typeof value !== 'string') return value;
  
  // Your transformation logic here
  return transformedValue;
}
```

2. Use in schema: `"transform": "myTransform(arg1,arg2)"`

### Customization for Different Projects
1. Copy the `data/` folder to your project
2. Edit `input-urls.csv` with your target URLs
3. Configure `input-schema.json` for your data structure
4. Run the scraper

### Architecture Overview
- **index.js** - Main orchestration and CLI
- **scraper.js** - Browser automation with Playwright
- **csvHandler.js** - CSV file reading/writing operations
- **validator.js** - Schema validation and data validation
- **transforms/** - Pluggable data transformation functions

## License

MIT