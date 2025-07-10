/**
 * Template Loader Utility
 *
 * This utility loads and compiles Handlebars templates from the promptText directory.
 * It supports variable substitution, partials, and conditional logic.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as Handlebars from 'handlebars';
import configManager from './configManager';
import logger from './logger';

// Get the templates directory from configuration or use a fallback
const getTemplatesDir = (): string => {
  try {
    // Use the configured path from configManager
    const configuredPath = configManager.getPathsConfig().promptsDir;
    if (configuredPath && fs.existsSync(configuredPath)) {
      logger.debug(`Using configured templates directory: ${configuredPath}`);
      return configuredPath;
    }

    // Fallback to default
    const defaultPath = path.resolve(process.cwd(), 'promptText');
    logger.debug(`Using default templates directory: ${defaultPath}`);
    return defaultPath;
  } catch (error) {
    // If there's any error with the configuration, use default
    logger.warn(
      `Error getting templates directory from config: ${error instanceof Error ? error.message : String(error)}`,
    );
    const fallbackPath = path.resolve(process.cwd(), 'promptText');
    logger.debug(`Using fallback templates directory: ${fallbackPath}`);
    return fallbackPath;
  }
};

// Interface for framework version information
interface FrameworkVersion {
  version: string;
  releaseDate: string;
  supportedUntil: string;
  features: string[];
  [key: string]: unknown;
}

// Interface for framework information
interface Framework {
  latest: FrameworkVersion;
  previous: FrameworkVersion;
  [key: string]: unknown;
}

// Interface for framework data
interface FrameworkData {
  frameworks: {
    [key: string]: Framework;
  };
}

// Interface for CSS framework data
interface CssFrameworkData {
  cssFrameworks: {
    [key: string]: {
      name: string;
      version: string;
      releaseDate: string;
      features: string[];
      integrations: {
        [key: string]: string;
      };
    };
  };
}

/**
 * Template cache to avoid re-reading and re-compiling templates
 */
const templateCache: Record<string, HandlebarsTemplateDelegate> = {};

/**
 * Register helpers and partials for Handlebars
 */
function initializeHandlebars(): void {
  // Register comparison helper
  Handlebars.registerHelper(
    'eq',
    function (this: unknown, arg1: unknown, arg2: unknown, options: Handlebars.HelperOptions) {
      return arg1 === arg2 ? options.fn(this) : options.inverse(this);
    },
  );

  // Register join helper for arrays
  Handlebars.registerHelper('join', (array: unknown, separator: string) => {
    if (Array.isArray(array)) {
      return array.join(separator);
    }
    return '';
  });

  // Register partials by scanning the common directory
  const partialsDir = path.join(getTemplatesDir(), 'common');
  registerPartials(partialsDir, '');
}

/**
 * Recursively register partials from a directory
 *
 * @param dirPath Directory path to scan for partials
 * @param prefix Prefix for partial names (based on directory hierarchy)
 */
