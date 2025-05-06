#!/usr/bin/env node
/**
 * NPM-based dependency security analyzer
 * Uses npm audit to check for vulnerabilities in Node.js projects
 */

const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Basic tech stack detection
async function detectTechStack(projectPath) {
  try {
    console.log(`Looking for package.json in ${projectPath}`);
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      await fs.access(packageJsonPath);
      console.log('✅ Found package.json!');
      
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      console.log('📦 Checking dependencies...');
      const depCount = Object.keys(packageJson.dependencies || {}).length;
      const devDepCount = Object.keys(packageJson.devDependencies || {}).length;
      console.log(`Found ${depCount} dependencies and ${devDepCount} dev dependencies`);
      
      return {
        name: packageJson.name,
        tech: 'Node.js',
        dependencies: packageJson.dependencies || {},
        devDependencies: packageJson.devDependencies || {}
      };
    } catch (err) {
      console.log('❌ No package.json found');
    }
    
    // Add other tech stack detections here if needed
    return null;
  } catch (error) {
    console.error(`Error detecting tech stack: ${error}`);
    return null;
  }
}

// Run npm audit
async function runNpmAudit(projectPath) {
  try {
    console.log(`Running npm audit in ${projectPath}...`);
    
    // Use --json format to get structured output
    const { stdout, stderr } = await execPromise('npm audit --json', {
      cwd: projectPath,
      // Set a reasonable timeout
      timeout: 60000
    });
    
    if (stderr && !stderr.includes('found 0 vulnerabilities')) {
      console.error(`Error running npm audit: ${stderr}`);
    }
    
    // Parse the JSON output
    const auditResult = JSON.parse(stdout);
    
    return auditResult;
  } catch (error) {
    if (error.stdout) {
      try {
        // Even if npm audit exits with non-zero code (because it found vulnerabilities),
        // we can still parse the output
        return JSON.parse(error.stdout);
      } catch (parseError) {
        console.error(`Error parsing npm audit output: ${parseError}`);
      }
    }
    
    console.error(`Error running npm audit: ${error.message}`);
    return {
      error: error.message,
      vulnerabilities: { total: 0 }
    };
  }
}

