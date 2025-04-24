 # Prompts Directory

 This directory contains the Markdown templates used to generate AI-driven code review prompts.

 ## Structure
 - `prompts/` (root): language-agnostic prompt templates.
 - `prompts/<language>/`: language-specific overrides. If a template file exists here, it will be used instead of the root version.
 
 Supported languages:
 - `typescript`
 - `python`
 - `php`
 - `ruby`

 ## Frontmatter Schema
 Each prompt file begins with YAML frontmatter, delimited by `---`. Required fields:
 - `name`: string, prompt display name.
 - `description`: string, one-line summary.
 - `version`: string, prompt template version.
 - `author`: string, template author.
 - `lastModified`: string, ISO date when the prompt was last updated.
 - `reviewType`: string, e.g., `quick-fixes`, `security`, `architectural`.
 - `tags`: array of strings, categorization tags.

 Example:
 ```yaml
 ---
 name: Quick Fixes Review
 description: Fast review focusing on low-hanging improvements
 version: 1.0.0
 author: AI Code Review Tool
 lastModified: 2025-04-24
 reviewType: quick-fixes
 tags:
   - quick
   - fixes
   - improvements
 ---
 ```

 ## Placeholders
 Prompts may include placeholders that are replaced at runtime:
 - `{{LANGUAGE_INSTRUCTIONS}}`: language-specific guidance.
 - `{{SPECIALIZATION}}`: area of expertise.
 - `{{CONTEXT}}`: contextual description.
 - `{{CHECKLIST}}`: evaluation checklist items.
 - `{{OUTPUT_FORMAT}}`: required output formatting.
 - `{{SCHEMA_INSTRUCTIONS}}`: instructions for interactive mode (if any).

 ## Fallback Rules
 When loading a prompt:
 1. If `prompts/<language>/<prompt-file>.md` exists, use that.
 2. Otherwise, fall back to `prompts/<prompt-file>.md`.

 ## Adding a New Prompt or Language
 1. Create a new Markdown file in `prompts/` with the required frontmatter.
 2. To override for a specific language, copy the file into `prompts/<language>/`.
 3. Update `version` and `lastModified` when making changes.
 4. Ensure `tags` are maintained as a YAML list.

 ## Validation
 Run `npm run validate:prompts` to check frontmatter consistency.