function registerPartials(dirPath: string, prefix: string): void {
  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      logger.warn(`Partials directory not found: ${dirPath}`);
      return;
    }

    // Read directory entries
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        registerPartials(fullPath, `${prefix}${entry.name}/`);
      } else if (entry.name.endsWith('.hbs')) {
        try {
          // Register .hbs files as partials
          const partialName = `${prefix}${entry.name.replace('.hbs', '')}`;
          const partialContent = fs.readFileSync(fullPath, 'utf-8');
          Handlebars.registerPartial(`common/${partialName}`, partialContent);
          logger.debug(`Registered partial: common/${partialName}`);
        } catch (partialError) {
          // Handle errors for individual partial files
          logger.error(
            `Error registering partial ${fullPath}: ${
              partialError instanceof Error ? partialError.message : String(partialError)
            }`,
          );
          // Continue with other partials even if one fails
        }
      }
    }
  } catch (error) {
    // Handle directory reading errors
    logger.error(
      `Error scanning partials directory ${dirPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    // Return so calling code knows registration may be incomplete
  }
}

/**
 * Load template variables from JSON files
 *
 * @returns Combined variables object for template rendering
 */
function loadTemplateVariables(): Record<string, unknown> {
  const variables: Record<string, unknown> = {};

  try {
    // Check if variables directory exists
    const variablesDir = path.join(getTemplatesDir(), 'common', 'variables');
    if (!fs.existsSync(variablesDir)) {
      logger.warn(`Variables directory not found: ${variablesDir}`);
      return variables;
    }

    // Load framework versions data
    const frameworksPath = path.join(variablesDir, 'framework-versions.json');
    if (fs.existsSync(frameworksPath)) {
      try {
        const fileContents = fs.readFileSync(frameworksPath, 'utf-8');
        const frameworkData = JSON.parse(fileContents) as FrameworkData;
        variables.frameworks = frameworkData.frameworks;
        logger.debug('Successfully loaded framework versions data');
      } catch (readError) {
        logger.error(
          `Error reading or parsing framework versions data: ${
            readError instanceof Error ? readError.message : String(readError)
          }`,
        );
        // Provide empty frameworks object instead of leaving it undefined
        variables.frameworks = {};
      }
    } else {
      logger.debug(`Framework versions file not found: ${frameworksPath}`);
      variables.frameworks = {};
    }

    // Load CSS frameworks data
    const cssFrameworksPath = path.join(variablesDir, 'css-frameworks.json');
    if (fs.existsSync(cssFrameworksPath)) {
      try {
        const fileContents = fs.readFileSync(cssFrameworksPath, 'utf-8');
        const cssFrameworkData = JSON.parse(fileContents) as CssFrameworkData;
        variables.cssFrameworks = cssFrameworkData.cssFrameworks;
        logger.debug('Successfully loaded CSS frameworks data');
      } catch (readError) {
        logger.error(
          `Error reading or parsing CSS frameworks data: ${
            readError instanceof Error ? readError.message : String(readError)
          }`,
        );
        // Provide empty cssFrameworks object instead of leaving it undefined
        variables.cssFrameworks = {};
      }
    } else {
      logger.debug(`CSS frameworks file not found: ${cssFrameworksPath}`);
      variables.cssFrameworks = {};
    }

    // Scan the variables directory for other JSON files and load them
    try {
      const entries = fs.readdirSync(variablesDir);
      const otherJsonFiles = entries.filter(
        (entry) =>
          entry.endsWith('.json') &&
          entry !== 'framework-versions.json' &&
          entry !== 'css-frameworks.json',
      );

      for (const jsonFile of otherJsonFiles) {
        try {
          const filePath = path.join(variablesDir, jsonFile);
          const fileContents = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(fileContents);

          // Use the filename without extension as the variable key
          const key = jsonFile.replace('.json', '');
          variables[key] = data;
          logger.debug(`Loaded additional variable file: ${jsonFile}`);
        } catch (fileError) {
          logger.error(
            `Error reading or parsing ${jsonFile}: ${
              fileError instanceof Error ? fileError.message : String(fileError)
            }`,
          );
        }
      }
    } catch (scanError) {
      logger.error(
        `Error scanning variables directory for additional JSON files: ${
          scanError instanceof Error ? scanError.message : String(scanError)
        }`,
      );
    }
  } catch (error) {
    // Catch any unexpected errors
    logger.error(
      `Unexpected error loading template variables: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return variables;
}

/**
 * Load and compile a template from the given path
 *
 * @param templatePath Path to the template file (relative to TEMPLATES_DIR)
 * @returns Compiled Handlebars template function
 */
function loadTemplate(templatePath: string): HandlebarsTemplateDelegate | null {
  // Check cache first
  if (templateCache[templatePath]) {
    return templateCache[templatePath];
  }

  const fullPath = path.join(getTemplatesDir(), templatePath);

  // Check if template exists
  if (!fs.existsSync(fullPath)) {
    logger.error(`Template not found: ${fullPath}`);
    return null;
  }

  try {
    // Read and compile template
    const templateContent = fs.readFileSync(fullPath, 'utf-8');
    const template = Handlebars.compile(templateContent);

    // Cache compiled template
    templateCache[templatePath] = template;

    return template;
  } catch (error) {
    logger.error(`Error loading template ${fullPath}: ${error}`);
    return null;
  }
}

/**
 * Render a template with provided variables
 *
 * @param templatePath Path to the template file (relative to TEMPLATES_DIR)
 * @param customVars Optional custom variables to merge with default variables
 * @returns Rendered template string or null if rendering fails
 */
export function renderTemplate(
  templatePath: string,
  customVars: Record<string, unknown> = {},
): string | null {
  // Initialize Handlebars if not already initialized
  if (Object.keys(Handlebars.partials).length === 0) {
    initializeHandlebars();
  }

  // Load template
  const template = loadTemplate(templatePath);
  if (!template) {
    return null;
  }

  // Load variables and merge with custom vars
  const defaultVars = loadTemplateVariables();
  const variables = { ...defaultVars, ...customVars };

  try {
    // Render template with variables
    return template(variables);
  } catch (error) {
    logger.error(`Error rendering template ${templatePath}: ${error}`);
    return null;
  }
}

/**
 * Load a template for a specific framework or language
 *
 * @param reviewType Type of review (e.g., 'best-practices', 'security')
 * @param language Language (e.g., 'typescript', 'python')
 * @param framework Optional framework (e.g., 'react', 'angular')
 * @returns Rendered template string or null if not found
 */
export function loadPromptTemplate(
  reviewType: string,
  language?: string,
  framework?: string,
): string | null {
  // Try framework-specific template first
  if (language && framework) {
    const frameworkPath = `frameworks/${framework}/${reviewType}.hbs`;
    const rendered = renderTemplate(frameworkPath);
    if (rendered) {
      logger.debug(`Loaded framework-specific template: ${frameworkPath}`);
      return rendered;
    }
  }

  // Try language-specific template
  if (language) {
    const languagePath = `languages/${language}/${reviewType}.hbs`;
    const rendered = renderTemplate(languagePath);
    if (rendered) {
      logger.debug(`Loaded language-specific template: ${languagePath}`);
      return rendered;
    }
  }

  // Fall back to generic template
  const genericPath = `languages/generic/${reviewType}.hbs`;
  const rendered = renderTemplate(genericPath);
  if (rendered) {
    logger.debug(`Loaded generic template: ${genericPath}`);
    return rendered;
  }

  logger.error(
    `No template found for reviewType=${reviewType}, language=${language ?? 'undefined'}, framework=${framework ?? 'undefined'}`,
  );
  return null;
}

/**
 * List all available templates
 *
 * @returns Map of available templates by category
 */
export function listAvailableTemplates(): Record<string, string[]> {
  const result: Record<string, string[]> = {
    frameworks: [],
    languages: [],
    reviewTypes: [],
  };

  try {
    // Scan frameworks directory
    const frameworksDir = path.join(getTemplatesDir(), 'frameworks');
    if (fs.existsSync(frameworksDir)) {
      try {
        const entries = fs.readdirSync(frameworksDir, { withFileTypes: true });
        result.frameworks = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      } catch (error) {
        logger.error(
          `Error reading frameworks directory ${frameworksDir}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      logger.debug(`Frameworks directory not found: ${frameworksDir}`);
    }

    // Scan languages directory
    const languagesDir = path.join(getTemplatesDir(), 'languages');
    if (fs.existsSync(languagesDir)) {
      try {
        const entries = fs.readdirSync(languagesDir, { withFileTypes: true });
        result.languages = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      } catch (error) {
        logger.error(
          `Error reading languages directory ${languagesDir}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    } else {
      logger.debug(`Languages directory not found: ${languagesDir}`);
    }

    // Get review types from any framework (assuming all frameworks have the same review types)
    // or from the generic directory if no frameworks are available
    if (Array.isArray(result.frameworks) && result.frameworks.length > 0) {
      try {
        const firstFramework = result.frameworks[0];
        if (firstFramework) {
          const firstFrameworkDir = path.join(frameworksDir, firstFramework);
          if (fs.existsSync(firstFrameworkDir)) {
            const entries = fs.readdirSync(firstFrameworkDir);
            result.reviewTypes = entries
              .filter((entry) => entry.endsWith('.hbs'))
              .map((entry) => entry.replace('.hbs', ''));
          }
        }
      } catch (error) {
        logger.error(
          `Error reading review types from framework directory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // If we couldn't get review types from frameworks, try the generic directory
    if (!Array.isArray(result.reviewTypes) || result.reviewTypes.length === 0) {
      try {
        const genericDir = path.join(languagesDir, 'generic');
        if (fs.existsSync(genericDir)) {
          const entries = fs.readdirSync(genericDir);
          result.reviewTypes = entries
            .filter((entry) => entry.endsWith('.hbs'))
            .map((entry) => entry.replace('.hbs', ''));
        }
      } catch (error) {
        logger.error(
          `Error reading review types from generic directory: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  } catch (error) {
    // Catch any other unexpected errors
    logger.error(
      `Unexpected error listing available templates: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  return result;
}

/**
 * Clear the template cache to force reloading of templates
 * This is useful when the configuration changes
 */
export function clearTemplateCache(): void {
  // Reset cache and Handlebars registrations
  for (const key in templateCache) {
    delete templateCache[key];
  }

  // Clear registered partials
  for (const key in Handlebars.partials) {
    Handlebars.unregisterPartial(key);
  }

  logger.debug('Template cache cleared');
}

/**
 * Export loadPromptTemplate as default
 */
export default {
  renderTemplate,
  loadPromptTemplate,
  listAvailableTemplates,
  clearTemplateCache,
};
