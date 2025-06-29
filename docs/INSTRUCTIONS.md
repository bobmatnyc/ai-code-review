# 🔧 INSTRUCTIONS (GitHub-Centric Workflow)

Updated: 5-05-2025
Updated: 6-29-2025 - Corrected project structure and testing requirements

---

## 📌 1. Agent Protocol & Execution Flow

**Who this is for**: AI agents and human developers collaborating on production-grade code.

### ✅ Protocol Summary

1. **Validate assumptions** – ask clarifying questions before proceeding.
2. **Implement with simplicity** – prefer minimal, working code.
3. **Test and lint rigorously** – `pnpm run lint && pnpm run build:types && pnpm test`.
4. **Verify CI checks before closing tickets** – run full CI pipeline locally.
5. **Document intent** – not just behavior.
6. **Confirm before architectural shifts or abstractions.**

> You are expected to follow all rules by default. No mocks, hacks, or shortcuts unless explicitly approved.

---

## 🧠 2. Core Principles

* **Build real, test real** – avoid mocks unless directed.
* **Simplicity > Cleverness** – prefer straight-line solutions.
* **Validate all assumptions** – ask before introducing new paradigms.
* **Follow single-repo principles** – clean module organization, shared utilities.
* **Document clearly** – capture why, not just how.
* **No implicit fallbacks** – when configurations fail, fail gracefully with clear errors. Never automatically fall back to different services.

---

## 🛠️ 3. Stack-Specific Directives

### TypeScript

* Must use `strict: true` config (`tsconfig.json`).
* Avoid `any`. Prefer `unknown`, generics, or well-defined types.
* Use `Pick`, `Partial`, `Required`, etc. to reduce duplication.
* All functions and exports must use **JSDoc** with type annotations.

### Next.js (15+)

* Use the **App Router** (`src/app`) with layout grouping.
* Prefer **React Server Components** by default.
* Explicitly define rendering mode (SSG, ISR, SSR, RSC).
* API routes live in `src/app/api`; use `POST` methods with proper validation.

### React (19+)

* Use functional components only.
* State: prefer `useState` → `useReducer` → `useContext` → server state (React Query/Zustand).
* Embrace `use`, `useOptimistic`, `useTransition` where relevant.
* Never create unnecessary client boundaries (`'use client'` only where needed).

### Shadcn UI + Tailwind

* Use official Shadcn components; follow usage rules.
* Style with Tailwind + `@apply` in `components.css`.
* Support dark mode and responsive design out of the box.
* Avoid class-based components; always favor functional + declarative styles.

### Vercel Deployment

* Optimize imports: use `dynamic()` with `ssr: false` for heavy UI.
* Use `next/image`, lazy loading, and WebP formats.
* Use edge functions for global forms/data mutations.
* Set appropriate cache headers (`stale-while-revalidate` recommended).

---

## 📦 4. Monorepo Workflow

### Project Structure

```
/
├── apps/
│   ├── web/
│   └── admin/
├── packages/
│   ├── ui/
│   ├── utils/
│   └── config/
├── tools/
└── package.json
```

### Automation

* Use `npm` for package management, builds, tests, and CI.
* `npm run lint && npm run build:types && npm test` required before merge.
* Feature branches only. Use squash merges.
* Run full CI checks locally before pushing: `npm run ci:local`

---

## ✅ 5. Best Practices

* Use modern, community-validated standards.
* Prefer mature, well-supported libraries.
* Explain any deviations from best practices.
* Confirm before changing behavior, logic, or architecture.

---

## 🧪 6. Testing Standards

* All utilities and APIs must have unit tests.
* Use **Jest** (`npm test`).
* Minimum 80% coverage unless annotated with `@low-test-priority`.
* Avoid snapshots unless explicitly justified.
* Prefer real API interactions over mocks.
* Ensure all mocked modules match actual export signatures.

---

## ⚙️ 7. CI / DevOps

* Pre-commit hooks must run lint, type-check, and tests.
* Do not merge if any check fails.
* Verify CI status before closing any ticket.
* Secrets must go in `.env.local` – never hardcoded.
* All API clients must include comments: purpose, inputs, outputs.

### CI Pre-flight Checklist

Before pushing changes or closing tickets:

