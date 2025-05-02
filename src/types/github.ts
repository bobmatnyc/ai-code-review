/**
 * @fileoverview Types for GitHub API operations.
 *
 * This module defines types for GitHub issues, PRs, commits, and other GitHub entities.
 */

/**
 * GitHub repository information
 */
export interface GitHubRepository {
  owner: string;
  repo: string;
}

/**
 * GitHub issue information
 */
export interface GitHubIssue {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  url: string;
  htmlUrl: string;
}

/**
 * GitHub pull request information
 */
export interface GitHubPullRequest {
  id: string;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  mergedAt?: string;
  url: string;
  htmlUrl: string;
}

/**
 * GitHub commit information
 */
export interface GitHubCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  htmlUrl: string;
}

/**
 * GitHub issue comment information
 */
export interface GitHubComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  htmlUrl: string;
}

/**
 * GitHub issue creation options
 */
export interface CreateIssueOptions {
  title: string;
  body: string;
  assignees?: string[];
  labels?: string[];
  milestone?: number;
}

/**
 * GitHub issue update options
 */
export interface UpdateIssueOptions {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  assignees?: string[];
  labels?: string[];
  milestone?: number;
}

/**
 * GitHub subtask information
 */
export interface GitHubSubtask {
  text: string;
  completed: boolean;
  position: number;
}

/**
 * GitHub issue with subtasks
 */
export interface GitHubIssueWithSubtasks extends GitHubIssue {
  subtasks: GitHubSubtask[];
}

/**
 * GitHub issue link information
 */
export interface GitHubIssueLink {
  type: 'commit' | 'pr';
  id: string;
  url: string;
}
