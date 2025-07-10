/**
 * @fileoverview Git history analyzer for detecting AI-generated code patterns.
 *
 * This analyzer examines git commit history, patterns, and metadata to identify
 * characteristics commonly associated with AI-generated code submissions.
 */

import type {
  CodeSubmission,
  DetectedPattern,
  GitAnalysisResult,
  GitCommit,
  PatternDetectionResult,
} from '../types/DetectionTypes';
import { BaseAnalyzer } from './BaseAnalyzer';

/**
 * Analyzer for git history patterns that may indicate AI generation
 */
export class GitHistoryAnalyzer extends BaseAnalyzer {
  /**
   * Get analyzer name
   */
  getAnalyzerName(): string {
    return 'git';
  }

  /**
   * Analyze git history for AI-generated patterns
   * @param submission Code submission to analyze
   * @returns Git analysis result
   */
  async analyze(submission: CodeSubmission): Promise<GitAnalysisResult> {
    this.startTimer();
    const patterns: DetectedPattern[] = [];

    try {
      const commits = submission.repository.commits;

      if (commits.length === 0) {
        return this.createEmptyResult();
      }

      // Pattern H1.1: Simultaneous File Creation
      const bulkCreationResult = this.detectBulkFileCreation(commits);
      if (bulkCreationResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'H1.1',
            'Simultaneous File Creation',
            'high',
            bulkCreationResult.score,
            'Initial commit contains unusually large number of files, suggesting bulk generation',
            bulkCreationResult.evidence || {},
          ),
        );
      }

