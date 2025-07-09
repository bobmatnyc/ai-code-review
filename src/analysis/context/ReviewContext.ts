/**
 * @fileoverview Review context for maintaining state between review passes.
 *
 * This module provides a class for maintaining context between multiple review passes.
 * It stores information about the review, including file metadata, important code elements,
 * and findings from previous passes.
 */

import type { FileInfo } from '../../types/review';

/**
 * Type of code element tracked in the context
 */
export enum CodeElementType {
  Function = 'function',
  Class = 'class',
  Interface = 'interface',
  Variable = 'variable',
  Import = 'import',
  ExportedItem = 'exported',
  Component = 'component',
  EntryPoint = 'entryPoint',
}

/**
 * A code element tracked in the context
 */
export interface CodeElement {
  /** Type of code element */
  type: CodeElementType;
  /** Name of the code element */
  name: string;
  /** File where the element is defined */
  file: string;
  /** Short description or signature of the element */
  signature?: string;
  /** Importance score (higher = more important) */
  importance: number;
}

/**
 * A review finding from a previous pass
 */
export interface ReviewFinding {
  /** Type of finding (e.g., 'bug', 'security', 'performance') */
  type: string;
  /** Short description of the finding */
  description: string;
  /** File where the finding was located */
  file?: string;
  /** Severity of the finding (higher = more severe) */
  severity: number;
  /** Pass number where this finding was identified */
  passNumber: number;
}

/**
 * Summary of a file from previous review passes
 */
export interface FileSummary {
  /** Path to the file */
  path: string;
  /** File type or extension */
  type: string;
  /** Short description of the file purpose */
  description: string;
  /** Key elements in this file (e.g., classes, functions) */
  keyElements: string[];
  /** Pass number when this summary was created */
  passNumber: number;
}

/**
 * Context for multi-pass reviews
 */
export class ReviewContext {
  /** Project name */
  private projectName: string;
  /** Review type */
  private reviewType: string;
  /** All files involved in the review */
  private allFiles: string[];
  /** Current pass number */
  private currentPass: number;
  /** Important code elements tracked across passes */
  private codeElements: Map<string, CodeElement>;
  /** Findings from previous passes */
  private findings: ReviewFinding[];
  /** File summaries from previous passes */
  private fileSummaries: Map<string, FileSummary>;
  /** General notes about the codebase */
  private generalNotes: string[];
  /** Timestamp when context was created */
  private createdAt: Date;
  /** Timestamp of last update */
  private updatedAt: Date;

