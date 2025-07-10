/**
 * @fileoverview Utility to convert existing code review data to AI detection format.
 *
 * This module provides functions to transform the existing FileInfo and project structure
 * into the CodeSubmission format required by the AI detection engine.
 */

import { execSync } from 'child_process';
import { readFileSync, statSync } from 'fs';
import path from 'path';
import type { FileInfo } from '../../../types/review';
import type { ProjectDocs } from '../../../utils/projectDocs';
import type {
  CodeFile,
  CodeSubmission,
  DocumentationSet,
  GitCommit,
  GitRepository,
  ParsedCodebase,
  ParsedFunction,
} from '../types/DetectionTypes';

/**
 * Convert review data to AI detection submission format
 */
export class SubmissionConverter {
  /**
   * Convert FileInfo array and project data to CodeSubmission
   * @param files Array of FileInfo objects
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param projectPath Path to project root
   * @returns CodeSubmission object for AI detection
   */
  static async convert(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    projectPath: string = process.cwd(),
  ): Promise<CodeSubmission> {
    try {
      const repository = await SubmissionConverter.extractGitRepository(projectPath);
      const codebase = SubmissionConverter.createParsedCodebase(files);
      const documentation = SubmissionConverter.createDocumentationSet(files, projectDocs);

      return {
        repository,
        codebase,
        documentation,
      };
    } catch (error) {
      console.warn('Error converting submission:', error);
      return SubmissionConverter.createFallbackSubmission(files, projectDocs);
    }
  }

  /**
   * Extract git repository information
   * @param projectPath Path to project root
   * @returns Git repository data
   */
  private static async extractGitRepository(projectPath: string): Promise<GitRepository> {
    try {
      // Check if git repository exists
      execSync('git rev-parse --git-dir', {
        cwd: projectPath,
        stdio: 'pipe',
      });

      // Get commit history (last 50 commits)
      const gitLogOutput = execSync(
        'git log --pretty=format:"%H|%s|%ai|%an|%ae" -n 50 --name-only',
        {
          cwd: projectPath,
          encoding: 'utf8',
          stdio: 'pipe',
        },
      );

      const commits = SubmissionConverter.parseGitLog(gitLogOutput);

      return {
        commits,
        rootPath: projectPath,
      };
    } catch (error) {
      console.warn('Failed to extract git repository info:', error);
      return {
        commits: [],
        rootPath: projectPath,
      };
    }
  }

  /**
   * Parse git log output into commit objects
   * @param gitLogOutput Raw git log output
   * @returns Array of parsed git commits
   */
  private static parseGitLog(gitLogOutput: string): GitCommit[] {
    const commits: GitCommit[] = [];
    const lines = gitLogOutput.split('\n').filter((line) => line.trim());

    let currentCommit: Partial<GitCommit> | null = null;
    let collectingFiles = false;

    for (const line of lines) {
      if (line.includes('|')) {
        // Commit header line
        if (currentCommit) {
          commits.push(currentCommit as GitCommit);
        }

        const parts = line.split('|');
        if (parts.length >= 5) {
          currentCommit = {
            hash: parts[0],
            message: parts[1],
            timestamp: new Date(parts[2]),
            author: {
              name: parts[3],
              email: parts[4],
            },
            changedFiles: [],
          };
          collectingFiles = true;
        }
      } else if (collectingFiles && currentCommit && line.trim()) {
        // File name line
        currentCommit.changedFiles!.push(line.trim());
      }
    }

    // Add the last commit
    if (currentCommit) {
      commits.push(currentCommit as GitCommit);
    }

    return commits.reverse(); // Oldest first
  }

  /**
   * Create parsed codebase from FileInfo array
   * @param files Array of FileInfo objects
   * @returns Parsed codebase structure
   */
  private static createParsedCodebase(files: FileInfo[]): ParsedCodebase {
    const codeFiles: CodeFile[] = files.map((file) => ({
      path: file.path,
      content: file.content,
      language: SubmissionConverter.detectLanguage(file.path),
      size: Buffer.byteLength(file.content, 'utf8'),
      lastModified: SubmissionConverter.getFileModifiedTime(file.path),
    }));

    const functions = SubmissionConverter.extractFunctions(codeFiles);

    return {
      files: codeFiles,
      functions,
      statistics: {
        totalLines: codeFiles.reduce((sum, file) => sum + file.content.split('\n').length, 0),
        totalFiles: codeFiles.length,
        languages: Array.from(new Set(codeFiles.map((f) => f.language))),
      },
    };
  }

