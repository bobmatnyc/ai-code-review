/**
 * @fileoverview GitHub Projects API client for interacting with GitHub Projects.
 *
 * This module provides functionality for interacting with GitHub Projects (new version)
 * using the GitHub GraphQL API. It allows for reading and writing project data,
 * syncing PROJECT.md content with GitHub Projects, and managing project items.
 */

import fs from 'fs/promises';
import fetch from 'node-fetch';
// import path from 'path'; // TODO: Remove if not needed
import logger from './logger';

// GitHub API endpoints
// const GITHUB_API_URL = 'https://api.github.com'; // TODO: Remove if not needed
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * GitHub Projects client configuration
 */
interface GitHubProjectsConfig {
  token: string;
  projectId?: string;
  projectNumber?: number;
  owner: string;
}

/**
 * Project item interface
 */
interface ProjectItem {
  id: string;
  title: string;
  body?: string;
  status?: string;
}

/**
 * Get GitHub Projects configuration from environment variables
 * @returns GitHub Projects configuration
 */
export function getGitHubProjectsConfig(): GitHubProjectsConfig {
  const token = process.env.GITHUB_TOKEN;
  const projectId = process.env.GITHUB_PROJECT_ID;
  const projectNumber = process.env.GITHUB_PROJECT_NUMBER
    ? parseInt(process.env.GITHUB_PROJECT_NUMBER, 10)
    : undefined;
  const owner = process.env.GITHUB_OWNER || 'bobmatnyc';

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  if (!projectId && !projectNumber) {
    throw new Error(
      'Either GITHUB_PROJECT_ID or GITHUB_PROJECT_NUMBER environment variable is required',
    );
  }

  return {
    token,
    projectId,
    projectNumber,
    owner,
  };
}

/**
 * Execute a GraphQL query against the GitHub API
 * @param query GraphQL query
 * @param variables Query variables
 * @param token GitHub API token
 * @returns Query result
 */