// Format vulnerabilities report
function formatVulnerabilityReport(auditResult) {
  // Handle error case
  if (auditResult.error) {
    return `## Dependency Security Analysis\n\n⚠️ Error running npm audit: ${auditResult.error}\n`;
  }
  
  try {
    let report = '## Dependency Security Analysis\n\n';
    
    // Get the metadata and vulnerability counts
    const metadata = auditResult.metadata || {};
    const vulnerabilities = auditResult.vulnerabilities || {};
    const totalVulns = metadata.vulnerabilities?.total || 0;
    
    // Add summary
    if (totalVulns === 0) {
      report += '✅ **No vulnerabilities found in dependencies!**\n\n';
      report += `Analyzed ${metadata.totalDependencies || 0} dependencies.\n\n`;
      return report;
    }
    
    // Add vulnerability summary
    report += `⚠️ **Found ${totalVulns} vulnerabilities in dependencies**\n\n`;
    report += '**Vulnerability Severity Breakdown**:\n';
    if (metadata.vulnerabilities?.critical > 0) report += `- 🔴 Critical: ${metadata.vulnerabilities.critical}\n`;
    if (metadata.vulnerabilities?.high > 0) report += `- 🟠 High: ${metadata.vulnerabilities.high}\n`;
    if (metadata.vulnerabilities?.moderate > 0) report += `- 🟡 Moderate: ${metadata.vulnerabilities.moderate}\n`;
    if (metadata.vulnerabilities?.low > 0) report += `- 🟢 Low: ${metadata.vulnerabilities.low}\n`;
    if (metadata.vulnerabilities?.info > 0) report += `- ℹ️ Info: ${metadata.vulnerabilities.info}\n`;
    report += '\n';
    
    // Add vulnerability details
    report += '### Vulnerable Dependencies\n\n';
    
    // Iterate through all vulnerabilities
    for (const [pkgName, vulnInfo] of Object.entries(vulnerabilities)) {
      if (!vulnInfo.via || vulnInfo.via.length === 0) continue;
      
      report += `#### ${pkgName} (${vulnInfo.version || 'unknown version'})\n\n`;
      
      // Get unique vulnerabilities
      const uniqueVulns = new Map();
      for (const vuln of vulnInfo.via) {
        // Skip if it's just a package reference
        if (typeof vuln === 'string') continue;
        
        // Use vulnerability ID as key to avoid duplicates
        uniqueVulns.set(vuln.url || vuln.title, vuln);
      }
      
      // Add each vulnerability
      for (const vuln of uniqueVulns.values()) {
        // Determine severity emoji
        let severityEmoji = '⚪';
        switch (vuln.severity) {
          case 'critical': severityEmoji = '🔴'; break;
          case 'high': severityEmoji = '🟠'; break;
          case 'moderate': severityEmoji = '🟡'; break;
          case 'low': severityEmoji = '🟢'; break;
          case 'info': severityEmoji = 'ℹ️'; break;
        }
        
        report += `${severityEmoji} **${vuln.severity?.toUpperCase() || 'UNKNOWN'}**: ${vuln.title}\n\n`;
        
        if (vuln.url) {
          report += `- Advisory: ${vuln.url}\n`;
        }
        
        if (vuln.range) {
          report += `- Vulnerable versions: ${vuln.range}\n`;
        }
        
        if (vulnInfo.fixAvailable) {
          if (vulnInfo.fixAvailable === true) {
            report += `- 🛠️ Fix available by updating\n`;
          } else if (vulnInfo.fixAvailable.name) {
            report += `- 🛠️ Fix available by updating to ${vulnInfo.fixAvailable.version}\n`;
          }
        }
        
        report += '\n';
      }
      
      report += '---\n\n';
    }
    
    // Add fix recommendations
    if (auditResult.metadata?.fixAvailable) {
      report += '### Recommended Fixes\n\n';
      report += 'Run the following command to fix these vulnerabilities:\n\n';
      report += '```bash\nnpm audit fix\n```\n\n';
      
      if (metadata.vulnerabilities?.critical > 0 || metadata.vulnerabilities?.high > 0) {
        report += 'For more severe vulnerabilities that may include breaking changes, consider:\n\n';
        report += '```bash\nnpm audit fix --force\n```\n\n';
        report += '⚠️ Note: Using `--force` may introduce breaking changes. Test thoroughly after updating.\n\n';
      }
    }
    
    return report;
  } catch (error) {
    console.error(`Error formatting vulnerability report: ${error.message}`);
    return `## Dependency Security Analysis\n\n⚠️ Error formatting vulnerability report: ${error.message}\n`;
  }
}

// Main function to analyze dependencies
async function analyzeDependencies(projectPath) {
  console.log('=========== NPM DEPENDENCY ANALYSIS STARTED ===========');
  console.log(`Project path: ${projectPath}`);
  
  // Check if path exists
  try {
    await fs.access(projectPath);
    console.log(`✅ Project directory exists: ${projectPath}`);
  } catch (err) {
    console.error(`❌ Project directory does not exist: ${projectPath}`);
    return `## Dependency Security Analysis\n\n❌ Error: Project directory does not exist: ${projectPath}\n`;
  }
  
  // Detect tech stack
  const stack = await detectTechStack(projectPath);
  console.log(`Detected stack: ${stack ? stack.tech : 'Unknown'}`);
  
  if (!stack) {
    return `## Dependency Security Analysis\n\n⚠️ No package.json found. Cannot analyze dependencies.\n`;
  }
  
  // Run npm audit
  const auditResult = await runNpmAudit(projectPath);
  
  // Format the report
  const report = formatVulnerabilityReport(auditResult);
  
  console.log('=========== NPM DEPENDENCY ANALYSIS COMPLETED ===========');
  
  return report;
}

// If the script is run directly
if (require.main === module) {
  // Get the project path from command line or use current directory
  const projectPath = process.argv[2] || process.cwd();
  
  analyzeDependencies(projectPath).then(report => {
    console.log('\nReport:\n');
    console.log(report);
    
    // Save the report to a file
    const reportPath = path.join(projectPath, 'dependency-analysis.md');
    fs.writeFile(reportPath, report)
      .then(() => console.log(`\nReport saved to ${reportPath}`))
      .catch(err => console.error(`Error saving report: ${err}`));
  });
}

// Export for module use
module.exports = { analyzeDependencies };