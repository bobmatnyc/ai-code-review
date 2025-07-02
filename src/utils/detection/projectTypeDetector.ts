/**
 * @fileoverview Project type detection utilities.
 *
 * This module provides functions to automatically detect project types
 * and programming languages from project files and structure. It's used
 * to set default language options without requiring manual specification.
 */

import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_LANGUAGE, type ProgrammingLanguage } from '../../types/common';
import logger from '../logger';

/**
 * Project type detection result
 */
export interface ProjectDetectionResult {
  /** The primary programming language of the project */
  language: ProgrammingLanguage;
  /** Confidence level of the detection (high, medium, low) */
  confidence: 'high' | 'medium' | 'low';
  /** Additional detected languages */
  additionalLanguages?: ProgrammingLanguage[];
  /** Project type (framework, library, application, etc.) */
  projectType?: string;
}

/**
 * Project type signature defining files that are checked
 * to identify a project's language and type
 */
interface ProjectTypeSignature {
  /** Programming language of the project */
  language: ProgrammingLanguage;
  /** Required files that must exist for this project type */
  requiredFiles: string[];
  /** Optional files that help confirm the project type but aren't required */
  optionalFiles?: string[];
  /** Additional check function for complex conditions */
  additionalCheck?: (projectPath: string) => Promise<boolean>;
  /** Project type name (framework, library, application, etc.) */
  projectType?: string;
  /** Detection confidence based on how specific the signature is */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Project type signatures for different languages and frameworks
 */
const PROJECT_SIGNATURES: ProjectTypeSignature[] = [
  // Ruby signatures
  {
    language: 'ruby',
    requiredFiles: ['Gemfile'],
    optionalFiles: ['config/routes.rb', 'app/controllers'],
    projectType: 'Ruby on Rails',
    confidence: 'high',
  },
  {
    language: 'ruby',
    requiredFiles: ['config/routes.rb'],
    projectType: 'Ruby on Rails',
    confidence: 'high',
  },
  {
    language: 'ruby',
    requiredFiles: ['config/application.rb'],
    projectType: 'Ruby on Rails',
    confidence: 'high',
  },
  {
    language: 'ruby',
    requiredFiles: ['Rakefile', 'Gemfile'],
    confidence: 'high',
  },
  {
    language: 'ruby',
    requiredFiles: ['config.ru'],
    projectType: 'Rack',
    confidence: 'medium',
  },
  {
    language: 'ruby',
    requiredFiles: ['bin/rails'],
    projectType: 'Ruby on Rails',
    confidence: 'high',
  },
  {
    language: 'ruby',
    requiredFiles: ['.ruby-version'],
    confidence: 'medium',
  },
  {
    language: 'ruby',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .rb files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.rb'));
      } catch {
        return false;
      }
    },
    confidence: 'low',
  },

  // Python signatures
  {
    language: 'python',
    requiredFiles: ['requirements.txt'],
    optionalFiles: ['setup.py', 'pyproject.toml'],
    confidence: 'high',
  },
  {
    language: 'python',
    requiredFiles: ['setup.py'],
    confidence: 'high',
  },
  {
    language: 'python',
    requiredFiles: ['pyproject.toml'],
    confidence: 'high',
  },
  {
    language: 'python',
    requiredFiles: ['Pipfile'],
    confidence: 'high',
  },
  {
    language: 'python',
    requiredFiles: ['manage.py'],
    projectType: 'Django',
    confidence: 'high',
  },
  {
    language: 'python',
    requiredFiles: ['app.py'],
    optionalFiles: ['wsgi.py', 'templates/'],
    projectType: 'Flask',
    confidence: 'medium',
  },
  {
    language: 'python',
    requiredFiles: ['__init__.py'],
    confidence: 'medium',
  },
  {
    language: 'python',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .py files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.py'));
      } catch {
        return false;
      }
    },
    confidence: 'low',
  },

  // Go signatures
  {
    language: 'go',
    requiredFiles: ['go.mod'],
    optionalFiles: ['go.sum', 'main.go'],
    confidence: 'high',
  },
  {
    language: 'go',
    requiredFiles: ['main.go'],
    confidence: 'medium',
  },
  {
    language: 'go',
    requiredFiles: ['cmd/'],
    optionalFiles: ['internal/', 'pkg/'],
    projectType: 'Go CLI Application',
    confidence: 'medium',
  },
  {
    language: 'go',
    requiredFiles: ['Dockerfile'],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check if Dockerfile mentions Go
      try {
        const dockerfilePath = path.join(projectPath, 'Dockerfile');
        const dockerfileContent = await fs.readFile(dockerfilePath, 'utf-8');
        return dockerfileContent.includes('golang') || dockerfileContent.includes('go:');
      } catch {
        return false;
      }
    },
    projectType: 'Go Docker Application',
    confidence: 'medium',
  },
  {
    language: 'go',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .go files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.go'));
      } catch {
        return false;
      }
    },
    confidence: 'low',
  },

  // PHP signatures
  {
    language: 'php',
    requiredFiles: ['composer.json'],
    confidence: 'high',
  },
  {
    language: 'php',
    requiredFiles: ['artisan'],
    optionalFiles: ['app/Http/Controllers/'],
    projectType: 'Laravel',
    confidence: 'high',
  },
  {
    language: 'php',
    requiredFiles: ['vendor/autoload.php'],
    confidence: 'medium',
  },
  {
    language: 'php',
    requiredFiles: ['wp-config.php'],
    projectType: 'WordPress',
    confidence: 'high',
  },
  {
    language: 'php',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .php files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.php'));
      } catch {
        return false;
      }
    },
    confidence: 'low',
  },

  // TypeScript signatures
  {
    language: 'typescript',
    requiredFiles: ['tsconfig.json'],
    confidence: 'high',
  },
  {
    language: 'typescript',
    requiredFiles: ['package.json'],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for TypeScript in dependencies or devDependencies
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        return (
          (packageJson.dependencies && packageJson.dependencies.typescript) ||
          (packageJson.devDependencies && packageJson.devDependencies.typescript)
        );
      } catch {
        return false;
      }
    },
    confidence: 'high',
  },
  {
    language: 'typescript',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .ts files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.ts') || file.endsWith('.tsx'));
      } catch {
        return false;
      }
    },
    confidence: 'medium',
  },

  // JavaScript signatures
  {
    language: 'javascript',
    requiredFiles: ['package.json'],
    optionalFiles: ['webpack.config.js', 'babel.config.js', '.babelrc'],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // TypeScript check to ensure this isn't a TypeScript project
      try {
        const files = await fs.readdir(projectPath);
        const hasTypeScriptFiles = files.some(
          (file) => file.endsWith('.ts') || file.endsWith('.tsx') || file === 'tsconfig.json',
        );
        return !hasTypeScriptFiles;
      } catch {
        return true; // If we can't check, assume it's JavaScript
      }
    },
    confidence: 'high',
  },
  {
    language: 'javascript',
    requiredFiles: [],
    additionalCheck: async (projectPath: string): Promise<boolean> => {
      // Check for .js files
      try {
        const files = await fs.readdir(projectPath);
        return files.some((file) => file.endsWith('.js') || file.endsWith('.jsx'));
      } catch {
        return false;
      }
    },
    confidence: 'low',
  },
];

