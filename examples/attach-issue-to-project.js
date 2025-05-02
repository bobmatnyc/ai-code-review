#!/usr/bin/env node

/**
 * Example script to attach an existing GitHub issue to Project 1
 * 
 * Usage:
 * 1. Set your GitHub token in the GITHUB_TOKEN environment variable
 * 2. Run this script: node attach-issue-to-project.js
 */

const { Octokit } = require("octokit");

// Create a new Octokit instance with GraphQL support
const octokit = new Octokit({ 
  auth: process.env.GITHUB_TOKEN
});

// Constants
const OWNER = "bobmatnyc";
const REPO = "code-review";
const ISSUE_NUMBER = 1;

// Function to get the Project ID
async function getProjectId() {
  try {
    const result = await octokit.graphql(`
      query {
        user(login: "${OWNER}") {
          projectV2(number: 1) {
            id
            title
          }
        }
      }
    `);
    
    console.log(`Project ID: ${result.user.projectV2.id}`);
    console.log(`Project Title: ${result.user.projectV2.title}`);
    
    return result.user.projectV2.id;
  } catch (error) {
    console.error("Error getting project ID:", error.message);
    if (error.errors) {
      console.error("GraphQL Errors:", JSON.stringify(error.errors, null, 2));
    }
  }
}

// Function to get the Issue node ID
async function getIssueNodeId() {
  try {
    const response = await octokit.rest.issues.get({
      owner: OWNER,
      repo: REPO,
      issue_number: ISSUE_NUMBER
    });
    
    return response.data.node_id;
  } catch (error) {
    console.error("Error getting issue node ID:", error.message);
  }
}

// Function to add the issue to the project
async function addIssueToProject() {
  try {
    // Step 1: Get the Project ID
    const projectId = await getProjectId();
    if (!projectId) {
      throw new Error("Could not get Project ID");
    }
    
    // Step 2: Get the Issue node ID
    const issueId = await getIssueNodeId();
    if (!issueId) {
      throw new Error("Could not get Issue node ID");
    }
    
    console.log(`Issue #${ISSUE_NUMBER} node ID: ${issueId}`);
    
    // Step 3: Add the issue to the project
    const addToProjectMutation = await octokit.graphql(`
      mutation {
        addProjectV2ItemById(input: {
          projectId: "${projectId}"
          contentId: "${issueId}"
        }) {
          item {
            id
          }
        }
      }
    `);
    
    console.log(`Successfully added Issue #${ISSUE_NUMBER} to Project 1`);
    console.log(`Project Item ID: ${addToProjectMutation.addProjectV2ItemById.item.id}`);
    
  } catch (error) {
    console.error("Error:", error.message);
    if (error.errors) {
      console.error("GraphQL Errors:", JSON.stringify(error.errors, null, 2));
    }
  }
}

// Run the function
addIssueToProject();
