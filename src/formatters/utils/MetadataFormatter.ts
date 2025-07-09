/**
 * @fileoverview Utilities for formatting metadata sections in review outputs.
 *
 * This module provides functions to format metadata sections for review outputs,
 * including cost information, model details, and other metadata.
 */

import type { PassCost, ReviewType } from '../../types/review';
import { extractModelInfoFromString } from './ModelInfoExtractor';

/**
 * Format a metadata section for a review
 * @param reviewType Type of review
 * @param timestamp Timestamp of the review
 * @param modelInfo Model information string
 * @param cost Cost information object
 * @param toolVersion Tool version
 * @param commandOptions Command options used
 * @param detectedLanguage Detected language
 * @param detectedFramework Detected framework
 * @param frameworkVersion Framework version
 * @param cssFrameworks CSS frameworks detected
 * @returns Formatted metadata section as markdown
 */
export function formatMetadataSection(
  reviewType: string,
  timestamp: string,
  modelInfo: string,
  cost?: any,
  toolVersion?: string,
  commandOptions?: string,
  detectedLanguage?: string,
  detectedFramework?: string,
  frameworkVersion?: string,
  cssFrameworks?: Array<{ name: string; version?: string }>,
): string {
  // Extract model vendor and name from modelInfo
  const { modelVendor, modelName } = extractModelInfoFromString(modelInfo);

  // Format the date
  const formattedDate = new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  // Create metadata section
  let metadataSection = `## Metadata\n| Property | Value |\n|----------|-------|\n| Review Type | ${reviewType} |\n| Generated At | ${formattedDate} |\n| Model Provider | ${modelVendor} |\n| Model Name | ${modelName} |`;

  // Add framework detection information if available
  if (detectedLanguage) {
    metadataSection += `\n| Detected Language | ${detectedLanguage} |`;

    if (detectedFramework && detectedFramework !== 'none') {
      metadataSection += `\n| Detected Framework | ${detectedFramework}${frameworkVersion ? ` v${frameworkVersion}` : ''} |`;
    }

    if (cssFrameworks && cssFrameworks.length > 0) {
      const cssFrameworksStr = cssFrameworks
        .map((cf) => (cf.version ? `${cf.name} v${cf.version.replace(/[^\d.]/g, '')}` : cf.name))
        .join(', ');

      metadataSection += `\n| CSS Frameworks | ${cssFrameworksStr} |`;
    }
  }

  // Add cost information if available
  if (cost) {
    metadataSection += `\n| Input Tokens | ${cost.inputTokens.toLocaleString()} |\n| Output Tokens | ${cost.outputTokens.toLocaleString()} |\n| Total Tokens | ${cost.totalTokens.toLocaleString()} |\n| Estimated Cost | ${cost.formattedCost} |`;

    // Add multi-pass information if available
    if (cost.passCount && cost.passCount > 1) {
      metadataSection += `\n| Multi-pass Review | ${cost.passCount} passes |`;
    }
  }

  // Add tool version if available
  if (toolVersion) {
    metadataSection += `\n| Tool Version | ${toolVersion} |`;
  }

  // Add command options if available
  if (commandOptions) {
    metadataSection += `\n| Command Options | \`${commandOptions}\` |`;
  }

  // Close the metadata table
  metadataSection += `\n`;

  return metadataSection;
}

/**
 * Parse metadata from a review object
 * @param metadata Metadata object or string
 * @returns Parsed metadata object
 */
export function parseMetadata(metadata: any): any {
  if (!metadata) {
    return {};
  }

  try {
    return typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
  } catch (_error) {
    // Silently continue if metadata parsing fails
    return {};
  }
}

/**
 * Create enhanced metadata object with detection info
 * @param modelVendor Model vendor
 * @param modelName Model name
 * @param modelInfo Full model info string
 * @param reviewType Review type
 * @param displayPath Display path
 * @param timestamp Timestamp
 * @param cost Cost information
 * @param toolVersion Tool version
 * @param commandOptions Command options
 * @param additionalMetadata Additional metadata
 * @param detectedLanguage Detected language
 * @param detectedFramework Detected framework
 * @param frameworkVersion Framework version
 * @param cssFrameworks CSS frameworks
 * @returns Enhanced metadata object
 */
