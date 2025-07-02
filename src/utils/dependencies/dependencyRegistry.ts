/**
 * @fileoverview Dependency registry for different tech stacks and frameworks
 *
 * This module defines the mappings for different tech stacks, their frameworks,
 * and the locations of their dependency files. It serves as a centralized registry
 * for identifying project dependencies across various technology ecosystems.
 */

import fs from 'fs';
import path from 'path';
import logger from '../logger';

/**
 * Tech stack types supported by the dependency analyzer
 */
export type TechStackType =
  // JavaScript/TypeScript ecosystems
  | 'nodejs'
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'angular'
  | 'svelte'
  // Server-side stacks
  | 'express'
  | 'nestjs'
  | 'fastify'
  // PHP ecosystems
  | 'php'
  | 'laravel'
  | 'symfony'
  | 'wordpress'
  // Python ecosystems
  | 'python'
  | 'django'
  | 'flask'
  | 'fastapi'
  // Ruby ecosystems
  | 'ruby'
  | 'rails'
  // Other ecosystems
  | 'java'
  | 'dotnet'
  | 'go'
  | 'rust';

/**
 * Package file types supported by the dependency analyzer
 */
export type PackageFileType =
  | 'package.json'
  | 'composer.json'
  | 'requirements.txt'
  | 'Gemfile'
  | 'pom.xml'
  | 'build.gradle'
  | 'go.mod'
  | 'Cargo.toml'
  | 'Project.csproj';

/**
 * Stack-specific dependency file location
 */
export interface StackDependencyFile {
  fileType: PackageFileType;
  relativeLocation: string;
  required: boolean;
}

/**
 * Tech stack definition with dependency files
 */
export interface TechStackDefinition {
  name: TechStackType;
  displayName: string;
  dependencyFiles: StackDependencyFile[];
  detectionFiles?: string[];
  packagePrefix?: string;
  parentStack?: TechStackType;
}

/**
 * Registry of tech stacks and their dependency file locations
 */
export const TECH_STACK_REGISTRY: TechStackDefinition[] = [
  // Node.js
  {
    name: 'nodejs',
    displayName: 'Node.js',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    detectionFiles: ['package.json', 'node_modules'],
  },

  // React
  {
    name: 'react',
    displayName: 'React',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    detectionFiles: ['react', 'jsx'],
    packagePrefix: 'react',
    parentStack: 'nodejs',
  },

  // Next.js
  {
    name: 'nextjs',
    displayName: 'Next.js',
    dependencyFiles: [
      { fileType: 'package.json', relativeLocation: '/', required: true },
      { fileType: 'package.json', relativeLocation: '/package-lock.json', required: false },
      { fileType: 'package.json', relativeLocation: '/yarn.lock', required: false },
      { fileType: 'package.json', relativeLocation: '/pnpm-lock.yaml', required: false },
    ],
    detectionFiles: ['next.config.js', '.next', 'pages', 'app/layout.tsx'],
    packagePrefix: 'next',
    parentStack: 'react',
  },

  // Vue
  {
    name: 'vue',
    displayName: 'Vue.js',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    detectionFiles: ['vue.config.js', 'src/main.js', 'src/main.ts', 'components'],
    packagePrefix: 'vue',
    parentStack: 'nodejs',
  },

  // Angular
  {
    name: 'angular',
    displayName: 'Angular',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    detectionFiles: ['angular.json', 'src/app/app.module.ts'],
    packagePrefix: '@angular',
    parentStack: 'nodejs',
  },

  // Express
  {
    name: 'express',
    displayName: 'Express.js',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    packagePrefix: 'express',
    parentStack: 'nodejs',
  },

  // NestJS
  {
    name: 'nestjs',
    displayName: 'NestJS',
    dependencyFiles: [{ fileType: 'package.json', relativeLocation: '/', required: true }],
    detectionFiles: ['nest-cli.json', 'src/main.ts', 'src/app.module.ts'],
    packagePrefix: '@nestjs',
    parentStack: 'nodejs',
  },

  // PHP
  {
    name: 'php',
    displayName: 'PHP',
    dependencyFiles: [{ fileType: 'composer.json', relativeLocation: '/', required: true }],
    detectionFiles: ['composer.json', 'composer.lock', 'php'],
  },

  // Laravel
  {
    name: 'laravel',
    displayName: 'Laravel',
    dependencyFiles: [{ fileType: 'composer.json', relativeLocation: '/', required: true }],
    detectionFiles: ['artisan', 'app/Http/Controllers', 'app/Providers/AppServiceProvider.php'],
    packagePrefix: 'laravel',
    parentStack: 'php',
  },

  // Symfony
  {
    name: 'symfony',
    displayName: 'Symfony',
    dependencyFiles: [{ fileType: 'composer.json', relativeLocation: '/', required: true }],
    detectionFiles: ['symfony.lock', 'config/bundles.php', 'bin/console'],
    packagePrefix: 'symfony',
    parentStack: 'php',
  },

  // WordPress
  {
    name: 'wordpress',
    displayName: 'WordPress',
    dependencyFiles: [{ fileType: 'composer.json', relativeLocation: '/', required: false }],
    detectionFiles: ['wp-config.php', 'wp-content', 'wp-admin'],
    parentStack: 'php',
  },

  // Python
  {
    name: 'python',
    displayName: 'Python',
    dependencyFiles: [{ fileType: 'requirements.txt', relativeLocation: '/', required: true }],
    detectionFiles: ['setup.py', 'pyproject.toml', '.py'],
  },

  // Django
  {
    name: 'django',
    displayName: 'Django',
    dependencyFiles: [{ fileType: 'requirements.txt', relativeLocation: '/', required: true }],
    detectionFiles: ['manage.py', 'settings.py', 'wsgi.py', 'urls.py'],
    packagePrefix: 'django',
    parentStack: 'python',
  },

  // Flask
  {
    name: 'flask',
    displayName: 'Flask',
    dependencyFiles: [{ fileType: 'requirements.txt', relativeLocation: '/', required: true }],
    detectionFiles: ['app.py', 'flask_app.py'],
    packagePrefix: 'flask',
    parentStack: 'python',
  },

  // Ruby
  {
    name: 'ruby',
    displayName: 'Ruby',
    dependencyFiles: [{ fileType: 'Gemfile', relativeLocation: '/', required: true }],
    detectionFiles: ['Gemfile', 'Gemfile.lock', '.rb'],
  },

  // Ruby on Rails
  {
    name: 'rails',
    displayName: 'Ruby on Rails',
    dependencyFiles: [{ fileType: 'Gemfile', relativeLocation: '/', required: true }],
    detectionFiles: ['config/application.rb', 'config/routes.rb', 'app/controllers', 'app/models'],
    packagePrefix: 'rails',
    parentStack: 'ruby',
  },
];

