import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import { ReviewType, ReviewResult, FileInfo, ReviewCost } from '../types/review';
import { getCostInfo } from '../utils/tokenCounter';

// Initialize the Google Generative AI client
// Try to get the API key from environment variables
let apiKey = process.env.GOOGLE_GENERATIVE_AI_KEY;

// If not found in environment variables, use the hardcoded key from .env.local
if (!apiKey) {
  // This is the key from .env.local
  apiKey = 'AIzaSyDPUQSpBaxWyt79KbmFeIWXFxYo-P33tEY';
}

// Check if API key is available
if (!apiKey) {
  console.warn('Warning: GOOGLE_GENERATIVE_AI_KEY environment variable is not set. Using mock responses for testing.');
} else {
  console.log('API key found. Using real Gemini API responses.');
}

// Flag to indicate if we're using mock responses
const useMockResponses = !apiKey;

// Initialize the Google Generative AI client if API key is available
let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

if (!useMockResponses) {
  genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-1.5-pro instead of gemini-2.5-max as it's more widely available
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  console.log('Using Gemini model: gemini-1.5-pro');
}

/**
 * Load a prompt template from the prompts directory
 * @param reviewType Type of review to perform
 * @returns Promise resolving to the prompt template
 */
async function loadPromptTemplate(reviewType: ReviewType): Promise<string> {
  const promptPath = path.resolve('prompts', `${reviewType}-review.md`);
  try {
    return await fs.readFile(promptPath, 'utf-8');
  } catch (error) {
    console.error(`Error loading prompt template for ${reviewType}:`, error);
    throw new Error(`Failed to load prompt template for ${reviewType}`);
  }
}

/**
 * Generate a mock response for testing
 * @param reviewType Type of review to perform
 * @param filePath Path to the file being reviewed
 * @returns Mock review content
 */
async function generateMockResponse(reviewType: ReviewType, filePath: string): Promise<string> {
  const fileExtension = path.extname(filePath).slice(1);
  const language = getLanguageFromExtension(fileExtension);

  return `# Mock ${reviewType.toUpperCase()} Review for ${filePath}

This is a mock review generated for testing purposes since no API key was provided.

## Summary

This file appears to be a ${language} file. In a real review, this would contain detailed feedback based on the review type.

## Recommendations

1. Add proper documentation
2. Ensure consistent code style
3. Follow best practices for ${language}

*This is a mock response. To get real reviews, please set the GOOGLE_AI_STUDIO_KEY environment variable.*`;
}

/**
 * Generate a code review using the Gemini API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @returns Promise resolving to the review result
 */
export async function generateReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType
): Promise<ReviewResult> {
  try {
    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType);

    // Get file extension and language
    const fileExtension = path.extname(filePath).slice(1);
    const language = getLanguageFromExtension(fileExtension);

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockResponse(reviewType, filePath);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 1250,
        outputTokens: 750,
        totalTokens: 2000,
        estimatedCost: 0.000625,
        formattedCost: '$0.000625 USD'
      };
    } else {
      // Format the code block with language
      const codeBlock = `\`\`\`${language}
${fileContent}
\`\`\``;

      // Prepare the prompt with the code
      const prompt = `${promptTemplate}

## File: ${filePath}

${codeBlock}`;

      // Call the Gemini API - let errors propagate up
      const result = await model.generateContent(prompt);
      const response = result.response;
      content = response.text();

      // Calculate cost information
      cost = getCostInfo(prompt, content);
    }

    return {
      filePath,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock
    };
  } catch (error) {
    console.error('Error generating review:', error);
    throw new Error(`Failed to generate review for ${filePath}`);
  }
}

/**
 * Generate a mock architectural review for testing
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @returns Mock review content
 */
async function generateMockArchitecturalResponse(files: FileInfo[], projectName: string): Promise<string> {
  // Create a directory structure representation
  const directoryStructure = generateDirectoryStructure(files);

  // Count files by type
  const fileTypes: Record<string, number> = {};
  files.forEach(file => {
    const ext = path.extname(file.path).slice(1) || 'unknown';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });

  const fileTypeSummary = Object.entries(fileTypes)
    .map(([ext, count]) => `- ${ext}: ${count} files`)
    .join('\n');

  return `# Mock ARCHITECTURAL Review for ${projectName}

This is a mock architectural review generated for testing purposes since no API key was provided.

## Project Structure

\`\`\`
${directoryStructure}
\`\`\`

## File Types

${fileTypeSummary}

## Architecture Summary

This project contains ${files.length} files. In a real review, this would contain a detailed analysis of the project architecture, including:

- Code organization and modularity
- API design patterns
- Package dependencies
- Component relationships
- Data flow

## Recommendations

1. Ensure consistent code organization
2. Follow best practices for API design
3. Minimize external dependencies
4. Implement clear separation of concerns

*This is a mock response. To get real reviews, please set the GOOGLE_AI_STUDIO_KEY environment variable.*`;
}

/**
 * Generate an architectural review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @returns Promise resolving to the review result
 */
export async function generateArchitecturalReview(
  files: FileInfo[],
  projectName: string
): Promise<ReviewResult> {
  try {
    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockArchitecturalResponse(files, projectName);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 5000,
        outputTokens: 3000,
        totalTokens: 8000,
        estimatedCost: 0.0025,
        formattedCost: '$0.002500 USD'
      };
    } else {
      // Load the architectural review prompt template
      const promptTemplate = await loadPromptTemplate('architectural');

      // Prepare file summaries
      const fileSummaries = files.map(file => {
        const fileExtension = path.extname(file.path).slice(1);
        const language = getLanguageFromExtension(fileExtension);

        return `## File: ${file.relativePath}

\`\`\`${language}
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
      }).join('\n');

      // Create a project structure summary
      const directoryStructure = generateDirectoryStructure(files);

      // Prepare the prompt with the code
      const prompt = `${promptTemplate}

# Project: ${projectName}

## Directory Structure
${directoryStructure}

## File Summaries (truncated for brevity)
${fileSummaries}`;

      // Call the Gemini API - let errors propagate up
      const result = await model.generateContent(prompt);
      const response = result.response;
      content = response.text();

      // Calculate cost information
      cost = getCostInfo(prompt, content);
    }

    return {
      filePath: `${projectName}/architectural-review`,
      reviewType: 'architectural',
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock
    };
  } catch (error) {
    console.error('Error generating architectural review:', error);
    throw new Error(`Failed to generate architectural review for ${projectName}`);
  }
}

/**
 * Generate a directory structure representation from file paths
 * @param files Array of file information objects
 * @returns String representation of directory structure
 */
function generateDirectoryStructure(files: FileInfo[]): string {
  const structure: Record<string, any> = {};

  // Build tree structure
  for (const file of files) {
    const parts = file.relativePath.split('/');
    let current = structure;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    const fileName = parts[parts.length - 1];
    current[fileName] = null;
  }

  // Convert to string representation
  function stringifyStructure(obj: Record<string, any>, indent = 0): string {
    let result = '';
    for (const [key, value] of Object.entries(obj)) {
      result += '  '.repeat(indent) + (value === null ? '📄 ' : '📁 ') + key + '\n';
      if (value !== null) {
        result += stringifyStructure(value, indent + 1);
      }
    }
    return result;
  }

  return stringifyStructure(structure);
}

/**
 * Get the language name from file extension
 * @param extension File extension
 * @returns Language name
 */
function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    php: 'php',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin'
  };

  return extensionMap[extension.toLowerCase()] || 'plaintext';
}
