import * as cheerio from 'cheerio';

/**
 * Clean HTML transformation - extracts only specified HTML tags and removes unwanted elements
 * 
 * Usage: "cleanHTML(h1,p)" or "cleanHTML(h1,h2,p;.skip-ads,.header)"
 * First arg: allowed tags (comma-separated, default: h1,h2,h3,h4,h5,h6,p)  
 * Second arg: skip selectors (comma-separated, optional)
 * Input: "<div><h1>Title</h1><p>Text</p><script>bad</script></div>"
 * Output: "<h1>Title</h1>\n<p>Text</p>"
 */
export default function cleanHTML(htmlContent, allowedTags = 'h1,h2,h3,h4,h5,h6,p', skipSelectors = '') {
  // Handle empty string arguments by using defaults
  if (allowedTags === '') {
    allowedTags = 'h1,h2,h3,h4,h5,h6,p';
  }
  
  console.log(`🔍 cleanHTML Debug: input length=${htmlContent?.length}, allowedTags="${allowedTags}", skipSelectors="${skipSelectors}"`);
  
  if (!htmlContent || typeof htmlContent !== 'string') {
    console.log(`🔍 cleanHTML Debug: Invalid input - returning empty string`);
    return '';
  }

  try {
    const $ = cheerio.load(htmlContent);
    console.log(`🔍 cleanHTML Debug: Cheerio loaded, original HTML length=${htmlContent.length}`);
    
    // Remove elements matching skip selectors
    if (skipSelectors) {
      const skipList = skipSelectors.split(',').map(s => s.trim()).filter(s => s);
      skipList.forEach(selector => {
        try {
          $(selector).remove();
        } catch (error) {
          // Ignore invalid selectors
          console.warn(`Invalid skip selector: ${selector}`);
        }
      });
    }
    
    // Get list of allowed tags
    const allowedTagList = allowedTags.split(',').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
    console.log(`🔍 cleanHTML Debug: allowedTagList=${JSON.stringify(allowedTagList)}`);
    
    // Create selector for allowed tags
    const allowedSelector = allowedTagList.join(',');
    console.log(`🔍 cleanHTML Debug: allowedSelector="${allowedSelector}"`);
    
    // Extract only allowed elements
    const allowedElements = $(allowedSelector);
    console.log(`🔍 cleanHTML Debug: found ${allowedElements.length} allowed elements`);
    
    if (allowedElements.length === 0) {
      console.log(`🔍 cleanHTML Debug: No allowed elements found - returning empty string`);
      return '';
    }
    
    // Build clean HTML content
    let cleanContent = '';
    allowedElements.each((index, element) => {
      const $element = $(element);
      
      // Clean up the element content
      const tagName = element.tagName.toLowerCase();
      const textContent = $element.text().trim();
      
      console.log(`🔍 cleanHTML Debug: processing element ${index}: tagName="${tagName}", textLength=${textContent.length}`);
      
      if (textContent) {
        if (tagName.startsWith('h')) {
          // For headers, preserve the tag
          cleanContent += `<${tagName}>${textContent}</${tagName}>\n`;
          console.log(`🔍 cleanHTML Debug: added header: ${tagName}`);
        } else if (tagName === 'p') {
          // For paragraphs, preserve the tag and basic formatting
          const innerHTML = $element.html();
          if (innerHTML) {
            cleanContent += `<p>${innerHTML}</p>\n`;
            console.log(`🔍 cleanHTML Debug: added paragraph`);
          }
        }
      }
    });
    
    console.log(`🔍 cleanHTML Debug: final cleanContent length=${cleanContent.length}`);
    return cleanContent.trim();
    
  } catch (error) {
    console.warn(`cleanHTML transformation error: ${error.message}`);
    return htmlContent; // Return original content on error
  }
}