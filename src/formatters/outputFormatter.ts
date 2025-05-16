/**
 * @fileoverview Formatter for code review output in different formats.
 *
 * This module provides formatting utilities for code review results, supporting
 * multiple output formats including Markdown and JSON. It handles the transformation
 * of raw review data into well-structured, readable formats suitable for different
 * consumption patterns.
 *
 * Key responsibilities:
 * - Converting review results to Markdown format with proper headings and sections
 * - Converting review results to JSON format for programmatic consumption
 * - Sanitizing content to prevent rendering issues
 * - Adding metadata like review date, model used, and cost information
 * - Formatting code snippets and recommendations consistently
 *
 * The formatter ensures that review outputs are consistent, readable, and properly
 * structured regardless of the review type or content.
 */

import { ReviewResult } from '../types/review';
import { StructuredReview, ReviewIssue } from '../types/structuredReview';
import { sanitizeContent } from '../utils/parsing/sanitizer';
import logger from '../utils/logger';

/**
 * Format the review output based on the specified format
 * @param review Review result to format
 * @param format Output format (markdown or json)
 * @returns Formatted review output
 */
export function formatReviewOutput(
  review: ReviewResult,
  format: string
): string {
  // Debug logging to help diagnose issues with missing fields
  if (!review.filePath) {
    console.warn('Warning: filePath is undefined or empty in ReviewResult');
  }
  if (!review.modelUsed) {
    console.warn('Warning: modelUsed is undefined or empty in ReviewResult');
  }
  
  // Ensure costInfo is set if only cost is available
  if (review.cost && !review.costInfo) {
    review.costInfo = review.cost;
  }

  if (format === 'json') {
    return formatAsJson(review);
  }

  return formatAsMarkdown(review);
}

/**
 * Format the review as JSON
 * @param review Review result to format
 * @returns JSON string
 */
