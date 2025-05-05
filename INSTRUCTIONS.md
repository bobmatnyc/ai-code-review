# 🔧 INSTRUCTIONS (GitHub-Centric Workflow)

Updated: 2025-05-04

## 📋 Table of Contents

- [1. Agent Protocol & Execution Flow](#-1-agent-protocol--execution-flow)
- [2. Core Principles](#-2-core-principles)
- [3. Stack-Specific Directives](#-3-stack-specific-directives)
- [4. Monorepo Workflow](#-4-monorepo-workflow)
- [5. Best Practices](#-5-best-practices)
- [6. Testing Standards](#-6-testing-standards)
- [7. CI / DevOps](#-7-ci--devops)
- [8. Documentation](#-8-documentation)
- [9. Code Quality & Workflow](#-9-code-quality--workflow)
- [10. Git Workflow & Version Control](#-10-git-workflow--version-control)
- [11. GitHub Issue Tracking](#-11-github-issue-tracking)
- [12. AI Assistant Guidelines](#-12-ai-assistant-guidelines)

---

## 📌 1. Agent Protocol & Execution Flow

**Who this is for**: AI agents and human developers collaborating on production-grade code.

### ✅ Protocol Summary

1. **Validate assumptions** – ask clarifying questions before proceeding.
2. **Implement with simplicity** – prefer minimal, working code.
3. **Test and lint rigorously** – `pnpm lint && pnpm typecheck && pnpm test`.
4. **Document intent** – not just behavior.
5. **Confirm before architectural shifts or abstractions.**

> You are expected to follow all rules by default. No mocks, hacks, or shortcuts unless explicitly approved.

---

## 🧠 2. Core Principles

* **Build real, test real** – avoid mocks unless directed.
* **Simplicity > Cleverness** – prefer straight-line solutions.
* **Validate all assumptions** – ask before introducing new paradigms.
* **Follow monorepo principles** – workspace isolation, shared utilities.
* **Document clearly** – capture why, not just how.

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

* Use `pnpm` for package management, builds, tests, and CI.
* `pnpm lint && pnpm typecheck && pnpm test` required before merge.
* Feature branches only. Use squash merges.

### Common Commands

```bash
# Install dependencies
pnpm install

# Run linting
pnpm lint

# Run type checks
pnpm typecheck

# Run tests
pnpm test

# Run build
pnpm build
```

---

## ✅ 5. Best Practices

### Modern Standards

* Use modern, community-validated standards.
* Prefer mature, well-supported libraries.
* Explain any deviations from best practices.

### Simplicity and Elegance

* Prioritize clarity over cleverness.
* Favor minimal, working implementations.
* Confirm with users when there's a risk of over-engineering.

### Confirmation & Safety

* Confirm before changing behavior, logic, or architecture.
* Validate assumptions before introducing new patterns.

---

## 🧪 6. Testing Standards

* All utilities and APIs must have unit tests.
* Use **[Vitest](https://vitest.dev/)** (`pnpm test`).
* Minimum 80% coverage unless annotated with `@low-test-priority`.
* Avoid snapshots unless explicitly justified.
* Prefer real API interactions over mocks.

---

## ⚙️ 7. CI / DevOps

* Pre-commit hooks must run:

  * Linting (`pnpm lint`)
  * Type-checking (`pnpm typecheck`)
  * Tests (`pnpm test`)
* Do not merge if any check fails.
* Secrets must go in `.env.local` – never hardcoded.
* All API clients must include comments: purpose, inputs, outputs.

---

## 📘 8. Documentation

* Document *intent* as well as behavior.
* Use JSDoc with full TypeScript annotations.
* Comment all API interactions clearly.
* Read existing docs, particularly JSDocs before editing or suggesting changes.

---

## 🔭 9. Code Quality & Workflow

### Development Flow

* Run linting and type checks after every change.
* Build and verify tests before handing off code.
* Ensure test coverage for all new features.
* Follow existing conventions and naming patterns.
* Optimize for clarity and maintainability.
* Prefer straightforward implementations.

### Playground Apps

* Use real packages unless mocks are requested.
* Show real-world usage scenarios.
* Follow production-level testing standards.
* Document any test overrides or configs.

### API Integration

* Use structured error handling.
* Budget for API tokens and performance.
* Log request/response with trace IDs.
* Validate inputs at the boundary.
* Code defensively against upstream services.

---

## 🔁 10. Git Workflow & Version Control

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
- **Squash-merge** in GitHub. Clean up the title to follow commit conventions.
- Only merge if CI passes and code is reviewed.

### 🚫 Avoid

- Committing secrets, `.env`, build artifacts, or large binary files.
- Merge commits in feature branches (use rebase instead).
- Committing unresolved conflicts or commented-out code.

---

## 🧭 11. GitHub Issue Tracking

We use **GitHub Issues** for all tracked work—features, bugs, ideas, spikes.  
Submit via GitHub Issues REST API with `GITHUB_TOKEN`. No automation scripts.

Each issue answers: *What are we doing, why does it matter, and how will we know it's done?*

### Issue Fields to Fill

- **Title** – human-readable and emoji-tagged (e.g. `🚀 Add login flow`)
- **Description** – context, proposed approach, and acceptance criteria
- **Labels** – use taxonomy below
- **Assignee** – assign only when actively in progress
- **Milestone** – for cycles/themes

### Label Taxonomy

| Category  | Prefix    | Examples                                 |
| --------- | --------- | ---------------------------------------- |
| Theme     | `theme:`  | `theme:infra`, `theme:ai`, `theme:ux`    |
| Status    | `status:` | `status:in-progress`, `status:blocked`   |
| Priority  | `prio:`   | `prio:high`, `prio:low`                  |
| Effort    | `size:`   | `size:xs`, `size:m`, `size:xl`           |
| Type      | `type:`   | `type:bug`, `type:feature`, `type:chore` |

Use emojis in titles for quick scan: `🧠`, `🐛`, `🚀`, `📌`, etc.

### 📅 Milestones = Roadmap Buckets

Milestones replace a static `ROADMAP.md`. Use them to group issues by cycle or theme.

- Examples: `May 2025`, `LLM Infra`, `Billing Cleanup`
- Include: goal (1–2 lines), timeframe, and summary
- Optionally close with a wrap-up issue

### 📌 Decision Logs

Capture important architectural decisions as `type:decision` issues.

- Title format: `📌 Decision: Move to Mastra`
- Rationale and trade-offs should be added in comments

### 🧾 How to Write Good Issues

- Start with **why** – always ground in context
- Use checklists for deliverables
- Reference code, PRs, and past issues with links
- Break up large problems into discrete sub-issues when possible

### 🚀 Proposing New Work

Anyone can open an Issue. Use this template:

```md
### Summary
What's the idea or problem?

### Why it matters
Why now? What impact does it have?

### Proposal (if known)
How might we tackle this?

### Success Criteria
What does "done" look like?
```

Apply appropriate `type:` and `theme:` labels.

### 🔁 Replaces These Docs

* `ROADMAP.md` → use Milestones
* `PROGRESS.md` → use Labels + Issues
* Task trackers (Notion, Google Docs) → link Issues directly

### 👁️ Final Note

Issues aren't just tasks—they're **shared context**.
Write them like you're briefing a future teammate (or future you).

Clear Issues create speed later.

---

## 🤖 12. AI Assistant Guidelines

This section contains guidelines specifically optimized for AI coding assistants.

### 🔧 Machine-Readable Project Configuration

```json
{
  "projectType": "monorepo",
  "language": "typescript",
  "strictMode": true,
  "testFramework": "vitest",
  "packageManager": "pnpm",
  "commitStyle": "conventional",
  "lintCommand": "pnpm lint",
  "testCommand": "pnpm test",
  "typeCheckCommand": "pnpm typecheck",
  "buildCommand": "pnpm build",
  "branchNamingPattern": "^(feature|fix|chore|docs|refactor|test|perf|ci)/[a-z0-9-]+$",
  "commitMessagePattern": "^(feat|fix|chore|docs|refactor|test|perf|ci)(\\([a-z-]+\\))?: .{1,72}$"
}
```

### 📁 Directory Purpose Annotations

- `/src`: Core application code
  - `/cli`: Command-line interfaces
  - `/clients`: API client implementations
  - `/commands`: Command handlers
  - `/core`: Business logic
  - `/estimators`: Token estimation utilities
  - `/formatters`: Output formatting
  - `/handlers`: Event handlers
  - `/plugins`: Extension system
  - `/prompts`: LLM prompt templates
  - `/strategies`: Implementation strategies
  - `/tokenizers`: Token counting
  - `/types`: TypeScript definitions
  - `/utils`: Shared utilities

### 📏 Code Style Patterns

**Function Signatures:**

```ts
/**
 * Description of what the function does
 * @param param1 - Description of param1
 * @returns Description of return value
 */
function functionName(param1: Type1, param2?: Type2): ReturnType {
  // Implementation
}
```

**Error Handling:**

```ts
try {
  // Operation that might fail
} catch (error) {
  errorLogger.logError('Context of operation', error);
  throw new AppError('Human-readable message', { cause: error });
}
```

**Type Definitions:**

```ts
/**
 * Description of this type
 */
interface TypeName {
  /** Property description */
  requiredProp: string;
  /** Optional property description */
  optionalProp?: number;
}
```

### 🧪 Test Case Patterns

```ts
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle the happy path', () => {
      // Arrange
      const input = {};
      // Act
      const result = functionName(input);
      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle error cases', () => {
      // Test error scenarios
    });
  });
});
```

### 📊 Decision Making Framework

For dependencies:
1. First use existing project utilities
2. Then consider built-in Node.js modules
3. Then use existing project dependencies
4. Only then propose new dependencies, with justification

For algorithms:
1. Prioritize readability over performance unless proven bottleneck
2. Prefer functional patterns with proper error handling
3. Include type guards for runtime safety

### 🔄 Prompt Bundling

When working with AI prompts in this project:
1. All prompts must be bundled via `src/prompts/bundledPrompts.ts`
2. Run `pnpm build` to ensure prompt bundling works correctly
3. Test any prompt changes with the test harness (`pnpm test`)
4. Update schemas when prompt structure changes