/**
 * @fileoverview AI-powered dependency analysis for architectural reviews
 *
 * This module provides a dependency analysis approach that uses the AI model
 * itself to analyze the project structure and dependencies, eliminating the
 * need for external tools like dependency-cruiser that can cause installation issues.
 */

import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
// import { getConfig } from '../../utils/config';
// import { AbstractClient } from '../../clients/base/abstractClient';
import { ClientFactory } from '../../clients/factory/clientFactory';
import logger from '../logger';

// import { formatProjectDocs } from '../projectDocs';

const execAsync = promisify(exec);

/**
 * Basic file structure for dependency analysis
 */
interface FileStructureInfo {
  /** Path to the file */
  path: string;
  /** Type of file based on extension */
  type: string;
  /** Import statements in the file */
  imports?: string[];
  /** Export statements in the file */
  exports?: string[];
  /** Dependencies declared in package.json */
  dependencies?: Record<string, string>;
  /** Dev dependencies declared in package.json */
  devDependencies?: Record<string, string>;
}

/**
 * Sample of files to provide to the AI for analysis
 */
interface ProjectFileSample {
  /** All package.json files found */
  packageFiles: FileStructureInfo[];
  /** Sample of source files with their imports/exports */
  sourceFiles: FileStructureInfo[];
  /** Total file count in the project */
  totalFileCount: number;
  /** Project structure overview */
  directoryStructure: string;
}

/**
 * Result of the AI-based dependency analysis
 */
export interface AIDependencyAnalysisResult {
  /** Summary of dependencies in the project */
  dependencySummary: string;
  /** Potential architectural issues identified */
  architecturalIssues: string;
  /** Package.json analysis */
  packageAnalysis: string;
  /** Import/export structure analysis */
  codeStructureAnalysis: string;
  /** Recommendations for dependency management */
  recommendations: string;
  /** Raw AI response for debugging */
  rawResponse?: string;
}

/**
 * Create a dependency analysis section for architectural reviews using AI
 * @param projectPath The path to the project
 * @returns Dependency analysis formatted for inclusion in reviews
 */
export async function createAIDependencyAnalysis(projectPath: string): Promise<string> {
  logger.info('=========== STARTING AI-POWERED DEPENDENCY ANALYSIS ===========');
  logger.info(`Project path: ${projectPath}`);

  try {
    // Get project file sample for AI analysis
    const projectSample = await getProjectFileSample(projectPath);

    // Return empty analysis if no files were found
    if (projectSample.packageFiles.length === 0 && projectSample.sourceFiles.length === 0) {
      logger.warn('No suitable files found for AI dependency analysis');
      return '## Dependency Analysis\n\nNo suitable files were found for dependency analysis.';
    }

    logger.info(
      `Collected ${projectSample.packageFiles.length} package files and ${projectSample.sourceFiles.length} source files for analysis`,
    );

    // Generate the dependency analysis using AI
    const analysisResult = await analyzeWithAI(projectSample);

    // Format the results as markdown
    return formatDependencyAnalysis(analysisResult);
  } catch (error) {
    logger.error(
      `Error in AI dependency analysis: ${error instanceof Error ? error.message : String(error)}`,
    );
    return '## Dependency Analysis\n\n⚠️ Unable to perform AI-powered dependency analysis due to an error.\n\nThe rest of the review is still valid.';
  }
}

/**
 * Use AI to analyze project dependencies
 * @param projectSample Sample of project files for analysis
 * @returns AI-generated dependency analysis
 */
