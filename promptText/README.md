# AI Code Review Prompt Management System

This directory contains a structured system for managing, maintaining, and sharing prompts used by the AI Code Review tool. The system uses a templating approach with Handlebars to provide flexible, reusable prompt components with variable substitution.

## Directory Structure

```
promptText/
├── common/                     # Shared prompt components
│   ├── css-frameworks/         # CSS framework components
│   ├── output-formats/         # Standardized output format templates
│   └── variables/              # JSON data for template variables
│       ├── css-frameworks.json # CSS framework version and feature data
│       └── framework-versions.json # Framework version and feature data
├── frameworks/                 # Framework-specific prompt templates
│   ├── react/                  # React-specific prompts
│   ├── angular/                # Angular-specific prompts
│   ├── vue/                    # Vue-specific prompts
│   ├── nextjs/                 # Next.js-specific prompts
│   ├── django/                 # Django-specific prompts
│   ├── fastapi/                # FastAPI-specific prompts
│   ├── flask/                  # Flask-specific prompts
│   ├── pyramid/                # Pyramid-specific prompts
│   └── laravel/                # Laravel-specific prompts
└── languages/                  # Language-specific prompt templates
    ├── typescript/             # TypeScript-specific prompts
    ├── python/                 # Python-specific prompts
    ├── php/                    # PHP-specific prompts
    └── ruby/                   # Ruby-specific prompts
```

## Template System

The prompt system uses Handlebars templates (`.hbs` files) that support:

1. **Variable Substitution**: Insert dynamic values using `{{variableName}}` syntax
2. **Partials**: Include shared components with `{{> common/path/to/partial}}`
3. **Conditional Logic**: Use `{{#if condition}}...{{else}}...{{/if}}` for conditional content
4. **Loops and Iteration**: Process lists with `{{#each items}}...{{/each}}`
5. **Helpers**: Custom formatting functions like `{{#eq a b}}...{{/eq}}` for equality checks

## Usage

### Template Variables

Variables are loaded from JSON files in the `common/variables/` directory:

- `framework-versions.json`: Contains version information and features for each framework
- `css-frameworks.json`: Contains version information and features for CSS frameworks

To reference these variables in templates:

```handlebars
Latest Angular version is {{frameworks.angular.latest.version}} released in {{frameworks.angular.latest.releaseDate}}
```

### Partials/Components

Common template sections can be included with:

```handlebars
{{> common/css-frameworks/tailwind-section}}
```

### Creating New Templates

1. Create a new `.hbs` file in the appropriate directory
2. Use standard Handlebars syntax for variables and partials
3. Make sure to end your review template with the standard output format:

```handlebars
{{> common/output-formats/standard-review-format language="PYTHON" framework="DJANGO" 
   impactAreas="type safety, maintainability, or performance" 
   improvementFocus="adherence to Django best practices" 
   includeVersionCompatibility=true 
   versionsList="5.2, 4.2, or both"}}
```

## Compiling Templates

When the application runs, templates are loaded, compiled with appropriate variables, and made available to the bundledPrompts system. This happens at runtime, allowing for dynamic template updates without rebuilding the application.

## Maintenance

1. Update framework versions in the JSON files when new versions are released
2. Keep template styles consistent and focused on actionable recommendations
3. When adding new frameworks, follow the existing directory structure

## Migrating from Old System

This prompt management system replaces the old approach where prompts were defined directly in `src/prompts/bundledPrompts.ts` and duplicated across language directories in `/prompts`. This new approach is more maintainable, easier to update, and provides consistent formatting and versioning across all prompt types.