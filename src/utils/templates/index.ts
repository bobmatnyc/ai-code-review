/**
 * Templates Utility Index
 * 
 * Exports the template utility functions for use in the application.
 */

export * from './templateLoader';
export * from './promptTemplateManager';

import templateLoader from './templateLoader';
import promptTemplateManager from './promptTemplateManager';

export default {
  ...templateLoader,
  ...promptTemplateManager
};