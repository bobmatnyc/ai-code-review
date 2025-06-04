/**
 * @fileoverview Tests for the ReviewContext
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { ReviewContext, CodeElementType } from '../../analysis/context';

describe('ReviewContext', () => {
  let context: ReviewContext;
  
  // Create some test file data
  const testFiles = [
    {
      path: '/test/file1.ts',
      relativePath: 'file1.ts',
      content: 'const hello = "world";\nexport default hello;'
    },
    {
      path: '/test/file2.ts',
      relativePath: 'file2.ts',
      content: 'import hello from "./file1";\nconsole.log(hello);'
    }
  ];

  beforeEach(() => {
    context = new ReviewContext('test-project', 'quick-fixes', testFiles);
  });

  it('should initialize with correct values', () => {
    expect(context.getCurrentPass()).toBe(0);
  });

  it('should increment pass number correctly', () => {
    expect(context.getCurrentPass()).toBe(0);
    context.startPass();
    expect(context.getCurrentPass()).toBe(1);
    context.startPass();
    expect(context.getCurrentPass()).toBe(2);
  });

  it('should add and retrieve code elements', () => {
    const element = {
      type: CodeElementType.Function,
      name: 'testFunction',
      file: '/test/file1.ts',
      importance: 8
    };
    
    context.addCodeElement(element);
    
    const elements = context.getCodeElements();
    expect(elements).toHaveLength(1);
    expect(elements[0]).toEqual(element);
  });

  it('should add and retrieve findings', () => {
    const finding = {
      type: 'bug',
      description: 'Test bug',
      file: '/test/file1.ts',
      severity: 8,
      passNumber: 1
    };
    
    context.startPass(); // Start pass 1
    context.addFinding({
      type: finding.type,
      description: finding.description,
      file: finding.file,
      severity: finding.severity,
      passNumber: 0 // This will be overridden
    });
    
    const findings = context.getFindings();
    expect(findings).toHaveLength(1);
    expect(findings[0].passNumber).toBe(1); // Should be set to current pass
  });

  it('should add and retrieve file summaries', () => {
    const summary = {
      path: '/test/file1.ts',
      type: 'typescript',
      description: 'A test file',
      keyElements: ['hello'],
      passNumber: 1
    };
    
    context.startPass(); // Start pass 1
    context.addFileSummary({
      path: summary.path,
      type: summary.type,
      description: summary.description,
      keyElements: summary.keyElements,
      passNumber: 0 // This will be overridden
    });
    
    const retrievedSummary = context.getFileSummary('/test/file1.ts');
    expect(retrievedSummary).toBeDefined();
    expect(retrievedSummary?.passNumber).toBe(1); // Should be set to current pass
  });

  it('should add and retrieve general notes', () => {
    const note = 'This is a test note';
    
    context.addGeneralNote(note);
    
    const notes = context.getGeneralNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0]).toBe(note);
  });

  it('should generate context for the next pass', () => {
    context.startPass(); // Start pass 1
    
    // Add findings
    context.addFinding({
      type: 'bug',
      description: 'Test bug',
      file: '/test/file1.ts',
      severity: 9,
      passNumber: 1
    });
    
    // Add file summaries
    context.addFileSummary({
      path: '/test/file1.ts',
      type: 'typescript',
      description: 'A test file',
      keyElements: ['hello'],
      passNumber: 1
    });
    
    // Add code elements
    context.addCodeElement({
      type: CodeElementType.Function,
      name: 'testFunction',
      file: '/test/file1.ts',
      importance: 8
    });
    
    // Add general notes
    context.addGeneralNote('This is a test note');
    
    const nextPassContext = context.generateNextPassContext(['/test/file2.ts']);
    
    expect(nextPassContext).toContain('Review Context (Pass 1)');
    expect(nextPassContext).toContain('Test bug');
    expect(nextPassContext).toContain('/test/file1.ts');
    expect(nextPassContext).toContain('This is a test note');
  });

  it('should serialize and deserialize correctly', () => {
    context.startPass(); // Start pass 1
    
    // Add some data
    context.addFinding({
      type: 'bug',
      description: 'Test bug',
      file: '/test/file1.ts',
      severity: 9,
      passNumber: 1
    });
    
    context.addCodeElement({
      type: CodeElementType.Function,
      name: 'testFunction',
      file: '/test/file1.ts',
      importance: 8
    });
    
    // Serialize to JSON
    const json = context.toJSON();
    
    // Deserialize from JSON
    const deserializedContext = ReviewContext.fromJSON(json);
    
    // Verify that the deserialized context has the same data
    expect(deserializedContext.getCurrentPass()).toBe(context.getCurrentPass());
    expect(deserializedContext.getFindings()).toHaveLength(context.getFindings().length);
    expect(deserializedContext.getCodeElements()).toHaveLength(context.getCodeElements().length);
  });
});