# Universal Web Scraper

Universal web scraper in Node.js for extracting data from websites to CSV files. Configurable schemas make it adaptable to any website structure.

## Features

- ✅ Universal scraping with configurable JSON schemas
- ✅ All configuration in one file for non-technical users
- ✅ CSS selector support and various HTML attributes
- ✅ Retry logic and error handling
- ✅ Input/output data validation
- ✅ Automatic file naming with input/output prefixes
- ✅ Testing tools for debugging
- ✅ Extensible for API integrations

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
├── data/                          # All data in one place
│   ├── input-urls.csv            # URLs to scrape
│   ├── input-schema.json         # Column definitions + all configuration
│   ├── output-scraped-data.csv   # Generated results
│   └── output-invalid-data.csv   # Generated errors (if any)
├── src/lib/                      # Source code (don't edit)
└── index.js                      # Entry point
```

## Usage for Non-Technical Users

### Everything you need to edit is in the `data/` folder

### 1. Configure URLs

Edit `data/input-urls.csv`:
```csv
url
https://example.com/products/laptop
https://example.com/products/smartphone
https://example.com/blog/article-1
```

### 2. Configure Schema and All Settings

Edit `data/input-schema.json` - **this is the only configuration file**:
```json
{
  "version": "1.0",
  "description": "Project description",
  "config": {
    "scraper": {
      "delay": 1000,
      "timeout": 30000,
      "maxRetries": 3
    },
    "browser": {
      "headless": true,
      "viewport": { "width": 1920, "height": 1080 }
    },
    "output": {
      "filename": "scraped-data",
      "includeTimestamp": true
    }
  },
  "columns": [
    {
      "name": "title",
      "selector": "h1, .page-title",
      "attribute": "text",
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
node index.js test-schema
node index.js test-urls
node index.js test-selectors https://example.com

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

### Transformations

- `trim` - Remove whitespace
- `lowercase` - Convert to lowercase  
- `uppercase` - Convert to uppercase
- `number` - Convert to number

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

## Examples

### Scraping Basic Product Data

```json
{
  "columns": [
    {
      "name": "product_name",
      "selector": "h1.product-title",
      "attribute": "text",
      "required": true
    },
    {
      "name": "price", 
      "selector": ".price, .cost",
      "attribute": "text",
      "transform": "trim"
    },
    {
      "name": "description",
      "selector": ".product-description p",
      "attribute": "html"
    },
    {
      "name": "image_url",
      "selector": ".product-image img",
      "attribute": "src"
    }
  ]
}
```

### Scraping SEO Metadata

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
      "name": "og_image",
      "selector": "meta[property='og:image']",
      "attribute": "content"
    }
  ]
}
```

### Scraping Article Content

```json
{
  "columns": [
    {
      "name": "article_title",
      "selector": "h1, .article-title",
      "attribute": "text"
    },
    {
      "name": "author",
      "selector": ".author, .byline",
      "attribute": "text"
    },
    {
      "name": "publish_date",
      "selector": ".date, time",
      "attribute": "text"
    },
    {
      "name": "content",
      "selector": ".content, .article-body",
      "attribute": "html"
    }
  ]
}
```

## Output Files

Scraper generates in the `data/` folder:

1. **Main file** - `output-scraped-data_TIMESTAMP.csv`
2. **Errors** - `output-scraped-data_invalid_TIMESTAMP.csv` (if any occur)
3. **Screenshots** - `data/screenshots/` (if enabled)

## Environment Configuration (.env) - For Developers Only

```bash
# API Keys (future integrations)
API_KEY=your_api_key
SITE_ID=your_site_id
COLLECTION_ID=your_collection_id

# Debug
DEBUG=false
```

## Troubleshooting

### Not Finding Elements
1. Use `node index.js test-selectors <url>` to check selectors
2. Verify CSS selector is correct
3. Add alternative selectors: `"h1, .title, .product-name"`

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

## For Developers

### Customization for Other Projects
1. Copy the `data/` folder 
2. Edit `input-urls.csv` and `input-schema.json`
3. Run scraper

### Adding New Features
1. Edit modules in `src/lib/`
2. Update validation in `validator.js`
3. Test with `test-*` commands

## License

MIT