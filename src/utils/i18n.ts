/**
 * @fileoverview Internationalization (i18n) configuration for the application.
 *
 * This module sets up i18next for internationalization support, allowing the application
 * to be used in multiple languages. It configures language detection, loads translation
 * resources, and provides utility functions for translating text.
 */

import fs from 'node:fs';
import path from 'node:path';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import ICU from 'i18next-icu';

// Default language
const DEFAULT_LANGUAGE = 'en';

// Supported languages
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja'];

/**
 * Initialize i18next with the specified language
 * @param lng Language code to use
 * @returns Promise that resolves when i18next is initialized
 */
export async function initI18n(lng: string = DEFAULT_LANGUAGE): Promise<typeof i18next> {
  // Ensure the language is supported, fallback to default if not
  const language = SUPPORTED_LANGUAGES.includes(lng) ? lng : DEFAULT_LANGUAGE;

  // Get the locales directory path
  const localesPath = getLocalesPath();

  // Initialize i18next
  await i18next
    .use(Backend)
    .use(ICU)
    .init({
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      debug: process.env.NODE_ENV === 'development',
      interpolation: {
        escapeValue: false, // Not needed for server-side
        format: (value, format, _lng) => {
          if (format === 'uppercase') return value.toUpperCase();
          if (format === 'lowercase') return value.toLowerCase();
          return value;
        },
      },
      backend: {
        loadPath: path.join(localesPath, '{{lng}}/{{ns}}.json'),
      },
      // Add any additional configuration here
    });

  return i18next;
}

/**
 * Get the path to the locales directory
 * @returns Path to the locales directory
 */
function getLocalesPath(): string {
  // Try different paths to find the locales directory
  const possiblePaths = [
    // For local development
    path.resolve('locales'),
    // For npm package
    path.resolve(__dirname, '..', '..', 'locales'),
    // For global installation
    path.resolve(__dirname, '..', '..', '..', 'locales'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to the first path if none exist
  return possiblePaths[0];
}

/**
 * Translate a key using i18next
 * @param key Translation key
 * @param options Translation options
 * @returns Translated text
 */
export function t(key: string, options?: Record<string, any>): string {
  try {
    // Check if i18n is initialized
    if (!i18next.isInitialized) {
      // Return a fallback message
      return options?.message || key;
    }

    const translated = i18next.t(key, options);

    // If translation returns the key itself or undefined, use fallback
    if (!translated || translated === key || translated === 'undefined') {
      return options?.message || key;
    }

    return translated;
  } catch (_error) {
    // In case of any error, return a fallback
    return options?.message || key;
  }
}

/**
 * Get the current language
 * @returns Current language code
 */
export function getCurrentLanguage(): string {
  return i18next.language;
}

/**
 * Change the current language
 * @param lng Language code to change to
 * @returns Promise that resolves when the language is changed
 */
export async function changeLanguage(lng: string): Promise<void> {
  if (!SUPPORTED_LANGUAGES.includes(lng)) {
    console.warn(`Language ${lng} is not supported. Using ${DEFAULT_LANGUAGE} instead.`);
    lng = DEFAULT_LANGUAGE;
  }

  await i18next.changeLanguage(lng);
}

// Export i18next instance for direct access if needed
export default i18next;