export function createEnhancedMetadata(
  modelVendor: string,
  modelName: string,
  modelInfo: string,
  reviewType: ReviewType,
  displayPath: string,
  timestamp: string,
  cost: any,
  toolVersion?: string,
  commandOptions?: string,
  additionalMetadata: any = {},
  detectedLanguage?: string,
  detectedFramework?: string,
  frameworkVersion?: string,
  cssFrameworks?: Array<{ name: string; version?: string }>,
): any {
  // Format the date
  const formattedDate = new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });

  // Create enhanced metadata object
  const enhancedMetadata: any = {
    model: {
      provider: modelVendor,
      name: modelName,
      fullName: modelInfo,
    },
    review: {
      type: reviewType,
      path: displayPath,
      generatedAt: new Date(timestamp).toISOString(),
      formattedDate: formattedDate,
      multiPass:
        cost?.passCount && cost.passCount > 1
          ? {
              enabled: true,
              passCount: cost.passCount || 1,
              perPassCosts: cost.perPassCosts || null,
            }
          : null,
    },
    cost: cost || null,
    tool: {
      version: toolVersion || process.env.npm_package_version || '2.1.1',
      commandOptions: commandOptions || null,
      ...additionalMetadata,
    },
  };

  // Add framework detection information if available
  if (detectedLanguage) {
    enhancedMetadata.detection = {
      language: detectedLanguage,
    };

    if (detectedFramework && detectedFramework !== 'none') {
      enhancedMetadata.detection.framework = detectedFramework;
      if (frameworkVersion) {
        enhancedMetadata.detection.frameworkVersion = frameworkVersion;
      }
    }

    if (cssFrameworks && cssFrameworks.length > 0) {
      enhancedMetadata.detection.cssFrameworks = cssFrameworks;
    }
  }

  return enhancedMetadata;
}

/**
 * Parse cost information from a cost info string
 * @param costInfo Cost information string
 * @returns Parsed cost object or null
 */
export function parseCostInfo(costInfo: string): any {
  if (!costInfo) {
    return null;
  }

  // Try to extract cost information from the costInfo string
  const inputTokensMatch = costInfo.match(/Input tokens: ([\d,]+)/);
  const outputTokensMatch = costInfo.match(/Output tokens: ([\d,]+)/);
  const totalTokensMatch = costInfo.match(/Total tokens: ([\d,]+)/);
  const estimatedCostMatch = costInfo.match(/Estimated cost: (.*?)$/m);
  const passCountMatch = costInfo.match(/Multi-pass review: (\d+) passes/);

  if (inputTokensMatch || outputTokensMatch || totalTokensMatch || estimatedCostMatch) {
    return {
      inputTokens: inputTokensMatch ? parseInt(inputTokensMatch[1].replace(/,/g, '')) : 0,
      outputTokens: outputTokensMatch ? parseInt(outputTokensMatch[1].replace(/,/g, '')) : 0,
      totalTokens: totalTokensMatch ? parseInt(totalTokensMatch[1].replace(/,/g, '')) : 0,
      estimatedCost: estimatedCostMatch
        ? parseFloat(estimatedCostMatch[1].replace('$', '').replace(' USD', ''))
        : 0,
      formattedCost: estimatedCostMatch ? estimatedCostMatch[1] : '$0.00 USD',
      passCount: passCountMatch ? parseInt(passCountMatch[1]) : 1,
    };
  }

  return null;
}

/**
 * Format cost information as a markdown string
 * @param cost Cost information object
 * @returns Formatted cost information string
 */
export function formatCostInfo(cost: any): string {
  if (!cost) {
    return '';
  }

  let costInfo = `\n\n## Token Usage and Cost\n- Input tokens: ${cost.inputTokens.toLocaleString()}\n- Output tokens: ${cost.outputTokens.toLocaleString()}\n- Total tokens: ${cost.totalTokens.toLocaleString()}\n- Estimated cost: ${cost.formattedCost}`;

  // Add multi-pass information if available
  if (cost.passCount && cost.passCount > 1) {
    costInfo += `\n- Multi-pass review: ${cost.passCount} passes`;

    // Add per-pass breakdown if available
    if (cost.perPassCosts && Array.isArray(cost.perPassCosts)) {
      costInfo += `\n\n### Pass Breakdown`;
      cost.perPassCosts.forEach((passCost: PassCost) => {
        costInfo += `\nPass ${passCost.passNumber}:\n- Input tokens: ${passCost.inputTokens.toLocaleString()}\n- Output tokens: ${passCost.outputTokens.toLocaleString()}\n- Total tokens: ${passCost.totalTokens.toLocaleString()}\n- Cost: ${typeof passCost.estimatedCost === 'number' ? `$${passCost.estimatedCost.toFixed(4)} USD` : 'N/A'}`;
      });
    }
  }

  return costInfo;
}
