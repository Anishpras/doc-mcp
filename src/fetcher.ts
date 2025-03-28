import fetch from 'node-fetch';
import { ServerConfig } from './types.js';
import { cleanHtmlContent } from './content-cleaner.js';

// Fetches HTML content from a given URL
export async function fetchDocumentation(url: string, config?: ServerConfig): Promise<string> {
  // Set default config values if not provided
  const cleaningConfig = {
    removeImages: config?.removeImages !== undefined ? config.removeImages : true,
    removeStyles: config?.removeStyles !== undefined ? config.removeStyles : true,
    removeScripts: config?.removeScripts !== undefined ? config.removeScripts : true,
    maxContentSize: config?.maxContentSize || 10 * 1024 * 1024 // 10MB default
  };
  try {
    // Make the request with appropriate headers to mimic a browser
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.google.com/',
        'DNT': '1'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch documentation: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML content
    if (!contentType.includes('text/html')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const htmlContent = await response.text();
    
    // Clean the HTML content to remove unwanted elements
    return cleanHtmlContent(htmlContent, cleaningConfig);
  } catch (error) {
    console.error(`Error fetching documentation from ${url}:`, error);
    throw error;
  }
}

// Function to fetch multiple documentation pages (for sites with pagination)
export async function fetchMultiplePages(baseUrl: string, pagePattern: string, maxPages: number = 10): Promise<{url: string, content: string}[]> {
  const results: {url: string, content: string}[] = [];
  let currentPage = 1;
  let hasMorePages = true;

  while (hasMorePages && currentPage <= maxPages) {
    const url = pagePattern.replace('{page}', currentPage.toString());
    try {
      const content = await fetchDocumentation(url);
      results.push({ url, content });
      currentPage++;
    } catch (error) {
      console.error(`Failed to fetch page ${currentPage}:`, error);
      hasMorePages = false;
    }
  }

  return results;
}

// Function to determine if a URL is likely to be documentation
export function isLikelyDocumentation(url: string): boolean {
  const docPatterns = [
    '/docs/',
    '/documentation/',
    '/guide/',
    '/manual/',
    '/reference/',
    '/tutorial/',
    '/api/',
    '-docs',
    '/help/'
  ];
  
  const lowerUrl = url.toLowerCase();
  
  return docPatterns.some(pattern => lowerUrl.includes(pattern));
}
