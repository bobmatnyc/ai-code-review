/**
 * @fileoverview File Analysis MCP Tool
 *
 * This module implements the file analysis tool for MCP, providing
 * detailed analysis of individual files including syntax, complexity,
 * security, and performance analysis.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { orchestrateReview } from '../../core/reviewOrchestrator';
import type { ReviewOptions } from '../../types/review';
import logger from '../../utils/logger';
import type { FileAnalysisToolInput, McpRequestContext } from '../types';
import { BaseTool } from './BaseTool';

/**
 * File Analysis Tool for MCP
 *
 * Provides detailed analysis of individual files including:
 * - Syntax and style analysis
 * - Code complexity metrics
 * - Security vulnerability detection
 * - Performance optimization opportunities
 * - Pattern recognition and best practices
 */
export class FileAnalysisTool extends BaseTool {
  constructor() {
    super(
      'file-analysis',
      'Perform detailed analysis of individual files including syntax, complexity, security, and performance analysis. Supports multiple programming languages and frameworks.',
      {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the file to analyze',
          },
          analysisType: {
            type: 'string',
            enum: ['syntax', 'complexity', 'security', 'performance', 'patterns'],
            description: 'Type of analysis to perform on the file',
            default: 'syntax',
          },
          language: {
            type: 'string',
            description: 'Programming language (auto-detected if not provided)',
          },
          framework: {
            type: 'string',
            description: 'Framework context (e.g., "react", "vue", "django", "rails")',
          },
        },
        required: ['filePath'],
      },
    );
  }

  /**
   * Execute the file analysis
   */
  protected async executeImpl(
    args: FileAnalysisToolInput,
    context: McpRequestContext,
  ): Promise<string> {
    const { filePath, analysisType = 'syntax', language, framework } = args;

    logger.info(`Starting file analysis for: ${filePath}`);
    logger.info(`Analysis type: ${analysisType}`);

    const resolvedPath = path.resolve(filePath);

    try {
      // Verify file exists
      await this.verifyFileExists(resolvedPath);

      // Detect language if not provided
      const detectedLanguage = language || this.detectLanguage(resolvedPath);

      // Read file content for analysis
      const fileContent = await fs.readFile(resolvedPath, 'utf8');
      const fileStats = await fs.stat(resolvedPath);

      // Perform the requested analysis
      let analysisResult: string;

      switch (analysisType) {
        case 'syntax':
          analysisResult = await this.analyzeSyntax(
            resolvedPath,
            fileContent,
            detectedLanguage,
            framework,
          );
          break;
        case 'complexity':
          analysisResult = await this.analyzeComplexity(
            resolvedPath,
            fileContent,
            detectedLanguage,
          );
          break;
        case 'security':
          analysisResult = await this.analyzeSecurity(
            resolvedPath,
            fileContent,
            detectedLanguage,
            framework,
          );
          break;
        case 'performance':
          analysisResult = await this.analyzePerformance(
            resolvedPath,
            fileContent,
            detectedLanguage,
            framework,
          );
          break;
        case 'patterns':
          analysisResult = await this.analyzePatterns(
            resolvedPath,
            fileContent,
            detectedLanguage,
            framework,
          );
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      logger.info(`File analysis completed for: ${filePath}`);

      return this.formatAnalysisResult(analysisResult, {
        filePath: resolvedPath,
        analysisType,
        language: detectedLanguage,
        framework,
        fileSize: fileStats.size,
        lineCount: fileContent.split('\n').length,
        timestamp: context.timestamp,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`File analysis failed for ${filePath}: ${errorMessage}`);
      throw new Error(`File analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Verify that the file exists and is readable
   */
  private async verifyFileExists(filePath: string): Promise<void> {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error(`Path is not a file: ${filePath}`);
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.cxx': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.sh': 'bash',
      '.sql': 'sql',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.sass': 'sass',
      '.less': 'less',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.md': 'markdown',
    };

    return languageMap[ext] || 'unknown';
  }

  /**
   * Analyze syntax and style
   */
  private async analyzeSyntax(
    filePath: string,
    _content: string,
    language: string,
    framework?: string,
  ): Promise<string> {
    // Use the existing review system for syntax analysis
    const reviewOptions: ReviewOptions = {
      type: 'quick-fixes',
      output: 'markdown',
      language,
      framework,
      interactive: false,
      noConfirm: true,
    };

    return await this.performReviewAnalysis(filePath, reviewOptions);
  }

  /**
   * Analyze code complexity
   */
  private async analyzeComplexity(
    _filePath: string,
    content: string,
    language: string,
  ): Promise<string> {
    let analysis = `## Code Complexity Analysis\n\n`;

    // Basic metrics
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0).length;
    const commentLines = lines.filter((line) => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('//') ||
        trimmed.startsWith('#') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*')
      );
    }).length;

    analysis += `**Basic Metrics:**\n`;
    analysis += `- Total Lines: ${lines.length}\n`;
    analysis += `- Non-empty Lines: ${nonEmptyLines}\n`;
    analysis += `- Comment Lines: ${commentLines}\n`;
    analysis += `- Code Lines: ${nonEmptyLines - commentLines}\n\n`;

    // Function/method count (basic estimation)
    const functionPatterns = {
      typescript: /function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/g,
      javascript: /function\s+\w+|const\s+\w+\s*=\s*\(|class\s+\w+/g,
      python: /def\s+\w+|class\s+\w+/g,
      java: /public\s+\w+\s+\w+\(|private\s+\w+\s+\w+\(|protected\s+\w+\s+\w+\(/g,
      go: /func\s+\w+/g,
    };

    const pattern = functionPatterns[language as keyof typeof functionPatterns];
    if (pattern) {
      const matches = content.match(pattern) || [];
      analysis += `**Functions/Methods:** ${matches.length}\n\n`;
    }

    analysis += `*Detailed complexity metrics would be calculated here using AST analysis.*\n`;

    return analysis;
  }

  /**
   * Analyze security vulnerabilities
   */
  private async analyzeSecurity(
    filePath: string,
    _content: string,
    language: string,
    framework?: string,
  ): Promise<string> {
    const reviewOptions: ReviewOptions = {
      type: 'security',
      output: 'markdown',
      language,
      framework,
      interactive: false,
      noConfirm: true,
    };

    return await this.performReviewAnalysis(filePath, reviewOptions);
  }

  /**
   * Analyze performance opportunities
   */
  private async analyzePerformance(
    filePath: string,
    _content: string,
    language: string,
    framework?: string,
  ): Promise<string> {
    const reviewOptions: ReviewOptions = {
      type: 'performance',
      output: 'markdown',
      language,
      framework,
      interactive: false,
      noConfirm: true,
    };

    return await this.performReviewAnalysis(filePath, reviewOptions);
  }

  /**
   * Analyze code patterns
   */
  private async analyzePatterns(
    filePath: string,
    _content: string,
    language: string,
    framework?: string,
  ): Promise<string> {
    const reviewOptions: ReviewOptions = {
      type: 'extract-patterns',
      output: 'markdown',
      language,
      framework,
      interactive: false,
      noConfirm: true,
    };

    return await this.performReviewAnalysis(filePath, reviewOptions);
  }

  /**
   * Perform review analysis using the existing review system
   */
  private async performReviewAnalysis(filePath: string, options: ReviewOptions): Promise<string> {
    let reviewOutput = '';
    const originalConsoleLog = console.log;
    const originalConsoleInfo = console.info;

    // Capture console output
    const outputBuffer: string[] = [];
    console.log = (...args: any[]) => {
      outputBuffer.push(args.join(' '));
      originalConsoleLog(...args);
    };
    console.info = (...args: any[]) => {
      outputBuffer.push(args.join(' '));
      originalConsoleInfo(...args);
    };

    try {
      await orchestrateReview(filePath, options);
      reviewOutput = outputBuffer.join('\n');
    } finally {
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;
    }

    return reviewOutput || 'Analysis completed successfully.';
  }

  /**
   * Format analysis result
   */
  private formatAnalysisResult(
    result: string,
    metadata: {
      filePath: string;
      analysisType: string;
      language: string;
      framework?: string;
      fileSize: number;
      lineCount: number;
      timestamp: Date;
    },
  ): string {
    const { filePath, analysisType, language, framework, fileSize, lineCount, timestamp } =
      metadata;

    let output = `# File Analysis Results\n\n`;
    output += `**File:** \`${filePath}\`\n`;
    output += `**Analysis Type:** ${analysisType}\n`;
    output += `**Language:** ${language}\n`;
    if (framework) {
      output += `**Framework:** ${framework}\n`;
    }
    output += `**File Size:** ${fileSize} bytes\n`;
    output += `**Line Count:** ${lineCount}\n`;
    output += `**Timestamp:** ${timestamp.toISOString()}\n\n`;
    output += `---\n\n`;
    output += result;

    return output;
  }
}