/**
 * Check if all specified files exist in the project directory
 * @param projectPath Project directory path
 * @param files Array of files to check
 * @returns True if all specified files exist
 */
async function checkFilesExist(projectPath: string, files: string[]): Promise<boolean> {
  if (files.length === 0) return true;

  for (const file of files) {
    const filePath = path.join(projectPath, file);

    try {
      if (!existsSync(filePath)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Count files with specific extensions in a directory
 * @param projectPath Project directory path
 * @param extensions Array of file extensions to count (e.g., ['.py', '.js'])
 * @returns Number of files with the specified extensions
 */
async function countFilesByExtension(projectPath: string, extensions: string[]): Promise<number> {
  try {
    let count = 0;
    const files = await fs.readdir(projectPath);

    for (const file of files) {
      const filePath = path.join(projectPath, file);
      try {
        const stats = await fs.stat(filePath);

        if (stats.isFile() && extensions.some((ext) => file.endsWith(ext))) {
          count++;
        } else if (stats.isDirectory() && file !== 'node_modules' && file !== '.git') {
          // Recursively count files in subdirectories, excluding node_modules and .git
          count += await countFilesByExtension(filePath, extensions);
        }
      } catch {}
    }

    return count;
  } catch {
    return 0;
  }
}

/**
 * Get file extension counts for major languages
 * @param projectPath Project directory path
 * @returns Object with counts of files by language
 */
async function getLanguageFileStats(
  projectPath: string,
): Promise<Record<ProgrammingLanguage, number>> {
  const extensionMap: Record<ProgrammingLanguage, string[]> = {
    typescript: ['.ts', '.tsx'],
    javascript: ['.js', '.jsx'],
    python: ['.py'],
    php: ['.php'],
    java: ['.java'],
    go: ['.go'],
    rust: ['.rs'],
    c: ['.c', '.h'],
    cpp: ['.cpp', '.hpp'],
    csharp: ['.cs'],
    ruby: ['.rb'],
    swift: ['.swift'],
    kotlin: ['.kt'],
  };

  const result: Record<ProgrammingLanguage, number> = {
    typescript: 0,
    javascript: 0,
    python: 0,
    php: 0,
    java: 0,
    go: 0,
    rust: 0,
    c: 0,
    cpp: 0,
    csharp: 0,
    ruby: 0,
    swift: 0,
    kotlin: 0,
  };

  for (const [language, extensions] of Object.entries(extensionMap)) {
    result[language as ProgrammingLanguage] = await countFilesByExtension(projectPath, extensions);
  }

  return result;
}

/**
 * Auto-detect project type and primary programming language
 * @param projectPath Project directory path
 * @returns Detection result with language and confidence
 */
export async function detectProjectType(projectPath: string): Promise<ProjectDetectionResult> {
  try {
    // Check project signatures in order (most specific first)
    for (const signature of PROJECT_SIGNATURES) {
      const requiredFilesExist = await checkFilesExist(projectPath, signature.requiredFiles);

      if (!requiredFilesExist) continue;

      // Check optional files if specified
      // No longer using this score in calculations, but keeping the logic for future enhancements
      if (signature.optionalFiles && signature.optionalFiles.length > 0) {
        for (const file of signature.optionalFiles) {
          if (existsSync(path.join(projectPath, file))) {
            // Files exist but score is not currently used
          }
        }
      }

      // Run additional check if specified
      if (signature.additionalCheck) {
        const additionalCheckPassed = await signature.additionalCheck(projectPath);
        if (!additionalCheckPassed) continue;
      }

      // Calculate additional languages
      const languageStats = await getLanguageFileStats(projectPath);

      // Filter languages with significant presence (more than 3 files)
      const additionalLanguages = Object.entries(languageStats)
        .filter(
          ([lang, count]) => count > 3 && lang !== signature.language && lang !== 'typescript',
        )
        .sort((a, b) => b[1] - a[1]) // Sort by file count (descending)
        .map(([lang]) => lang as ProgrammingLanguage);

      return {
        language: signature.language,
        confidence: signature.confidence,
        projectType: signature.projectType,
        additionalLanguages: additionalLanguages.length > 0 ? additionalLanguages : undefined,
      };
    }

    // Fallback to statistical detection if no signature matched
    const languageStats = await getLanguageFileStats(projectPath);

    // Get language with most files
    const entries = Object.entries(languageStats);
    if (entries.length === 0 || entries.every(([_, count]) => count === 0)) {
      // No files with known extensions found
      return {
        language: DEFAULT_LANGUAGE,
        confidence: 'low',
      };
    }

    const sortedLanguages = entries.sort((a, b) => b[1] - a[1]);
    const primaryLanguage = sortedLanguages[0][0] as ProgrammingLanguage;
    const primaryCount = sortedLanguages[0][1];

    // If very few files, confidence is low
    if (primaryCount < 3) {
      return {
        language: primaryLanguage,
        confidence: 'low',
      };
    }

    // Filter additional languages (more than 3 files, not the primary language)
    const additionalLanguages = sortedLanguages
      .filter(([lang, count]) => count > 3 && lang !== primaryLanguage)
      .map(([lang]) => lang as ProgrammingLanguage);

    return {
      language: primaryLanguage,
      confidence: 'medium',
      additionalLanguages: additionalLanguages.length > 0 ? additionalLanguages : undefined,
    };
  } catch (error) {
    logger.error(
      `Error detecting project type: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      language: DEFAULT_LANGUAGE,
      confidence: 'low',
    };
  }
}
