/**
 * Manually add file list to the latest architectural review
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find latest architectural review file
function findLatestReview() {
  const files = glob.sync('./ai-code-review-docs/architectural-review-*.md');
  return files.sort().pop();
}

// Get the list of files in test-projects/typescript
function getFileList() {
  const files = glob.sync('./test-projects/typescript/**/*', { nodir: true });
  return files.map(file => path.relative('./test-projects', file));
}

// Add file list to review
function addFileList(reviewPath, files) {
  console.log(`Adding file list to ${reviewPath}`);
  
  // Read review file
  const review = fs.readFileSync(reviewPath, 'utf8');
  
  // Generate file list section
  const fileListSection = `
## Files Analyzed

The following ${files.length} files were included in this review:

${files.map(file => `- \`${file}\``).join('\n')}

`;

  // Find cost information section to insert before
  const costIndex = review.indexOf('## Cost Information');
  
  if (costIndex === -1) {
    // If no cost section, append to end
    const newReview = review + fileListSection;
    fs.writeFileSync(reviewPath, newReview);
  } else {
    // Insert before cost section
    const newReview = 
      review.substring(0, costIndex) + 
      fileListSection + 
      review.substring(costIndex);
    fs.writeFileSync(reviewPath, newReview);
  }
  
  console.log('File list added successfully!');
}

// Main function
function main() {
  const reviewPath = findLatestReview();
  if (!reviewPath) {
    console.error('No review file found!');
    return;
  }
  
  const files = getFileList();
  addFileList(reviewPath, files);
}

main();