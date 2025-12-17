/**
 * @fileoverview Command-line argument parser for the code review tool.
 *
 * This module defines and parses command-line arguments for the code review tool
 * using the yargs library. It provides a consistent interface for all commands
 * and ensures that required arguments are provided.
 */

import yargs from 'yargs';
import type { ReviewOptions, ReviewType } from '../types/review';
import { displayConfigError, loadConfigSafe } from '../utils/config';
import logger from '../utils/logger';
import { VERSION_WITH_BUILD } from '../version';

// Define valid review types for display
const validReviewTypes: ReviewType[] = [
  'quick-fixes',
  'architectural',
  'security',
  'performance',
  'unused-code',
  'focused-unused-code',
  'code-tracing-unused-code',
  'consolidated',
  'best-practices',
  'evaluation',
  'extract-patterns',
  'coding-test',
  'ai-integration',
  'cloud-native',
  'developer-experience',
  'comprehensive',
];

// Define all accepted values including aliases (for validation)
// 'improved-quick-fixes' is a hidden alias that maps to 'quick-fixes'
const _acceptedReviewTypes: string[] = [
  ...validReviewTypes,
  'improved-quick-fixes', // Hidden alias, mapped to 'quick-fixes'
];

// Define valid output formats
const validOutputFormats = ['markdown', 'json'];

/**
 * Parse command-line arguments for the code review tool
 * @returns Parsed arguments
 */
