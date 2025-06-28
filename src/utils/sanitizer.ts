/**
 * @fileoverview Content sanitization utilities for preventing XSS attacks.
 *
 * This module provides sanitization functions to clean user-generated or AI-generated
 * content before rendering or storing it. It uses DOMPurify to remove potentially
 * malicious HTML, JavaScript, and other harmful content while preserving legitimate
 * formatting elements. It also includes utilities for sanitizing filenames to ensure
 * they are safe for use in file systems.
 */

import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';
import logger from './logger';

// Create a DOM window for DOMPurify
const { window } = new JSDOM('');
// Cast window for DOMPurify compatibility
const DOMPurify = createDOMPurify(window);

/**
 * Sanitizes HTML content to prevent Cross-Site Scripting (XSS) attacks.
 * 
 * This function uses DOMPurify to clean HTML content by:
 * 1. Allowing only safe HTML tags (h1-h6, p, lists, tables, etc.)
 * 2. Allowing only safe attributes (href, class, id, etc.)
 * 3. Explicitly forbidding dangerous tags (script, iframe, svg, etc.)
 * 4. Explicitly forbidding dangerous attributes (onerror, onclick, etc.)
 * 
 * If sanitization fails for any reason, it returns an empty string for safety.
 * 
 * @param {string} content - The HTML content to sanitize
 * @returns {string} Sanitized HTML with potentially dangerous content removed
 * 
 * @example
 * const unsafeHtml = '<div>Safe content</div><script>alert("XSS")</script>';
 * const safeHtml = sanitizeHtml(unsafeHtml);
 * // Returns: "<div>Safe content</div>"
 * 
 * @throws Catches internally and returns empty string if DOMPurify fails
 */
export function sanitizeHtml(content: string): string {
  try {
    // Configure DOMPurify to allow certain tags and attributes
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'p',
        'br',
        'hr',
        'ul',
        'ol',
        'li',
        'b',
        'i',
        'strong',
        'em',
        'code',
        'pre',
        'a',
        'span',
        'div',
        'table',
        'thead',
        'tbody',
        'tr',
        'th',
        'td'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'style'],
      FORBID_TAGS: [
        'script',
        'iframe',
        'object',
        'embed',
        'form',
        'input',
        'button',
        'style',
        'link',
        'meta',
        'base',
        'applet',
        'math',
        'svg'
      ],
      FORBID_ATTR: [
        'onerror',
        'onload',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onmousedown',
        'onmouseup',
        'onkeydown',
        'onkeyup',
        'onkeypress',
        'onfocus',
        'onblur',
        'onchange',
        'onsubmit',
        'onreset',
        'javascript:',
        'data:',
        'vbscript:'
      ]
    });

    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing HTML content:', error);
    // Return a safe fallback if sanitization fails
    return '';
  }
}

/**
 * Sanitize Markdown content
 * @param content Markdown content to sanitize
 * @returns Sanitized Markdown content
 */
export function sanitizeMarkdown(content: string): string {
  try {
    // Remove potentially harmful content
    const sanitized = content
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove script tags and their content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      // Remove iframe tags and their content
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      // Remove style tags and their content
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      // Remove event handlers
      .replace(/\son\w+\s*=\s*["']?[^"']*["']?/gi, '')
      // Remove javascript: URLs
      .replace(/javascript\s*:/gi, 'removed:')
      // Remove data: URLs
      .replace(/data\s*:/gi, 'removed:')
      // Remove vbscript: URLs
      .replace(/vbscript\s*:/gi, 'removed:');

    return sanitized;
  } catch (error) {
    logger.error('Error sanitizing Markdown content:', error);
    // Return a safe fallback if sanitization fails
    return '';
  }
}

/**
 * Sanitize JSON content
 * @param content JSON content to sanitize
 * @returns Sanitized JSON content
 */
export function sanitizeJson(content: string): string {
  try {
    // Parse and stringify to ensure valid JSON
    const parsed = JSON.parse(content);
    return JSON.stringify(parsed);
  } catch (error) {
    logger.error('Error sanitizing JSON content:', error);
    // Return a safe fallback if sanitization fails
    return '{}';
  }
}

/**
 * Sanitizes content based on its type to prevent security vulnerabilities.
 * 
 * This function acts as a dispatcher that routes the content to the appropriate
 * specialized sanitization function based on the content type. It supports
 * HTML, Markdown, JSON, and plain text formats, each with type-specific
 * sanitization rules.
 * 
 * @param {string} content - The content to sanitize
 * @param {('html'|'markdown'|'json'|'text')} [contentType='text'] - The type of content
 * @returns {string} Sanitized content safe for rendering or storage
 * 
 * @example
 * // Sanitize HTML content
 * const safeHtml = sanitizeContent('<script>alert("XSS")</script><p>Hello</p>', 'html');
 * // Returns: "<p>Hello</p>"
 * 
 * @example
 * // Sanitize Markdown content
 * const safeMarkdown = sanitizeContent('# Title\n<script>alert("XSS")</script>', 'markdown');
 * // Returns: "# Title\n"
 * 
 * @example
 * // Sanitize JSON content
 * const safeJson = sanitizeContent('{"key": "value"}', 'json');
 * // Returns: '{"key":"value"}'
 */
export function sanitizeContent(
  content: string,
  contentType: 'html' | 'markdown' | 'json' | 'text' = 'text'
): string {
  switch (contentType) {
    case 'html':
      return sanitizeHtml(content);
    case 'markdown':
      return sanitizeMarkdown(content);
    case 'json':
      return sanitizeJson(content);
    case 'text':
    default:
      // For plain text, just remove control characters except for newlines and tabs
      // eslint-disable-next-line no-control-regex
      return content.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');
  }
}

/**
 * Sanitize a filename to ensure it's safe for use in file systems
 *
 * This function removes or replaces characters that are not safe for use in filenames
 * across different operating systems. It handles null/undefined inputs and preserves
 * spaces and non-ASCII characters that are generally safe for modern file systems.
 *
 * @param filename The filename to sanitize
 * @returns A sanitized filename safe for use in file systems
 */
export function sanitizeFilename(filename: string | null | undefined): string {
  // Handle null or undefined
  if (filename === null || filename === undefined) {
    return '';
  }

  // Replace invalid characters with underscores
  // This regex matches characters that are generally unsafe in filenames across platforms:
  // / \ : * ? " < > | and control characters
  // eslint-disable-next-line no-control-regex
  return filename.replace(/[/\\:*?"<>|\x00-\x1F\x7F]/g, '_');
}
