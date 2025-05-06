const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function listFiles(directory, extension, callback) {
  const cmd = `find "${directory}" -name "*.${extension}" | sort`;
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      callback(error, null);
      return;
    }

// Set project root path for correct file references
const projectRoot = path.join(__dirname, '../..');

    
    const files = stdout.trim().split('\n').filter(Boolean);
    callback(null, files);
  });
}

// Test each project
const projects = [
  'typescript',
  'python',
  'php'
];

projects.forEach(project => {
  const projectDir = path.join('/Users/masa/Projects/ai-code-review/test-projects', project);
  
  console.log(`\n====== Testing ${project} project ======`);
  
  // Define relevant extensions for each project
  let extensions = [];
  if (project === 'typescript') {
    extensions = ['ts', 'tsx', 'js', 'jsx', 'json'];
  } else if (project === 'python') {
    extensions = ['py', 'json', 'md'];
  } else if (project === 'php') {
    extensions = ['php', 'json'];
  }
  
  // Check each extension
  extensions.forEach(ext => {
    listFiles(projectDir, ext, (err, files) => {
      if (err) {
        console.error(`Error listing ${ext} files:`, err);
        return;
      }
      
      console.log(`\nFound ${files.length} ${ext} files:`);
      files.forEach(file => {
        console.log(`  - ${path.relative(projectDir, file)}`);
      });
    });
  });
});
