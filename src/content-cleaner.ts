import * as cheerioModule from 'cheerio';
import { ServerConfig } from './types.js';

// Using any to work around TypeScript issues
type CheerioAPI = any;
type CheerioElement = any;

/**
 * Clean HTML content by removing unwanted elements and attributes
 * 
 * @param htmlContent The raw HTML content to clean
 * @param options Cleaning options
 * @returns Cleaned HTML content
 */
export function cleanHtmlContent(
  htmlContent: string, 
  options = { 
    removeImages: true,
    removeStyles: true,
    removeScripts: true,
    maxContentSize: 10 * 1024 * 1024 // 10MB default max size
  }
): string {
  // Check content size
  if (htmlContent.length > options.maxContentSize) {
    console.warn(`Content exceeds maximum size of ${options.maxContentSize} bytes, truncating`);
    htmlContent = htmlContent.substring(0, options.maxContentSize);
  }

  // Use cheerio to parse and clean HTML
  const $ = cheerioModule.load(htmlContent) as CheerioAPI;
  
  // Remove images, SVGs, and other binary content
  if (options.removeImages) {
    $('svg, img, canvas, video, audio, object, embed, picture, [data-src]').remove();
    $('*').removeAttr('data-src data-srcset src srcset poster');
    $('[style*="base64"]').removeAttr('style');
    $('[type="image"], [type="video"]').remove();
    $('figure.image, .svg-container, .image-container').remove();
  }
  
  // Remove style tags and style attributes
  if (options.removeStyles) {
    $('style').remove();
    $('*').removeAttr('style class');
    $('link[rel="stylesheet"]').remove();
  }
  
  // Remove scripts
  if (options.removeScripts) {
    $('script').remove();
    $('*').removeAttr('onclick onmouseover onmouseout onload onerror');
    $('link[rel="preload"]').remove();
  }
  
  // Remove other potentially undesirable elements
  $('iframe, noscript, [aria-hidden="true"]').remove();
  
  // Remove all data-* attributes that might contain binary data
  $('*').each((index, el) => {
    const attribs = $(el).attr() || {};
    Object.keys(attribs).forEach(attr => {
      if (attr.startsWith('data-')) {
        $(el).removeAttr(attr);
      }
    });
  });
  
  // Return cleaned HTML
  return $.html() as string;
}

/**
 * Clean content using cheerio directly
 * 
 * @param $ Cheerio instance
 * @param element Element to clean
 * @param config Server configuration
 */
export function cleanContentWithCheerio($: CheerioAPI, element: CheerioElement, config: ServerConfig): void {
  // Remove standard navigation, footer, etc.
  element.find('script, style, iframe, nav:not([role="navigation"]), footer, aside, .comments, .ads, .banner, .navigation').remove();
  element.find('[style*="display: none"], [style*="display:none"], [hidden]').remove();
  element.find('[data-loading], .loading-placeholder').remove();
  element.find('.sidebar, .menu, .share-buttons, .related-posts').remove();
  
  // Remove images and SVGs if configured
  if (config.removeImages) {
    element.find('svg, img, canvas, video, audio, object, embed, [data-src], [src^="data:"]').remove();
    element.find('*').removeAttr('data-src data-srcset src srcset poster background background-image');
    element.find('[style*="base64"]').removeAttr('style');
    element.find('[type="image"], [type="video"], picture, figure.image').remove();
  }
  
  // Remove styles if configured
  if (config.removeStyles) {
    element.find('style').remove();
    element.find('*').removeAttr('style class');
    element.find('link[rel="stylesheet"]').remove();
  }
  
  // Remove scripts if configured
  if (config.removeScripts) {
    element.find('script').remove();
    element.find('*').removeAttr('onclick onmouseover onmouseout onload onerror');
    element.find('link[rel="preload"]').remove();
  }
  
  // Remove data attributes
  element.find('*').each((_, el) => {
    const attribs = $(el).attr() || {};
    Object.keys(attribs).forEach(attr => {
      if (attr.startsWith('data-')) {
        $(el).removeAttr(attr);
      }
    });
  });
}
