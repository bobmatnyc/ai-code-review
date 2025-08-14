/**
 * @fileoverview Formatter for architectural code reviews.
 *
 * This module enhances the output of architectural reviews by adding a list
 * of all files that were included in the review process and converting
 * JSON responses to properly formatted Markdown with diagrams.
 */

import type { FileInfo, ReviewResult } from '../types/review';
import logger from '../utils/logger';
import { generateFileTree } from '../utils/treeGenerator';
import { formatReviewOutput } from './outputFormatter';

/**
 * Convert JSON architectural review data to Markdown format with diagrams
 *
 * WHY: OpenRouter models often return JSON even when Markdown is requested.
 * This function post-processes JSON responses to convert them into proper
 * Markdown format with Mermaid diagrams for better readability.
 *
 * @param jsonData The JSON architectural review data
 * @returns Formatted Markdown string with diagrams
 */
function convertJsonArchitectureToMarkdown(jsonData: any): string {
  try {
    let markdown = '';

    // Add summary section
    if (jsonData.summary) {
      markdown += '## Architecture Summary\n\n';
      markdown += `${jsonData.summary}\n\n`;
    }

    // Generate Mermaid diagram from components/layers
    if (jsonData.components || jsonData.layers) {
      const items = jsonData.components || jsonData.layers;
      markdown += '## System Architecture\n\n';
      markdown += '```mermaid\ngraph TB\n';

      // Create nodes for each component
      if (Array.isArray(items)) {
        items.forEach((item: any, index: number) => {
          const id = `C${index}`;
          const name = item.name || item.component || item.layer || `Component${index}`;
          const desc = item.description || item.purpose || '';
          markdown += `    ${id}["${name}${desc ? `<br/>${desc.substring(0, 50)}` : ''}"]\n`;
        });

        // Add relationships if available
        if (jsonData.dependencies) {
          markdown += '\n';
          jsonData.dependencies.forEach((dep: any) => {
            const fromIndex = items.findIndex(
              (i: any) => (i.name || i.component || i.layer) === dep.from,
            );
            const toIndex = items.findIndex(
              (i: any) => (i.name || i.component || i.layer) === dep.to,
            );
            if (fromIndex >= 0 && toIndex >= 0) {
              markdown += `    C${fromIndex} --> C${toIndex}\n`;
            }
          });
        }
      } else if (typeof items === 'object') {
        // Handle object format
        let index = 0;
        for (const [key, value] of Object.entries(items)) {
          const id = `C${index}`;
          const desc = typeof value === 'string' ? value : (value as any).description || '';
          markdown += `    ${id}["${key}${desc ? `<br/>${desc.substring(0, 50)}` : ''}"]\n`;
          index++;
        }
      }

      markdown += '```\n\n';
    }

    // Add components/layers details
    if (jsonData.components || jsonData.layers) {
      const items = jsonData.components || jsonData.layers;
      markdown += '## Components\n\n';

      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.name || item.component || item.layer || 'Unknown';
          const desc = item.description || item.purpose || 'No description';
          const tech = item.technologies || item.tech || [];

          markdown += `### ${name}\n\n`;
          markdown += `${desc}\n\n`;

          if (Array.isArray(tech) && tech.length > 0) {
            markdown += `**Technologies:** ${tech.join(', ')}\n\n`;
          }

          if (item.responsibilities && Array.isArray(item.responsibilities)) {
            markdown += '**Responsibilities:**\n';
            item.responsibilities.forEach((resp: string) => {
              markdown += `- ${resp}\n`;
            });
            markdown += '\n';
          }
        });
      } else if (typeof items === 'object') {
        for (const [key, value] of Object.entries(items)) {
          markdown += `### ${key}\n\n`;
          if (typeof value === 'string') {
            markdown += `${value}\n\n`;
          } else {
            const desc = (value as any).description || 'No description';
            markdown += `${desc}\n\n`;
          }
        }
      }
    }

    // Add data flow diagram if available
    if (jsonData.dataFlow || jsonData.flow) {
      const flow = jsonData.dataFlow || jsonData.flow;
      markdown += '## Data Flow\n\n';
      markdown += '```mermaid\nsequenceDiagram\n';

      if (Array.isArray(flow)) {
        flow.forEach((step: any) => {
          if (step.from && step.to) {
            const action = step.action || step.message || 'interacts with';
            markdown += `    ${step.from}->>${step.to}: ${action}\n`;
          }
        });
      }

      markdown += '```\n\n';
    }

    // Add architectural patterns
    if (jsonData.patterns) {
      markdown += '## Architectural Patterns\n\n';
      if (Array.isArray(jsonData.patterns)) {
        jsonData.patterns.forEach((pattern: any) => {
          if (typeof pattern === 'string') {
            markdown += `- ${pattern}\n`;
          } else {
            const name = pattern.name || pattern.pattern || 'Unknown';
            const desc = pattern.description || '';
            markdown += `- **${name}**${desc ? `: ${desc}` : ''}\n`;
          }
        });
      }
      markdown += '\n';
    }

    // Add issues/concerns
    if (jsonData.issues || jsonData.concerns) {
      const issues = jsonData.issues || jsonData.concerns;
      markdown += '## Architectural Issues\n\n';

      if (Array.isArray(issues)) {
        // Group issues by priority if they have priority field
        const highPriority = issues.filter((i) => i.priority === 'high');
        const mediumPriority = issues.filter((i) => i.priority === 'medium');
        const lowPriority = issues.filter((i) => i.priority === 'low');
        const unclassified = issues.filter(
          (i) => !i.priority || !['high', 'medium', 'low'].includes(i.priority),
        );

        if (highPriority.length > 0) {
          markdown += '### High Priority\n\n';
          highPriority.forEach((issue: any) => {
            markdown += formatIssue(issue);
          });
        }

        if (mediumPriority.length > 0) {
          markdown += '### Medium Priority\n\n';
          mediumPriority.forEach((issue: any) => {
            markdown += formatIssue(issue);
          });
        }

        if (lowPriority.length > 0) {
          markdown += '### Low Priority\n\n';
          lowPriority.forEach((issue: any) => {
            markdown += formatIssue(issue);
          });
        }

        if (
          unclassified.length > 0 &&
          highPriority.length + mediumPriority.length + lowPriority.length === 0
        ) {
          // Only show unclassified if there are no classified issues
          unclassified.forEach((issue: any) => {
            markdown += formatIssue(issue);
          });
        }
      }
      markdown += '\n';
    }

    // Helper function to format an issue
    function formatIssue(issue: any): string {
      let result = '';

      if (typeof issue === 'string') {
        result += `- ⚠️ ${issue}\n`;
      } else {
        const title = issue.title || issue.name || '';
        const severity = issue.severity || issue.priority || 'medium';
        const desc = issue.description || issue.issue || issue.concern || 'Unknown issue';
        const type = issue.type || '';
        const filePath = issue.filePath || '';
        const lineNumbers = issue.lineNumbers || '';
        const codeSnippet = issue.codeSnippet || '';
        const suggestedFix = issue.suggestedFix || issue.recommendation || '';
        const impact = issue.impact || '';

        const emoji = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';

        // Format the issue with title if available
        if (title) {
          result += `#### ${emoji} ${title}\n\n`;
        } else {
          result += `- ${emoji} **${severity.toUpperCase()}**\n\n`;
        }

        // Add type and location info
        if (type || filePath) {
          result += `**Type:** ${type}${filePath ? ` | **File:** \`${filePath}\`` : ''}${lineNumbers ? ` (lines ${lineNumbers})` : ''}\n\n`;
        }

        // Add description
        result += `${desc}\n\n`;

        // Add code snippet if available
        if (codeSnippet) {
          result += `**Code:**\n\`\`\`typescript\n${codeSnippet}\n\`\`\`\n\n`;
        }

        // Add impact
        if (impact) {
          result += `**Impact:** ${impact}\n\n`;
        }

        // Add suggested fix
        if (suggestedFix) {
          result += `**Suggested Fix:** ${suggestedFix}\n\n`;
        }
      }

      return result;
    }

    // Add recommendations
    if (jsonData.recommendations) {
      markdown += '## Recommendations\n\n';
      if (Array.isArray(jsonData.recommendations)) {
        jsonData.recommendations.forEach((rec: any) => {
          if (typeof rec === 'string') {
            markdown += `- ${rec}\n`;
          } else {
            const title = rec.title || rec.recommendation || 'Recommendation';
            const desc = rec.description || rec.details || '';
            markdown += `- **${title}**${desc ? `: ${desc}` : ''}\n`;
            if (rec.priority) {
              markdown += `  - Priority: ${rec.priority}\n`;
            }
            if (rec.effort) {
              markdown += `  - Effort: ${rec.effort}\n`;
            }
          }
        });
      }
      markdown += '\n';
    }

    // Add tech stack if available
    if (jsonData.techStack || jsonData.technologies) {
      const tech = jsonData.techStack || jsonData.technologies;
      markdown += '## Technology Stack\n\n';

      if (Array.isArray(tech)) {
        tech.forEach((item: any) => {
          if (typeof item === 'string') {
            markdown += `- ${item}\n`;
          } else {
            const name = item.name || item.technology || 'Unknown';
            const version = item.version || '';
            const purpose = item.purpose || item.usage || '';
            markdown += `- **${name}**${version ? ` v${version}` : ''}${purpose ? `: ${purpose}` : ''}\n`;
          }
        });
      } else if (typeof tech === 'object') {
        for (const [category, items] of Object.entries(tech)) {
          markdown += `### ${category}\n`;
          if (Array.isArray(items)) {
            items.forEach((item: any) => {
              markdown += `- ${item}\n`;
            });
          }
          markdown += '\n';
        }
      }
      markdown += '\n';
    }

    return markdown;
  } catch (error) {
    logger.warn(`Error converting JSON to Markdown: ${error}`);
    // Return original JSON as formatted code block
    return `\`\`\`json\n${JSON.stringify(jsonData, null, 2)}\n\`\`\`\n`;
  }
}

