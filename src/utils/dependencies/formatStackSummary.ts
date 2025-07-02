/**
 * @fileoverview Helper function for stack summary formatting
 *
 * This module provides a helper function to format tech stack summaries
 * for project without depending on the full stackAwarePackageAnalyzer module.
 */

/**
 * Format a tech stack summary for a detected stack
 * @param stack The detected stack information
 * @returns A formatted markdown summary
 */
export function formatStackSummary(stack: any): string {
  if (!stack) {
    return '## Project Stack Analysis\n\n**Error**: Invalid analysis result\n\n';
  }

  let summary = '## Project Stack Analysis\n\n';

  if (stack.name) {
    summary += `**Primary Tech Stack**: ${getDisplayName(stack.name)} (${stack.confidence || 'medium'} confidence)\n\n`;

    if (stack.parentStacks && Array.isArray(stack.parentStacks) && stack.parentStacks.length > 0) {
      summary += '**Stack Hierarchy**:\n';
      summary += stack.parentStacks
        .map((parentStack: string) => `- ${getDisplayName(parentStack)}`)
        .join('\n');
      summary += '\n\n';
    }
  } else {
    summary += '**No specific tech stack detected**\n\n';
  }

  // Add package counts if available
  if (stack.dependencyFiles && Array.isArray(stack.dependencyFiles)) {
    summary += `**Dependency Files**: ${stack.dependencyFiles.length} found\n\n`;
  }

  return summary;
}

/**
 * Get a display name for a tech stack
 * @param stackName The tech stack type
 * @returns A user-friendly display name
 */
function getDisplayName(stackName: string): string {
  const displayNames: Record<string, string> = {
    nodejs: 'Node.js',
    nextjs: 'Next.js',
    nestjs: 'NestJS',
    react: 'React',
    vue: 'Vue.js',
    angular: 'Angular',
    express: 'Express.js',
    laravel: 'Laravel',
    symfony: 'Symfony',
    wordpress: 'WordPress',
    django: 'Django',
    flask: 'Flask',
    python: 'Python',
    ruby: 'Ruby',
    rails: 'Ruby on Rails',
    java: 'Java',
    dotnet: '.NET',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    svelte: 'Svelte',
    fastify: 'Fastify',
    fastapi: 'FastAPI',
  };

  return displayNames[stackName] || stackName;
}