export function parseArguments(): any {
  // Try to load configuration safely
  const configResult = loadConfigSafe();

  if (!configResult.success) {
    // Display user-friendly error and exit
    displayConfigError(configResult);
    process.exit(1);
  }

  const config = configResult.config;

  // Get the default model from configuration
  const defaultModel = config.selectedModel || '';

  // Parse command-line arguments using yargs
  // Filter out the '--' separator that may be added by npm scripts
  const filteredArgs = process.argv.slice(2).filter((arg) => arg !== '--');

  const argv = yargs(filteredArgs)
    .command(
      ['$0 [target]', 'code-review [target]'],
      'Run a code review on the specified target\n\n' +
        'Examples:\n' +
        '  ai-code-review . --type comprehensive    # Full analysis of current directory\n' +
        '  ai-code-review src --type quick-fixes    # Quick fixes for src folder\n' +
        '  ai-code-review file.ts --type security   # Security review of single file\n' +
        '  ai-code-review . --estimate              # Estimate cost before review',
      (yargs) => {
        return (
          yargs
            .positional('target', {
              describe: 'Path to the file or directory to review',
              type: 'string',
              default: '.',
            })
            .option('type', {
              alias: 't',
              describe:
                'Type of review to perform\n' +
                '  • quick-fixes: Fast improvements and bug fixes\n' +
                '  • architectural: Design patterns and structure\n' +
                '  • security: Vulnerability detection\n' +
                '  • performance: Optimization opportunities\n' +
                '  • comprehensive: Complete analysis (recommended)',
              choices: validReviewTypes, // Show only the valid types in help
              // No default here - will be set after config file is applied
              coerce: (value: string) => {
                // Transform improved-quick-fixes to quick-fixes before validation
                if (value === 'improved-quick-fixes') {
                  return 'quick-fixes';
                }
                return value;
              },
            })
            .option('output', {
              alias: 'o',
              describe: 'Output format (markdown or json)',
              choices: validOutputFormats,
              default: 'markdown',
            })
            .option('output-dir', {
              describe: 'Directory to save review output',
              type: 'string',
            })
            .option('model', {
              alias: 'm',
              describe:
                'Model to use for the review (format: provider:model)\n' +
                '  Popular choices:\n' +
                '  • openrouter:anthropic/claude-4-opus (best quality)\n' +
                '  • openrouter:anthropic/claude-4-sonnet (balanced)\n' +
                '  • openrouter:openai/gpt-4o (multimodal)\n' +
                '  • openrouter:google/gemini-2.0-pro (large context)\n' +
                '  Use --listmodels to see all available options',
              type: 'string',
              default: defaultModel,
            })
            .option('include-tests', {
              describe: 'Include test files in the review',
              type: 'boolean',
              default: false,
            })
            .option('include-project-docs', {
              describe: 'Include project documentation in the review context',
              type: 'boolean',
              default: true,
            })
            .option('include-dependency-analysis', {
              describe: 'Include dependency analysis in the review',
              type: 'boolean',
              default: undefined,
            })
            .option('enable-semantic-chunking', {
              describe: 'Enable semantic chunking for intelligent code analysis',
              type: 'boolean',
              default: process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING !== 'false',
            })
            .option('interactive', {
              alias: 'i',
              describe: 'Run in interactive mode, processing review results in real-time',
              type: 'boolean',
              default: false,
            })
            .option('test-api', {
              describe: 'Test API connections before running the review',
              type: 'boolean',
              default: false,
            })
            .option('skip-key-check', {
              describe: 'Skip API key validation on startup',
              type: 'boolean',
              default: false,
            })
            .option('estimate', {
              describe: 'Estimate token usage and cost without performing the review',
              type: 'boolean',
              default: false,
            })
            .option('multi-pass', {
              describe: 'Use multi-pass review for large codebases',
              type: 'boolean',
              default: false,
            })
            .option('force-single-pass', {
              describe:
                'Force single-pass review even if token analysis suggests multiple passes are needed',
              type: 'boolean',
              default: false,
            })
            .option('context-maintenance-factor', {
              describe: 'Context maintenance factor for multi-pass reviews (0-1)',
              type: 'number',
              default: 0.15,
            })
            .option('no-confirm', {
              describe: 'Skip confirmation prompts',
              type: 'boolean',
              default: false,
            })
            .option('debug', {
              describe: 'Enable debug logging',
              type: 'boolean',
              default: false,
            })
            .option('language', {
              describe: 'Specify the programming language (auto-detected if not specified)',
              type: 'string',
            })
            .option('framework', {
              describe: 'Specify the framework (auto-detected if not specified)',
              type: 'string',
            })
            .option('listmodels', {
              describe: 'List available models based on configured API keys',
              type: 'boolean',
              default: false,
            })
            .option('models', {
              describe: 'List all supported models and their configuration names',
              type: 'boolean',
              default: false,
            })
            .option('config', {
              describe: 'Path to JSON configuration file',
              type: 'string',
            })
            .option('google-api-key', {
              describe: 'Google API key for Gemini models',
              type: 'string',
            })
            .option('openrouter-api-key', {
              describe: 'OpenRouter API key',
              type: 'string',
            })
            .option('anthropic-api-key', {
              describe: 'Anthropic API key for Claude models',
              type: 'string',
            })
            .option('openai-api-key', {
              describe: 'OpenAI API key for GPT models',
              type: 'string',
            })
            // Coding test specific options
            .option('assignment-file', {
              describe: 'Path to assignment description file',
              type: 'string',
            })
            .option('assignment-url', {
              describe: 'URL to assignment description',
              type: 'string',
            })
            .option('assignment-text', {
              describe: 'Inline assignment description',
              type: 'string',
            })
            .option('evaluation-template', {
              describe: 'Path to custom evaluation template',
              type: 'string',
            })
            .option('template-url', {
              describe: 'URL to evaluation template',
              type: 'string',
            })
            .option('rubric-file', {
              describe: 'Path to scoring rubric file',
              type: 'string',
            })
            .option('assessment-type', {
              describe: 'Type of assessment',
              choices: ['coding-challenge', 'take-home', 'live-coding', 'code-review'],
              default: 'coding-challenge',
            })
            .option('difficulty-level', {
              describe: 'Difficulty level',
              choices: ['junior', 'mid', 'senior', 'lead', 'architect'],
              default: 'mid',
            })
            .option('writer-model', {
              describe:
                'Model to use for consolidating multi-pass reviews (defaults to main model)',
              type: 'string',
            })
            .option('batch-token-limit', {
              describe: 'Force maximum tokens per batch (for testing consolidation)',
              type: 'number',
            })
            .option('time-limit', {
              describe: 'Expected completion time in minutes',
              type: 'number',
            })
            .option('weight-correctness', {
              describe: 'Weight for correctness evaluation (0-100)',
              type: 'number',
              default: 30,
            })
            .option('weight-code-quality', {
              describe: 'Weight for code quality evaluation (0-100)',
              type: 'number',
              default: 25,
            })
            .option('weight-architecture', {
              describe: 'Weight for architecture evaluation (0-100)',
              type: 'number',
              default: 20,
            })
            .option('weight-performance', {
              describe: 'Weight for performance evaluation (0-100)',
              type: 'number',
              default: 15,
            })
            .option('weight-testing', {
              describe: 'Weight for testing evaluation (0-100)',
              type: 'number',
              default: 10,
            })
            .option('evaluate-documentation', {
              describe: 'Include documentation assessment',
              type: 'boolean',
              default: false,
            })
            .option('evaluate-git-history', {
              describe: 'Include git commit history analysis',
              type: 'boolean',
              default: false,
            })
            .option('evaluate-edge-cases', {
              describe: 'Focus on edge case handling',
              type: 'boolean',
              default: false,
            })
            .option('evaluate-error-handling', {
              describe: 'Focus on error handling patterns',
              type: 'boolean',
              default: false,
            })
            .option('scoring-system', {
              describe: 'Scoring system type',
              choices: ['numeric', 'letter', 'pass-fail', 'custom'],
              default: 'numeric',
            })
            .option('max-score', {
              describe: 'Maximum possible score',
              type: 'number',
              default: 100,
            })
            .option('passing-threshold', {
              describe: 'Minimum passing score',
              type: 'number',
              default: 70,
            })
            .option('score-breakdown', {
              describe: 'Include detailed score breakdown',
              type: 'boolean',
              default: true,
            })
            .option('feedback-level', {
              describe: 'Feedback detail level',
              choices: ['basic', 'detailed', 'comprehensive'],
              default: 'detailed',
            })
            .option('include-examples', {
              describe: 'Include code examples in feedback',
              type: 'boolean',
              default: true,
            })
            .option('include-suggestions', {
              describe: 'Include improvement suggestions',
              type: 'boolean',
              default: true,
            })
            .option('include-resources', {
              describe: 'Include learning resources',
              type: 'boolean',
              default: false,
            })
            .option('allowed-libraries', {
              describe: 'Comma-separated list of allowed libraries',
              type: 'string',
            })
            .option('forbidden-patterns', {
              describe: 'Comma-separated list of forbidden patterns',
              type: 'string',
            })
            .option('node-version', {
              describe: 'Expected Node.js version',
              type: 'string',
            })
            .option('typescript-version', {
              describe: 'Expected TypeScript version',
              type: 'string',
            })
            .option('memory-limit', {
              describe: 'Memory constraint in MB',
              type: 'number',
            })
            .option('execution-timeout', {
              describe: 'Execution timeout in seconds',
              type: 'number',
            })
            // AI Detection Options
            .option('enable-ai-detection', {
              describe:
                'Enable AI-generated code detection for coding tests. Analyzes patterns that suggest AI assistance in code submissions.',
              type: 'boolean',
              default: false,
            })
            .option('ai-detection-threshold', {
              describe:
                'AI detection confidence threshold (0.0-1.0). Lower values are more sensitive. Use 0.6-0.7 for strict evaluation, 0.8+ for lenient.',
              type: 'number',
              default: 0.7,
            })
            .option('ai-detection-analyzers', {
              describe:
                'Comma-separated list of analyzers: git (commit patterns), documentation (README/comments), structural (code organization), statistical (style analysis), linguistic (naming patterns)',
              type: 'string',
              default: 'git,documentation',
            })
            .option('ai-detection-include-in-report', {
              describe:
                'Include detailed AI detection results and recommendations in the review report',
              type: 'boolean',
              default: true,
            })
            .option('ai-detection-fail-on-detection', {
              describe:
                'Automatically fail the evaluation if AI-generated code is detected above the threshold. Use with caution for high-stakes assessments.',
              type: 'boolean',
              default: false,
            })
            .option('diagram', {
              describe: 'Generate Mermaid architecture diagrams for architectural reviews',
              type: 'boolean',
              default: false,
            })
        );
      },
    )
    .command('test-model', 'Test the configured model with a simple prompt', (yargs) => {
      return yargs
        .option('model', {
          alias: 'm',
          describe: 'Model to test (format: provider:model)',
          type: 'string',
          default: defaultModel,
        })
        .option('debug', {
          describe: 'Enable debug logging',
          type: 'boolean',
          default: false,
        })
        .option('google-api-key', {
          describe: 'Google API key for Gemini models',
          type: 'string',
        })
        .option('openrouter-api-key', {
          describe: 'OpenRouter API key',
          type: 'string',
        })
        .option('anthropic-api-key', {
          describe: 'Anthropic API key for Claude models',
          type: 'string',
        })
        .option('openai-api-key', {
          describe: 'OpenAI API key for GPT models',
          type: 'string',
        });
    })
    .command('test-build', 'Test the build by running a simple command', (yargs) => {
      return yargs.option('debug', {
        describe: 'Enable debug logging',
        type: 'boolean',
        default: false,
      });
    })
    .command('sync-github-projects', 'Sync GitHub projects to local directory', (yargs) => {
      return yargs
        .option('token', {
          describe: 'GitHub token',
          type: 'string',
          demandOption: true,
        })
        .option('org', {
          describe: 'GitHub organization',
          type: 'string',
          demandOption: true,
        })
        .option('output-dir', {
          describe: 'Output directory',
          type: 'string',
          default: './github-projects',
        })
        .option('debug', {
          describe: 'Enable debug logging',
          type: 'boolean',
          default: false,
        });
    })
    .command('generate-config', 'Generate a sample configuration file', (yargs) => {
      return yargs
        .option('output', {
          alias: 'o',
          describe: 'Output file path for the configuration',
          type: 'string',
        })
        .option('format', {
          alias: 'f',
          describe: 'Configuration file format',
          choices: ['yaml', 'json'],
          default: 'yaml',
        })
        .option('force', {
          describe: 'Overwrite existing configuration file',
          type: 'boolean',
          default: false,
        });
    })
    .command('mcp', 'Start the AI Code Review MCP (Model Context Protocol) server', (yargs) => {
      return yargs
        .option('debug', {
          describe: 'Enable debug logging',
          type: 'boolean',
          default: false,
        })
        .option('name', {
          describe: 'Server name',
          type: 'string',
          default: 'ai-code-review',
        })
        .option('max-requests', {
          describe: 'Maximum concurrent requests',
          type: 'string',
          default: '5',
        })
        .option('timeout', {
          describe: 'Request timeout in milliseconds',
          type: 'string',
          default: '300000',
        });
    })
    .command('validate-config', 'Validate configuration and API keys', (yargs) => {
      return yargs
        .option('config', {
          describe: 'Path to configuration file to validate',
          type: 'string',
        })
        .option('test-connections', {
          describe: 'Test API connections for all configured providers',
          type: 'boolean',
          default: true,
        });
    })
    .command('init', 'Initialize project configuration and set up API keys', (yargs) => {
      return yargs.option('debug', {
        describe: 'Enable debug logging',
        type: 'boolean',
        default: false,
      });
    })
    .command('install', 'Install AI Code Review as a project-level MCP service', (yargs) => {
      return yargs.option('debug', {
        describe: 'Enable debug logging',
        type: 'boolean',
        default: false,
      });
    })
    .option('show-version', {
      describe: 'Show version information',
      type: 'boolean',
      default: false,
    })
    .help()
    .alias('help', 'h')
    .version(VERSION_WITH_BUILD)
    .alias('version', 'v')
    .strict()
    .demandCommand(0) // Don't require a command for version/help flags
    .parse();

  // Enable debug logging if requested
  if ((argv as any).debug) {
    logger.setLogLevel('debug');
    logger.debug('Debug logging enabled');
    logger.debug(
      `Environment variable AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING: ${process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING || 'not set (defaults to true)'}`,
    );
    logger.debug(`Semantic chunking enabled: ${(argv as any).enableSemanticChunking}`);
    logger.debug(`Raw parsed arguments: ${JSON.stringify(argv, null, 2)}`);
    logger.debug(`Parsed target: ${(argv as any).target}`);
    logger.debug(`Parsed type: ${(argv as any).type}`);
    logger.debug(`Process argv: ${JSON.stringify(process.argv, null, 2)}`);
  }

  return argv;
}

