/**
 * @fileoverview Toolchain detection utility for identifying project types
 *
 * This module provides functionality to detect the toolchain and framework
 * used by a project based on configuration files and project structure.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Detected toolchain information
 */
export interface ToolchainInfo {
  /** Primary toolchain (nodejs, python, go, rust, ruby, java, etc.) */
  toolchain: string;
  /** Detected framework (if any) */
  framework?: string;
  /** Programming language */
  language?: string;
  /** Configuration files found */
  configFiles: string[];
  /** Package manager (if applicable) */
  packageManager?: string;
}

/**
 * Toolchain detection patterns
 */
const TOOLCHAIN_PATTERNS = {
  nodejs: {
    files: ['package.json', 'node_modules'],
    language: 'javascript',
    packageManagers: {
      'package-lock.json': 'npm',
      'yarn.lock': 'yarn',
      'pnpm-lock.yaml': 'pnpm',
      'bun.lockb': 'bun',
    },
  },
  python: {
    files: ['setup.py', 'pyproject.toml', 'requirements.txt', 'Pipfile', 'poetry.lock'],
    language: 'python',
    packageManagers: {
      'requirements.txt': 'pip',
      Pipfile: 'pipenv',
      'poetry.lock': 'poetry',
      'pyproject.toml': 'pip/poetry',
    },
  },
  go: {
    files: ['go.mod', 'go.sum'],
    language: 'go',
    packageManagers: {
      'go.mod': 'go modules',
    },
  },
  rust: {
    files: ['Cargo.toml', 'Cargo.lock'],
    language: 'rust',
    packageManagers: {
      'Cargo.toml': 'cargo',
    },
  },
  ruby: {
    files: ['Gemfile', 'Gemfile.lock', '.ruby-version'],
    language: 'ruby',
    packageManagers: {
      Gemfile: 'bundler',
    },
  },
  java: {
    files: ['pom.xml', 'build.gradle', 'build.gradle.kts', 'settings.gradle'],
    language: 'java',
    packageManagers: {
      'pom.xml': 'maven',
      'build.gradle': 'gradle',
      'build.gradle.kts': 'gradle',
    },
  },
  php: {
    files: ['composer.json', 'composer.lock'],
    language: 'php',
    packageManagers: {
      'composer.json': 'composer',
    },
  },
  dotnet: {
    files: ['*.csproj', '*.fsproj', '*.vbproj', '*.sln'],
    language: 'csharp',
    packageManagers: {
      '*.csproj': 'nuget',
    },
  },
};

/**
 * Framework detection patterns (for common frameworks)
 */
const FRAMEWORK_PATTERNS = {
  // JavaScript/TypeScript frameworks
  react: ['react', '@types/react'],
  vue: ['vue', '@vue/cli'],
  angular: ['@angular/core'],
  nextjs: ['next'],
  nuxt: ['nuxt'],
  express: ['express'],
  nestjs: ['@nestjs/core'],
  svelte: ['svelte'],

  // Python frameworks
  django: ['django'],
  flask: ['flask'],
  fastapi: ['fastapi'],

  // Ruby frameworks
  rails: ['rails'],
  sinatra: ['sinatra'],

  // PHP frameworks
  laravel: ['laravel/framework'],
  symfony: ['symfony/symfony'],

  // Java frameworks
  spring: ['spring-boot', 'spring-framework'],
};

/**
 * Detect the toolchain and framework for a project
 * @param projectPath Path to the project directory
 * @returns Detected toolchain information
 */
export function detectToolchain(projectPath: string = process.cwd()): ToolchainInfo {
  const configFiles: string[] = [];
  let detectedToolchain = 'unknown';
  let packageManager: string | undefined;
  let language: string | undefined;

  // Check for toolchain-specific files
  for (const [toolchain, config] of Object.entries(TOOLCHAIN_PATTERNS)) {
    for (const file of config.files) {
      const filePath = path.join(projectPath, file);

      // Handle glob patterns for .NET projects
      if (file.includes('*')) {
        const pattern = new RegExp(file.replace('*', '.*'));
        const files = fs.readdirSync(projectPath).filter((f) => pattern.test(f));
        if (files.length > 0) {
          configFiles.push(...files);
          detectedToolchain = toolchain;
          language = config.language;
          break;
        }
      } else if (fs.existsSync(filePath)) {
        configFiles.push(file);
        detectedToolchain = toolchain;
        language = config.language;

        // Detect package manager
        if (config.packageManagers && file in config.packageManagers) {
          packageManager = config.packageManagers[file as keyof typeof config.packageManagers];
        }
      }
    }

    if (detectedToolchain !== 'unknown') {
      break;
    }
  }

  // Detect framework if we found a toolchain
  const framework = detectFramework(projectPath, detectedToolchain);

  return {
    toolchain: detectedToolchain,
    framework,
    language,
    configFiles,
    packageManager,
  };
}

/**
 * Detect the framework for a project
 * @param projectPath Path to the project directory
 * @param toolchain Detected toolchain
 * @returns Detected framework name
 */
function detectFramework(projectPath: string, toolchain: string): string | undefined {
  // For Node.js projects, check package.json dependencies
  if (toolchain === 'nodejs') {
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        // Check for framework packages
        for (const [framework, packages] of Object.entries(FRAMEWORK_PATTERNS)) {
          for (const pkg of packages) {
            if (pkg in allDeps) {
              return framework;
            }
          }
        }
      } catch (_error) {
        // Ignore parse errors
      }
    }
  }

  // For Python projects, check requirements.txt or pyproject.toml
  if (toolchain === 'python') {
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const requirements = fs.readFileSync(requirementsPath, 'utf-8');
        for (const [framework, packages] of Object.entries(FRAMEWORK_PATTERNS)) {
          for (const pkg of packages) {
            if (requirements.includes(pkg)) {
              return framework;
            }
          }
        }
      } catch (_error) {
        // Ignore read errors
      }
    }
  }

  // For Ruby projects, check Gemfile
  if (toolchain === 'ruby') {
    const gemfilePath = path.join(projectPath, 'Gemfile');
    if (fs.existsSync(gemfilePath)) {
      try {
        const gemfile = fs.readFileSync(gemfilePath, 'utf-8');
        for (const [framework, packages] of Object.entries(FRAMEWORK_PATTERNS)) {
          for (const pkg of packages) {
            if (gemfile.includes(pkg)) {
              return framework;
            }
          }
        }
      } catch (_error) {
        // Ignore read errors
      }
    }
  }

  return undefined;
}

/**
 * Get a human-readable description of the detected toolchain
 * @param toolchainInfo Detected toolchain information
 * @returns Human-readable description
 */
export function getToolchainDescription(toolchainInfo: ToolchainInfo): string {
  const parts: string[] = [];

  if (toolchainInfo.framework) {
    parts.push(toolchainInfo.framework);
  }

  if (toolchainInfo.language) {
    parts.push(toolchainInfo.language);
  } else if (toolchainInfo.toolchain !== 'unknown') {
    parts.push(toolchainInfo.toolchain);
  }

  if (toolchainInfo.packageManager) {
    parts.push(`(${toolchainInfo.packageManager})`);
  }

  return parts.length > 0 ? parts.join(' ') : 'Unknown project type';
}
