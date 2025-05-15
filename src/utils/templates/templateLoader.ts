/**
 * Template Loader Utility
 * 
 * This utility loads and compiles Handlebars templates from the promptText directory.
 * It supports variable substitution, partials, and conditional logic.
 */

import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { logger } from '../logger';

// Define the base path for templates
const TEMPLATES_DIR = path.resolve(process.cwd(), 'promptText');

// Interface for framework version information
interface FrameworkVersion {
  version: string;
  releaseDate: string;
  supportedUntil: string;
  features: string[];
  [key: string]: any;
}

// Interface for framework information
interface Framework {
  latest: FrameworkVersion;
  previous: FrameworkVersion;
  [key: string]: any;
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
  Handlebars.registerHelper('eq', function(arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  // Register partials by scanning the common directory
  const partialsDir = path.join(TEMPLATES_DIR, 'common');
  registerPartials(partialsDir, '');
}

/**
 * Recursively register partials from a directory
 * 
 * @param dirPath Directory path to scan for partials
 * @param prefix Prefix for partial names (based on directory hierarchy)
 */
function registerPartials(dirPath: string, prefix: string): void {
  if (!fs.existsSync(dirPath)) {
    logger.warn(`Partials directory not found: ${dirPath}`);
    return;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      // Recurse into subdirectories
      registerPartials(fullPath, `${prefix}${entry.name}/`);
    } else if (entry.name.endsWith('.hbs')) {
      // Register .hbs files as partials
      const partialName = `${prefix}${entry.name.replace('.hbs', '')}`;
      const partialContent = fs.readFileSync(fullPath, 'utf-8');
      Handlebars.registerPartial(`common/${partialName}`, partialContent);
      logger.debug(`Registered partial: common/${partialName}`);
    }
  }
}

/**
 * Load template variables from JSON files
 * 
 * @returns Combined variables object for template rendering
 */
function loadTemplateVariables(): Record<string, any> {
  const variables: Record<string, any> = {};
  
  // Load framework versions data
  const frameworksPath = path.join(TEMPLATES_DIR, 'common', 'variables', 'framework-versions.json');
  if (fs.existsSync(frameworksPath)) {
    try {
      const frameworkData = JSON.parse(fs.readFileSync(frameworksPath, 'utf-8')) as FrameworkData;
      variables.frameworks = frameworkData.frameworks;
    } catch (error) {
      logger.error(`Error loading framework versions data: ${error}`);
    }
  }
  
  // Load CSS frameworks data
  const cssFrameworksPath = path.join(TEMPLATES_DIR, 'common', 'variables', 'css-frameworks.json');
  if (fs.existsSync(cssFrameworksPath)) {
    try {
      const cssFrameworkData = JSON.parse(fs.readFileSync(cssFrameworksPath, 'utf-8')) as CssFrameworkData;
      variables.cssFrameworks = cssFrameworkData.cssFrameworks;
    } catch (error) {
      logger.error(`Error loading CSS frameworks data: ${error}`);
    }
  }
  
  // Can add more variable sources here as needed
  
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
  
  const fullPath = path.join(TEMPLATES_DIR, templatePath);
  
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
  customVars: Record<string, any> = {}
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
  framework?: string
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
  
  logger.error(`No template found for reviewType=${reviewType}, language=${language}, framework=${framework}`);
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
    reviewTypes: []
  };
  
  // Scan frameworks directory
  const frameworksDir = path.join(TEMPLATES_DIR, 'frameworks');
  if (fs.existsSync(frameworksDir)) {
    result.frameworks = fs.readdirSync(frameworksDir)
      .filter(entry => fs.statSync(path.join(frameworksDir, entry)).isDirectory());
  }
  
  // Scan languages directory
  const languagesDir = path.join(TEMPLATES_DIR, 'languages');
  if (fs.existsSync(languagesDir)) {
    result.languages = fs.readdirSync(languagesDir)
      .filter(entry => fs.statSync(path.join(languagesDir, entry)).isDirectory());
  }
  
  // Get review types from any framework (assuming all frameworks have the same review types)
  if (result.frameworks.length > 0) {
    const firstFrameworkDir = path.join(frameworksDir, result.frameworks[0]);
    result.reviewTypes = fs.readdirSync(firstFrameworkDir)
      .filter(entry => entry.endsWith('.hbs'))
      .map(entry => entry.replace('.hbs', ''));
  }
  
  return result;
}

/**
 * Export loadPromptTemplate as default
 */
export default {
  renderTemplate,
  loadPromptTemplate,
  listAvailableTemplates
};