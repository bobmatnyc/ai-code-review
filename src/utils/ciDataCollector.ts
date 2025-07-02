/**
 * @fileoverview CI/CD data collector utility.
 *
 * This module collects CI/CD data (type check errors, lint errors) to include
 * in code reviews. It supports both project-wide and per-file analysis.
 */

import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import logger from './logger';

const execAsync = promisify(exec);

/**
 * CI data structure
 */
export interface CIData {
  /**
   * Number of type check errors
   */
  typeCheckErrors?: number;

  /**
   * Number of lint errors
   */
  lintErrors?: number;

  /**
   * Raw type check output
   */
  typeCheckOutput?: string;

  /**
   * Raw lint output
   */
  lintOutput?: string;

  /**
   * Per-file error counts
   */
  fileErrors?: {
    [filePath: string]: {
      typeCheckErrors: number;
      lintErrors: number;
      typeCheckMessages?: string[];
      lintMessages?: string[];
    };
  };
}

/**
 * Collect CI/CD data for the current project
 * @param projectPath Path to the project root
 * @returns Promise resolving to CI data
 */
export async function collectCIData(projectPath: string): Promise<CIData> {
  const ciData: CIData = {
    fileErrors: {},
  };

  // Collect type check errors
  try {
    logger.info('Running type check to collect error count...');
    const { stdout, stderr } = await execAsync('npm run build:types', {
      cwd: projectPath,
      env: { ...process.env, CI: 'true' },
    });

    ciData.typeCheckOutput = stdout + stderr;
    parseTypeCheckErrors(ciData.typeCheckOutput, ciData, projectPath);
  } catch (error: any) {
    // Type check failed - extract error count from output
    const output = error.stdout + error.stderr;
    ciData.typeCheckOutput = output;
    parseTypeCheckErrors(output, ciData, projectPath);
  }

  // Collect lint errors
  try {
    logger.info('Running lint to collect error count...');
    const { stdout, stderr } = await execAsync('npm run lint', {
      cwd: projectPath,
      env: { ...process.env, CI: 'true' },
    });

    ciData.lintOutput = stdout + stderr;
    parseLintErrors(ciData.lintOutput, ciData, projectPath);
  } catch (error: any) {
    // Lint failed - extract error count from output
    const output = error.stdout + error.stderr;
    ciData.lintOutput = output;
    parseLintErrors(output, ciData, projectPath);
  }

  // Calculate totals
  calculateTotals(ciData);

  return ciData;
}

/**
 * Parse TypeScript errors from output
 */
function parseTypeCheckErrors(output: string, ciData: CIData, projectPath: string): void {
  const lines = output.split('\n');

  for (const line of lines) {
    // TypeScript error format: src/file.ts(line,col): error TS2322: ...
    const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
    if (match) {
      const [, file, lineNum, colNum, errorCode, message] = match;
      const relativeFile = path.relative(projectPath, file);

      if (!ciData.fileErrors![relativeFile]) {
        ciData.fileErrors![relativeFile] = {
          typeCheckErrors: 0,
          lintErrors: 0,
          typeCheckMessages: [],
          lintMessages: [],
        };
      }

      ciData.fileErrors![relativeFile].typeCheckErrors++;
      ciData.fileErrors![relativeFile].typeCheckMessages!.push(
        `Line ${lineNum}:${colNum} - ${errorCode}: ${message}`,
      );
    }
  }
}

/**
 * Parse ESLint errors from output
 */
function parseLintErrors(output: string, ciData: CIData, projectPath: string): void {
  const lines = output.split('\n');
  let currentFile: string | null = null;

  for (const line of lines) {
    // ESLint file header format: /path/to/file.ts
    if (line.match(/^[/\\]/)) {
      currentFile = path.relative(projectPath, line.trim());
      if (!ciData.fileErrors![currentFile]) {
        ciData.fileErrors![currentFile] = {
          typeCheckErrors: 0,
          lintErrors: 0,
          typeCheckMessages: [],
          lintMessages: [],
        };
      }
    }
    // ESLint error format:   line:col  error  message  rule-name
    else if (currentFile && line.match(/^\s*\d+:\d+\s+error\s+/)) {
      const match = line.match(/^\s*(\d+):(\d+)\s+error\s+(.+?)\s+(.+)$/);
      if (match) {
        const [, lineNum, colNum, message, rule] = match;
        ciData.fileErrors![currentFile].lintErrors++;
        ciData.fileErrors![currentFile].lintMessages!.push(
          `Line ${lineNum}:${colNum} - ${message} (${rule})`,
        );
      }
    }
  }
}

/**
 * Calculate total error counts from per-file data
 */
function calculateTotals(ciData: CIData): void {
  let totalTypeCheckErrors = 0;
  let totalLintErrors = 0;

  for (const fileData of Object.values(ciData.fileErrors || {})) {
    totalTypeCheckErrors += fileData.typeCheckErrors;
    totalLintErrors += fileData.lintErrors;
  }

  ciData.typeCheckErrors = totalTypeCheckErrors;
  ciData.lintErrors = totalLintErrors;

  logger.info(
    `Found ${totalTypeCheckErrors} type check errors and ${totalLintErrors} lint errors across all files`,
  );
}

/**
 * Format CI data for inclusion in prompts
 * @param ciData CI data to format
 * @param specificFile Optional specific file to focus on
 * @returns Formatted string for prompt inclusion
 */
export function formatCIDataForPrompt(ciData: CIData, specificFile?: string): string {
  const lines: string[] = [];

  lines.push('## CI/CD Status');
  lines.push('');

  // Overall summary
  lines.push(`- Total TypeScript errors: ${ciData.typeCheckErrors || 0}`);
  lines.push(`- Total ESLint errors: ${ciData.lintErrors || 0}`);

  // Per-file data
  if (ciData.fileErrors && Object.keys(ciData.fileErrors).length > 0) {
    lines.push('');
    lines.push('### Errors by file:');

    // If reviewing a specific file, show only that file's errors
    if (specificFile && ciData.fileErrors[specificFile]) {
      const fileData = ciData.fileErrors[specificFile];
      lines.push('');
      lines.push(`**${specificFile}**:`);
      lines.push(`- TypeScript errors: ${fileData.typeCheckErrors}`);
      if (fileData.typeCheckMessages && fileData.typeCheckMessages.length > 0) {
        lines.push('  TypeScript issues:');
        fileData.typeCheckMessages.slice(0, 5).forEach((msg) => {
          lines.push(`    - ${msg}`);
        });
      }
      lines.push(`- ESLint errors: ${fileData.lintErrors}`);
      if (fileData.lintMessages && fileData.lintMessages.length > 0) {
        lines.push('  ESLint issues:');
        fileData.lintMessages.slice(0, 5).forEach((msg) => {
          lines.push(`    - ${msg}`);
        });
      }
    } else {
      // Show top 5 files with most errors
      const fileList = Object.entries(ciData.fileErrors)
        .map(([file, data]) => ({
          file,
          totalErrors: data.typeCheckErrors + data.lintErrors,
          ...data,
        }))
        .sort((a, b) => b.totalErrors - a.totalErrors)
        .slice(0, 5);

      for (const fileInfo of fileList) {
        lines.push('');
        lines.push(`**${fileInfo.file}**: ${fileInfo.totalErrors} total errors`);
        lines.push(`  - TypeScript: ${fileInfo.typeCheckErrors} errors`);
        lines.push(`  - ESLint: ${fileInfo.lintErrors} errors`);
      }
    }
  }

  lines.push('');
  lines.push('Please include fixes for these CI/CD issues in your code review.');

  return lines.join('\n');
}
