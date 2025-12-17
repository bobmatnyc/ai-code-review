# Documentation Standards (Developer Tools)

These standards describe a lightweight, practical documentation system for developer tools (CLI + services/daemons + optional plugins/extensions).

## Principles

1. **Single source of truth per topic**: one canonical doc for installation, one for troubleshooting, one for the API/tool surface, etc.
2. **Audience-first**: separate user guides from maintainer/reference material.
3. **Docs match reality**: examples must match the current CLI `--help`, config schema, and shipped artifacts.
4. **Minimize duplication**: prefer linking to deeper docs instead of copying large sections across files.
5. **Avoid local-only details**: no absolute paths, machine-specific instructions, or personal environment assumptions.
6. **Make docs navigable**: provide an index (`docs/README.md`) and keep it up to date.

## Doc taxonomy (recommended structure)

Use a small number of predictable buckets:

- `docs/README.md`: documentation index and navigation
- `docs/guides/`: user-facing “how to” guides (install, usage, troubleshooting)
- `docs/reference/`: stable reference (architecture, API/tool schemas, standards)
- `docs/developer/`: maintainer docs (contributing workflows, release process, operational notes)
- `docs/testing/`: test reports and validation evidence
- `docs/prd/` (or `docs/specs/`): product requirements / design notes
- `docs/_archive/`: historical or superseded docs (not maintained)

## Naming and organization

- Use **descriptive filenames**; avoid “misc.md”.
- Prefer **stable paths** so links don’t churn.
- If moving docs, update links in `README.md` and `docs/README.md`, and add an entry to `docs/_archive/` only when you intentionally keep historical material.

## Writing conventions

### Structure

- Start with **what this doc is for** and **who it’s for**.
- Put the “happy path” first (quick install/quick start), then detail.
- Use headings that scan: “Install”, “Configure”, “Run”, “Verify”, “Troubleshooting”.
- Keep command snippets short and runnable; provide platform variants only when needed.

### Examples

- Prefer copy/paste-friendly commands.
- Use fenced code blocks with a language hint (`bash`, `json`, `python`).
- Don’t rely on screenshots for critical steps (they go stale quickly). If used, they must be supplemental.
- Avoid absolute paths; use placeholders like `/path/to/project` or `$HOME`.

### Terminology

Pick one term for each concept and stick to it:

- “daemon” vs “server” vs “agent” (define once, reuse)
- “client” (the consuming tool) vs “service” (your runtime)
- “extension/plugin” (browser/plugin surface)

## CLI documentation (developer tool projects)

For each user-facing command, docs should answer:

- **When to use it** (intent)
- **What it changes** (files, config, network ports, background processes)
- **Examples** (most common 2–5)
- **How to verify success**
- **Where to look when it fails** (log paths + a diagnostic command)

If the CLI is the primary interface, treat CLI `--help` output as authoritative and keep docs aligned with it.

## Configuration documentation

Document:

- Default config location(s)
- The config schema (keys + types)
- Safe minimal examples
- How overrides work (CLI flags, env vars, merge rules)

Prefer describing behavior (“port_range controls auto-selection”) over restating code.

## API/tool surface documentation (MCP / RPC / SDK)

For any machine-consumed interface:

- List the **authoritative tool names/endpoints**
- Provide input schema or field tables
- Include “common recipes” examples
- Include a migration section if names/shapes change

Keep this doc updated whenever the API/tool surface changes; stale tool names are a common failure mode for AI-tool integrations.

## Troubleshooting documentation

A good troubleshooting guide:

- Starts with “Quick checks” (a single diagnostic command + status command)
- Groups by symptoms (“extension not connecting”, “no logs”, “port conflict”)
- Gives “what to try next” in the order that’s fastest to validate
- Lists log locations and what to attach to an issue

## Release documentation

Release docs should be maintainers-only and include:

- Prerequisites (tokens, tooling)
- One-command workflow
- Checklist for verification
- Rollback guidance

Keep a short quick-reference card alongside a fuller guide.

## Triage and lifecycle

### When to archive

Move a doc to `docs/_archive/` when it is intentionally kept for historical context but is no longer maintained.

Archived docs must:
- Be excluded from primary navigation (`docs/README.md` should not link to them as current)
- Include an “Archived” note at the top or be covered by an archive README

### When to delete

Delete docs that are:
- Duplicates of canonical docs
- Generated artifacts
- Personal notes that shouldn’t ship

Git history preserves the content if it’s ever needed again.

## Suggested improvements (optional)

- Add a lightweight link check in CI (internal + external links).
- Add a “docs review” checklist item for PRs that change CLI flags, config schema, or tool surfaces.
- Keep `docs/reference/API_OR_TOOLS.md` (or similar) as the place where “what can I call?” is always correct.

