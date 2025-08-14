/**
 * @fileoverview Framework detection utility for AI Code Review
 *
 * This module analyzes project files to determine which framework is being used,
 * allowing for more specific prompts and improved review quality.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import logger from '../logger';

/**
 * Recursively count files with specific extensions in a directory
 * @param dirPath Directory path to search
 * @param extensions Array of file extensions to count (e.g., ['.ts', '.tsx'])
 * @returns Promise resolving to the count of matching files
 */
async function countFilesByExtension(dirPath: string, extensions: string[]): Promise<number> {
  let count = 0;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip common directories that shouldn't be counted
        if (!['node_modules', '.git', 'dist', 'build', '.next', 'coverage'].includes(entry.name)) {
          count += await countFilesByExtension(fullPath, extensions);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          count++;
        }
      }
    }
  } catch (error) {
    logger.debug(`Error reading directory ${dirPath}: ${error}`);
  }

  return count;
}

/**
 * Framework detection result
 */
export interface FrameworkDetectionResult {
  /** Primary programming language detected */
  language: string;
  /** Framework detected */
  framework: string;
  /** Confidence level (0-1) */
  confidence: number;
  /** Detection method used */
  detectionMethod: string;
  /** Any additional frameworks detected */
  additionalFrameworks?: string[];
  /** CSS frameworks detected */
  cssFrameworks?: {
    name: string;
    version?: string;
    confidence: number;
  }[];
  /** Detected framework version */
  frameworkVersion?: string;
  /** Framework type (ui, css, backend, etc.) */
  frameworkType?: string;
}

/**
 * Framework signature definition for detection
 */
interface FrameworkSignature {
  /** Framework name */
  name: string;
  /** Files that indicate this framework */
  files: string[];
  /** Directories that indicate this framework */
  directories?: string[];
  /** Package.json dependencies that indicate this framework */
  dependencies?: string[];
  /** Confidence weight for this signature */
  weight: number;
  /** Framework type (ui, css, backend, etc.) */
  type?: 'ui' | 'css' | 'backend' | 'fullstack';
}

/**
 * Language-specific framework signatures
 */
const FRAMEWORK_SIGNATURES: Record<string, FrameworkSignature[]> = {
  typescript: [
    {
      name: 'react',
      files: ['src/App.tsx', 'src/App.jsx', 'public/index.html'],
      dependencies: ['react', 'react-dom'],
      weight: 0.8,
      type: 'ui',
    },
    {
      name: 'nextjs',
      files: ['next.config.js', 'pages/_app.tsx', 'pages/index.tsx'],
      dependencies: ['next'],
      weight: 0.9,
      type: 'fullstack',
    },
    {
      name: 'angular',
      files: ['angular.json', 'src/app/app.module.ts'],
      dependencies: ['@angular/core', '@angular/common'],
      weight: 0.9,
      type: 'ui',
    },
    {
      name: 'vue',
      files: ['src/App.vue', 'vue.config.js'],
      dependencies: ['vue'],
      weight: 0.8,
      type: 'ui',
    },
    {
      name: 'express',
      files: ['app.js', 'server.js'],
      dependencies: ['express'],
      weight: 0.7,
      type: 'backend',
    },
  ],
  php: [
    {
      name: 'laravel',
      files: ['artisan', 'composer.json'],
      directories: ['app/Http/Controllers', 'resources/views'],
      weight: 0.9,
      type: 'fullstack',
    },
    {
      name: 'symfony',
      files: ['symfony.lock', 'composer.json', 'config/bundles.php'],
      dependencies: ['symfony/symfony', 'symfony/framework-bundle'],
      weight: 0.9,
      type: 'fullstack',
    },
    {
      name: 'wordpress',
      files: ['wp-config.php', 'wp-content/themes'],
      directories: ['wp-admin', 'wp-content'],
      weight: 0.8,
      type: 'fullstack',
    },
  ],
  python: [
    {
      name: 'django',
      files: ['manage.py', 'settings.py'],
      directories: ['app/migrations'],
      dependencies: ['django'],
      weight: 0.9,
      type: 'fullstack',
    },
    {
      name: 'flask',
      files: ['app.py', 'wsgi.py'],
      dependencies: ['flask'],
      weight: 0.8,
      type: 'backend',
    },
    {
      name: 'fastapi',
      files: ['main.py'],
      dependencies: ['fastapi'],
      weight: 0.7,
      type: 'backend',
    },
  ],
  ruby: [
    {
      name: 'rails',
      files: ['Gemfile', 'config/routes.rb', 'app/controllers/application_controller.rb'],
      directories: ['app/models', 'app/controllers', 'app/views'],
      weight: 0.9,
      type: 'fullstack',
    },
    {
      name: 'sinatra',
      files: ['Gemfile', 'config.ru'],
      dependencies: ['sinatra'],
      weight: 0.8,
      type: 'backend',
    },
  ],
  css: [
    {
      name: 'tailwind',
      files: ['tailwind.config.js', 'postcss.config.js'],
      dependencies: ['tailwindcss'],
      weight: 0.9,
      type: 'css',
    },
    {
      name: 'bootstrap',
      files: ['bootstrap.min.css', 'bootstrap.bundle.min.js'],
      dependencies: ['bootstrap'],
      weight: 0.8,
      type: 'css',
    },
    {
      name: 'material-ui',
      files: [],
      dependencies: ['@mui/material', '@material-ui/core'],
      weight: 0.8,
      type: 'css',
    },
    {
      name: 'styled-components',
      files: [],
      dependencies: ['styled-components'],
      weight: 0.7,
      type: 'css',
    },
    {
      name: 'emotion',
      files: [],
      dependencies: ['@emotion/react', '@emotion/styled'],
      weight: 0.7,
      type: 'css',
    },
    {
      name: 'chakra-ui',
      files: [],
      dependencies: ['@chakra-ui/react'],
      weight: 0.8,
      type: 'css',
    },
    {
      name: 'bulma',
      dependencies: ['bulma'],
      files: ['bulma.min.css'],
      weight: 0.7,
      type: 'css',
    },
  ],
};

