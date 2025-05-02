/**
 * @fileoverview GitHub API client for interacting with GitHub repositories.
 *
 * This module provides functionality for interacting with GitHub repositories
 * using the GitHub REST and GraphQL APIs. It allows for creating and managing
 * issues, linking issues to commits and PRs, and updating issue status.
 */

import fetch from 'node-fetch';
import logger from './logger';
import { 
  GitHubRepository, 
  GitHubIssue, 
  GitHubPullRequest, 
  GitHubCommit, 
  GitHubComment,
  CreateIssueOptions,
  UpdateIssueOptions,
  GitHubSubtask,
  GitHubIssueWithSubtasks
} from '../types/github';

// GitHub API endpoints
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * GitHub client configuration
 */
interface GitHubClientConfig {
  token: string;
  owner: string;
  repo: string;
}

/**
 * Get GitHub client configuration from environment variables
 * @returns GitHub client configuration
 */
export function getGitHubClientConfig(): GitHubClientConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'bobmatnyc';
  const repo = process.env.GITHUB_REPO || 'code-review';

  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required');
  }

  return {
    token,
    owner,
    repo
  };
}

/**
 * Execute a REST API request against the GitHub API
 * @param endpoint API endpoint (e.g., '/repos/{owner}/{repo}/issues')
 * @param method HTTP method
 * @param token GitHub API token
 * @param body Request body
 * @returns API response
 */