async function executeGraphQLQuery(query: string, variables: any, token: string): Promise<any> {
  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v4+json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    const data = (await response.json()) as any;

    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  } catch (error) {
    logger.error(
      `Error executing GraphQL query: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Get project information by ID or number
 * @param config GitHub Projects configuration
 * @returns Project information
 */
export async function getProjectInfo(config: GitHubProjectsConfig): Promise<any> {
  try {
    let query;
    const variables: any = {};

    if (config.projectId) {
      // Query by project ID
      query = `
        query GetProjectById($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              id
              title
              url
              number
              shortDescription
              readme
              fields(first: 20) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;
      variables.projectId = config.projectId;
    } else if (config.projectNumber) {
      // Query by project number and owner
      query = `
        query GetProjectByNumber($owner: String!, $number: Int!) {
          user(login: $owner) {
            projectV2(number: $number) {
              id
              title
              url
              number
              shortDescription
              readme
              fields(first: 20) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;
      variables.owner = config.owner;
      variables.number = config.projectNumber;
    } else {
      throw new Error('Either projectId or projectNumber must be provided');
    }

    const result = await executeGraphQLQuery(query, variables, config.token);

    // Extract the project data from the result
    const project = config.projectId ? result.node : result.user.projectV2;

    return project;
  } catch (error) {
    logger.error(
      `Error getting project info: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Get project items
 * @param config GitHub Projects configuration
 * @returns Project items
 */
export async function getProjectItems(config: GitHubProjectsConfig): Promise<ProjectItem[]> {
  try {
    // First, get the project ID if we only have the number
    let projectId = config.projectId;
    if (!projectId && config.projectNumber) {
      const projectInfo = await getProjectInfo(config);
      projectId = projectInfo.id;
    }

    if (!projectId) {
      throw new Error('Could not determine project ID');
    }

    // Now query for the items
    const query = `
      query GetProjectItems($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    title
                    body
                  }
                  ... on PullRequest {
                    title
                    body
                  }
                  ... on DraftIssue {
                    title
                    body
                  }
                }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await executeGraphQLQuery(query, { projectId }, config.token);

    // Extract and format the items
    const items = result.node.items.nodes.map((item: any) => {
      // Find the status field value
      const statusField = item.fieldValues.nodes.find(
        (fieldValue: any) => fieldValue.field && fieldValue.field.name === 'Status',
      );

      return {
        id: item.id,
        title: item.content.title,
        body: item.content.body,
        status: statusField ? statusField.name : undefined,
      };
    });

    return items;
  } catch (error) {
    logger.error(
      `Error getting project items: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Create a new project item
 * @param config GitHub Projects configuration
 * @param title Item title
 * @param body Item body
 * @returns Created item
 */
export async function createProjectItem(
  config: GitHubProjectsConfig,
  title: string,
  body: string,
): Promise<ProjectItem> {
  try {
    // First, get the project ID if we only have the number
    let projectId = config.projectId;
    if (!projectId && config.projectNumber) {
      const projectInfo = await getProjectInfo(config);
      projectId = projectInfo.id;
    }

    if (!projectId) {
      throw new Error('Could not determine project ID');
    }

    // Create a draft issue in the project
    const query = `
      mutation CreateProjectItem($projectId: ID!, $title: String!, $body: String!) {
        addProjectV2DraftIssue(input: {
          projectId: $projectId,
          title: $title,
          body: $body
        }) {
          projectItem {
            id
            content {
              ... on DraftIssue {
                title
                body
              }
            }
          }
        }
      }
    `;

    const result = await executeGraphQLQuery(query, { projectId, title, body }, config.token);

    const createdItem = result.addProjectV2DraftIssue.projectItem;

    return {
      id: createdItem.id,
      title: createdItem.content.title,
      body: createdItem.content.body,
    };
  } catch (error) {
    logger.error(
      `Error creating project item: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Update a project item
 * @param config GitHub Projects configuration
 * @param itemId Item ID
 * @param title New title
 * @param body New body
 * @returns Updated item
 */
export async function updateProjectItem(
  config: GitHubProjectsConfig,
  itemId: string,
  title: string,
  body: string,
): Promise<ProjectItem> {
  try {
    // Update the draft issue
    const query = `
      mutation UpdateProjectItem($itemId: ID!, $title: String!, $body: String!) {
        updateProjectV2DraftIssue(input: {
          draftIssueId: $itemId,
          title: $title,
          body: $body
        }) {
          draftIssue {
            id
            title
            body
          }
        }
      }
    `;

    const result = await executeGraphQLQuery(query, { itemId, title, body }, config.token);

    const updatedItem = result.updateProjectV2DraftIssue.draftIssue;

    return {
      id: updatedItem.id,
      title: updatedItem.title,
      body: updatedItem.body,
    };
  } catch (error) {
    logger.error(
      `Error updating project item: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Parse PROJECT.md content into sections
 * @param content PROJECT.md content
 * @returns Parsed sections
 */
export function parseProjectMd(content: string): { [key: string]: string } {
  const sections: { [key: string]: string } = {};

  // Split by level 2 headers (##)
  const sectionRegex = /^## (.+?)$([\s\S]*?)(?=^## |\s*$)/gm;
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionTitle = match[1].trim();
    const sectionContent = match[2].trim();
    sections[sectionTitle] = sectionContent;
  }

  return sections;
}

/**
 * Update GitHub Project readme with PROJECT.md content
 * @param projectMdPath Path to PROJECT.md file
 * @param config GitHub Projects configuration
 */
export async function updateProjectDescription(
  projectMdPath: string,
  config: GitHubProjectsConfig,
): Promise<void> {
  try {
    // Read PROJECT.md content
    const content = await fs.readFile(projectMdPath, 'utf-8');

    // Get project info to get the project ID
    const projectInfo = await getProjectInfo(config);
    const projectId = projectInfo.id;

    if (!projectId) {
      throw new Error('Could not determine project ID');
    }

    // Update the project readme
    const query = `
      mutation UpdateProjectReadme($projectId: ID!, $readme: String!) {
        updateProjectV2(input: {
          projectId: $projectId,
          readme: $readme
        }) {
          projectV2 {
            id
            readme
          }
        }
      }
    `;

    await executeGraphQLQuery(query, { projectId, readme: content }, config.token);

    logger.info('Successfully updated GitHub Project readme with PROJECT.md content');
  } catch (error) {
    logger.error(
      `Error updating project readme: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Sync PROJECT.md content with GitHub Projects
 * @param projectMdPath Path to PROJECT.md file
 * @param config GitHub Projects configuration
 * @param updateDescriptionOnly Whether to only update the project description
 */
export async function syncProjectMdToGitHub(
  projectMdPath: string,
  config: GitHubProjectsConfig,
  updateDescriptionOnly = false,
): Promise<void> {
  try {
    if (updateDescriptionOnly) {
      // Only update the project description
      await updateProjectDescription(projectMdPath, config);
      return;
    }

    // Read PROJECT.md content
    const content = await fs.readFile(projectMdPath, 'utf-8');

    // Parse sections
    const sections = parseProjectMd(content);

    // Get existing project items
    const existingItems = await getProjectItems(config);

    // Process each section
    for (const [title, body] of Object.entries(sections)) {
      // Check if an item with this title already exists
      const existingItem = existingItems.find((item) => item.title === title);

      if (existingItem) {
        // Update existing item
        await updateProjectItem(config, existingItem.id, title, body);
        logger.info(`Updated project item: ${title}`);
      } else {
        // Create new item
        await createProjectItem(config, title, body);
        logger.info(`Created project item: ${title}`);
      }
    }

    logger.info('Successfully synced PROJECT.md to GitHub Projects');
  } catch (error) {
    logger.error(
      `Error syncing PROJECT.md to GitHub: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Generate PROJECT.md content from GitHub Projects
 * @param config GitHub Projects configuration
 * @returns Generated PROJECT.md content
 */
export async function generateProjectMdFromGitHub(config: GitHubProjectsConfig): Promise<string> {
  try {
    // Get project info
    const projectInfo = await getProjectInfo(config);

    // Get project items
    const items = await getProjectItems(config);

    // Generate content
    let content = `# ${projectInfo.title}\n\n`;

    // Add items as sections
    for (const item of items) {
      content += `## ${item.title}\n\n${item.body || ''}\n\n`;
    }

    return content;
  } catch (error) {
    logger.error(
      `Error generating PROJECT.md from GitHub: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Sync GitHub Projects content to PROJECT.md
 * @param projectMdPath Path to PROJECT.md file
 * @param config GitHub Projects configuration
 */
export async function syncGitHubToProjectMd(
  projectMdPath: string,
  config: GitHubProjectsConfig,
): Promise<void> {
  try {
    // Generate content
    const content = await generateProjectMdFromGitHub(config);

    // Write to file
    await fs.writeFile(projectMdPath, content, 'utf-8');

    logger.info('Successfully synced GitHub Projects to PROJECT.md');
  } catch (error) {
    logger.error(
      `Error syncing GitHub to PROJECT.md: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}
