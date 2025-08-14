/**
 * @fileoverview Formatter for token analysis results.
 *
 * This module provides utilities for formatting token analysis results into
 * human-readable strings and other formats for display or logging.
 */

import type { FileTokenAnalysis, TokenAnalysisResult } from './TokenAnalyzer';

/**
 * Format a number with commas as thousands separators
 * @param num Number to format
 * @returns Formatted number string
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a file size in bytes to a human-readable string
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g., "1.23 KB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format token analysis result as a human-readable string
 * @param analysis Token analysis result
 * @param modelName Name of the model used
 * @param includedFiles Whether to include detailed file listing
 * @returns Formatted string representation of the analysis
 */
export function formatTokenAnalysis(
  analysis: TokenAnalysisResult,
  modelName: string,
  includeFiles = false,
): string {
  // Extract provider and model from both colon and slash formats
  // Handle formats: "provider:model", "provider/model", or just "model"
  let provider: string | undefined;
  let model: string;

  if (modelName.includes(':')) {
    // Traditional format: "provider:model"
    [provider, model] = modelName.split(':', 2);
  } else if (modelName.includes('/')) {
    // OpenRouter format: "provider/model"
    [provider, model] = modelName.split('/', 2);
  } else {
    // Just model name
    provider = undefined;
    model = modelName;
  }

  const displayModel = model || modelName;
  const displayProvider = provider
    ? `${provider.charAt(0).toUpperCase() + provider.slice(1)}`
    : 'Unknown';

  let output = `
=== Token Analysis Report ===

Provider: ${displayProvider}
Model: ${displayModel}
Files: ${formatNumber(analysis.fileCount)} (${formatFileSize(analysis.totalSizeInBytes)})

Token Information:
  Content Tokens: ${formatNumber(analysis.totalTokens)}
  Prompt Overhead: ${formatNumber(analysis.promptOverheadTokens)}
  Total Estimated Tokens: ${formatNumber(analysis.estimatedTotalTokens)}
  Context Window Size: ${formatNumber(analysis.contextWindowSize)}

Context Utilization:
  ${((analysis.estimatedTotalTokens / analysis.contextWindowSize) * 100).toFixed(2)}% of context window used

`;

  // Add chunking information if recommended
  if (analysis.chunkingRecommendation.chunkingRecommended) {
    output += `
Multi-Pass Analysis:
  Chunking Required: Yes
  Reason: ${analysis.chunkingRecommendation.reason}
  Estimated Passes: ${formatNumber(analysis.estimatedPassesNeeded)}
`;

    // Add chunk details
    analysis.chunkingRecommendation.recommendedChunks.forEach((chunk, index) => {
      output += `
  Chunk ${index + 1}:
    Files: ${formatNumber(chunk.files.length)}
    Estimated Tokens: ${formatNumber(chunk.estimatedTokenCount)}
    Priority: ${chunk.priority}
`;
    });
  } else {
    output += `
Multi-Pass Analysis:
  Chunking Required: No
  Reason: ${analysis.chunkingRecommendation.reason}
`;
  }

  // Add file details if requested
  if (includeFiles) {
    output += `
File Details:
`;

    // Sort files by token count (largest first)
    const sortedFiles = [...analysis.files].sort((a, b) => b.tokenCount - a.tokenCount);

    sortedFiles.forEach((file) => {
      output += `  ${file.relativePath}:
    Tokens: ${formatNumber(file.tokenCount)}
    Size: ${formatFileSize(file.sizeInBytes)}
    Tokens/Byte: ${file.tokensPerByte.toFixed(2)}
`;
    });
  }

  return output;
}

/**
 * Format token analysis result as JSON
 * @param analysis Token analysis result
 * @returns JSON string representation of the analysis
 */
export function formatTokenAnalysisAsJson(analysis: TokenAnalysisResult): string {
  return JSON.stringify(analysis, null, 2);
}

/**
 * Format a single file token analysis as a string
 * @param fileAnalysis File token analysis
 * @returns Formatted string representation of the file analysis
 */
export function formatFileTokenAnalysis(fileAnalysis: FileTokenAnalysis): string {
  return `
File: ${fileAnalysis.relativePath}
Tokens: ${formatNumber(fileAnalysis.tokenCount)}
Size: ${formatFileSize(fileAnalysis.sizeInBytes)}
Tokens/Byte: ${fileAnalysis.tokensPerByte.toFixed(2)}
`;
}