async function executeRestRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  token: string,
  body?: any
): Promise<any> {
  try {
    const url = `${GITHUB_API_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    // For DELETE requests, there might not be a response body
    if (method === 'DELETE') {
      return { success: true };
    }

    return await response.json();
  } catch (error) {
    logger.error(`Error executing REST request: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
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
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v4+json'
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  } catch (error) {
    logger.error(`Error executing GraphQL query: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get repository information
 * @param config GitHub client configuration
 * @returns Repository information
 */
export async function getRepositoryInfo(config: GitHubClientConfig): Promise<GitHubRepository> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}`;
    const result = await executeRestRequest(endpoint, 'GET', config.token);
    
    return {
      owner: result.owner.login,
      repo: result.name
    };
  } catch (error) {
    logger.error(`Error getting repository info: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Create a new issue
 * @param config GitHub client configuration
 * @param options Issue creation options
 * @returns Created issue
 */
export async function createIssue(
  config: GitHubClientConfig,
  options: CreateIssueOptions
): Promise<GitHubIssue> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/issues`;
    const result = await executeRestRequest(endpoint, 'POST', config.token, options);
    
    return {
      id: result.id,
      number: result.number,
      title: result.title,
      body: result.body,
      state: result.state,
      labels: result.labels.map((label: any) => label.name),
      assignees: result.assignees.map((assignee: any) => assignee.login),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      closedAt: result.closed_at,
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error creating issue: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Update an existing issue
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @param options Issue update options
 * @returns Updated issue
 */
export async function updateIssue(
  config: GitHubClientConfig,
  issueNumber: number,
  options: UpdateIssueOptions
): Promise<GitHubIssue> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`;
    const result = await executeRestRequest(endpoint, 'PATCH', config.token, options);
    
    return {
      id: result.id,
      number: result.number,
      title: result.title,
      body: result.body,
      state: result.state,
      labels: result.labels.map((label: any) => label.name),
      assignees: result.assignees.map((assignee: any) => assignee.login),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      closedAt: result.closed_at,
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error updating issue: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get an issue by number
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @returns Issue information
 */
export async function getIssue(
  config: GitHubClientConfig,
  issueNumber: number
): Promise<GitHubIssue> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/issues/${issueNumber}`;
    const result = await executeRestRequest(endpoint, 'GET', config.token);
    
    return {
      id: result.id,
      number: result.number,
      title: result.title,
      body: result.body,
      state: result.state,
      labels: result.labels.map((label: any) => label.name),
      assignees: result.assignees.map((assignee: any) => assignee.login),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      closedAt: result.closed_at,
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error getting issue: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * List issues in a repository
 * @param config GitHub client configuration
 * @param state Issue state (open, closed, all)
 * @param labels Comma-separated list of labels
 * @param assignee Filter by assignee
 * @returns List of issues
 */
export async function listIssues(
  config: GitHubClientConfig,
  state: 'open' | 'closed' | 'all' = 'open',
  labels?: string,
  assignee?: string
): Promise<GitHubIssue[]> {
  try {
    let endpoint = `/repos/${config.owner}/${config.repo}/issues?state=${state}`;
    
    if (labels) {
      endpoint += `&labels=${encodeURIComponent(labels)}`;
    }
    
    if (assignee) {
      endpoint += `&assignee=${encodeURIComponent(assignee)}`;
    }
    
    const result = await executeRestRequest(endpoint, 'GET', config.token);
    
    return result.map((issue: any) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body,
      state: issue.state,
      labels: issue.labels.map((label: any) => label.name),
      assignees: issue.assignees.map((assignee: any) => assignee.login),
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at,
      url: issue.url,
      htmlUrl: issue.html_url
    }));
  } catch (error) {
    logger.error(`Error listing issues: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Create a comment on an issue
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @param body Comment body
 * @returns Created comment
 */
export async function createIssueComment(
  config: GitHubClientConfig,
  issueNumber: number,
  body: string
): Promise<GitHubComment> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`;
    const result = await executeRestRequest(endpoint, 'POST', config.token, { body });
    
    return {
      id: result.id,
      body: result.body,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error creating issue comment: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Parse task list items from issue body
 * @param body Issue body
 * @returns List of subtasks
 */
export function parseSubtasks(body: string): GitHubSubtask[] {
  const subtasks: GitHubSubtask[] = [];
  const lines = body.split('\n');
  
  let position = 0;
  for (const line of lines) {
    // Match GitHub task list syntax: - [ ] Task or - [x] Task
    const match = line.match(/^\s*-\s+\[([ xX])\]\s+(.+)$/);
    if (match) {
      const completed = match[1].toLowerCase() === 'x';
      const text = match[2].trim();
      
      subtasks.push({
        text,
        completed,
        position: position++
      });
    }
  }
  
  return subtasks;
}

/**
 * Update subtasks in issue body
 * @param body Issue body
 * @param subtasks Updated subtasks
 * @returns Updated issue body
 */
export function updateSubtasksInBody(body: string, subtasks: GitHubSubtask[]): string {
  const lines = body.split('\n');
  const updatedLines: string[] = [];
  
  let taskIndex = 0;
  const sortedSubtasks = [...subtasks].sort((a, b) => a.position - b.position);
  
  for (const line of lines) {
    // Check if this line is a task list item
    if (line.match(/^\s*-\s+\[([ xX])\]\s+(.+)$/)) {
      // If we have a corresponding updated subtask, replace it
      if (taskIndex < sortedSubtasks.length) {
        const subtask = sortedSubtasks[taskIndex++];
        const checkmark = subtask.completed ? 'x' : ' ';
        updatedLines.push(`- [${checkmark}] ${subtask.text}`);
      } else {
        // Otherwise, keep the original line
        updatedLines.push(line);
      }
    } else {
      // Not a task list item, keep as is
      updatedLines.push(line);
    }
  }
  
  return updatedLines.join('\n');
}

/**
 * Get issue with subtasks
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @returns Issue with subtasks
 */
export async function getIssueWithSubtasks(
  config: GitHubClientConfig,
  issueNumber: number
): Promise<GitHubIssueWithSubtasks> {
  try {
    const issue = await getIssue(config, issueNumber);
    const subtasks = parseSubtasks(issue.body);
    
    return {
      ...issue,
      subtasks
    };
  } catch (error) {
    logger.error(`Error getting issue with subtasks: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Update subtasks in an issue
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @param subtasks Updated subtasks
 * @returns Updated issue with subtasks
 */
export async function updateIssueSubtasks(
  config: GitHubClientConfig,
  issueNumber: number,
  subtasks: GitHubSubtask[]
): Promise<GitHubIssueWithSubtasks> {
  try {
    // Get the current issue
    const issue = await getIssue(config, issueNumber);
    
    // Update the body with the new subtasks
    const updatedBody = updateSubtasksInBody(issue.body, subtasks);
    
    // Update the issue
    const updatedIssue = await updateIssue(config, issueNumber, { body: updatedBody });
    
    return {
      ...updatedIssue,
      subtasks
    };
  } catch (error) {
    logger.error(`Error updating issue subtasks: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Create an issue with subtasks
 * @param config GitHub client configuration
 * @param title Issue title
 * @param description Issue description
 * @param subtasks List of subtask texts
 * @param options Additional issue creation options
 * @returns Created issue with subtasks
 */
export async function createIssueWithSubtasks(
  config: GitHubClientConfig,
  title: string,
  description: string,
  subtasks: string[],
  options?: Omit<CreateIssueOptions, 'title' | 'body'>
): Promise<GitHubIssueWithSubtasks> {
  try {
    // Format the body with task list items
    let body = description ? `${description}\n\n` : '';
    
    // Add task list items
    if (subtasks.length > 0) {
      body += '## Subtasks\n\n';
      for (const subtask of subtasks) {
        body += `- [ ] ${subtask}\n`;
      }
    }
    
    // Create the issue
    const issue = await createIssue(config, {
      title,
      body,
      ...options
    });
    
    // Parse the subtasks from the created issue
    const parsedSubtasks = parseSubtasks(issue.body);
    
    return {
      ...issue,
      subtasks: parsedSubtasks
    };
  } catch (error) {
    logger.error(`Error creating issue with subtasks: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get a pull request by number
 * @param config GitHub client configuration
 * @param prNumber Pull request number
 * @returns Pull request information
 */
export async function getPullRequest(
  config: GitHubClientConfig,
  prNumber: number
): Promise<GitHubPullRequest> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/pulls/${prNumber}`;
    const result = await executeRestRequest(endpoint, 'GET', config.token);
    
    return {
      id: result.id,
      number: result.number,
      title: result.title,
      body: result.body,
      state: result.merged ? 'merged' : result.state,
      labels: result.labels.map((label: any) => label.name),
      assignees: result.assignees.map((assignee: any) => assignee.login),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      closedAt: result.closed_at,
      mergedAt: result.merged_at,
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error getting pull request: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get a commit by SHA
 * @param config GitHub client configuration
 * @param sha Commit SHA
 * @returns Commit information
 */
export async function getCommit(
  config: GitHubClientConfig,
  sha: string
): Promise<GitHubCommit> {
  try {
    const endpoint = `/repos/${config.owner}/${config.repo}/commits/${sha}`;
    const result = await executeRestRequest(endpoint, 'GET', config.token);
    
    return {
      sha: result.sha,
      message: result.commit.message,
      author: {
        name: result.commit.author.name,
        email: result.commit.author.email,
        date: result.commit.author.date
      },
      url: result.url,
      htmlUrl: result.html_url
    };
  } catch (error) {
    logger.error(`Error getting commit: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Link an issue to a pull request in the issue body
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @param prNumber Pull request number
 * @returns Updated issue
 */
export async function linkIssueToPullRequest(
  config: GitHubClientConfig,
  issueNumber: number,
  prNumber: number
): Promise<GitHubIssue> {
  try {
    // Get the current issue
    const issue = await getIssue(config, issueNumber);
    
    // Get the PR
    const pr = await getPullRequest(config, prNumber);
    
    // Check if the PR is already linked
    if (issue.body.includes(`#${prNumber}`)) {
      return issue;
    }
    
    // Add the PR link to the issue body
    let updatedBody = issue.body;
    
    // Add a "Linked Pull Requests" section if it doesn't exist
    if (!updatedBody.includes('## Linked Pull Requests')) {
      updatedBody += '\n\n## Linked Pull Requests\n';
    }
    
    // Add the PR link
    const prLink = `- [#${prNumber}: ${pr.title}](${pr.htmlUrl})`;
    if (!updatedBody.includes(prLink)) {
      // Find the "Linked Pull Requests" section and add the link
      const sections = updatedBody.split('## ');
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].startsWith('Linked Pull Requests')) {
          sections[i] += `\n${prLink}`;
          break;
        }
      }
      updatedBody = sections.join('## ');
    }
    
    // Update the issue
    return await updateIssue(config, issueNumber, { body: updatedBody });
  } catch (error) {
    logger.error(`Error linking issue to pull request: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Link an issue to a commit in the issue body
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @param sha Commit SHA
 * @returns Updated issue
 */
export async function linkIssueToCommit(
  config: GitHubClientConfig,
  issueNumber: number,
  sha: string
): Promise<GitHubIssue> {
  try {
    // Get the current issue
    const issue = await getIssue(config, issueNumber);
    
    // Get the commit
    const commit = await getCommit(config, sha);
    
    // Check if the commit is already linked
    if (issue.body.includes(sha)) {
      return issue;
    }
    
    // Add the commit link to the issue body
    let updatedBody = issue.body;
    
    // Add a "Linked Commits" section if it doesn't exist
    if (!updatedBody.includes('## Linked Commits')) {
      updatedBody += '\n\n## Linked Commits\n';
    }
    
    // Add the commit link
    const commitLink = `- [${sha.substring(0, 7)}](${commit.htmlUrl}): ${commit.message.split('\n')[0]}`;
    if (!updatedBody.includes(commitLink)) {
      // Find the "Linked Commits" section and add the link
      const sections = updatedBody.split('## ');
      for (let i = 0; i < sections.length; i++) {
        if (sections[i].startsWith('Linked Commits')) {
          sections[i] += `\n${commitLink}`;
          break;
        }
      }
      updatedBody = sections.join('## ');
    }
    
    // Update the issue
    return await updateIssue(config, issueNumber, { body: updatedBody });
  } catch (error) {
    logger.error(`Error linking issue to commit: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Close an issue
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @returns Closed issue
 */
export async function closeIssue(
  config: GitHubClientConfig,
  issueNumber: number
): Promise<GitHubIssue> {
  try {
    return await updateIssue(config, issueNumber, { state: 'closed' });
  } catch (error) {
    logger.error(`Error closing issue: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Reopen an issue
 * @param config GitHub client configuration
 * @param issueNumber Issue number
 * @returns Reopened issue
 */
export async function reopenIssue(
  config: GitHubClientConfig,
  issueNumber: number
): Promise<GitHubIssue> {
  try {
    return await updateIssue(config, issueNumber, { state: 'open' });
  } catch (error) {
    logger.error(`Error reopening issue: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