/**
 * CLI options interface that extends ReviewOptions with CLI-specific properties
 */
export interface CliOptions extends ReviewOptions {
  /** Target file or directory path */
  target: string;
  /** Output directory for generated files */
  outputDir?: string;
  /** Writer model for consolidation */
  writerModel?: string;
  /** API keys for different providers */
  apiKey?: Record<string, string>;
  /** API keys from CLI (alternative name for compatibility) */
  apiKeys?: Record<string, string>;
  /** Log level for logging */
  logLevel?: string;
  /** Path to JSON configuration file */
  config?: string;
}

/**
 * Map command-line arguments to review options
 * @param argv Parsed command-line arguments
 * @returns Review options
 */
interface ParsedArguments {
  type?: string;
  individual?: boolean;
  output?: string;
  outputDir?: string;
  model?: string;
  includeTests?: boolean;
  includeProjectDocs?: boolean;
  includeDependencyAnalysis?: boolean;
  enableSemanticChunking?: boolean;
  interactive?: boolean;
  testApi?: boolean;
  estimate?: boolean;
  multiPass?: boolean;
  forceSinglePass?: boolean;
  contextMaintenanceFactor?: number;
  noConfirm?: boolean;
  confirm?: boolean;
  debug?: boolean;
  language?: string;
  framework?: string;
  listmodels?: boolean;
  models?: boolean;
  target?: string;
  config?: string;
  'ui-language'?: string;
  uiLanguage?: string;
  'google-api-key'?: string;
  'openrouter-api-key'?: string;
  'anthropic-api-key'?: string;
  'openai-api-key'?: string;

