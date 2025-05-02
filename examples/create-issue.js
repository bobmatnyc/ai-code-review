#!/usr/bin/env node

/**
 * Example script to create a GitHub issue for the architectural review prompt template loading error
 * and add it to Project 1
 *
 * Usage:
 * 1. Set your GitHub token in the GITHUB_TOKEN environment variable
 * 2. Run this script: node create-issue.js
 */

const { Octokit } = require("octokit");

// Create a new Octokit instance with GraphQL support
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Project ID for Project 1
const PROJECT_ID = "PVT_kwDOLXXXXM4AXXXXs"; // Replace with your actual Project ID

async function createIssue() {
  try {
    // Step 1: Create the issue using REST API
    const response = await octokit.rest.issues.create({
      owner: "bobmatnyc",
      repo: "code-review",
      title: "Fix architectural review prompt template loading error",
      body: `## Bug Description

When running an architectural review, the system fails to find the architectural review prompt template file, resulting in an error.

## Error Message

\`\`\`
Error loading prompt template for architectural (language: typescript): Error: ENOENT: no such file or directory, open '/Users/masa/prompts/architectural-review.md'
\`\`\`

## Attempted Paths

The system tried to find the file in the following locations:

\`\`\`
- /Users/masa/EWTN/ewtn-plus-api-gateway/prompts/typescript/architectural-review.md
- /Users/masa/Projects/prompts/typescript/architectural-review.md
- /Users/masa/prompts/typescript/architectural-review.md
- /Users/masa/EWTN/ewtn-plus-api-gateway/prompts/architectural-review.md
- /Users/masa/Projects/prompts/architectural-review.md
- /Users/masa/prompts/architectural-review.md
\`\`\`

## Expected Behavior

The system should be able to find the architectural review prompt template file in one of the expected locations or provide a clear error message with instructions on how to resolve the issue.

## Possible Solutions

1. Include the architectural review prompt template file in the package
2. Provide better error handling with clear instructions on how to resolve the issue
3. Add a fallback mechanism to use a default template if the custom one is not found
4. Update the documentation to explain how to set up custom prompt templates`,
      labels: ["bug", "prompt-templates", "architectural-review"]
    });

    console.log(`Created issue #${response.data.number}: ${response.data.html_url}`);

    // Step 2: Add the issue to Project 1 using GraphQL API
    // Get the node ID of the issue
    const issueId = response.data.node_id;

    // Add the issue to the project
    const addToProjectMutation = await octokit.graphql(`
      mutation {
        addProjectV2ItemById(input: {
          projectId: "${PROJECT_ID}"
          contentId: "${issueId}"
        }) {
          item {
            id
          }
        }
      }
    `);

    console.log(`Added issue to Project 1. Item ID: ${addToProjectMutation.addProjectV2ItemById.item.id}`);

    return response.data;
  } catch (error) {
    console.error("Error:", error.message);
    if (error.errors) {
      console.error("GraphQL Errors:", JSON.stringify(error.errors, null, 2));
    }
  }
}

// Function to get the Project ID if you don't know it
async function getProjectId() {
  try {
    const result = await octokit.graphql(`
      query {
        user(login: "bobmatnyc") {
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

// Uncomment this line to get the Project ID if you don't know it
// getProjectId();

// Run the function to create an issue and add it to the project
createIssue();
