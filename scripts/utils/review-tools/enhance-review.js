#!/usr/bin/env node

/**
 * Script to enhance architectural reviews with file lists and package security information
 * 
 * Usage: node enhance-review.js <review-file-path>
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { exec } = require('child_process');

// Get the review file path from command line arguments
const reviewPath = process.argv[2];

if (!reviewPath) {
  console.error('Please provide a path to a review file');
  process.exit(1);
}

// Verify the review file exists
if (!fs.existsSync(reviewPath)) {
  console.error(`Review file not found: ${reviewPath}`);
  process.exit(1);
}

// Check if this is an architectural review
function isArchitecturalReview(filePath) {
  // Check the filename and content
  const filename = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  return filename.includes('architectural-review') || 
         content.includes('Review Type**: architectural');
}

// Parse the target directory from the review file
function extractTargetFromReview(reviewContent) {
  const targetMatch = reviewContent.match(/# Code Review: (.+)/);
  if (targetMatch && targetMatch[1]) {
    const target = targetMatch[1].replace(' (Current Directory)', '');
    return target;
  }
  return null;
}

// Add file list to the review
function addFileList(reviewPath, targetDir) {
  console.log(`Adding file list to ${reviewPath}`);
  console.log(`Target directory: ${targetDir}`);
  
  // Read review file
  const review = fs.readFileSync(reviewPath, 'utf8');
  
  // Check if file list is already present
  if (review.includes('## Files Analyzed')) {
    console.log('File list already present, skipping');
    return review;
  }
  
  // Extract target directory
  const targetFromReview = extractTargetFromReview(review);
  const targetDirectory = targetFromReview || targetDir;
  
  console.log(`Using target directory: ${targetDirectory}`);
  
  // Ensure target directory exists
  if (!targetDirectory || !fs.existsSync(targetDirectory)) {
    console.error(`Target directory not found: ${targetDirectory}`);
    process.exit(1);
  }
  
  // Get files in target directory
  const files = getFilesInDirectory(targetDirectory);
  console.log(`Found ${files.length} files in target directory`);
  
  // Generate file list section
  const fileListSection = `
## Files Analyzed

The following ${files.length} files were included in this review:

${files.map(file => `- \`${file}\``).join('\n')}
`;

  // Find the position to insert (before cost information section)
  const costSectionMatch = review.match(/^## Cost Information/m);
  
  let updatedReview;
  if (costSectionMatch && costSectionMatch.index) {
    // Insert before cost information
    const position = costSectionMatch.index;
    console.log('Inserting file list before Cost Information section');
    updatedReview = 
      review.substring(0, position) +
      fileListSection +
      review.substring(position);
  } else {
    // If cost section not found, append at the end but before the footnote
    const footnoteMatch = review.match(/\*Generated by Code Review Tool using .+\*$/);
    if (footnoteMatch && footnoteMatch.index) {
      const position = footnoteMatch.index;
      console.log('Appending file list before footnote');
      updatedReview = 
        review.substring(0, position) +
        fileListSection + '\n' +
        review.substring(position);
    } else {
      // If footnote not found, just append at the end
      console.log('Appending file list to end');
      updatedReview = review + fileListSection;
    }
  }
  
  return updatedReview;
}

// Helper function to get files in a directory recursively
function getFilesInDirectory(directory) {
  const ignorePatterns = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/coverage/**',
    '**/.git/**',
    '**/ai-code-review-docs/**'
  ];
  
  // Get all files recursively
  const files = glob.sync('**/*', {
    cwd: directory,
    ignore: ignorePatterns,
    nodir: true
  });
  
  return files;
}

// Add package security information
function addPackageSecurity(reviewPath, targetDir) {
  return new Promise((resolve, reject) => {
    console.log('Adding package security information...');
    
    // Check if SERPAPI_KEY is set
    if (!process.env.SERPAPI_KEY) {
      console.warn('SERPAPI_KEY not set in environment. Loading from .env.local file if available...');
      
      // Try to load SERPAPI_KEY from .env.local file
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const match = envContent.match(/SERPAPI_KEY=(.+)/);
          if (match && match[1]) {
            process.env.SERPAPI_KEY = match[1].trim();
            console.log('SERPAPI_KEY loaded from .env.local file');
          }
        }
      } catch (error) {
        console.warn('Error loading SERPAPI_KEY from .env.local:', error);
      }
    }
    
    // Use ts-node to execute the package security analyzer
    const command = `npx ts-node -e "import { createDependencySecuritySection } from './src/utils/dependencies/packageSecurityAnalyzer'; createDependencySecuritySection('${targetDir}').then(result => console.log(result)).catch(err => console.error(err))"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing package security analyzer:', error);
        return reject(error);
      }
      
      if (stderr) {
        console.warn('Security analyzer warnings:', stderr);
      }
      
      // Read the review file
      const review = fs.readFileSync(reviewPath, 'utf8');
      
      // Check if package security section already exists
      if (review.includes('## Package Security Analysis')) {
        console.log('Package security section already present, skipping');
        return resolve(review);
      }
      
      // Add package security section
      const securitySection = stdout.trim();
      console.log(`Generated security section (${securitySection.length} characters)`);
      
      // Find position to add security section (after review content but before cost info)
      const costSectionMatch = review.match(/^## Cost Information/m);
      let updatedReview;
      
      if (costSectionMatch && costSectionMatch.index) {
        // Insert before cost information
        const position = costSectionMatch.index;
        console.log('Inserting security section before Cost Information section');
        updatedReview = 
          review.substring(0, position) +
          securitySection + '\n\n' +
          review.substring(position);
      } else {
        // If cost section not found, append at the end but before the footnote
        const footnoteMatch = review.match(/\*Generated by Code Review Tool using .+\*$/);
        if (footnoteMatch && footnoteMatch.index) {
          const position = footnoteMatch.index;
          console.log('Appending security section before footnote');
          updatedReview = 
            review.substring(0, position) +
            securitySection + '\n\n' +
            review.substring(position);
        } else {
          // If footnote not found, just append at the end
          console.log('Appending security section to end');
          updatedReview = review + '\n\n' + securitySection;
        }
      }
      
      resolve(updatedReview);
    });
  });
}

// Main execution
async function enhanceReview() {
  try {
    // Only process architectural reviews
    if (!isArchitecturalReview(reviewPath)) {
      console.log(`Skipping non-architectural review: ${reviewPath}`);
      process.exit(0);
    }
    
    // Get the target directory - try to parse from review file first
    const reviewContent = fs.readFileSync(reviewPath, 'utf8');
    const targetDir = extractTargetFromReview(reviewContent);
    
    // If we couldn't extract the target, use the current working directory
    const effectiveTargetDir = targetDir || process.cwd();
    
    // Add file list to the review
    let updatedReview = addFileList(reviewPath, effectiveTargetDir);
    
    // Add package security information
    updatedReview = await addPackageSecurity(reviewPath, effectiveTargetDir);
    
    // Write the updated review back to the file
    fs.writeFileSync(reviewPath, updatedReview);
    console.log(`✅ Enhanced review saved to: ${reviewPath}`);
  } catch (error) {
    console.error('Error enhancing review:', error);
    process.exit(1);
  }
}

enhanceReview().catch(console.error);