  // Coding test specific options
  assignmentFile?: string;
  assignmentUrl?: string;
  assignmentText?: string;
  evaluationTemplate?: string;
  templateUrl?: string;
  rubricFile?: string;
  assessmentType?: string;
  difficultyLevel?: string;
  timeLimit?: number;
  weightCorrectness?: number;
  weightCodeQuality?: number;
  weightArchitecture?: number;
  weightPerformance?: number;
  weightTesting?: number;
  evaluateDocumentation?: boolean;
  evaluateGitHistory?: boolean;
  evaluateEdgeCases?: boolean;
  evaluateErrorHandling?: boolean;
  scoringSystem?: string;
  maxScore?: number;
  passingThreshold?: number;
  scoreBreakdown?: boolean;
  feedbackLevel?: string;
  includeExamples?: boolean;
  includeSuggestions?: boolean;
  includeResources?: boolean;
  allowedLibraries?: string;
  forbiddenPatterns?: string;
  nodeVersion?: string;
  typescriptVersion?: string;
  memoryLimit?: number;
  executionTimeout?: number;

  // AI Detection options
  enableAiDetection?: boolean;
  aiDetectionThreshold?: number;
  aiDetectionAnalyzers?: string;
  aiDetectionIncludeInReport?: boolean;
  aiDetectionFailOnDetection?: boolean;
  diagram?: boolean;
  'writer-model'?: string;
  writerModel?: string;
  'batch-token-limit'?: number;
  batchTokenLimit?: number;
}

