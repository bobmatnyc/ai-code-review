/**
 * Type patches to fix compatibility issues between our new code and the existing codebase.
 * This is a temporary solution until the main codebase can be updated.
 */

// Allow optional filePath in formatSimpleMarkdown and formatStructuredReviewAsMarkdown
declare module '../formatters/outputFormatter' {
  function formatSimpleMarkdown(
    content: string,
    filePath: string | undefined,
    reviewType: string,
    timestamp: string,
    costInfo: string,
    modelInfo: string,
    metadataSection?: string
  ): string;

  function formatStructuredReviewAsMarkdown(
    structuredReview: any,
    filePath: string | undefined,
    reviewType: string,
    timestamp: string,
    costInfo: string,
    modelInfo: string
  ): string;
}