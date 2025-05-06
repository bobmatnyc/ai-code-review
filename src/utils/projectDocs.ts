/**
 * @fileoverview Re-export of project documentation utilities.
 *
 * This module re-exports project documentation utilities from the files module
 * to maintain backward compatibility. It also provides a compatibility layer
 * for the old readProjectDocs function signature.
 */

export * from './files/projectDocs';

// For backward compatibility with the old function signature
export function readProjectDocs(
  projectPath: string,
  contextFiles?: string
): Promise<import('./files/projectDocs').ProjectDocs> {
  if (contextFiles) {
    // Log warning about using deprecated parameter
    console.warn('Warning: contextFiles parameter is deprecated, using default file discovery instead');
  }
  return import('./files/projectDocs').then(mod => mod.readProjectDocs(projectPath));
}