function formatAsJson(review: ReviewResult): string {
  // Create a copy of the review object to avoid modifying the original
  const jsonOutput: Record<string, any> = {
    ...review
  };
  
  // Determine model information
  let modelInfo = 'AI';
  let modelVendor = 'Unknown';
  let modelName = 'AI';

  // Extract model information
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('openrouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('openai:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('gemini:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else if (review.modelUsed.startsWith('Google:')) {
      // Handle miscapitalized provider names
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('Google:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else if (review.modelUsed.startsWith('Anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('Anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('OpenAI:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('OpenAI:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('OpenRouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('OpenRouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else {
      modelVendor = 'Unknown';
      modelName = review.modelUsed;
      modelInfo = `AI (${modelName})`;
    }
  } else {
    logger.warn('Review result has no modelUsed property. Using default values for JSON output.');
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(review.content);

  // Parse structured data if available
  let parsedStructuredData = review.structuredData;
  if (typeof review.structuredData === 'string') {
    try {
      parsedStructuredData = JSON.parse(review.structuredData);
    } catch (error) {
      console.error('Error parsing structured review data:', error);
    }
  }

  // Parse additional metadata if available
  let additionalMetadata = {};
  if (review.metadata) {
    try {
      additionalMetadata = typeof review.metadata === 'string' 
        ? JSON.parse(review.metadata) 
        : review.metadata;
    } catch (error) {
      // Silently continue if metadata parsing fails
    }
  }

  // Format path for display
  let displayPath = review.filePath || '';
  if (!displayPath || displayPath === review.reviewType || displayPath === 'consolidated') {
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Create enhanced metadata with detection info type
  interface EnhancedMetadata {
    model: {
      provider: string;
      name: string;
      fullName: string;
    };
    review: {
      type: ReviewType;
      path: string;
      generatedAt: string;
      formattedDate: string;
      multiPass: {
        enabled: boolean;
        passCount: number;
        perPassCosts: PassCost[] | null;
      } | null;
    };
    cost: ReviewCost | null;
    tool: {
      version: string;
      commandOptions: string | null;
      [key: string]: any;
    };
    detection?: {
      language: string;
      framework?: string;
      frameworkVersion?: string;
      cssFrameworks?: Array<{ name: string; version?: string }>;
    };
  }
  
  const enhancedMetadata: EnhancedMetadata = {
    model: {
      provider: modelVendor,
      name: modelName,
      fullName: modelInfo
    },
    review: {
      type: review.reviewType,
      path: displayPath,
      generatedAt: new Date(review.timestamp).toISOString(),
      formattedDate: new Date(review.timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }),
      multiPass: (review.costInfo || review.cost) && ((review.costInfo?.passCount || review.cost?.passCount) || 0) > 1 ? {
        enabled: true,
        passCount: (review.costInfo?.passCount || review.cost?.passCount || 1),
        perPassCosts: (review.costInfo?.perPassCosts || review.cost?.perPassCosts) || null
      } : null
    },
    cost: review.costInfo || review.cost || null,
    tool: {
      version: review.toolVersion || process.env.npm_package_version || '2.1.1',
      commandOptions: review.commandOptions || null,
      ...additionalMetadata
    }
  };
  
  // Add framework detection information if available
  if (review.detectedLanguage) {
    enhancedMetadata.detection = {
      language: review.detectedLanguage
    };
    
    if (review.detectedFramework && review.detectedFramework !== 'none') {
      if (enhancedMetadata.detection) {
        enhancedMetadata.detection.framework = review.detectedFramework;
        if (review.frameworkVersion) {
          enhancedMetadata.detection.frameworkVersion = review.frameworkVersion;
        }
      }
    }
    
    if (review.cssFrameworks && review.cssFrameworks.length > 0) {
      if (enhancedMetadata.detection) {
        enhancedMetadata.detection.cssFrameworks = review.cssFrameworks;
      }
    }
  }

  // Create a copy of the review with enhanced metadata
  const reviewWithMeta = {
    ...review,
    content: sanitizedContent,
    structuredData: parsedStructuredData,
    meta: enhancedMetadata,
    // Legacy metadata field for backward compatibility
    metadata: {
      model: modelInfo,
      generatedAt: new Date(review.timestamp).toISOString(),
      costEstimation: review.cost
    }
  };

  return JSON.stringify(reviewWithMeta, null, 2);
}

/**
 * Format the review as Markdown
 * @param review Review result to format
 * @returns Markdown string
 */
function formatAsMarkdown(review: ReviewResult): string {
  const { filePath, reviewType, content, timestamp, structuredData } = review;
  // Use costInfo if available, fallback to cost
  const cost = review.costInfo || review.cost;

  // Determine model information
  let modelInfo = 'AI';

  // Add specific model information if available
  let modelVendor = 'Unknown';
  let modelName = 'AI';
  
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('openrouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('openai:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('gemini:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else if (review.modelUsed.startsWith('Google:')) {
      // Handle miscapitalized provider names
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('Google:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else if (review.modelUsed.startsWith('Anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('Anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('OpenAI:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('OpenAI:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('OpenRouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('OpenRouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else {
      // For any other format
      modelVendor = 'Unknown';
      modelName = review.modelUsed;
      modelInfo = `AI (${modelName})`;
    }
  } else {
    logger.warn('Review result has no modelUsed property. Using default values.');
  }

  // Format cost information if available
  let costInfo = '';
  if (cost) {
    costInfo = `

## Token Usage and Cost
- Input tokens: ${cost.inputTokens.toLocaleString()}
- Output tokens: ${cost.outputTokens.toLocaleString()}
- Total tokens: ${cost.totalTokens.toLocaleString()}
- Estimated cost: ${cost.formattedCost}`;
    
    // Add multi-pass information if available
    if (cost.passCount && cost.passCount > 1) {
      costInfo += `
- Multi-pass review: ${cost.passCount} passes`;
      
      // Add per-pass breakdown if available
      if (cost.perPassCosts && Array.isArray(cost.perPassCosts)) {
        costInfo += `

### Pass Breakdown`;
        cost.perPassCosts.forEach(passCost => {
          costInfo += `
Pass ${passCost.passNumber}:
- Input tokens: ${passCost.inputTokens.toLocaleString()}
- Output tokens: ${passCost.outputTokens.toLocaleString()}
- Total tokens: ${passCost.totalTokens.toLocaleString()}
- Cost: ${typeof passCost.estimatedCost === 'number' ? `$${passCost.estimatedCost.toFixed(4)} USD` : 'N/A'}`;
        });
      }
    }
  }

  // Check if the content is JSON that should be formatted as structured data
  let actualStructuredData = structuredData;
  if (!actualStructuredData && content && typeof content === 'string') {
    // Check if content starts with JSON
    const trimmedContent = content.trim();
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        actualStructuredData = JSON.parse(trimmedContent);
      } catch (e) {
        // Not valid JSON, continue with regular formatting
      }
    }
  }
  
  // If we have structured data, format it as Markdown
  if (actualStructuredData) {
    try {
      let structuredReview: any;
      
      if (typeof actualStructuredData === 'string') {
        try {
          structuredReview = JSON.parse(actualStructuredData);
        } catch (parseError) {
          console.warn('Failed to parse structured data as JSON:', parseError);
          // If it's not valid JSON, treat it as plain text
          return formatSimpleMarkdown(
            content,
            filePath || '',
            reviewType,
            timestamp,
            costInfo,
            modelInfo
          );
        }
      } else {
        structuredReview = actualStructuredData;
      }
      
      // Check if the data has a 'review' property (our JSON structure)
      if (structuredReview && structuredReview.review) {
        return formatSchemaBasedReviewAsMarkdown(
          structuredReview,
          filePath || '',
          reviewType,
          timestamp,
          costInfo,
          modelInfo
        );
      }
      
      // Validate the parsed data has expected structure
      if (typeof structuredReview === 'object' && structuredReview !== null) {
        return formatStructuredReviewAsMarkdown(
          structuredReview,
          filePath || '',
          reviewType,
          timestamp,
          costInfo,
          modelInfo
        );
      } else {
        console.warn('Structured data is not an object:', typeof structuredReview);
        // If the data doesn't have the right structure, fall back to plain text
        return formatSimpleMarkdown(
          content,
          filePath || '',
          reviewType,
          timestamp,
          costInfo,
          modelInfo
        );
      }
    } catch (error) {
      console.error('Error processing structured review data:', error);
      // Fall back to unstructured format
      return formatSimpleMarkdown(
        content,
        filePath || '',
        reviewType,
        timestamp,
        costInfo,
        modelInfo
      );
    }
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(content);

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, is 'consolidated', or is undefined/empty, show the current directory path
  let displayPath = filePath || '';
  
  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = process.cwd() + ' (Current Directory)';
  }
  
  // Format metadata
  const formattedDate = new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  // Create comprehensive metadata section
  let metadataSection = `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${formattedDate} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |`;
  
  // Add framework detection information if available
  if (review.detectedLanguage) {
    metadataSection += `
| Detected Language | ${review.detectedLanguage} |`;
    
    if (review.detectedFramework && review.detectedFramework !== 'none') {
      metadataSection += `
| Detected Framework | ${review.detectedFramework}${review.frameworkVersion ? ` v${review.frameworkVersion}` : ''} |`;
    }
    
    if (review.cssFrameworks && review.cssFrameworks.length > 0) {
      const cssFrameworksStr = review.cssFrameworks.map(cf => 
        cf.version ? `${cf.name} v${cf.version.replace(/[^\d\.]/g, '')}` : cf.name
      ).join(', ');
      
      metadataSection += `
| CSS Frameworks | ${cssFrameworksStr} |`;
    }
  }

  // Add cost information if available
  if (cost) {
    metadataSection += `
| Input Tokens | ${cost.inputTokens.toLocaleString()} |
| Output Tokens | ${cost.outputTokens.toLocaleString()} |
| Total Tokens | ${cost.totalTokens.toLocaleString()} |
| Estimated Cost | ${cost.formattedCost} |`;
    
    // Add multi-pass information if available
    if (cost.passCount && cost.passCount > 1) {
      metadataSection += `
| Multi-pass Review | ${cost.passCount} passes |`;
    }
  }

  // Add tool version from the review result or fallback to package.json
  if (review.toolVersion) {
    metadataSection += `
| Tool Version | ${review.toolVersion} |`;
  }

  // Add command options if available
  if (review.commandOptions) {
    metadataSection += `
| Command Options | \`${review.commandOptions}\` |`;
  }

  // If we have additional metadata from the review, include it
  if (review.metadata) {
    try {
      const metadata = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : review.metadata;
      
      // Add any additional metadata fields that weren't already added
      if (metadata.commandLineOptions && !review.commandOptions) {
        metadataSection += `
| Command Options | \`${metadata.commandLineOptions}\` |`;
      }
      
      if (metadata.version && !review.toolVersion) {
        metadataSection += `
| Tool Version | ${metadata.version} |`;
      }
    } catch (error) {
      // Silently continue if metadata parsing fails
    }
  }

  // Close the metadata table
  metadataSection += `
`;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataSection}

${sanitizedContent}

---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
}

/**
 * Format a structured review as Markdown
 * @param structuredReview Structured review data
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review performed
 * @param timestamp Timestamp of when the review was generated
 * @param costInfo Cost information formatted as Markdown
 * @param modelInfo Model information
 * @param metadataSection Optional metadata section to include
 * @returns Markdown string
 */
function formatStructuredReviewAsMarkdown(
  structuredReview: StructuredReview,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string
): string {
  // Check if the structuredReview has required properties
  if (!structuredReview || typeof structuredReview !== 'object') {
    console.warn('Invalid structured review data, falling back to simple format');
    return formatSimpleMarkdown(
      'No structured data available. The review may be in an unsupported format.',
      filePath,
      reviewType,
      timestamp,
      costInfo,
      modelInfo,
      metadataSection
    );
  }
  
  // Extract properties with fallbacks for missing properties
  const summary = structuredReview.summary || 'No summary provided';
  const issues = Array.isArray(structuredReview.issues) ? structuredReview.issues : [];
  const recommendations = Array.isArray(structuredReview.recommendations) ? structuredReview.recommendations : [];
  const positiveAspects = Array.isArray(structuredReview.positiveAspects) ? structuredReview.positiveAspects : [];
  
  // Extract grade information if available
  const grade = structuredReview.grade;
  const gradeCategories = structuredReview.gradeCategories;

  // Group issues by priority
  const highPriorityIssues = issues.filter(issue => issue && issue.priority === 'high');
  const mediumPriorityIssues = issues.filter(
    issue => issue && issue.priority === 'medium'
  );
  const lowPriorityIssues = issues.filter(issue => issue && issue.priority === 'low');

  // Format issues by priority
  let issuesMarkdown = '';

  if (highPriorityIssues.length > 0) {
    issuesMarkdown += '### High Priority\n\n';
    issuesMarkdown += highPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (mediumPriorityIssues.length > 0) {
    issuesMarkdown += '### Medium Priority\n\n';
    issuesMarkdown += mediumPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (lowPriorityIssues.length > 0) {
    issuesMarkdown += '### Low Priority\n\n';
    issuesMarkdown += lowPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  // Format recommendations
  let recommendationsMarkdown = '';
  if (recommendations && recommendations.length > 0) {
    recommendationsMarkdown = '## General Recommendations\n\n';
    recommendationsMarkdown += recommendations
      .map(rec => `- ${rec}`)
      .join('\n');
    recommendationsMarkdown += '\n\n';
  }

  // Format positive aspects
  let positiveAspectsMarkdown = '';
  if (positiveAspects && positiveAspects.length > 0) {
    positiveAspectsMarkdown = '## Positive Aspects\n\n';
    positiveAspectsMarkdown += positiveAspects
      .map(aspect => `- ${aspect}`)
      .join('\n');
    positiveAspectsMarkdown += '\n\n';
  }

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, is 'consolidated', or is undefined/empty, show the current directory path
  let displayPath = filePath || '';
  
  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Include metadata section if available
  const metadataContent = metadataSection ? `${metadataSection}\n` : '';
  
  // Format grade section if available
  let gradeMarkdown = '';
  if (grade) {
    gradeMarkdown = `## Grade: ${grade}\n\n`;
    
    // Add grade categories if available
    if (gradeCategories) {
      if (gradeCategories.functionality) gradeMarkdown += `- **Functionality**: ${gradeCategories.functionality}\n`;
      if (gradeCategories.codeQuality) gradeMarkdown += `- **Code Quality**: ${gradeCategories.codeQuality}\n`;
      if (gradeCategories.documentation) gradeMarkdown += `- **Documentation**: ${gradeCategories.documentation}\n`;
      if (gradeCategories.testing) gradeMarkdown += `- **Testing**: ${gradeCategories.testing}\n`;
      if (gradeCategories.maintainability) gradeMarkdown += `- **Maintainability**: ${gradeCategories.maintainability}\n`;
      if (gradeCategories.security) gradeMarkdown += `- **Security**: ${gradeCategories.security}\n`;
      if (gradeCategories.performance) gradeMarkdown += `- **Performance**: ${gradeCategories.performance}\n`;
      gradeMarkdown += '\n';
    }
  }

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataContent}${gradeMarkdown}## Summary

${summary}

## Issues

${issuesMarkdown}
${recommendationsMarkdown}${positiveAspectsMarkdown}---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
}

/**
 * Format a simple markdown document with just the content
 * Used as fallback when structured data isn't available
 * @param content Content to include in the document
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review performed
 * @param timestamp Timestamp of when the review was generated
 * @param costInfo Cost information formatted as Markdown
 * @param modelInfo Model information
 * @param metadataSection Optional metadata section to include
 * @returns Markdown string
 */
function formatSimpleMarkdown(
  content: string,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string
): string {
  // Sanitize the content
  const sanitizedContent = sanitizeContent(content);
  
  // Use the actual file path for the review title and the reviewed field
  let displayPath = filePath || '';
  
  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = process.cwd() + ' (Current Directory)';
  }
  
  // Extract model vendor and name from modelInfo
  let modelVendor = 'Unknown';
  let modelName = 'AI';
  
  // Extract the model information from modelInfo
  if (modelInfo) {
    if (modelInfo.includes('Google Gemini AI')) {
      modelVendor = 'Google';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Gemini';
    } else if (modelInfo.includes('Anthropic')) {
      modelVendor = 'Anthropic';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Claude';
    } else if (modelInfo.includes('OpenAI')) {
      modelVendor = 'OpenAI';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'GPT';
    } else if (modelInfo.includes('OpenRouter')) {
      modelVendor = 'OpenRouter';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'AI';
    }
  }
  
  // Parse cost information if it's available in string form
  let cost = null;
  if (costInfo) {
    // Try to extract cost information from the costInfo string
    const inputTokensMatch = costInfo.match(/Input tokens: ([\d,]+)/);
    const outputTokensMatch = costInfo.match(/Output tokens: ([\d,]+)/);
    const totalTokensMatch = costInfo.match(/Total tokens: ([\d,]+)/);
    const estimatedCostMatch = costInfo.match(/Estimated cost: (.*?)$/m);
    const passCountMatch = costInfo.match(/Multi-pass review: (\d+) passes/);
    
    if (inputTokensMatch || outputTokensMatch || totalTokensMatch || estimatedCostMatch) {
      cost = {
        inputTokens: inputTokensMatch ? parseInt(inputTokensMatch[1].replace(/,/g, '')) : 0,
        outputTokens: outputTokensMatch ? parseInt(outputTokensMatch[1].replace(/,/g, '')) : 0,
        totalTokens: totalTokensMatch ? parseInt(totalTokensMatch[1].replace(/,/g, '')) : 0,
        estimatedCost: estimatedCostMatch ? parseFloat(estimatedCostMatch[1].replace('$', '').replace(' USD', '')) : 0,
        formattedCost: estimatedCostMatch ? estimatedCostMatch[1] : '$0.00 USD',
        passCount: passCountMatch ? parseInt(passCountMatch[1]) : 1
      };
    }
  }
  
  // Include metadata section if available
  const metadataContent = metadataSection ? `${metadataSection}\n` : '';
  
  // Generate a metadata section with model information
  const modelMetadata = `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${new Date(timestamp).toLocaleString(undefined, {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short'
})} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |${cost ? `
| Input Tokens | ${cost.inputTokens.toLocaleString()} |
| Output Tokens | ${cost.outputTokens.toLocaleString()} |
| Total Tokens | ${cost.totalTokens.toLocaleString()} |
| Estimated Cost | ${cost.formattedCost} |` : ''}${(cost && cost.passCount) ? `
| Multi-pass Review | ${cost.passCount} passes |` : ''}
`;

  // Include this metadata section in all formats for consistency
  const fullMetadataContent = metadataContent || modelMetadata;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${fullMetadataContent}

${sanitizedContent}

---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
}

/**
 * Format a schema-based review (with 'review' property) as Markdown
 * @param schemaReview Schema-based review object
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review
 * @param timestamp Timestamp of the review
 * @param costInfo Cost information string
 * @param modelInfo Model information string
 * @param metadataSection Optional metadata section
 * @returns Formatted markdown string
 */
function formatSchemaBasedReviewAsMarkdown(
  schemaReview: any,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string
): string {
  // Extract the review object
  const review = schemaReview.review;
  if (!review || typeof review !== 'object') {
    return formatSimpleMarkdown(
      JSON.stringify(schemaReview, null, 2),
      filePath,
      reviewType,
      timestamp,
      costInfo,
      modelInfo,
      metadataSection
    );
  }

  // Extract files and issues
  const files = review.files || [];
  const summary = review.summary || {};
  
  // Create issues sections by priority
  let highPriorityIssues: any[] = [];
  let mediumPriorityIssues: any[] = [];
  let lowPriorityIssues: any[] = [];
  
  // Collect all issues from all files
  files.forEach((file: any) => {
    const issues = file.issues || [];
    issues.forEach((issue: any) => {
      // Add file path to issue for context
      const issueWithFile = { ...issue, filePath: file.filePath };
      
      if (issue.priority === 'HIGH') {
        highPriorityIssues.push(issueWithFile);
      } else if (issue.priority === 'MEDIUM') {
        mediumPriorityIssues.push(issueWithFile);
      } else if (issue.priority === 'LOW') {
        lowPriorityIssues.push(issueWithFile);
      }
    });
  });

  // Format the metadata section
  let displayPath = filePath || '';
  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Extract model vendor and name from modelInfo
  let modelVendor = 'Unknown';
  let modelName = 'AI';
  
  if (modelInfo) {
    if (modelInfo.includes('Google Gemini AI')) {
      modelVendor = 'Google';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Gemini';
    } else if (modelInfo.includes('Anthropic')) {
      modelVendor = 'Anthropic';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Claude';
    } else if (modelInfo.includes('OpenAI')) {
      modelVendor = 'OpenAI';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'GPT';
    } else if (modelInfo.includes('OpenRouter')) {
      modelVendor = 'OpenRouter';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'AI';
    }
  }

  // Build the metadata section if not provided
  if (!metadataSection) {
    const formattedDate = new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    metadataSection = `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${formattedDate} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |`;
  }

  let output = `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataSection}

## Review Summary

`;

  // Add summary counts
  if (summary.totalIssues > 0) {
    output += `Total issues found: **${summary.totalIssues}**
- High Priority: ${summary.highPriorityIssues || 0}
- Medium Priority: ${summary.mediumPriorityIssues || 0}
- Low Priority: ${summary.lowPriorityIssues || 0}

`;
  } else {
    output += `No issues found. The code looks good!\n\n`;
  }

  // Add issues by priority
  if (highPriorityIssues.length > 0) {
    output += `## High Priority Issues\n\n`;
    highPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  if (mediumPriorityIssues.length > 0) {
    output += `## Medium Priority Issues\n\n`;
    mediumPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  if (lowPriorityIssues.length > 0) {
    output += `## Low Priority Issues\n\n`;
    lowPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  // Add cost information at the end
  if (costInfo) {
    output += `\n${costInfo}\n`;
  }

  // Add footer with tool information
  output += `
*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;

  return output;
}

/**
 * Format a single issue from the schema format
 * @param issue Issue object from schema
 * @param index Issue number
 * @returns Formatted issue string
 */
function formatSchemaIssue(issue: any, index: number): string {
  let issueMarkdown = `### ${index}. ${issue.description}\n\n`;
  
  if (issue.filePath) {
    issueMarkdown += `**File**: \`${issue.filePath}\`\n`;
  }
  
  if (issue.location) {
    issueMarkdown += `**Location**: Lines ${issue.location.startLine}-${issue.location.endLine}\n\n`;
  }
  
  if (issue.currentCode) {
    issueMarkdown += `**Current Code**:\n\`\`\`\n${issue.currentCode}\n\`\`\`\n\n`;
  }
  
  if (issue.suggestedCode) {
    issueMarkdown += `**Suggested Fix**:\n\`\`\`\n${issue.suggestedCode}\n\`\`\`\n\n`;
  }
  
  if (issue.explanation) {
    issueMarkdown += `**Explanation**: ${issue.explanation}\n\n`;
  }
  
  issueMarkdown += `---\n\n`;
  
  return issueMarkdown;
}

/**
 * Format a single issue as Markdown
 * @param issue Review issue
 * @returns Markdown string
 */
function formatIssue(issue: ReviewIssue): string {
  // Guard against null or undefined issues
  if (!issue) {
    return '#### [Error: Issue data missing]';
  }
  
  const {
    title,
    type,
    filePath,
    lineNumbers,
    description,
    codeSnippet,
    suggestedFix,
    impact
  } = issue;

  let issueMarkdown = `#### ${title || '[Untitled Issue]'}\n`;

  if (filePath) {
    issueMarkdown += `- **Location**: \`${filePath}${lineNumbers ? `:${lineNumbers}` : ''}\`\n`;
  }

  if (type) {
    issueMarkdown += `- **Type**: ${type}\n`;
  }

  issueMarkdown += `- **Description**: ${description || 'No description provided'}\n`;

  if (codeSnippet) {
    issueMarkdown += `- **Code**:\n\`\`\`\n${codeSnippet}\n\`\`\`\n`;
  }

  if (suggestedFix) {
    issueMarkdown += `- **Suggested Fix**:\n\`\`\`\n${suggestedFix}\n\`\`\`\n`;
  }

  if (impact) {
    issueMarkdown += `- **Impact**: ${impact}\n`;
  }

  return issueMarkdown;
}
