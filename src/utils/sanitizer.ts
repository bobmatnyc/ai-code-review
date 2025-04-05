import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

// Create a DOM environment for DOMPurify
const window = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitizes content to prevent Cross-Site Scripting (XSS) attacks.
 * Removes potentially malicious HTML and JavaScript from the input string.
 * @param content Content to sanitize
 * @returns Sanitized content
 */
export function sanitizeContent(content: string): string {
  try {
    // Configure DOMPurify to allow safe Markdown/HTML elements but remove potentially dangerous ones
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        // Basic formatting
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
        // Lists
        'ul', 'ol', 'li',
        // Text formatting
        'b', 'i', 'strong', 'em', 'code', 'pre',
        // Links and images
        'a', 'img',
        // Tables
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        // Quotes
        'blockquote'
      ],
      ALLOWED_ATTR: [
        'href', // For links
        'src',  // For images
        'alt',  // For images
        'title', // For accessibility
        'target', // For links
        'rel' // For links
      ],
      // Use HTML profile for better security
      USE_PROFILES: { html: true },
      // Remove any elements containing dangerous attributes
      WHOLE_DOCUMENT: false,
      // Don't allow JavaScript URIs
      ALLOW_UNKNOWN_PROTOCOLS: false
    });

    return sanitized;
  } catch (error) {
    console.error('Error sanitizing content:', error);
    // Return a safe default value
    return 'Error: Content could not be sanitized properly.';
  }
}
