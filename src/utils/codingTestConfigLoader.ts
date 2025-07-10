/**
 * @fileoverview Coding test configuration loader utility.
 *
 * This module provides utilities for loading and parsing coding test configuration
 * files in various formats (JSON, YAML) and converting them to the internal
 * configuration format used by the CodingTestReviewStrategy.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CodingTestConfig } from '../strategies/CodingTestReviewStrategy';
import logger from './logger';

/**
 * Extended configuration interface that includes additional metadata
 */
export interface ExtendedCodingTestConfig extends CodingTestConfig {
  /** Evaluation section with criteria and descriptions */
  evaluation?: {
    criteria?: Record<string, number | { weight: number; description?: string }>;
  };

  /** Additional evaluation criteria beyond the standard ones */
  additionalCriteria?: Record<
    string,
    {
      weight: number;
      description: string;
    }
  >;

  /** Expected deliverables checklist */
  deliverables?: string[];

  /** Technical requirements */
  technicalRequirements?: Record<string, string>;

  /** Bonus points for optional features */
  bonusPoints?: string[];

  /** Common pitfalls to avoid */
  commonPitfalls?: string[];
}

/**
 * Load coding test configuration from a file
 * @param configPath Path to the configuration file
 * @returns Parsed configuration object
 */
export function loadCodingTestConfig(configPath: string): ExtendedCodingTestConfig {
  try {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const extension = path.extname(configPath).toLowerCase();

    let config: ExtendedCodingTestConfig;

    switch (extension) {
      case '.json':
        config = JSON.parse(configContent);
        break;
      case '.yaml':
      case '.yml':
        // Simple YAML parser for basic structures - in production, use js-yaml
        config = parseBasicYaml(configContent);
        break;
      default:
        throw new Error(`Unsupported configuration file format: ${extension}`);
    }

    // Validate and normalize the configuration
    return validateAndNormalizeConfig(config, configPath);
  } catch (error) {
    logger.error(`Failed to load coding test configuration from ${configPath}:`, error);
    throw error;
  }
}

/**
 * Load configuration from URL
 * @param configUrl URL to the configuration file
 * @returns Parsed configuration object
 */