/**
 * Format an architectural review to include the list of analyzed files
 * @param review The review result
 * @param outputFormat Output format (markdown or JSON)
 * @param files Array of file information objects that were analyzed
 * @returns The formatted review output
 */
export function formatArchitecturalReview(
  review: ReviewResult,
  outputFormat: 'markdown' | 'json',
  files: FileInfo[],
): string {
  logger.debug(
    `formatArchitecturalReview called with ${files.length} files, format: ${outputFormat}`,
  );
  files.forEach((file, index) => {
    logger.debug(`File ${index + 1}: ${file.relativePath || file.path}`);
  });

  // Check if content is JSON that needs conversion to Markdown
  // This handles cases where OpenRouter returns JSON despite Markdown being requested
  if (outputFormat === 'markdown' && review.content) {
    const content = typeof review.content === 'string' ? review.content : '';
    const trimmedContent = content.trim();

    // Detect JSON content (either raw or in code blocks)
    let jsonData: any = null;

    // Try to extract JSON from code blocks first
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const jsonBlocks = [...trimmedContent.matchAll(jsonBlockRegex)];

    if (jsonBlocks.length > 0) {
      for (const match of jsonBlocks) {
        try {
          const jsonContent = match[1].trim();
          if (jsonContent) {
            jsonData = JSON.parse(jsonContent);
            logger.debug('Detected JSON in code block for architectural review');
            break;
          }
        } catch (_e) {
          // Continue to next block
        }
      }
    }

    // If no JSON in code blocks, check if entire content is JSON
    if (!jsonData && trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        jsonData = JSON.parse(trimmedContent);
        logger.debug('Detected raw JSON content in architectural review');
      } catch (_e) {
        // Not valid JSON
      }
    }

    // If we found JSON data, convert it to Markdown
    if (
      jsonData &&
      (jsonData.summary ||
        jsonData.components ||
        jsonData.layers ||
        jsonData.architecture ||
        jsonData.issues ||
        jsonData.recommendations)
    ) {
      logger.info('Converting JSON architectural review to Markdown with diagrams');

      // Convert JSON to Markdown
      const convertedMarkdown = convertJsonArchitectureToMarkdown(jsonData);

      // Create a new review with converted content
      const enhancedReview = {
        ...review,
        content: convertedMarkdown,
        structuredData: null, // Clear structured data to prevent double processing
      };

      // Format the enhanced review
      const baseFormattedReview = formatReviewOutput(enhancedReview, outputFormat);

      // Add file list section
      const relativePaths = files.map((file) => file.relativePath || file.path);
      const fileTree = generateFileTree(relativePaths);

      const fileListSection = `
## Files Analyzed

The following ${files.length} files were included in this review:

${fileTree}

`;

      // Find the position to insert (before cost information section)
      const costSectionMatch = baseFormattedReview.match(/^## Cost Information/m);

      if (costSectionMatch?.index) {
        // Insert before cost information
        const position = costSectionMatch.index;
        logger.debug('Inserting file list before Cost Information section');
        return (
          baseFormattedReview.substring(0, position) +
          fileListSection +
          baseFormattedReview.substring(position)
        );
      }
      // If cost section not found, append at the end
      logger.debug('Cost Information section not found, appending file list to end');
      return baseFormattedReview + fileListSection;
    }
  }

  // Get the base formatted review (original flow)
  const baseFormattedReview = formatReviewOutput(review, outputFormat);

  if (outputFormat === 'json') {
    // For JSON output, we need to parse, modify, and then stringify again
    try {
      const reviewObj = JSON.parse(baseFormattedReview);
      const relativePaths = files.map((file) => file.relativePath || file.path);

      // Add both a flat list and a tree structure
      reviewObj.analyzedFiles = relativePaths;
      reviewObj.fileTree = generateFileTree(relativePaths).replace(/```/g, '').trim();

      return JSON.stringify(reviewObj, null, 2);
    } catch (error) {
      logger.warn(`Error enhancing JSON review with file list: ${error}`);
      return baseFormattedReview;
    }
  } else {
    // For markdown, we append the file list at the end with a tree structure
    const relativePaths = files.map((file) => file.relativePath || file.path);
    const fileTree = generateFileTree(relativePaths);

    const fileListSection = `
## Files Analyzed

The following ${files.length} files were included in this review:

${fileTree}

`;

    // Find the position to insert (before cost information section)
    const costSectionMatch = baseFormattedReview.match(/^## Cost Information/m);

    if (costSectionMatch?.index) {
      // Insert before cost information
      const position = costSectionMatch.index;
      logger.debug('Inserting file list before Cost Information section');
      return (
        baseFormattedReview.substring(0, position) +
        fileListSection +
        baseFormattedReview.substring(position)
      );
    }
    // If cost section not found, append at the end
    logger.debug('Cost Information section not found, appending file list to end');
    return baseFormattedReview + fileListSection;
  }
}

// Export the converter function for use by other modules
export { convertJsonArchitectureToMarkdown };