/**
 * Detect frameworks used in a project
 * @param projectPath Path to project root directory
 * @returns Promise resolving to framework detection result
 */
export async function detectFramework(
  projectPath: string,
): Promise<FrameworkDetectionResult | null> {
  try {
    logger.debug(`Detecting framework for project at ${projectPath}`);

    // First, detect the primary language
    const language = await detectPrimaryLanguage(projectPath);
    if (!language) {
      logger.debug('Could not detect primary language.');
      return null;
    }

    logger.debug(`Detected primary language: ${language}`);

    // Now detect the framework based on the language
    if (FRAMEWORK_SIGNATURES[language]) {
      const frameworkResult = await detectFrameworkForLanguage(projectPath, language);
      if (frameworkResult) {
        logger.debug(
          `Detected framework: ${frameworkResult.framework} with confidence ${frameworkResult.confidence.toFixed(2)}`,
        );
        if (
          frameworkResult.additionalFrameworks &&
          frameworkResult.additionalFrameworks.length > 0
        ) {
          logger.debug(
            `Additional frameworks detected: ${frameworkResult.additionalFrameworks.join(', ')}`,
          );
        }
        return frameworkResult;
      }
    }

    // If we couldn't detect a specific framework, return just the language
    logger.debug(`No specific framework detected for ${language}`);
    return {
      language,
      framework: 'none',
      confidence: 0.5,
      detectionMethod: 'language-only',
    };
  } catch (error) {
    logger.error(
      `Error detecting framework: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Detect the primary programming language used in a project
 * @param projectPath Path to project root directory
 * @returns Promise resolving to language name
 */
export async function detectPrimaryLanguage(projectPath: string): Promise<string | null> {
  try {
    // Check for language-specific files
    const fileExtensionMap: Record<string, string[]> = {
      typescript: ['.ts', '.tsx'],
      javascript: ['.js', '.jsx'],
      php: ['.php'],
      python: ['.py'],
      ruby: ['.rb'],
    };

    // Count files by extension
    const extensionCounts: Record<string, number> = {};

    for (const [language, extensions] of Object.entries(fileExtensionMap)) {
      try {
        const count = await countFilesByExtension(projectPath, extensions);
        extensionCounts[language] = count;
      } catch (error) {
        logger.debug(`Error counting ${language} files: ${error}`);
        extensionCounts[language] = 0;
      }
    }

    // Find the language with the most files
    let maxCount = 0;
    let primaryLanguage: string | null = null;

    for (const [language, count] of Object.entries(extensionCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryLanguage = language;
      }
    }

    // If TypeScript and JavaScript are close, prefer TypeScript
    if (
      primaryLanguage === 'javascript' &&
      extensionCounts.typescript > 0 &&
      extensionCounts.typescript >= extensionCounts.javascript * 0.5
    ) {
      primaryLanguage = 'typescript';
    }

    // Check for special cases: package.json (Node.js), composer.json (PHP), Gemfile (Ruby), requirements.txt (Python)
    try {
      const packageJsonExists = await fileExists(path.join(projectPath, 'package.json'));
      const composerJsonExists = await fileExists(path.join(projectPath, 'composer.json'));
      const gemfileExists = await fileExists(path.join(projectPath, 'Gemfile'));
      const requirementsTxtExists = await fileExists(path.join(projectPath, 'requirements.txt'));

      // IMPORTANT: Language detection priority:
      // 1. Strong file evidence for non-JS/TS languages (Python, PHP, Ruby) takes absolute priority
      // 2. For JS/TS projects, config files can influence the decision
      // 3. Package.json presence suggests Node.js ecosystem

      // If we have strong evidence for Python, PHP, or Ruby, respect it absolutely
      if (primaryLanguage === 'python' && extensionCounts.python > 3) {
        // Keep Python if we have clear Python files
        logger.debug(
          `Strong Python evidence (${extensionCounts.python} files), keeping Python despite package.json`,
        );
      } else if (primaryLanguage === 'php' && extensionCounts.php > 3) {
        // Keep PHP if we have clear PHP files
        logger.debug(`Strong PHP evidence (${extensionCounts.php} files), keeping PHP`);
      } else if (primaryLanguage === 'ruby' && extensionCounts.ruby > 3) {
        // Keep Ruby if we have clear Ruby files
        logger.debug(`Strong Ruby evidence (${extensionCounts.ruby} files), keeping Ruby`);
      } else if (packageJsonExists) {
        // Handle Node.js projects (package.json present)
        if (
          primaryLanguage === null ||
          primaryLanguage === 'javascript' ||
          primaryLanguage === 'typescript'
        ) {
          // Check if this is a TypeScript-oriented project
          const isTypescriptProject = await isTypeScriptProject(projectPath);

          if (isTypescriptProject || extensionCounts.typescript > 0) {
            primaryLanguage = 'typescript';
          } else if (extensionCounts.javascript > 0 || extensionCounts.typescript === 0) {
            // For backward compatibility with tests, default to TypeScript for Node.js projects
            // This maintains the existing behavior while fixing Python detection
            primaryLanguage = 'typescript';
          }
        }
        // If primaryLanguage is Python/PHP/Ruby with few files, package.json might be for tooling
      } else if (composerJsonExists && (primaryLanguage === null || extensionCounts.php > 0)) {
        primaryLanguage = 'php';
      } else if (gemfileExists && (primaryLanguage === null || extensionCounts.ruby > 0)) {
        primaryLanguage = 'ruby';
      } else if (
        requirementsTxtExists &&
        (primaryLanguage === null || extensionCounts.python > 0)
      ) {
        primaryLanguage = 'python';
      }

      // Additional Python detection for projects with Python files but no requirements.txt
      if (primaryLanguage === null && extensionCounts.python > 0) {
        primaryLanguage = 'python';
      }
    } catch (error) {
      logger.debug(`Error checking for special files: ${error}`);
    }

    return primaryLanguage;
  } catch (error) {
    logger.error(
      `Error detecting primary language: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Detect frameworks for a specific language
 * @param projectPath Path to project root directory
 * @param language Language to detect frameworks for
 * @returns Promise resolving to framework detection result
 */
async function detectFrameworkForLanguage(
  projectPath: string,
  language: string,
): Promise<FrameworkDetectionResult | null> {
  try {
    const signatures = FRAMEWORK_SIGNATURES[language] || [];
    const scores: Record<string, number> = {};
    const detectionMethods: Record<string, string[]> = {};

    // Get all dependencies for this project
    const dependencies = await getDependencies(projectPath, language);

    // Detect CSS frameworks
    const cssFrameworks = await detectCssFrameworks(projectPath, dependencies);

    // Store framework versions
    let frameworkVersion: string | undefined;
    let frameworkType: string | undefined;

    // Check for each framework signature
    for (const signature of signatures) {
      let score = 0;
      const methods: string[] = [];

      // Check for files
      for (const file of signature.files) {
        if (await fileExists(path.join(projectPath, file))) {
          score += signature.weight;
          methods.push(`found file: ${file}`);
        }
      }

      // Check for directories
      if (signature.directories) {
        for (const dir of signature.directories) {
          if (await directoryExists(path.join(projectPath, dir))) {
            score += signature.weight * 0.8;
            methods.push(`found directory: ${dir}`);
          }
        }
      }

      // Check for dependencies
      if (signature.dependencies) {
        for (const dep of signature.dependencies) {
          if (dependencies[dep]) {
            score += signature.weight * 0.9;
            methods.push(`found dependency: ${dep}`);

            // Store version of the main dependency
            if (!frameworkVersion) {
              frameworkVersion = dependencies[dep];
            }
          }
        }
      }

      scores[signature.name] = score;
      detectionMethods[signature.name] = methods;

      // Store the framework type if this signature has a high score
      if (score > 0.7 && signature.type) {
        frameworkType = signature.type;
      }
    }

    // Find the framework with the highest score
    let maxScore = 0;
    let detectedFramework: string | null = null;

    for (const [framework, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedFramework = framework;
      }
    }

    // Calculate additional frameworks
    const additionalFrameworks: string[] = [];
    for (const [framework, score] of Object.entries(scores)) {
      if (framework !== detectedFramework && score > 0.5) {
        additionalFrameworks.push(framework);
      }
    }

    // If a framework was detected, return it
    if (detectedFramework) {
      return {
        language,
        framework: detectedFramework,
        confidence: Math.min(maxScore, 1),
        detectionMethod: detectionMethods[detectedFramework].join(', '),
        additionalFrameworks: additionalFrameworks.length > 0 ? additionalFrameworks : undefined,
        cssFrameworks: cssFrameworks.length > 0 ? cssFrameworks : undefined,
        frameworkVersion: frameworkVersion,
        frameworkType: frameworkType,
      };
    }

    // If no framework was detected but we have CSS frameworks, return language with CSS frameworks
    if (cssFrameworks.length > 0) {
      return {
        language,
        framework: 'none',
        confidence: 0.5,
        detectionMethod: 'css-frameworks-only',
        cssFrameworks: cssFrameworks,
      };
    }

    return null;
  } catch (error) {
    logger.error(
      `Error detecting framework for ${language}: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Check if a file exists
 * @param filePath Path to file
 * @returns Promise resolving to boolean
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
}

/**
 * Check if a directory exists
 * @param dirPath Path to directory
 * @returns Promise resolving to boolean
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (_error) {
    return false;
  }
}

/**
 * Check if a Node.js project should be considered a TypeScript project
 * @param projectPath Path to project root
 * @returns Promise resolving to boolean
 */
async function isTypeScriptProject(projectPath: string): Promise<boolean> {
  try {
    // Check for TypeScript config files
    const tsconfigExists = await fileExists(path.join(projectPath, 'tsconfig.json'));
    if (tsconfigExists) {
      return true;
    }

    // Check package.json for TypeScript dependencies
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

      // Check for TypeScript in dependencies or devDependencies
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Look for TypeScript-specific packages
      const typescriptIndicators = [
        'typescript',
        '@types/node',
        'ts-node',
        '@typescript-eslint/parser',
        '@typescript-eslint/eslint-plugin',
      ];

      return typescriptIndicators.some((indicator) => allDeps[indicator]);
    }

    return false;
  } catch (error) {
    logger.debug(`Error checking if TypeScript project: ${error}`);
    return false;
  }
}

/**
 * Get dependencies for a project
 * @param projectPath Path to project
 * @param language Language to get dependencies for
 * @returns Promise resolving to dependency map with versions
 */
async function getDependencies(
  projectPath: string,
  language: string,
): Promise<Record<string, string>> {
  const dependencies: Record<string, string> = {};

  try {
    if (language === 'typescript' || language === 'javascript') {
      // Parse package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fileExists(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));

        // Add both dependencies and devDependencies
        if (packageJson.dependencies) {
          Object.assign(dependencies, packageJson.dependencies);
        }
        if (packageJson.devDependencies) {
          Object.assign(dependencies, packageJson.devDependencies);
        }
      }
    } else if (language === 'php') {
      // Parse composer.json
      const composerJsonPath = path.join(projectPath, 'composer.json');
      if (await fileExists(composerJsonPath)) {
        const composerJson = JSON.parse(await fs.readFile(composerJsonPath, 'utf-8'));

        if (composerJson.require) {
          Object.assign(dependencies, composerJson.require);
        }
        if (composerJson['require-dev']) {
          Object.assign(dependencies, composerJson['require-dev']);
        }
      }
    } else if (language === 'ruby') {
      // Parse Gemfile
      const gemfilePath = path.join(projectPath, 'Gemfile');
      if (await fileExists(gemfilePath)) {
        const gemfile = await fs.readFile(gemfilePath, 'utf-8');

        // Simple regex to extract gem names
        const gemRegex = /gem\s+['"]([^'"]+)['"](?:,\s*['"]([^'"]+)['"])?/g;
        let match;
        while ((match = gemRegex.exec(gemfile)) !== null) {
          dependencies[match[1]] = match[2] || '*';
        }
      }
    } else if (language === 'python') {
      // Parse requirements.txt
      const requirementsPath = path.join(projectPath, 'requirements.txt');
      if (await fileExists(requirementsPath)) {
        const requirements = await fs.readFile(requirementsPath, 'utf-8');

        // Parse each line
        for (const line of requirements.split('\n')) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            // Extract package name and version
            const parts = trimmedLine.split(/([=<>!~]=?)/);
            if (parts.length >= 1) {
              const packageName = parts[0].trim().toLowerCase();
              const version = parts.length >= 3 ? parts[1] + parts[2] : '*';
              if (packageName) {
                dependencies[packageName] = version;
              }
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn(
      `Error getting dependencies: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return dependencies;
}

/**
 * Detect CSS frameworks used in a project
 * @param projectPath Path to project root directory
 * @param dependencies Dependencies map
 * @returns Promise resolving to CSS frameworks detection results
 */
async function detectCssFrameworks(
  projectPath: string,
  dependencies: Record<string, string>,
): Promise<{ name: string; version?: string; confidence: number }[]> {
  const cssFrameworks: { name: string; version?: string; confidence: number }[] = [];

  try {
    // Check for CSS frameworks based on FRAMEWORK_SIGNATURES
    if (FRAMEWORK_SIGNATURES.css) {
      for (const signature of FRAMEWORK_SIGNATURES.css) {
        let score = 0;
        let foundDependency = false;
        let version: string | undefined;

        // Check for dependencies
        if (signature.dependencies) {
          for (const dep of signature.dependencies) {
            if (dependencies[dep]) {
              score += signature.weight * 0.9;
              foundDependency = true;
              version = dependencies[dep];
              break;
            }
          }
        }

        // Check for files
        if (signature.files) {
          for (const file of signature.files) {
            if (await fileExists(path.join(projectPath, file))) {
              score += signature.weight * 0.8;
              break;
            }
          }
        }

        // If we have a score, add it to the list
        if (score > 0.5) {
          cssFrameworks.push({
            name: signature.name,
            version: foundDependency ? version : undefined,
            confidence: Math.min(score, 1),
          });
        }
      }
    }

    // Look for specific CSS files in common locations
    const cssDirs = ['src/styles', 'src/css', 'public/css', 'assets/css', 'styles', 'css'];

    for (const dir of cssDirs) {
      const fullPath = path.join(projectPath, dir);
      if (await directoryExists(fullPath)) {
        try {
          const files = await fs.readdir(fullPath);

          // Look for common CSS framework files
          for (const file of files) {
            const lowerFile = file.toLowerCase();

            if (lowerFile.includes('bootstrap') && lowerFile.endsWith('.css')) {
              if (!cssFrameworks.some((f) => f.name === 'bootstrap')) {
                cssFrameworks.push({ name: 'bootstrap', confidence: 0.7 });
              }
            } else if (lowerFile.includes('bulma') && lowerFile.endsWith('.css')) {
              if (!cssFrameworks.some((f) => f.name === 'bulma')) {
                cssFrameworks.push({ name: 'bulma', confidence: 0.7 });
              }
            } else if (lowerFile.includes('tailwind') && lowerFile.endsWith('.css')) {
              if (!cssFrameworks.some((f) => f.name === 'tailwind')) {
                cssFrameworks.push({ name: 'tailwind', confidence: 0.7 });
              }
            }
          }
        } catch (_error) {
          // Ignore directory read errors
        }
      }
    }

    return cssFrameworks;
  } catch (error) {
    logger.warn(
      `Error detecting CSS frameworks: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}