      // Pattern H1.2: AI-Generated Commit Messages
      const aiCommitResult = this.detectAICommitMessages(commits);
      if (aiCommitResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'H1.2',
            'AI-Generated Commit Messages',
            'high',
            aiCommitResult.score,
            'Commit messages follow AI-generated patterns and templates',
            aiCommitResult.evidence || {},
          ),
        );
      }

      // Pattern H1.3: Absence of Debugging Commits
      const debuggingAbsenceResult = this.detectDebuggingAbsence(commits);
      if (debuggingAbsenceResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'H1.3',
            'Missing Developer Workflow',
            'high',
            debuggingAbsenceResult.score,
            'Lacks typical developer debugging and iteration patterns',
            debuggingAbsenceResult.evidence || {},
          ),
        );
      }

      // Pattern H1.4: Perfect Initial Commit
      const perfectInitialResult = this.detectPerfectInitialCommit(commits);
      if (perfectInitialResult.detected) {
        patterns.push(
          this.createDetectedPattern(
            'H1.4',
            'Perfect Initial Commit',
            'high',
            perfectInitialResult.score,
            'Initial commit contains complete, working project without typical development artifacts',
            perfectInitialResult.evidence || {},
          ),
        );
      }

      return {
        analyzer: 'git-history',
        patterns,
        metadata: {
          totalCommits: commits.length,
          analysisTime: this.getElapsedTime(),
          sufficientHistory: commits.length >= 3,
        },
      };
    } catch (error) {
      console.error('Error in GitHistoryAnalyzer:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Detect bulk file creation in initial commit
   * @param commits Array of git commits
   * @returns Pattern detection result
   */
  private detectBulkFileCreation(commits: GitCommit[]): PatternDetectionResult {
    if (commits.length === 0) {
      return this.createPatternResult(false, 0);
    }

    const initialCommit = commits[0];
    const fileCount = initialCommit.changedFiles.length;

    // Threshold: >15 files in initial commit is suspicious
    // More files = higher suspicion
    if (fileCount > 15) {
      const score = Math.min(0.95, 0.6 + (fileCount - 15) * 0.02);

      return this.createPatternResult(true, score, {
        fileCount,
        commitHash: initialCommit.hash,
        message: initialCommit.message,
        files: initialCommit.changedFiles.slice(0, 10), // First 10 files for evidence
        timestamp: initialCommit.timestamp,
        threshold: 15,
      });
    }

    return this.createPatternResult(false, 0);
  }

  /**
   * Detect AI-generated commit message patterns
   * @param commits Array of git commits
   * @returns Pattern detection result
   */
  private detectAICommitMessages(commits: GitCommit[]): PatternDetectionResult {
    const aiPatterns = [
      // Conventional commit patterns (overly consistent usage)
      /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{20,}/,
      // Template-like descriptive messages
      /^(Add|Update|Fix|Implement|Create) .+ (feature|functionality|component|module)$/i,
      // Overly formal initial commit messages
      /^Initial (commit|implementation) with (complete|full) .+ structure$/i,
      // Perfect grammar and structure
      /^(Implement|Add|Create) comprehensive .+ with .+ support$/i,
      // Emoji usage patterns common in AI
      /^(✨|🚀|🎉|🔧|📝|🐛|💡) /,
    ];

    let matches = 0;
    const evidence: any[] = [];
    const totalCommits = commits.length;

    commits.forEach((commit, index) => {
      const isAIPattern = aiPatterns.some((pattern) => pattern.test(commit.message));
      if (isAIPattern) {
        matches++;
        evidence.push({
          hash: commit.hash,
          message: commit.message,
          timestamp: commit.timestamp,
          position: index === 0 ? 'initial' : index === totalCommits - 1 ? 'latest' : 'middle',
        });
      }
    });

    const ratio = matches / totalCommits;

    // >70% of commits match AI patterns is highly suspicious
    if (ratio > 0.7 && totalCommits >= 3) {
      const score = Math.min(0.95, 0.6 + ratio * 0.3);

      return this.createPatternResult(true, score, {
        matchingCommits: matches,
        totalCommits,
        ratio,
        examples: evidence.slice(0, 5), // Top 5 examples
        patterns: aiPatterns.map((p) => p.source),
      });
    }

    return this.createPatternResult(false, ratio * 0.4); // Partial score for moderate usage
  }

  /**
   * Detect absence of typical debugging/development commits
   * @param commits Array of git commits
   * @returns Pattern detection result
   */
  private detectDebuggingAbsence(commits: GitCommit[]): PatternDetectionResult {
    if (commits.length < 3) {
      return this.createPatternResult(false, 0); // Need sufficient history
    }

    const developmentPatterns = [
      // Work in progress indicators
      /\bwip\b/i,
      /work.?in.?progress/i,
      // Quick fixes and debugging
      /\bfix\b(?!:)/i, // "fix" but not "fix:" (conventional commits)
      /\bbug\b/i,
      /\bdebug\b/i,
      /oops/i,
      /typo/i,
      // Experimental work
      /test/i,
      /experiment/i,
      /try/i,
      /attempt/i,
      // Informal language
      /\btodo\b/i,
      /\bfixme\b/i,
      /wtf/i,
      /hack/i,
    ];

    let humanLikeCommits = 0;
    const totalCommits = commits.length;

    commits.forEach((commit) => {
      const isHumanLike = developmentPatterns.some((pattern) => pattern.test(commit.message));

      if (isHumanLike) {
        humanLikeCommits++;
      }
    });

    const humanRatio = humanLikeCommits / totalCommits;

    // Very low ratio of human-like commits suggests AI generation
    if (humanRatio < 0.1 && totalCommits >= 5) {
      const score = Math.min(0.88, 0.5 + (0.1 - humanRatio) * 3);

      return this.createPatternResult(true, score, {
        humanLikeCommits,
        totalCommits,
        humanRatio,
        missingPatterns: developmentPatterns.map((p) => p.source),
        threshold: 0.1,
      });
    }

    return this.createPatternResult(false, 0);
  }

  /**
   * Detect perfect initial commit without development artifacts
   * @param commits Array of git commits
   * @returns Pattern detection result
   */
  private detectPerfectInitialCommit(commits: GitCommit[]): PatternDetectionResult {
    if (commits.length === 0) {
      return this.createPatternResult(false, 0);
    }

    const initialCommit = commits[0];
    const fileCount = initialCommit.changedFiles.length;

    // Indicators of "perfect" initial commit
    const indicators = {
      largeFileCount: fileCount > 20,
      hasCompleteStructure: this.hasCompleteProjectStructure(initialCommit.changedFiles),
      hasConfigFiles: this.hasConfigurationFiles(initialCommit.changedFiles),
      hasDocumentation: this.hasDocumentationFiles(initialCommit.changedFiles),
      hasTests: this.hasTestFiles(initialCommit.changedFiles),
      perfectMessage: this.isPerfectInitialMessage(initialCommit.message),
    };

    const indicatorCount = Object.values(indicators).filter(Boolean).length;
    const totalIndicators = Object.keys(indicators).length;

    // If most indicators are present, it suggests AI generation
    if (indicatorCount >= 4) {
      const score = Math.min(0.92, 0.5 + (indicatorCount / totalIndicators) * 0.4);

      return this.createPatternResult(true, score, {
        indicators,
        indicatorCount,
        totalIndicators,
        fileCount,
        commitMessage: initialCommit.message,
        fileTypes: this.categorizeFiles(initialCommit.changedFiles),
      });
    }

    return this.createPatternResult(false, (indicatorCount / totalIndicators) * 0.3);
  }

  /**
   * Check if commit has complete project structure
   * @param files Array of file paths
   * @returns True if has complete structure
   */
  private hasCompleteProjectStructure(files: string[]): boolean {
    const structureFiles = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'vite.config.js',
      'babel.config.js',
      '.eslintrc',
      '.prettierrc',
      'jest.config.js',
    ];

    const foundStructureFiles = files.filter((file) =>
      structureFiles.some((sf) => file.endsWith(sf)),
    ).length;

    return foundStructureFiles >= 3;
  }

  /**
   * Check if commit has configuration files
   * @param files Array of file paths
   * @returns True if has config files
   */
  private hasConfigurationFiles(files: string[]): boolean {
    const configPatterns = [/\.config\.(js|ts|json)$/, /^\.env/, /^\.git/, /^\.vscode/, /^\.idea/];

    return files.some((file) => configPatterns.some((pattern) => pattern.test(file)));
  }

  /**
   * Check if commit has documentation files
   * @param files Array of file paths
   * @returns True if has documentation
   */
  private hasDocumentationFiles(files: string[]): boolean {
    const docPatterns = [/README/i, /CHANGELOG/i, /LICENSE/i, /CONTRIBUTING/i, /\.md$/];

    return files.some((file) => docPatterns.some((pattern) => pattern.test(file)));
  }

  /**
   * Check if commit has test files
   * @param files Array of file paths
   * @returns True if has tests
   */
  private hasTestFiles(files: string[]): boolean {
    const testPatterns = [/\.(test|spec)\.(js|ts|jsx|tsx)$/, /^test\//, /^tests\//, /__tests__/];

    return files.some((file) => testPatterns.some((pattern) => pattern.test(file)));
  }

  /**
   * Check if initial commit message is "perfect" (suggests AI)
   * @param message Commit message
   * @returns True if message seems AI-generated
   */
  private isPerfectInitialMessage(message: string): boolean {
    const perfectPatterns = [
      /^Initial commit with complete .+ implementation$/i,
      /^feat: initial .+ setup with .+ integration$/i,
      /^🎉 Initial release with comprehensive .+ support$/i,
      /^Add complete .+ project structure$/i,
    ];

    return perfectPatterns.some((pattern) => pattern.test(message));
  }

  /**
   * Categorize files by type
   * @param files Array of file paths
   * @returns Object with file type counts
   */
  private categorizeFiles(files: string[]): Record<string, number> {
    const categories = {
      source: 0,
      config: 0,
      test: 0,
      documentation: 0,
      assets: 0,
      other: 0,
    };

    files.forEach((file) => {
      if (/\.(js|ts|jsx|tsx|py|java|go|rb|php)$/.test(file)) {
        categories.source++;
      } else if (/\.(json|yaml|yml|toml|ini|env)$/.test(file) || file.includes('config')) {
        categories.config++;
      } else if (/\.(test|spec)\./.test(file) || file.includes('test')) {
        categories.test++;
      } else if (/\.(md|txt|rst)$/.test(file) || /README|LICENSE|CHANGELOG/i.test(file)) {
        categories.documentation++;
      } else if (/\.(png|jpg|jpeg|gif|svg|ico|woff|ttf)$/.test(file)) {
        categories.assets++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }

  /**
   * Create empty result for error cases
   * @returns Empty git analysis result
   */
  private createEmptyResult(): GitAnalysisResult {
    return {
      analyzer: 'git-history',
      patterns: [],
      metadata: {
        totalCommits: 0,
        analysisTime: this.getElapsedTime(),
        sufficientHistory: false,
      },
    };
  }
}