  /**
   * Create documentation set from files and project docs
   * @param files Array of FileInfo objects
   * @param projectDocs Project documentation
   * @returns Documentation set
   */
  private static createDocumentationSet(
    files: FileInfo[],
    projectDocs: ProjectDocs | null,
  ): DocumentationSet {
    // Find README file
    const readmeFile = files.find((file) => /readme/i.test(path.basename(file.path)));

    // Get code files for comment analysis
    const codeFiles = files
      .filter((file) => SubmissionConverter.isCodeFile(file.path))
      .map((file) => ({
        path: file.path,
        content: file.content,
        language: SubmissionConverter.detectLanguage(file.path),
        size: Buffer.byteLength(file.content, 'utf8'),
      }));

    return {
      readme: readmeFile?.content || projectDocs?.readme,
      codeFiles,
      otherDocs: SubmissionConverter.extractOtherDocs(files),
    };
  }

  /**
   * Detect programming language from file path
   * @param filePath File path
   * @returns Programming language
   */
  private static detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const langMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rb': 'ruby',
      '.php': 'php',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.rs': 'rust',
    };

    return langMap[ext] || 'unknown';
  }

  /**
   * Get file modification time
   * @param filePath File path
   * @returns Last modified date or undefined
   */
  private static getFileModifiedTime(filePath: string): Date | undefined {
    try {
      const stats = statSync(filePath);
      return stats.mtime;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if file is a code file
   * @param filePath File path
   * @returns True if it's a code file
   */
  private static isCodeFile(filePath: string): boolean {
    const codeExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.java',
      '.go',
      '.rb',
      '.php',
      '.cpp',
      '.c',
      '.cs',
      '.swift',
      '.kt',
      '.rs',
      '.scala',
      '.clj',
    ];

    const ext = path.extname(filePath).toLowerCase();
    return codeExtensions.includes(ext);
  }

  /**
   * Extract function information from code files (simplified)
   * @param codeFiles Array of code files
   * @returns Array of parsed functions
   */
  private static extractFunctions(codeFiles: CodeFile[]): ParsedFunction[] {
    const functions: ParsedFunction[] = [];

    codeFiles.forEach((file) => {
      if (file.language === 'typescript' || file.language === 'javascript') {
        const extractedFunctions = SubmissionConverter.extractJSFunctions(file);
        functions.push(...extractedFunctions);
      }
      // Add other language parsers as needed
    });

    return functions;
  }

  /**
   * Extract JavaScript/TypeScript functions (simplified regex-based)
   * @param file Code file
   * @returns Array of parsed functions
   */
  private static extractJSFunctions(file: CodeFile): ParsedFunction[] {
    const functions: ParsedFunction[] = [];
    const lines = file.content.split('\n');

    // Simple regex patterns for function detection
    const functionPatterns = [
      /function\s+(\w+)\s*\([^)]*\)/,
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,
      /(\w+)\s*:\s*\([^)]*\)\s*=>/,
      /async\s+function\s+(\w+)/,
    ];

    lines.forEach((line, index) => {
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          functions.push({
            name: match[1] || 'anonymous',
            filePath: file.path,
            startLine: index + 1,
            endLine: index + 1, // Simplified - would need proper parsing
            parameters: [], // Simplified
            conditionals: [],
            loops: [],
            catches: [],
            logicalOperators: [],
          });
          break;
        }
      }
    });

    return functions;
  }

  /**
   * Extract other documentation files
   * @param files Array of FileInfo objects
   * @returns Array of documentation files
   */
  private static extractOtherDocs(files: FileInfo[]) {
    const docPatterns = [/\.md$/i, /changelog/i, /license/i, /contributing/i, /authors/i];

    return files
      .filter(
        (file) =>
          docPatterns.some((pattern) => pattern.test(file.path)) &&
          !/readme/i.test(path.basename(file.path)),
      )
      .map((file) => ({
        path: file.path,
        content: file.content,
        type: SubmissionConverter.categorizeDocFile(file.path),
      }));
  }

  /**
   * Categorize documentation file type
   * @param filePath File path
   * @returns Documentation type
   */
  private static categorizeDocFile(
    filePath: string,
  ): 'readme' | 'changelog' | 'api' | 'guide' | 'other' {
    const fileName = path.basename(filePath).toLowerCase();

    if (fileName.includes('changelog')) return 'changelog';
    if (fileName.includes('api')) return 'api';
    if (fileName.includes('guide') || fileName.includes('tutorial')) return 'guide';
    if (fileName.includes('readme')) return 'readme';

    return 'other';
  }

  /**
   * Create fallback submission when git extraction fails
   * @param files Array of FileInfo objects
   * @param projectDocs Project documentation
   * @returns Minimal CodeSubmission
   */
  private static createFallbackSubmission(
    files: FileInfo[],
    projectDocs: ProjectDocs | null,
  ): CodeSubmission {
    return {
      repository: {
        commits: [],
        rootPath: process.cwd(),
      },
      codebase: SubmissionConverter.createParsedCodebase(files),
      documentation: SubmissionConverter.createDocumentationSet(files, projectDocs),
    };
  }
}
