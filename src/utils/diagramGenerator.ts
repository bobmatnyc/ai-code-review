/**
 * @fileoverview Diagram generator for creating Mermaid architecture diagrams.
 *
 * This module is responsible for extracting and generating Mermaid diagrams
 * from review content, particularly for architectural reviews.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import logger from './logger';

/**
 * Extract Mermaid diagram blocks from review content
 * @param content Review content that may contain Mermaid diagram blocks
 * @returns Array of Mermaid diagram strings
 */
export function extractMermaidDiagrams(content: string): string[] {
  const diagrams: string[] = [];

  // Match Mermaid code blocks in various formats
  const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;
  let match;

  while ((match = mermaidBlockRegex.exec(content)) !== null) {
    diagrams.push(match[1].trim());
  }

  // Also check for inline mermaid notation that might be present
  const inlineMermaidRegex = /graph\s+(TB|TD|BT|RL|LR)[\s\S]*?(?=\n\n|\n##|$)/g;

  while ((match = inlineMermaidRegex.exec(content)) !== null) {
    // Only add if not already captured in a code block
    const diagram = match[0].trim();
    if (!diagrams.some((d) => d.includes(diagram))) {
      diagrams.push(diagram);
    }
  }

  return diagrams;
}

/**
 * Generate a Mermaid diagram prompt for architectural reviews
 * @param projectName Name of the project being reviewed
 * @param framework Framework being used (if detected)
 * @returns Prompt text for generating architecture diagrams
 */
export function generateDiagramPrompt(projectName: string, framework?: string): string {
  const frameworkContext = framework ? ` (${framework} framework)` : '';

  return `
## Architecture Diagram

Please generate a Mermaid diagram that visualizes the architecture of the ${projectName}${frameworkContext} project. Include:

1. **Component Diagram**: Show the main components/modules and their relationships
2. **Data Flow**: Illustrate how data flows through the system
3. **Key Dependencies**: Show external services, databases, and APIs
4. **Layer Architecture**: If applicable, show the layered architecture (presentation, business logic, data access)

Use the following Mermaid syntax:

\`\`\`mermaid
graph TB
    subgraph "Presentation Layer"
        UI[User Interface]
        API[API Gateway]
    end
    
    subgraph "Business Logic"
        Service[Service Layer]
        Domain[Domain Models]
    end
    
    subgraph "Data Layer"
        DB[(Database)]
        Cache[(Cache)]
    end
    
    UI --> API
    API --> Service
    Service --> Domain
    Service --> DB
    Service --> Cache
\`\`\`

Please provide a comprehensive architecture diagram based on the actual code structure analyzed.
`;
}

/**
 * Save Mermaid diagrams to separate files
 * @param diagrams Array of Mermaid diagram strings
 * @param outputPath Path to the main review output file
 * @returns Promise resolving to the paths of saved diagram files
 */
export async function saveDiagramFiles(diagrams: string[], outputPath: string): Promise<string[]> {
  if (diagrams.length === 0) {
    logger.debug('No diagrams to save');
    return [];
  }

  const savedPaths: string[] = [];
  const baseDir = path.dirname(outputPath);
  const baseName = path.basename(outputPath, path.extname(outputPath));

  for (let i = 0; i < diagrams.length; i++) {
    const diagramNumber = diagrams.length > 1 ? `-${i + 1}` : '';
    const diagramPath = path.join(baseDir, `${baseName}-diagram${diagramNumber}.md`);

    // Create markdown file with the Mermaid diagram
    const diagramContent = `# Architecture Diagram${diagramNumber ? ` ${i + 1}` : ''}

Generated from: ${path.basename(outputPath)}
Date: ${new Date().toISOString()}

## Diagram

\`\`\`mermaid
${diagrams[i]}
\`\`\`

## Rendering Instructions

To view this diagram:
1. Use a Markdown viewer that supports Mermaid (GitHub, GitLab, VS Code with Mermaid extension)
2. Or paste the Mermaid code into https://mermaid.live/
3. Or use the Mermaid CLI: \`mmdc -i ${path.basename(diagramPath)} -o ${baseName}-diagram${diagramNumber}.svg\`

## Notes

This diagram was automatically generated as part of an architectural code review.
For the full review, see: ${path.basename(outputPath)}
`;

    try {
      await fs.writeFile(diagramPath, diagramContent, 'utf-8');
      savedPaths.push(diagramPath);
      logger.info(`Saved architecture diagram to: ${diagramPath}`);
    } catch (error) {
      logger.error(`Failed to save diagram file: ${error}`);
    }
  }

  return savedPaths;
}

/**
 * Process review content to extract and save diagrams
 * @param reviewContent The full review content
 * @param outputPath Path to the main review output file
 * @param options Review options
 * @returns Promise resolving to paths of any saved diagram files
 */
export async function processDiagrams(
  reviewContent: string,
  outputPath: string,
  options: { diagram?: boolean; type: string },
): Promise<string[]> {
  // Only process diagrams if the flag is set and it's an architectural review
  if (!options.diagram || options.type !== 'architectural') {
    return [];
  }

  logger.info('Processing review content for architecture diagrams...');

  // Extract any Mermaid diagrams from the review content
  const diagrams = extractMermaidDiagrams(reviewContent);

  if (diagrams.length === 0) {
    logger.info('No Mermaid diagrams found in review content');
    return [];
  }

  logger.info(`Found ${diagrams.length} Mermaid diagram(s) in review`);

  // Save the diagrams to separate files
  return saveDiagramFiles(diagrams, outputPath);
}

/**
 * Enhance review prompt to include diagram generation
 * @param originalPrompt The original review prompt
 * @param options Review options
 * @param projectName Project name
 * @param framework Detected framework (optional)
 * @returns Enhanced prompt with diagram instructions
 */
export function enhancePromptForDiagrams(
  originalPrompt: string,
  options: { diagram?: boolean; type: string },
  projectName: string,
  framework?: string,
): string {
  // Only enhance if diagram flag is set and it's an architectural review
  if (!options.diagram || options.type !== 'architectural') {
    return originalPrompt;
  }

  const diagramPrompt = generateDiagramPrompt(projectName, framework);

  // Add the diagram prompt to the original prompt
  return `${originalPrompt}

${diagramPrompt}`;
}
