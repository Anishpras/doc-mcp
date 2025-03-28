import cheerio from 'cheerio';
import TurndownService from 'turndown';
import { ParsedDocumentation, Section } from './types.js';

// Initialize the HTML to Markdown converter
// Create turndown service - using any to avoid TypeScript errors
const turndownService = new (TurndownService as any)({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

// Enhance the turndown service with additional rules
turndownService.addRule('codeBlocks', {
  filter: function(node) {
    return (
      node.nodeName === 'PRE' &&
      node.firstChild !== null &&
      node.firstChild.nodeName === 'CODE'
    );
  },
  replacement: function(content, node) {
    let language = '';
    if (node?.firstChild && node.firstChild.nodeType === 1) {
      // Using any to bypass TypeScript's strict checking
      const firstChild = node.firstChild;
      const className = firstChild.getAttribute ? firstChild.getAttribute('class') : null;
      if (className && typeof className === 'string' && className.startsWith('language-')) {
        language = className.substring(9);
      }
    }
    
    // Extract text content safely
    const codeContent = node?.firstChild?.textContent || '';
    return '\n```' + language + '\n' + codeContent + '\n```\n\n';
  }
});

// Preserve tables
turndownService.addRule('tables', {
  filter: ['table'],
  replacement: function(content) {
    // This is a simplified approach - for more complex tables, you might want to use a dedicated library
    return '\n\n' + content + '\n\n';
  }
});

// Parses HTML content into structured documentation
export async function parseDocumentation(
  htmlContent: string, 
  selector: string = 'body'
): Promise<ParsedDocumentation> {
  // Parse HTML with cheerio - handle both ESM and CJS imports
  const $ = (cheerio as any).load(htmlContent);
  
  // Extract the title
  const title = $('title').text().trim() || 'Untitled Documentation';
  
  // Find the main content based on the selector
  const mainContent = selector ? $(selector) : $('body');
  
  if (mainContent.length === 0) {
    throw new Error(`Selector "${selector}" did not match any elements`);
  }
  
  // Clean up the content
  cleanupContent($, mainContent);
  
  // Extract the full content as Markdown
  const mainHtml = mainContent.html() || '';
  const mainMarkdown = turndownService.turndown(mainHtml);
  
  // Extract sections based on headings
  const sections = extractSections($, mainContent);
  
  return {
    title,
    content: mainMarkdown,
    sections
  };
}

// Clean up the HTML content (remove unnecessary elements)
function cleanupContent($, element) {
  // Remove elements that are typically not part of the main content
  element.find('script, style, iframe, nav:not([role="navigation"]), footer, aside, .comments, .ads, .banner, .navigation').remove();
  
  // Remove any invisible elements
  element.find('[style*="display: none"], [style*="display:none"], [hidden]').remove();
  
  // Remove any elements that might contain dynamically loaded content
  element.find('[data-loading], .loading-placeholder').remove();
  
  // Remove elements with specific classes (modify as needed)
  element.find('.sidebar, .menu, .share-buttons, .related-posts').remove();
}

// Extract sections from the content based on headings
function extractSections($, element) {
  const sections: Section[] = [];
  let currentHeading: string | null = null;
  let currentContent: string[] = [];
  
  // Find all headings and their content
  element.children().each((i, el) => {
    const node = $(el);
    const tagName = el.tagName?.toLowerCase() || '';
    
    // Check if this is a heading
    if (tagName.match(/^h[1-6]$/)) {
      // If we were already collecting content for a heading, save it
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: turndownService.turndown(currentContent.join(''))
        });
      }
      
      // Start a new section with this heading
      currentHeading = node.text().trim();
      currentContent = [];
    } else {
      // Add this element's HTML to the current section
      currentContent.push(node.prop('outerHTML') || '');
    }
  });
  
  // Add the last section if there is one
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: turndownService.turndown(currentContent.join(''))
    });
  }
  
  // If no sections were found but there is content, create a default section
  if (sections.length === 0 && element.html()) {
    sections.push({
      heading: 'Main Content',
      content: turndownService.turndown(element.html() || '')
    });
  }
  
  return sections;
}

// Function to chunk the content into smaller pieces for embedding
export function chunkContent(content: string, maxChunkSize: number = 1500): string[] {
  // Split the content by paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') continue;
    
    const paragraphSize = paragraph.length;
    
    // If the paragraph itself is too large, split it further
    if (paragraphSize > maxChunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join('\n\n'));
        currentChunk = [];
        currentSize = 0;
      }
      
      // Split by sentences or chunks of maxChunkSize
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      
      let sentenceChunk: string[] = [];
      let sentenceSize = 0;
      
      for (const sentence of sentences) {
        if (sentence.length > maxChunkSize) {
          // If a single sentence is too large, we have to break it up
          for (let i = 0; i < sentence.length; i += maxChunkSize) {
            const piece = sentence.substr(i, maxChunkSize);
            chunks.push(piece);
          }
        } else if (sentenceSize + sentence.length > maxChunkSize) {
          chunks.push(sentenceChunk.join(' '));
          sentenceChunk = [sentence];
          sentenceSize = sentence.length;
        } else {
          sentenceChunk.push(sentence);
          sentenceSize += sentence.length;
        }
      }
      
      if (sentenceChunk.length > 0) {
        chunks.push(sentenceChunk.join(' '));
      }
    } 
    // If adding this paragraph would exceed the chunk size, start a new chunk
    else if (currentSize + paragraphSize > maxChunkSize) {
      chunks.push(currentChunk.join('\n\n'));
      currentChunk = [paragraph];
      currentSize = paragraphSize;
    } 
    // Otherwise, add to the current chunk
    else {
      currentChunk.push(paragraph);
      currentSize += paragraphSize;
    }
  }
  
  // Add the last chunk if there is one
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n\n'));
  }
  
  return chunks;
}

// Detect code blocks in content
export function detectCodeBlocks(content: string): { language: string, code: string }[] {
  const codeBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;
  const codeBlocks: { language: string, code: string }[] = [];
  
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1],
      code: match[2]
    });
  }
  
  return codeBlocks;
}

// Extract metadata from the content
export function extractMetadata(content: string): Record<string, string> {
  const metadataRegex = /^---\n([\s\S]*?)\n---/;
  const match = metadataRegex.exec(content);
  
  if (!match) {
    return {};
  }
  
  const metadataStr = match[1];
  const metadata: Record<string, string> = {};
  
  metadataStr.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      metadata[key] = value;
    }
  });
  
  return metadata;
}
