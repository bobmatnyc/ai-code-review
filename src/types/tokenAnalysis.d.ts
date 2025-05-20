/**
 * Type definitions for token analysis.
 */

declare module '../analysis/tokens' {
  export interface FileTokenAnalysis {
    path: string;
    relativePath: string | undefined;
    tokenCount: number;
    sizeInBytes: number;
    tokensPerByte: number;
  }
  
  export interface TokenAnalysisResult {
    files: FileTokenAnalysis[];
    totalTokens: number;
    totalSizeInBytes: number;
    averageTokensPerByte: number;
    fileCount: number;
    promptOverheadTokens: number;
    estimatedTotalTokens: number;
    contextWindowSize: number;
    exceedsContextWindow: boolean;
    estimatedPassesNeeded: number;
    chunkingRecommendation: ChunkingRecommendation;
  }
  
  export interface ChunkingRecommendation {
    chunkingRecommended: boolean;
    recommendedChunks: FileChunk[];
    reason: string;
  }
  
  export interface FileChunk {
    files: string[];
    estimatedTokenCount: number;
    priority: number;
  }
  
  export interface TokenAnalysisOptions {
    reviewType: string;
    modelName: string;
    optimizeForSpeed?: boolean;
    additionalPromptOverhead?: number;
    contextMaintenanceFactor?: number;
  }
  
  export class TokenAnalyzer {
    static analyzeFile(file: import('../types/review').FileInfo, options: TokenAnalysisOptions): FileTokenAnalysis;
    static analyzeFiles(files: import('../types/review').FileInfo[], options: TokenAnalysisOptions): TokenAnalysisResult;
  }
  
  export function formatTokenAnalysis(
    analysis: TokenAnalysisResult,
    modelName: string,
    includeFiles?: boolean
  ): string;
}