export function mapArgsToReviewOptions(
  argv: ParsedArguments,
): ReviewOptions & { target: string } & { apiKeys?: Record<string, string> } {
  // Note: improved-quick-fixes aliasing is handled by yargs coerce function

  const options: ReviewOptions & { target: string } & { apiKeys?: Record<string, string> } = {
    type: (argv.type as ReviewType) || 'quick-fixes', // Apply default if not set by CLI or config
    output: argv.output,
    outputDir: argv.outputDir,
    model: argv.model,
    includeTests: argv.includeTests,
    includeProjectDocs: argv.includeProjectDocs,
    includeDependencyAnalysis: argv.includeDependencyAnalysis,
    enableSemanticChunking: argv.enableSemanticChunking,
    interactive: argv.interactive,
    testApi: argv.testApi,
    estimate: argv.estimate,
    multiPass: argv.multiPass,
    forceSinglePass: argv.forceSinglePass,
    contextMaintenanceFactor: argv.contextMaintenanceFactor,
    noConfirm: argv.noConfirm,
    debug: argv.debug,
    language: argv.language,
    framework: argv.framework,
    listmodels: argv.listmodels,
    models: argv.models,
    target: argv.target || '.',
    writerModel: argv['writer-model'] || argv.writerModel,
    batchTokenLimit: argv['batch-token-limit'] || argv.batchTokenLimit,

    // Coding test specific options
    assignmentFile: argv.assignmentFile,
    assignmentUrl: argv.assignmentUrl,
    assignmentText: argv.assignmentText,
    evaluationTemplate: argv.evaluationTemplate,
    templateUrl: argv.templateUrl,
    rubricFile: argv.rubricFile,
    assessmentType: argv.assessmentType as
      | 'coding-challenge'
      | 'take-home'
      | 'live-coding'
      | 'code-review'
      | undefined,
    difficultyLevel: argv.difficultyLevel as
      | 'junior'
      | 'mid'
      | 'senior'
      | 'lead'
      | 'architect'
      | undefined,
    timeLimit: argv.timeLimit,

    // Evaluation criteria weights
    weightCorrectness: argv.weightCorrectness,
    weightCodeQuality: argv.weightCodeQuality,
    weightArchitecture: argv.weightArchitecture,
    weightPerformance: argv.weightPerformance,
    weightTesting: argv.weightTesting,

    // Evaluation flags
    evaluateDocumentation: argv.evaluateDocumentation,
    evaluateGitHistory: argv.evaluateGitHistory,
    evaluateEdgeCases: argv.evaluateEdgeCases,
    evaluateErrorHandling: argv.evaluateErrorHandling,

    // Scoring configuration
    scoringSystem: argv.scoringSystem as 'numeric' | 'letter' | 'pass-fail' | 'custom' | undefined,
    maxScore: argv.maxScore,
    passingThreshold: argv.passingThreshold,
    scoreBreakdown: argv.scoreBreakdown,

    // Feedback options
    feedbackLevel: argv.feedbackLevel as 'basic' | 'detailed' | 'comprehensive' | undefined,
    includeExamples: argv.includeExamples,
    includeSuggestions: argv.includeSuggestions,
    includeResources: argv.includeResources,

    // Constraints
    allowedLibraries: argv.allowedLibraries
      ? argv.allowedLibraries.split(',').map((lib) => lib.trim())
      : undefined,
    forbiddenPatterns: argv.forbiddenPatterns
      ? argv.forbiddenPatterns.split(',').map((pattern) => pattern.trim())
      : undefined,
    nodeVersion: argv.nodeVersion,
    typescriptVersion: argv.typescriptVersion,
    memoryLimit: argv.memoryLimit,
    executionTimeout: argv.executionTimeout,

    // AI Detection options
    enableAiDetection: argv.enableAiDetection,
    aiDetectionThreshold: argv.aiDetectionThreshold,
    aiDetectionAnalyzers: argv.aiDetectionAnalyzers,
    aiDetectionIncludeInReport: argv.aiDetectionIncludeInReport,
    aiDetectionFailOnDetection: argv.aiDetectionFailOnDetection,
    diagram: argv.diagram,
  };

  // Add API keys if provided
  const apiKeys: Record<string, string> = {};
  if (argv['google-api-key']) {
    apiKeys.google = argv['google-api-key'];
  }
  if (argv['openrouter-api-key']) {
    apiKeys.openrouter = argv['openrouter-api-key'];
  }
  if (argv['anthropic-api-key']) {
    apiKeys.anthropic = argv['anthropic-api-key'];
  }
  if (argv['openai-api-key']) {
    apiKeys.openai = argv['openai-api-key'];
  }

  if (Object.keys(apiKeys).length > 0) {
    options.apiKeys = apiKeys;
  }

  return options;
}