  /**
   * Create a new review context
   * @param projectName Name of the project
   * @param reviewType Type of review
   * @param files Files involved in the review
   */
  constructor(projectName: string, reviewType: string, files: FileInfo[]) {
    this.projectName = projectName;
    this.reviewType = reviewType;
    this.allFiles = files.map((f) => f.path);
    this.currentPass = 0;
    this.codeElements = new Map();
    this.findings = [];
    this.fileSummaries = new Map();
    this.generalNotes = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Start a new review pass
   * @returns Updated pass number
   */
  public startPass(): number {
    this.currentPass++;
    this.updatedAt = new Date();
    return this.currentPass;
  }

  /**
   * Get the current pass number
   * @returns Current pass number
   */
  public getCurrentPass(): number {
    return this.currentPass;
  }

  /**
   * Add a code element to the context
   * @param element Code element to add
   */
  public addCodeElement(element: CodeElement): void {
    const key = `${element.type}:${element.file}:${element.name}`;
    this.codeElements.set(key, element);
    this.updatedAt = new Date();
  }

  /**
   * Get all tracked code elements
   * @returns Array of code elements
   */
  public getCodeElements(): CodeElement[] {
    return Array.from(this.codeElements.values());
  }

  /**
   * Get code elements of a specific type
   * @param type Type of code elements to get
   * @returns Array of code elements of the specified type
   */
  public getCodeElementsByType(type: CodeElementType): CodeElement[] {
    return this.getCodeElements().filter((el) => el.type === type);
  }

  /**
   * Get code elements in a specific file
   * @param filePath Path of the file
   * @returns Array of code elements in the file
   */
  public getCodeElementsInFile(filePath: string): CodeElement[] {
    return this.getCodeElements().filter((el) => el.file === filePath);
  }

  /**
   * Add a review finding
   * @param finding Review finding to add
   */
  public addFinding(finding: ReviewFinding): void {
    this.findings.push({
      ...finding,
      passNumber: this.currentPass,
    });
    this.updatedAt = new Date();
  }

  /**
   * Get all findings
   * @returns Array of all findings
   */
  public getFindings(): ReviewFinding[] {
    return [...this.findings];
  }

  /**
   * Add or update a file summary
   * @param summary File summary to add
   */
  public addFileSummary(summary: FileSummary): void {
    this.fileSummaries.set(summary.path, {
      ...summary,
      passNumber: this.currentPass,
    });
    this.updatedAt = new Date();
  }

  /**
   * Get summary for a specific file
   * @param filePath Path of the file
   * @returns File summary or undefined if not found
   */
  public getFileSummary(filePath: string): FileSummary | undefined {
    return this.fileSummaries.get(filePath);
  }

  /**
   * Get summaries for all files
   * @returns Array of file summaries
   */
  public getAllFileSummaries(): FileSummary[] {
    return Array.from(this.fileSummaries.values());
  }

  /**
   * Add a general note about the codebase
   * @param note Note to add
   */
  public addGeneralNote(note: string): void {
    this.generalNotes.push(note);
    this.updatedAt = new Date();
  }

  /**
   * Get all general notes
   * @returns Array of general notes
   */
  public getGeneralNotes(): string[] {
    return [...this.generalNotes];
  }

  /**
   * Generate a contextual prompt for the next pass
   * @param files Files to include in the next pass
   * @param maxContextLength Maximum length of context in characters
   * @returns Formatted context string for inclusion in the next prompt
   */
  public generateNextPassContext(files: string[], maxContextLength = 2000): string {
    let context = `
### Review Context (Pass ${this.currentPass})

Project: ${this.projectName}
Review Type: ${this.reviewType}
Files in this pass: ${files.length} / ${this.allFiles.length}

`;

    // Add important findings from previous passes
    const importantFindings = this.findings.sort((a, b) => b.severity - a.severity).slice(0, 5);

    if (importantFindings.length > 0) {
      context += '#### Key Findings from Previous Passes\n\n';
      importantFindings.forEach((finding) => {
        context += `- [${finding.type.toUpperCase()}] ${finding.description}${finding.file ? ` (in ${finding.file})` : ''}\n`;
      });
      context += '\n';
    }

    // Add summaries of files that are related but not in this pass
    const relatedFiles = this.getAllFileSummaries()
      .filter((summary) => !files.includes(summary.path))
      .slice(0, 5);

    if (relatedFiles.length > 0) {
      context += '#### Related Files (Not in This Pass)\n\n';
      relatedFiles.forEach((file) => {
        context += `- ${file.path}: ${file.description}\n`;
        if (file.keyElements.length > 0) {
          context += `  Key elements: ${file.keyElements.join(', ')}\n`;
        }
      });
      context += '\n';
    }

    // Add important code elements relevant to this pass
    const relevantElements = this.getCodeElements()
      .filter((el) => files.includes(el.file) || el.importance > 7)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10);

    if (relevantElements.length > 0) {
      context += '#### Important Code Elements\n\n';
      relevantElements.forEach((element) => {
        context += `- ${element.type} \`${element.name}\`${element.signature ? `: ${element.signature}` : ''} (in ${element.file})\n`;
      });
      context += '\n';
    }

    // Add general notes
    if (this.generalNotes.length > 0) {
      context += '#### General Notes\n\n';
      this.generalNotes.slice(0, 3).forEach((note) => {
        context += `- ${note}\n`;
      });
      context += '\n';
    }

    // Truncate if too long
    if (context.length > maxContextLength) {
      context = `${context.substring(0, maxContextLength - 3)}...`;
    }

    return context;
  }

  /**
   * Serialize the context to JSON
   * @returns JSON representation of the context
   */
  public toJSON(): object {
    return {
      projectName: this.projectName,
      reviewType: this.reviewType,
      currentPass: this.currentPass,
      codeElements: Array.from(this.codeElements.values()),
      findings: this.findings,
      fileSummaries: Array.from(this.fileSummaries.values()),
      generalNotes: this.generalNotes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create a review context from JSON
   * @param json JSON object
   * @returns New ReviewContext instance
   */
  public static fromJSON(json: Record<string, unknown>): ReviewContext {
    const context = new ReviewContext(
      json.projectName as string,
      json.reviewType as string,
      (json.allFiles as any[]) || [],
    );

    context.currentPass = (json.currentPass as number) || 0;

    // Restore code elements
    if (Array.isArray(json.codeElements)) {
      json.codeElements.forEach((element: CodeElement) => {
        context.addCodeElement(element);
      });
    }

    // Restore findings
    if (Array.isArray(json.findings)) {
      context.findings = json.findings;
    }

    // Restore file summaries
    if (Array.isArray(json.fileSummaries)) {
      json.fileSummaries.forEach((summary: FileSummary) => {
        context.fileSummaries.set(summary.path, summary);
      });
    }

    // Restore general notes
    if (Array.isArray(json.generalNotes)) {
      context.generalNotes = json.generalNotes;
    }

    // Restore timestamps
    if (json.createdAt) {
      context.createdAt = new Date(json.createdAt as string);
    }

    if (json.updatedAt) {
      context.updatedAt = new Date(json.updatedAt as string);
    }

    return context;
  }
}
