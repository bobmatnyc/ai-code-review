const { formatReviewOutput } = require('./dist/formatters/outputFormatter');
const { sanitizeContent } = require('./dist/utils/parsing/sanitizer');

// Create a mock review result with sample data
const sampleReview = {
  filePath: 'src/sample.ts',
  reviewType: 'quick-fixes',
  content: '## Issues\n\n- Sample issue 1\n- Sample issue 2',
  timestamp: new Date().toISOString(),
  cost: {
    inputTokens: 1200,
    outputTokens: 800,
    totalTokens: 2000,
    estimatedCost: 0.04,
    formattedCost: '$0.04 USD'
  },
  modelUsed: 'gemini:gemini-2.5-pro',
  toolVersion: '2.1.1',
  commandOptions: '--type quick-fixes --output markdown'
};

// Test content sanitization
console.log('===== CONTENT SANITIZATION =====');
console.log('Original content:');
console.log(sampleReview.content);
console.log('\nSanitized content:');
const sanitizedContent = sanitizeContent(sampleReview.content);
console.log(sanitizedContent);
console.log('\nContent string length (original vs sanitized):');
console.log(`Original: ${sampleReview.content.length}, Sanitized: ${sanitizedContent.length}`);
console.log('\nContent character codes for first 20 characters:');
console.log('Original:', [...sampleReview.content.substring(0, 20)].map(c => c.charCodeAt(0)));
console.log('Sanitized:', [...sanitizedContent.substring(0, 20)].map(c => c.charCodeAt(0)));

// Format as Markdown
console.log('\n\n===== MARKDOWN FORMAT =====');
const markdownOutput = formatReviewOutput(sampleReview, 'markdown');
console.log(markdownOutput);

// Format as JSON
console.log('\n\n===== JSON FORMAT =====');
const jsonOutput = formatReviewOutput(sampleReview, 'json');
const jsonObj = JSON.parse(jsonOutput);
console.log(JSON.stringify(jsonObj, null, 2));

// Compare the fields to make sure we have metadata
console.log('\n\n===== FIELD VERIFICATION =====');
console.log('Model:', sampleReview.modelUsed);
console.log('Tool Version:', sampleReview.toolVersion);
console.log('Command Options:', sampleReview.commandOptions);
console.log('Content included in output:', markdownOutput.includes(sampleReview.content));
console.log('Content included in output (sanitized):', markdownOutput.includes(sanitizedContent));