async function analyzeWithAI(
  projectSample: ProjectFileSample,
): Promise<AIDependencyAnalysisResult> {
  try {
    // Initialize an API client based on the selected model
    const client = ClientFactory.createClient();
    await client.initialize();

    // Prepare a detailed prompt for the AI
    const prompt = createDependencyAnalysisPrompt(projectSample);

    // Generate the analysis using the AI client
    const analysisResponse = await client.generateReview(
      prompt,
      'dependency-analysis.md',
      'architectural',
      {
        readme: '',
        custom: {
          'DEPENDENCY_ANALYSIS_INSTRUCTIONS.md': getDependencyAnalysisInstructions(),
        },
      },
      {
        type: 'architectural',
        includeTests: false,
        output: 'markdown',
        // @ts-expect-error - temporary property for AI dependency analysis
        isAIDependencyAnalysis: true,
      },
    );

    // Parse the AI response into structured sections
    return parseDependencyAnalysisResponse(analysisResponse.content);
  } catch (error) {
    logger.error(
      `Error generating AI dependency analysis: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Create a prompt for dependency analysis
 * @param projectSample Sample of project files
 * @returns Formatted prompt for the AI
 */
function createDependencyAnalysisPrompt(projectSample: ProjectFileSample): string {
  // Format package files
  const packageFilesSection = projectSample.packageFiles
    .map((pkg) => {
      return `## ${pkg.path}
\`\`\`json
"dependencies": ${JSON.stringify(pkg.dependencies || {}, null, 2)},
"devDependencies": ${JSON.stringify(pkg.devDependencies || {}, null, 2)}
\`\`\`
`;
    })
    .join('\n\n');

  // Format source files with imports
  const sourceFilesSection = projectSample.sourceFiles
    .map((file) => {
      return `## ${file.path} (${file.type})
${
  file.imports && file.imports.length > 0
    ? `**Imports:**
${file.imports.map((imp) => `- ${imp}`).join('\n')}`
    : 'No imports found.'
}

${
  file.exports && file.exports.length > 0
    ? `**Exports:**
${file.exports.map((exp) => `- ${exp}`).join('\n')}`
    : 'No exports found.'
}
`;
    })
    .join('\n\n');

  // Create the full prompt
  return `# Project Dependency Analysis Request

## Project Overview
Total Files: ${projectSample.totalFileCount}
Sample Files Analyzed: ${projectSample.packageFiles.length + projectSample.sourceFiles.length}

## Directory Structure
\`\`\`
${projectSample.directoryStructure}
\`\`\`

## Package Files
${packageFilesSection}

## Source File Sample
${sourceFilesSection}

Please analyze the project dependencies and structure based on the provided information.`;
}

/**
 * Get detailed instructions for the AI dependency analysis
 * @returns Formatted instructions
 */
function getDependencyAnalysisInstructions(): string {
  return `# Dependency Analysis Instructions

You are tasked with analyzing the project dependencies and structure based on the provided sample of files. 
Focus on identifying potential dependency issues, architectural patterns, and providing recommendations.

## Analysis Requirements

1. **Package Dependencies**:
   - Analyze all package.json files
   - Identify key dependencies and their purposes
   - Detect potential outdated or problematic dependencies
   - Note any unusual dependency patterns

2. **Code Structure**:
   - Analyze import/export patterns in the sample files
   - Identify potential circular dependencies
   - Note any heavily imported modules (potential core components)
   - Analyze coupling between components

3. **Architectural Issues**:
   - Identify potential architectural anti-patterns
   - Note any separation of concerns issues
   - Detect potential dependency management issues
   - Analyze project structure for architectural consistency

4. **Recommendations**:
   - Suggest improvements to dependency management
   - Recommend architectural improvements based on modern practices
   - Provide specific, actionable advice for dependency-related issues

## Response Format

Organize your analysis into the following sections:

1. **Dependency Summary**: Overview of the project's dependencies and overall structure.
2. **Architectural Issues**: Potential problems in the dependency architecture.
3. **Package Analysis**: Detailed analysis of package.json dependencies.
4. **Code Structure Analysis**: Analysis of import/export patterns and module relationships.
5. **Recommendations**: Specific suggestions for improving dependency management and architecture.

Be thorough but concise. Focus on providing actionable insights rather than just descriptions.`;
}

/**
 * Parse the AI response into structured sections
 * @param responseContent AI response content
 * @returns Structured dependency analysis
 */
function parseDependencyAnalysisResponse(responseContent: string): AIDependencyAnalysisResult {
  // Helper function to extract a section from the response
  const extractSection = (title: string): string => {
    const regex = new RegExp(`## ${title}\\s*([\\s\\S]*?)(?=## |$)`, 'i');
    const match = responseContent.match(regex);
    return match ? match[1].trim() : '';
  };

  return {
    dependencySummary: extractSection('Dependency Summary'),
    architecturalIssues: extractSection('Architectural Issues'),
    packageAnalysis: extractSection('Package Analysis'),
    codeStructureAnalysis: extractSection('Code Structure Analysis'),
    recommendations: extractSection('Recommendations'),
    rawResponse: responseContent,
  };
}

/**
 * Format the dependency analysis as markdown
 * @param analysis Dependency analysis result
 * @returns Formatted markdown
 */
