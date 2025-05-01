#!/usr/bin/env node

// Simple script to test GitHub Projects integration

// Use ts-node to run TypeScript files directly
require('ts-node/register');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const {
  getGitHubProjectsConfig,
  getProjectInfo,
  getProjectItems,
  syncProjectMdToGitHub,
  syncGitHubToProjectMd
} = require('./src/utils/githubProjectsClient');

async function main() {
  try {
    console.log('Testing GitHub Projects integration...');

    // Get GitHub Projects configuration
    const config = getGitHubProjectsConfig();
    console.log('GitHub Projects configuration:', {
      token: config.token ? '***' : undefined,
      projectId: config.projectId,
      projectNumber: config.projectNumber,
      owner: config.owner
    });

    // Get project information
    console.log('\nGetting project information...');
    const projectInfo = await getProjectInfo(config);
    console.log('Project information:', {
      id: projectInfo.id,
      title: projectInfo.title,
      url: projectInfo.url,
      number: projectInfo.number
    });

    // Get project items
    console.log('\nGetting project items...');
    const items = await getProjectItems(config);
    console.log(`Found ${items.length} items:`);
    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.title} (${item.status || 'No status'})`);
    });

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing GitHub Projects integration:', error);
    process.exit(1);
  }
}

main();
