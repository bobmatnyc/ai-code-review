/**
 * Type definitions for review context.
 */

declare module '../analysis/context' {
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

  export interface CodeElement {
    type: CodeElementType;
    name: string;
    file: string;
    signature?: string;
    importance: number;
  }

  export interface ReviewFinding {
    type: string;
    description: string;
    file?: string;
    severity: number;
    passNumber: number;
  }

  export interface FileSummary {
    path: string;
    type: string;
    description: string;
    keyElements: string[];
    passNumber: number;
  }

  export class ReviewContext {
    constructor(
      projectName: string,
      reviewType: string,
      files: import('../types/review').FileInfo[],
    );

    startPass(): number;
    getCurrentPass(): number;
    addCodeElement(element: CodeElement): void;
    getCodeElements(): CodeElement[];
    getCodeElementsByType(type: CodeElementType): CodeElement[];
    getCodeElementsInFile(filePath: string): CodeElement[];
    addFinding(finding: ReviewFinding): void;
    getFindings(): ReviewFinding[];
    addFileSummary(summary: FileSummary): void;
    getFileSummary(filePath: string): FileSummary | undefined;
    getAllFileSummaries(): FileSummary[];
    addGeneralNote(note: string): void;
    getGeneralNotes(): string[];
    generateNextPassContext(files: string[], maxContextLength?: number): string;
    toJSON(): Record<string, unknown>;
    static fromJSON(json: Record<string, unknown>): ReviewContext;
  }
}