/**
 * Interface for detected stack information
 */
export interface DetectedStack {
  name: TechStackType;
  confidence: 'high' | 'medium' | 'low';
  dependencyFiles: string[];
  parentStacks: TechStackType[];
}

/**
 * Detect the tech stack(s) used in a project
 * @param projectPath The path to the project directory
 * @returns Promise with array of detected stacks
 */
export async function detectTechStacks(projectPath: string): Promise<DetectedStack[]> {
  const detectedStacks: DetectedStack[] = [];

  try {
    // Check if projectPath is undefined or null
    if (!projectPath) {
      logger.error('Project path is undefined or null in detectTechStacks');
      return [];
    }

    // Check for each stack type by looking for the defining files
    for (const stack of TECH_STACK_REGISTRY) {
      let foundFiles = 0;
      let totalRequired = 0;
      const foundDependencyFiles: string[] = [];

      // Check for required dependency files
      for (const depFile of stack.dependencyFiles) {
        const filePath = path.join(projectPath, depFile.relativeLocation, depFile.fileType);

        try {
          // Check if file exists
          await fs.promises.access(filePath);
          foundFiles++;
          foundDependencyFiles.push(filePath);
          logger.debug(`Found ${depFile.fileType} for ${stack.name} at ${filePath}`);
        } catch (error) {
          if (depFile.required) {
            totalRequired++;
            logger.debug(
              `Required file ${depFile.fileType} for ${stack.name} not found at ${filePath}`,
            );
          }
        }
      }

      // Check for detection files if dependency files are found
      let detectionFileMatch = false;
      if (stack.detectionFiles && foundFiles > 0) {
        for (const detectionFile of stack.detectionFiles) {
          // Check for file/directory existence or glob pattern matches
          const filePath = path.join(projectPath, detectionFile);

          try {
            await fs.promises.access(filePath);
            detectionFileMatch = true;
            logger.debug(`Found detection file ${detectionFile} for ${stack.name}`);
            break;
          } catch (error) {
            // Not found, continue checking
          }
        }
      }

      // Determine confidence level
      let confidence: 'high' | 'medium' | 'low' = 'low';

      if (foundFiles > 0 && (totalRequired === 0 || foundFiles >= totalRequired)) {
        if (detectionFileMatch) {
          confidence = 'high';
        } else if (stack.packagePrefix) {
          // TODO: Check if packages with prefix exist in dependency files
          confidence = 'medium';
        } else {
          confidence = 'medium';
        }

        // Get parent stacks
        const parentStacks: TechStackType[] = [];
        let currentParent = stack.parentStack;

        while (currentParent) {
          parentStacks.push(currentParent);
          const parentDef = TECH_STACK_REGISTRY.find((s) => s.name === currentParent);
          currentParent = parentDef?.parentStack;
        }

        detectedStacks.push({
          name: stack.name,
          confidence,
          dependencyFiles: foundDependencyFiles,
          parentStacks,
        });
      }
    }

    return detectedStacks;
  } catch (error) {
    logger.error(
      `Error detecting tech stacks: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Get all package file locations for a specific tech stack
 * @param stack The detected tech stack
 * @param projectPath The path to the project
 * @returns Array of package file paths
 */
export function getPackageFilesForStack(stack: DetectedStack, projectPath: string): string[] {
  const allStacks = [stack.name, ...stack.parentStacks];
  const packageFiles: string[] = [];

  // Get package files for the stack and all parent stacks
  for (const stackName of allStacks) {
    const stackDef = TECH_STACK_REGISTRY.find((s) => s.name === stackName);

    if (stackDef) {
      for (const depFile of stackDef.dependencyFiles) {
        const filePath = path.join(projectPath, depFile.relativeLocation, depFile.fileType);
        if (!packageFiles.includes(filePath)) {
          packageFiles.push(filePath);
        }
      }
    }
  }

  return packageFiles;
}

/**
 * Get package file type from file path
 * @param filePath The path to the package file
 * @returns The package file type or undefined if not recognized
 */
export function getPackageFileType(filePath: string): PackageFileType | undefined {
  const fileName = path.basename(filePath);

  if (fileName === 'package.json') return 'package.json';
  if (fileName === 'composer.json') return 'composer.json';
  if (fileName === 'requirements.txt') return 'requirements.txt';
  if (fileName === 'Gemfile') return 'Gemfile';
  if (fileName === 'pom.xml') return 'pom.xml';
  if (fileName === 'build.gradle') return 'build.gradle';
  if (fileName === 'go.mod') return 'go.mod';
  if (fileName === 'Cargo.toml') return 'Cargo.toml';
  if (fileName.endsWith('.csproj')) return 'Project.csproj';

  return undefined;
}
