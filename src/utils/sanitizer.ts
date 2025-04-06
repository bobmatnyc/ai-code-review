/**
 * @fileoverview Content sanitization utilities for preventing XSS attacks.
 *
 * This module provides sanitization functions to clean user-generated or AI-generated
 * content before rendering or storing it. It uses DOMPurify to remove potentially
 * malicious HTML, JavaScript, and other harmful content while preserving legitimate
 * formatting elements.
 *
 * Key responsibilities:
 * - Sanitizing content to prevent Cross-Site Scripting (XSS) attacks
 * - Configuring allowed HTML tags and attributes for safe rendering
 * - Preserving legitimate Markdown and HTML formatting
 * - Removing potentially dangerous scripts and event handlers
 * - Providing a consistent sanitization interface across the application
 *
 * This sanitization is critical for security when rendering AI-generated content
 * that might inadvertently contain harmful markup.
 */

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
export function sanitizeContent(content: string | null | undefined): string {
  // Return empty string for null/undefined
  if (content == null) {
    return '';
  }

  try {
    // Configure DOMPurify to allow safe Markdown/HTML elements but remove potentially dangerous ones
    const sanitized = DOMPurify.sanitize(String(content), {
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

/**
 * Sanitizes a filename to ensure it's safe for file system operations.
 * Removes characters that are invalid in filenames across different operating systems.
 * @param filename The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  if (filename == null) {
    return '';
  }

  // Replace characters that are invalid in filenames across different operating systems
  // with underscores, while preserving spaces and other valid characters
  return String(filename).replace(/[\/\\:*?"<>|]/g, '_');
}