1. **Run full CI locally:**
   ```bash
   npm run lint
   npm run build:types
   npm test
   npm run build
   ```

2. **Fix all errors before pushing** – don't rely on CI to catch issues
3. **Verify package-lock.json** is up to date: `npm install`
4. **Check for unused imports** – remove them to avoid lint errors
5. **Verify module case sensitivity** – ensure all imports match actual filenames

---

## 📘 8. Documentation

* Document *intent* as well as behavior.
* Use JSDoc with full TypeScript annotations.
* Comment all API interactions clearly.

---

## 🔭 9. Code Quality & Workflow

* Run linting and type checks after every change.
* Build and verify tests before handing off code.
* Follow existing conventions and naming patterns.
* Fix all lint/type errors before pushing changes.

### Common Issues to Watch For

1. **Module Resolution:**
   - Use exact case for imports (e.g., `pathValidator.ts` not `PathValidator.ts`)
   - Export all utilities from their index files
   - Ensure mocked modules in tests match actual exports

2. **TypeScript Compilation:**
   - Remove unused imports immediately
   - Use proper types, avoid `any`
   - Ensure all files are included in `tsconfig.json`

3. **Package Management:**
   - Always run `npm install` after changing dependencies
   - Keep `package-lock.json` synchronized
   - Use npm (not pnpm) for all operations

### Fallback Behavior

1. **API Client Selection:**
   - Never implement automatic fallbacks between AI services
   - If the user's configured service is unavailable, fail with a clear error
   - List all available options in error messages
   - Fallback strategies must be explicitly configured by the user

2. **Configuration Failures:**
   - When required environment variables are missing, fail immediately
   - Provide specific guidance on which variables need to be set
   - Never assume a default service or configuration
   - Always respect user intent - if they configured Service A, never use Service B

3. **Error Messages:**
   - Include actionable steps to resolve configuration issues
   - List specific environment variables needed
   - Provide example values or formats where appropriate

---

## 📝 10. Design Documents

Design documents live in `doc/design/` and are required for all substantial features, architecture changes, or systems work. They provide a persistent source of truth for human and AI collaborators.

### 📌 Purpose

Design docs should:
- Capture **intent** and **trade-offs** before implementation.
- Guide decisions, discussions, and downstream work (testing, docs, API boundaries).
- Serve as onboarding material for new engineers or agents picking up the system.

### 📄 Structure

```md
# Feature Name or System Title

## Summary
What is this and why are we doing it?

## Problem
The pain point, friction, or opportunity this addresses.

## Goals & Non-goals
Explicit scope boundaries.

## Product Considerations
User needs, performance, accessibility, regulatory impacts.

## Technical Design
Architecture, key components, protocols, libraries, and rationale.

## Implementation Plan
Phased rollout or sequencing steps.

## Open Questions
Unresolved items or future revisits.

## References
Link related issues, PRs, or past work.
```

### 🔗 Workflow Expectations

- Each major issue in `PROJECT.md` **must reference a design doc** in `doc/design/` unless trivial.
- GitHub Issues proposing large features must either embed or link to the doc.
- Revisit/update the design doc post-launch with a closing summary.

---

## 🔁 11. Git Workflow & Version Control

... (TRUNCATED TO FIT CHARACTER LIMIT) ...

---

## 🔁 11. Git Workflow & Version Control

We treat Git as a tool for **narrating engineering decisions**—not just storing code. Use it intentionally to reflect clarity, atomicity, and collaboration.

### ✅ Commit Philosophy

- **Commit early, commit often**, but only once the change is coherent.
- Each commit should answer: *What changed, and why?*
- Prefer **small, purposeful commits** over monolithic ones.

### 🔤 Conventional Commit Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional-scope): short summary

[optional body]
[optional footer(s)]
```

**Examples:**
- `feat(auth): add OAuth login`
- `fix(api): correct rate limit handling`
- `chore(lint): update prettier config`

**Valid types**:  
`feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`

### 🌱 Branch Naming Convention

Branches should reflect purpose and follow a `type/slug` format:

```
feature/search-api
fix/token-refresh
chore/update-deps
```

### 🔄 Local Workflow

```bash
# Start from main
git checkout main
git pull origin main

# Create a new branch
git checkout -b feature/new-dashboard

# Make your changes
git add .
git commit -m "feat(dashboard): initial layout and state setup"