function formatDependencyAnalysis(analysis: AIDependencyAnalysisResult): string {
  return `## AI-Powered Dependency Analysis

${analysis.dependencySummary}

### Architectural Issues

${analysis.architecturalIssues}

### Package Analysis

${analysis.packageAnalysis}

### Code Structure Analysis

${analysis.codeStructureAnalysis}

### Recommendations

${analysis.recommendations}

---

*Note: This dependency analysis was performed by AI based on a representative sample of the codebase, without requiring additional dependencies.*`;
}

/**
 * Get a representative sample of project files for analysis
 * @param projectPath Path to the project
 * @returns Sample of project files
 */
async function getProjectFileSample(projectPath: string): Promise<ProjectFileSample> {
  logger.info(`Collecting project file sample from ${projectPath}`);

  // Initialize the result
  const result: ProjectFileSample = {
    packageFiles: [],
    sourceFiles: [],
    totalFileCount: 0,
    directoryStructure: '',
  };

  try {
    // Get directory structure using ls
    try {
      const { stdout: dirOutput } = await execAsync(`ls -la ${projectPath}`);
      result.directoryStructure = dirOutput;
    } catch (error) {
      logger.warn(
        `Error getting directory structure: ${error instanceof Error ? error.message : String(error)}`,
      );
      result.directoryStructure = 'Unable to retrieve directory structure';
    }

    // Find package.json files
    let packageFilePaths: string[] = [];
    try {
      const { stdout: packageFilesOutput } = await execAsync(
        `find ${projectPath} -name "package.json" -not -path "*/node_modules/*" -not -path "*/\\.*/*" | head -5`,
      );
      packageFilePaths = packageFilesOutput.trim().split('\n').filter(Boolean);
    } catch (error) {
      logger.warn(
        `Error finding package.json files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Process each package.json file
    for (const filePath of packageFilePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const packageJson = JSON.parse(content);

        result.packageFiles.push({
          path: path.relative(projectPath, filePath),
          type: 'package.json',
          dependencies: packageJson.dependencies || {},
          devDependencies: packageJson.devDependencies || {},
        });
      } catch (error) {
        logger.warn(
          `Error processing package.json file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Get total file count (excluding node_modules and hidden directories)
    try {
      const { stdout: totalFilesOutput } = await execAsync(
        `find ${projectPath} -type f -not -path "*/node_modules/*" -not -path "*/\\.*/*" | wc -l`,
      );
      result.totalFileCount = parseInt(totalFilesOutput.trim(), 10);
    } catch (error) {
      logger.warn(
        `Error counting files: ${error instanceof Error ? error.message : String(error)}`,
      );
      result.totalFileCount = 0;
    }

    // Find source files (JS, TS, etc.)
    let sourceFilePaths: string[] = [];
    try {
      const { stdout: sourceFilesOutput } = await execAsync(
        `find ${projectPath} -type f \\( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \\) -not -path "*/node_modules/*" -not -path "*/\\.*/*" | sort -R | head -20`,
      );
      sourceFilePaths = sourceFilesOutput.trim().split('\n').filter(Boolean);
    } catch (error) {
      logger.warn(
        `Error finding source files: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Process each source file to extract imports
    for (const filePath of sourceFilePaths) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // Extract file type from extension
        const fileType = path.extname(filePath).slice(1);

        // Extract imports using regex
        const importRegex = /import\s+(?:(?:{[^}]*})|(?:[^{}]*?))\s+from\s+['"]([^'"]+)['"]/g;
        const imports: string[] = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
          imports.push(match[1]);
        }

        // Extract exports using regex
        const exportRegex =
          /export\s+(?:(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+))/g;
        const exports: string[] = [];
        let exportMatch;

        while ((exportMatch = exportRegex.exec(content)) !== null) {
          if (exportMatch[1]) {
            exports.push(exportMatch[1]);
          }
        }

        result.sourceFiles.push({
          path: path.relative(projectPath, filePath),
          type: fileType,
          imports,
          exports,
        });
      } catch (error) {
        logger.warn(
          `Error processing source file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    logger.info(
      `Collected ${result.packageFiles.length} package files and ${result.sourceFiles.length} source files`,
    );
    return result;
  } catch (error) {
    logger.error(
      `Error getting project file sample: ${error instanceof Error ? error.message : String(error)}`,
    );
    return result;
  }
}
