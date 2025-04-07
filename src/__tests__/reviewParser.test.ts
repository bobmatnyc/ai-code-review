/**
 * @fileoverview Tests for the reviewParser module.
 *
 * This module contains tests for the reviewParser functions, including
 * JSON parsing, validation, and formatting.
 */

import { parseReviewJson, extractReviewContent, formatIssueForDisplay } from '../utils/parsing/reviewParser';
import { IssuePriority } from '../types/reviewSchema';

describe('parseReviewJson', () => {
  it('should parse valid JSON wrapped in backticks', () => {
    const jsonString = '```json\n{"review": {"version": "1.0", "timestamp": "2024-04-06T12:00:00Z", "files": [], "summary": {"highPriorityIssues": 0, "mediumPriorityIssues": 0, "lowPriorityIssues": 0, "totalIssues": 0}}}\n```';
    const result = parseReviewJson(jsonString);
    expect(result).not.toBeNull();
    expect(result?.review).toBeDefined();
    expect(result?.review.files).toEqual([]);
  });

  it('should parse valid JSON without backticks', () => {
    const jsonString = '{"review": {"version": "1.0", "timestamp": "2024-04-06T12:00:00Z", "files": [], "summary": {"highPriorityIssues": 0, "mediumPriorityIssues": 0, "lowPriorityIssues": 0, "totalIssues": 0}}}';
    const result = parseReviewJson(jsonString);
    expect(result).not.toBeNull();
    expect(result?.review).toBeDefined();
    expect(result?.review.files).toEqual([]);
  });

  it('should return null for invalid JSON', () => {
    const jsonString = '```json\n{"files": [,]}\n```';
    expect(parseReviewJson(jsonString)).toBeNull();
  });

  it('should return null for JSON without review property', () => {
    const jsonString = '```json\n{"files": []}\n```';
    expect(parseReviewJson(jsonString)).toBeNull();
  });
});

describe('extractReviewContent', () => {
  it('should extract and format valid JSON', () => {
    const content = '```json\n{"review": {"version": "1.0", "timestamp": "2024-04-06T12:00:00Z", "files": [], "summary": {"highPriorityIssues": 0, "mediumPriorityIssues": 0, "lowPriorityIssues": 0, "totalIssues": 0}}}\n```';
    const result = extractReviewContent(content);
    expect(result).toContain('"review"');
    expect(result).toContain('"files"');
    expect(result).toContain('"summary"');
  });

  it('should return original content for non-JSON', () => {
    const content = 'This is not JSON';
    const result = extractReviewContent(content);
    expect(result).toBe(content);
  });
});

describe('formatIssueForDisplay', () => {
  it('should format a high priority issue correctly', () => {
    const issue = {
      id: 'ISSUE-1',
      priority: IssuePriority.HIGH,
      description: 'A high priority issue',
      filePath: 'src/example.ts',
      location: {
        startLine: 10,
        endLine: 15
      },
      currentCode: 'function example() {\n  // Problematic code\n}',
      suggestedCode: 'function example() {\n  // Fixed code\n}',
      explanation: 'This is why the code should be fixed'
    };

    const result = formatIssueForDisplay(issue, 0, 0);
    
    expect(result).toContain('Issue 1.1');
    expect(result).toContain('[HIGH]');
    expect(result).toContain('A high priority issue');
    expect(result).toContain('src/example.ts');
    expect(result).toContain('Lines 10-15');
    expect(result).toContain('function example()');
    expect(result).toContain('This is why the code should be fixed');
  });

  it('should format a medium priority issue correctly', () => {
    const issue = {
      id: 'ISSUE-2',
      priority: IssuePriority.MEDIUM,
      description: 'A medium priority issue',
      filePath: 'src/example.ts',
      location: {
        startLine: 20,
        endLine: 25
      },
      currentCode: 'function example2() {\n  // Problematic code\n}',
      suggestedCode: 'function example2() {\n  // Fixed code\n}',
      explanation: 'This is why the code should be fixed'
    };

    const result = formatIssueForDisplay(issue, 1, 0);
    
    expect(result).toContain('Issue 2.1');
    expect(result).toContain('[MEDIUM]');
    expect(result).toContain('A medium priority issue');
  });

  it('should format a low priority issue correctly', () => {
    const issue = {
      id: 'ISSUE-3',
      priority: IssuePriority.LOW,
      description: 'A low priority issue',
      filePath: 'src/example.ts',
      location: {
        startLine: 30,
        endLine: 35
      },
      currentCode: 'function example3() {\n  // Problematic code\n}',
      suggestedCode: 'function example3() {\n  // Fixed code\n}',
      explanation: 'This is why the code should be fixed'
    };

    const result = formatIssueForDisplay(issue, 2, 0);
    
    expect(result).toContain('Issue 3.1');
    expect(result).toContain('[LOW]');
    expect(result).toContain('A low priority issue');
  });
});