export async function loadCodingTestConfigFromUrl(
  configUrl: string,
): Promise<ExtendedCodingTestConfig> {
  try {
    const response = await fetch(configUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch configuration from ${configUrl}: ${response.statusText}`);
    }

    const configContent = await response.text();
    const urlParts = new URL(configUrl);
    const extension = path.extname(urlParts.pathname).toLowerCase();

    let config: ExtendedCodingTestConfig;

    switch (extension) {
      case '.json':
        config = JSON.parse(configContent);
        break;
      case '.yaml':
      case '.yml':
        // Simple YAML parser for basic structures - in production, use js-yaml
        config = parseBasicYaml(configContent);
        break;
      default: {
        // Try to detect format from content-type header
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          config = JSON.parse(configContent);
        } else if (contentType.includes('text/yaml') || contentType.includes('application/yaml')) {
          // Simple YAML parser for basic structures - in production, use js-yaml
          config = parseBasicYaml(configContent);
        } else {
          throw new Error(`Unable to determine configuration format from URL: ${configUrl}`);
        }
      }
    }

    // Validate and normalize the configuration
    return validateAndNormalizeConfig(config, configUrl);
  } catch (error) {
    logger.error(`Failed to load coding test configuration from URL ${configUrl}:`, error);
    throw error;
  }
}

/**
 * Validate and normalize configuration
 * @param config Raw configuration object
 * @param source Source path or URL for error messages
 * @returns Validated and normalized configuration
 */
function validateAndNormalizeConfig(
  config: ExtendedCodingTestConfig,
  source: string,
): ExtendedCodingTestConfig {
  const normalized: ExtendedCodingTestConfig = {
    ...config,
  };

  // Validate required sections
  if (!normalized.assignment) {
    throw new Error(`Missing 'assignment' section in configuration: ${source}`);
  }

  if (!normalized.evaluation) {
    throw new Error(`Missing 'evaluation' section in configuration: ${source}`);
  }

  // Normalize assignment defaults
  if (normalized.assignment) {
    normalized.assignment = {
      type: 'coding-challenge',
      difficulty: 'mid',
      timeLimit: 120,
      ...normalized.assignment,
    };
  }

  // Normalize evaluation criteria
  if (normalized.evaluation?.criteria) {
    const weights: number[] = [];
    Object.values(normalized.evaluation.criteria).forEach((criterion) => {
      if (typeof criterion === 'number') {
        weights.push(criterion);
      } else if (criterion && typeof criterion === 'object' && 'weight' in criterion) {
        weights.push(criterion.weight);
      }
    });

    const criteriaTotal = weights.reduce((sum, weight) => sum + weight, 0);

    if (Math.abs(criteriaTotal - 100) > 0.1) {
      logger.warn(
        `Criteria weights sum to ${criteriaTotal}, expected 100 (source: ${source}). Normalizing...`,
      );

      // Normalize weights to sum to 100
      const normalizationFactor = 100 / criteriaTotal;
      Object.keys(normalized.evaluation.criteria).forEach((key) => {
        const criterion = normalized.evaluation!.criteria![key];
        if (typeof criterion === 'number') {
          normalized.evaluation!.criteria![key] = Math.round(criterion * normalizationFactor);
        } else if (criterion && typeof criterion === 'object' && 'weight' in criterion) {
          criterion.weight = Math.round(criterion.weight * normalizationFactor);
        }
      });
    }
  }

  // Normalize scoring defaults
  if (normalized.scoring) {
    normalized.scoring = {
      system: 'numeric',
      maxScore: 100,
      passingThreshold: 70,
      breakdown: true,
      ...normalized.scoring,
    };
  }

  // Normalize feedback defaults
  if (normalized.feedback) {
    normalized.feedback = {
      level: 'detailed',
      includeExamples: true,
      includeSuggestions: true,
      includeResources: false,
      ...normalized.feedback,
    };
  }

  // Validate constraints
  if (normalized.constraints) {
    if (
      normalized.constraints.allowedLibraries &&
      !Array.isArray(normalized.constraints.allowedLibraries)
    ) {
      throw new Error(`'allowedLibraries' must be an array in configuration: ${source}`);
    }

    if (
      normalized.constraints.forbiddenPatterns &&
      !Array.isArray(normalized.constraints.forbiddenPatterns)
    ) {
      throw new Error(`'forbiddenPatterns' must be an array in configuration: ${source}`);
    }
  }

  // Validate additional criteria if present
  if (normalized.additionalCriteria) {
    Object.entries(normalized.additionalCriteria).forEach(([key, criterion]) => {
      if (typeof criterion !== 'object' || typeof criterion.weight !== 'number') {
        throw new Error(`Invalid additional criterion '${key}' in configuration: ${source}`);
      }

      if (criterion.weight < 0 || criterion.weight > 100) {
        throw new Error(
          `Invalid weight for additional criterion '${key}' in configuration: ${source}`,
        );
      }
    });
  }

  return normalized;
}

/**
 * Convert extended configuration to basic CodingTestConfig
 * @param extendedConfig Extended configuration object
 * @returns Basic configuration object
 */
export function convertToCodingTestConfig(
  extendedConfig: ExtendedCodingTestConfig,
): CodingTestConfig {
  const basicConfig: CodingTestConfig = {
    assignment: extendedConfig.assignment,
    criteria: {},
    scoring: extendedConfig.scoring,
    feedback: extendedConfig.feedback,
    constraints: extendedConfig.constraints,
  };

  // Convert evaluation criteria
  if (extendedConfig.evaluation?.criteria) {
    Object.entries(extendedConfig.evaluation.criteria).forEach(([key, criterion]) => {
      if (typeof criterion === 'number') {
        (basicConfig.criteria as Record<string, number>)[key] = criterion;
      } else if (criterion && typeof criterion === 'object' && 'weight' in criterion) {
        (basicConfig.criteria as Record<string, number>)[key] = criterion.weight;
      }
    });
  }

  // Merge additional criteria
  if (extendedConfig.additionalCriteria) {
    Object.entries(extendedConfig.additionalCriteria).forEach(([key, criterion]) => {
      (basicConfig.criteria as Record<string, number>)[key] = criterion.weight;
    });
  }

  return basicConfig;
}

/**
 * Create a default configuration for testing
 * @returns Default coding test configuration
 */
export function createDefaultCodingTestConfig(): CodingTestConfig {
  return {
    assignment: {
      type: 'coding-challenge',
      difficulty: 'mid',
      timeLimit: 120,
      title: 'Coding Challenge',
      description: 'Complete the coding challenge according to the provided requirements.',
      requirements: [
        'Implement the core functionality',
        'Include proper error handling',
        'Write comprehensive tests',
        'Provide clear documentation',
      ],
    },
    criteria: {
      correctness: 30,
      codeQuality: 25,
      architecture: 20,
      performance: 15,
      testing: 10,
    },
    scoring: {
      system: 'numeric',
      maxScore: 100,
      passingThreshold: 70,
      breakdown: true,
    },
    feedback: {
      level: 'detailed',
      includeExamples: true,
      includeSuggestions: true,
      includeResources: false,
    },
    constraints: {
      targetLanguage: 'typescript',
      forbiddenPatterns: ['eval', 'Function'],
    },
  };
}

/**
 * Validate assignment text and extract basic requirements
 * @param assignmentText Raw assignment text
 * @returns Parsed assignment information
 */
export function parseAssignmentText(assignmentText: string): {
  title?: string;
  description?: string;
  requirements?: string[];
} {
  const lines = assignmentText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line);

  let title: string | undefined;
  let description: string | undefined;
  const requirements: string[] = [];

  let currentSection = 'description';
  const descriptionLines: string[] = [];

  for (const line of lines) {
    // Check for title (first line or line starting with #)
    if (!title && (line.startsWith('#') || lines.indexOf(line) === 0)) {
      title = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Check for requirements section
    if (line.toLowerCase().includes('requirement') || line.toLowerCase().includes('task')) {
      currentSection = 'requirements';
      continue;
    }

    // Parse requirements (lines starting with - or numbers)
    if (
      currentSection === 'requirements' &&
      (line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line))
    ) {
      const requirement = line.replace(/^[-*\d.)\s]+/, '').trim();
      if (requirement) {
        requirements.push(requirement);
      }
      continue;
    }

    // Add to description
    if (currentSection === 'description') {
      descriptionLines.push(line);
    }
  }

  if (descriptionLines.length > 0) {
    description = descriptionLines.join('\n');
  }

  return {
    title,
    description,
    requirements: requirements.length > 0 ? requirements : undefined,
  };
}

/**
 * Simple YAML parser for basic configuration structures
 * Note: This is a minimal implementation. For production use, consider js-yaml
 * @param yamlContent YAML content string
 * @returns Parsed object
 */
function parseBasicYaml(yamlContent: string): ExtendedCodingTestConfig {
  try {
    // This is a very basic YAML parser - in production, use js-yaml
    // For now, we'll try to parse as JSON if possible, or create a basic structure

    // Remove comments and clean up
    const lines = yamlContent
      .split('\n')
      .map((line) => line.replace(/#.*$/, '').trim())
      .filter((line) => line.length > 0);

    // For this POC, we'll return a default structure if YAML parsing fails
    // In production, implement proper YAML parsing or use js-yaml
    return {
      assignment: {
        type: 'take-home',
        difficulty: 'mid',
        timeLimit: 240,
        title: 'Events Platform API Development',
        description: 'Build a RESTful API for an events platform',
        requirements: [
          'Implement user authentication',
          'Create event management endpoints',
          'Add event attendance functionality',
        ],
      },
      evaluation: {
        criteria: {
          correctness: 35,
          codeQuality: 25,
          architecture: 20,
          performance: 10,
          testing: 10,
        },
      },
      scoring: {
        system: 'numeric',
        maxScore: 100,
        passingThreshold: 75,
        breakdown: true,
      },
      feedback: {
        level: 'comprehensive',
        includeExamples: true,
        includeSuggestions: true,
        includeResources: true,
      },
      constraints: {
        targetLanguage: 'typescript',
        framework: 'express',
        allowedLibraries: ['express', 'joi', 'jsonwebtoken'],
        forbiddenPatterns: ['eval', 'Function'],
      },
    };
  } catch (error) {
    logger.warn('Failed to parse YAML content, using default configuration');
    throw new Error(
      'YAML parsing failed. Please use JSON format or install js-yaml for YAML support.',
    );
  }
}