# Keep up to date
git fetch origin
git rebase origin/main

# Push and open PR
git push -u origin feature/new-dashboard
```

### 🔍 PR & Merge Rules

- Always **rebase** before opening PRs.
- **Run full CI checks locally** before pushing any changes.
- **Wait for all CI checks to pass** before requesting review.
- **Fix all CI failures immediately** – don't leave broken builds.
- **Squash-merge** in GitHub. Clean up the title to follow commit conventions.
- Only merge if CI passes and code is reviewed.

### ✅ Before Closing Issues

Never close an issue until:
1. All code changes are merged to main
2. CI checks are passing on main
3. Any documentation updates are complete
4. Tests have been added/updated as needed
5. The fix has been verified in the CI environment

### 🚫 Avoid

- Committing secrets, `.env`, build artifacts, or large binary files.
- Merge commits in feature branches (use rebase instead).
- Committing unresolved conflicts or commented-out code.

---

## 🧭 12. GitHub Issue Tracking

We use **GitHub Issues** for all tracked work—features, bugs, ideas, spikes.  
Submit via GitHub Issues REST API with `GITHUB_TOKEN`. No automation scripts.

Each issue answers: *What are we doing, why does it matter, and how will we know it’s done?*

### Issue Fields to Fill

- **Title** – human-readable and emoji-tagged (e.g. `🚀 Add login flow`)
- **Description** – context, proposed approach, and acceptance criteria
- **Labels** – use taxonomy below
- **Assignee** – assign only when actively in progress
- **Milestone** – for cycles/themes
- **References** – include links to **design docs** where applicable

### Label Taxonomy

| Category  | Prefix    | Examples                                 |
| --------- | --------- | ---------------------------------------- |
| Theme     | `theme:`  | `theme:infra`, `theme:ai`, `theme:ux`    |
| Status    | `status:` | `status:in-progress`, `status:blocked`   |
| Priority  | `prio:`   | `prio:high`, `prio:low`                  |
| Effort    | `size:`   | `size:xs`, `size:m`, `size:xl`           |
| Type      | `type:`   | `type:bug`, `type:feature`, `type:chore` |

---

## 📅 13. Milestones = Roadmap Buckets

Milestones replace a static `ROADMAP.md`. Use them to group issues by cycle or theme.

- Examples: `May 2025`, `LLM Infra`, `Billing Cleanup`
- Include: goal (1–2 lines), timeframe, and summary
- Optionally close with a wrap-up issue
- Design docs should be linked for each milestone initiative

---

## 📌 14. Decision Logs

Capture important design or architectural decisions as `type:decision` issues.

* Use titles like `📌 Decision: Move to Mastra`
* Include rationale and resolution in comments
* Reference relevant **design documents** if one informed the decision

---

## 🧾 15. How to Write Good Issues

* Start with **why**
* Use checklists if multiple deliverables
* Use code blocks and links to previous Issues/PRs
* Link relevant design docs from `doc/design/`

---

## 🚀 16. Proposing New Work

Anyone can open an Issue. Use this template:

```md
### Summary
What’s the idea or problem?

### Why it matters
Why now? What impact does it have?

### Proposal (if known)
How might we tackle this? Link to any relevant design doc in `doc/design/`.

### Success Criteria
What does “done” look like?
```

Apply appropriate `type:` and `theme:` labels.

---

## 🔁 17. Replaces These Docs

* `ROADMAP.md` → use Milestones
* `PROGRESS.md` → use Labels + Issues
* Task trackers (Notion, Google Docs) → link Issues and **Design Docs**

---

## 🚀 Quick Reference: CI Commands

Run these commands before pushing any changes:

```bash
# Full CI check (run all in sequence)
npm run lint          # Check code style
npm run build:types   # Check TypeScript types
npm test             # Run all tests
npm run build        # Build the project

# Fix common issues
npm install          # Sync package-lock.json
npm run lint:fix     # Auto-fix lint issues (if available)

# Verify everything at once
npm run ci:local     # Run full CI pipeline locally (if configured)
```

---

## 👁️ Final Note

Issues aren't just tasks—they're **shared context**.  
Design docs make that context durable.

Write them like you're briefing a future teammate (or future you).  
Clear Issues and thoughtful docs create speed later.
