# Prompt Migration Plan

This document outlines the plan for migrating prompts from the old `prompts/` directory structure to the new `promptText/` Handlebars-based templating system.

## Migration Goals

1. Ensure all existing prompt content is preserved in the new system
2. Take advantage of the new templating features (variables, partials, etc.)
3. Remove duplication across language-specific prompts
4. Maintain backward compatibility during the transition
5. Eventually remove the old prompts directory once migration is complete

## Migration Steps

### Phase 1: Initial Setup (Completed)

- ✅ Create new `promptText/` directory structure
- ✅ Implement Handlebars templating system
- ✅ Create templates for common sections
- ✅ Add framework version and CSS framework data
- ✅ Set up template loading utilities
- ✅ Update bundledPrompts.ts to use the new system with fallback

### Phase 2: Content Migration (In Progress)

1. Convert each review type template for each language/framework:
   - Extract content from bundledPrompts.ts and/or prompts/ directory
   - Create corresponding .hbs template in the new structure
   - Add template variables and partials where appropriate
   - Ensure identical output when compiled

2. Priority order:
   - Best practices review templates (high priority)
   - Architectural review templates
   - Security review templates
   - Performance review templates
   - Quick fixes review templates
   - Unused code review templates
   - Specialized review templates

### Phase 3: Validation and Testing

1. Create unit tests for template compilation
2. Test each template with sample data
3. Verify identical output between old and new systems
4. Test fallback mechanism for missing templates

### Phase 4: Transition (Future)

1. Update documentation to reference new template system
2. Mark old prompts directory as deprecated
3. Add warning logs when using old prompts
4. Create plan for eventual removal of old prompts

### Phase 5: Cleanup (Future)

1. Remove the old prompts directory
2. Update imports and references
3. Remove fallback code from bundledPrompts.ts
4. Finalize documentation

## Migration Progress Tracking

| Category | Languages | Frameworks | Status |
|----------|-----------|------------|--------|
| Best Practices | TypeScript | React | ✅ Completed |
| Best Practices | TypeScript | Next.js | ✅ Completed |
| Best Practices | Python | FastAPI | ✅ Completed |
| Best Practices | Python | Flask | ✅ Completed |
| Best Practices | Python | Pyramid | ✅ Completed |
| Best Practices | TypeScript | Angular | ⚠️ In Progress |
| Best Practices | TypeScript | Vue | ⚠️ In Progress |
| Best Practices | Python | Django | ⚠️ In Progress |
| Best Practices | PHP | Laravel | ⚠️ In Progress |
| Architectural | TypeScript | | ❌ Not Started |
| Security | TypeScript | | ❌ Not Started |
| Performance | TypeScript | | ❌ Not Started |
| Quick Fixes | TypeScript | | ❌ Not Started |
| Unused Code | TypeScript | | ❌ Not Started |

## Notes on Backward Compatibility

- The `getBundledPrompt` function in bundledPrompts.ts has been updated to support both systems
- It checks for template availability at runtime and falls back to bundled prompts if needed
- This ensures a smooth transition without breaking existing functionality
- During the transition period, both systems will coexist

## Benefits of the New System

- **Modularity**: Common sections are defined once and reused across templates
- **Maintainability**: Framework version data and features are centralized in JSON files
- **Flexibility**: Templates can be updated without TypeScript compilation
- **Readability**: Templates are stored in clean, organized files instead of string literals
- **Extensibility**: New languages and frameworks can be added more easily