/**
 * Validate and transform command-line arguments
 * @param options Raw command-line options
 * @returns Validated and transformed options
 */
export function validateArguments(options: ParsedArguments): ParsedArguments {
  const validated = { ...options };

  // Handle review type aliases
  if (validated.type === 'arch') {
    validated.type = 'architectural';
  }

  // Note: improved-quick-fixes alias is handled by yargs coerce function

  // Map ui-language to uiLanguage and remove the original property
  if (validated['ui-language']) {
    validated.uiLanguage = validated['ui-language'];
    delete validated['ui-language'];
  }

  // Map confirm option to noConfirm with inverse logic
  if (validated.confirm !== undefined) {
    validated.noConfirm = !validated.confirm;
    delete validated.confirm;
  }

  // Validate AI detection parameters
  if (
    validated.enableAiDetection !== undefined ||
    validated.aiDetectionThreshold !== undefined ||
    validated.aiDetectionAnalyzers !== undefined ||
    validated.aiDetectionIncludeInReport !== undefined ||
    validated.aiDetectionFailOnDetection !== undefined
  ) {
    // AI detection is only supported with coding-test review type
    if (validated.type !== 'coding-test') {
      console.warn(
        '⚠️  Warning: AI detection parameters are only supported with --type coding-test. These parameters will be ignored.',
      );
    }

    // Validate AI detection threshold
    if (validated.aiDetectionThreshold !== undefined) {
      const threshold = validated.aiDetectionThreshold;
      if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
        throw new Error('❌ AI detection threshold must be a number between 0.0 and 1.0');
      }
      if (threshold < 0.5) {
        console.warn(
          '⚠️  Warning: AI detection threshold below 0.5 may produce many false positives',
        );
      }
      if (threshold > 0.95) {
        console.warn(
          '⚠️  Warning: AI detection threshold above 0.95 may miss obvious AI-generated code',
        );
      }
    }

    // Validate AI detection analyzers
    if (validated.aiDetectionAnalyzers !== undefined) {
      const analyzers = validated.aiDetectionAnalyzers.split(',').map((a) => a.trim());
      const validAnalyzers = ['git', 'documentation', 'structural', 'statistical', 'linguistic'];
      const invalidAnalyzers = analyzers.filter((analyzer) => !validAnalyzers.includes(analyzer));

      if (invalidAnalyzers.length > 0) {
        throw new Error(
          `❌ Invalid AI detection analyzers: ${invalidAnalyzers.join(', ')}. Valid options: ${validAnalyzers.join(', ')}`,
        );
      }

      const availableAnalyzers = ['git', 'documentation']; // Currently implemented
      const unavailableAnalyzers = analyzers.filter(
        (analyzer) => !availableAnalyzers.includes(analyzer),
      );

      if (unavailableAnalyzers.length > 0) {
        console.warn(
          `⚠️  Warning: These analyzers are not yet implemented and will be ignored: ${unavailableAnalyzers.join(', ')}`,
        );
        // Filter to only available analyzers
        const filteredAnalyzers = analyzers.filter((analyzer) =>
          availableAnalyzers.includes(analyzer),
        );
        if (filteredAnalyzers.length === 0) {
          console.warn(
            '⚠️  Warning: No valid analyzers remaining, using default: git,documentation',
          );
          validated.aiDetectionAnalyzers = 'git,documentation';
        } else {
          validated.aiDetectionAnalyzers = filteredAnalyzers.join(',');
        }
      }
    }

    // Warn about automatic failure setting
    if (validated.aiDetectionFailOnDetection === true) {
      console.warn(
        '⚠️  Warning: Automatic failure on AI detection is enabled. Use with caution for high-stakes assessments.',
      );

      // Recommend lower threshold for automatic failure
      if (validated.aiDetectionThreshold !== undefined && validated.aiDetectionThreshold > 0.8) {
        console.warn(
          '💡 Tip: Consider using a lower threshold (0.6-0.7) when enabling automatic failure to avoid missing AI-generated content.',
        );
      }
    }

    // Provide helpful tips based on configuration
    if (validated.enableAiDetection === true) {
      if (validated.aiDetectionThreshold === undefined) {
        console.log(
          '💡 Tip: Using default AI detection threshold of 0.7. Adjust with --ai-detection-threshold for different sensitivity levels.',
        );
      }

      if (validated.aiDetectionAnalyzers === undefined) {
        console.log(
          '💡 Tip: Using default analyzers: git,documentation. Specify with --ai-detection-analyzers for different analysis focus.',
        );
      }
    }
  }

  return validated;
}
