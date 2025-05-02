# 🧠 AI Assistant Instructions (Next.js + TypeScript Stack)
_Last updated: 2025-05-02_

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

- **Build real, test real** – avoid mocks unless directed.
- **Simplicity > Cleverness** – prefer straight-line solutions.
- **Validate all assumptions** – ask before introducing new paradigms.
- **Follow monorepo principles** – workspace isolation, shared utilities.
- **Document clearly** – capture why, not just how.

---

## 🛠️ 3. Stack-Specific Directives

### TypeScript
- Must use `strict: true` config (`tsconfig.json`).
- Avoid `any`. Prefer `unknown`, generics, or well-defined types.
- Use `Pick`, `Partial`, `Required`, etc. to reduce duplication.
- All functions and exports must use **JSDoc** with type annotations.

### Next.js (15+)
- Use the **App Router** (`src/app`) with layout grouping.
- Prefer **React Server Components** by default.
- Explicitly define rendering mode (SSG, ISR, SSR, RSC).
- API routes live in `src/app/api`; use `POST` methods with proper validation.

### React (19+)
- Use functional components only.
- State: prefer `useState` → `useReducer` → `useContext` → server state (React Query/Zustand).
- Embrace `use`, `useOptimistic`, `useTransition` where relevant.
- Never create unnecessary client boundaries (`'use client'` only where needed).

### Shadcn UI + Tailwind
- Use official Shadcn components; follow usage rules.
- Style with Tailwind + `@apply` in `components.css`.
- Support dark mode and responsive design out of the box.
- Avoid class-based components; always favor functional + declarative styles.

### Vercel Deployment
- Optimize imports: use `dynamic()` with `ssr: false` for heavy UI.
- Use `next/image`, lazy loading, and WebP formats.
- Use edge functions for global forms/data mutations.
- Set appropriate cache headers (`stale-while-revalidate` recommended).

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
- Use `pnpm` for package management, builds, tests, and CI.
- `pnpm lint && pnpm typecheck && pnpm test` required before merge.
- Feature branches only. Use squash merges.

### Git Workflow
- Create a feature branch for each issue or task
- Follow the branch naming convention: `feature/issue-{number}-{short-description}`
- Example: `feature/issue-42-add-dark-mode`
- For bug fixes: `bugfix/issue-{number}-{short-description}`
- For documentation: `docs/issue-{number}-{short-description}`
- Include the branch name in the corresponding GitHub issue
- Keep branches focused on a single issue or feature
- Rebase feature branches on develop before creating pull requests
- Use descriptive commit messages that reference the issue number

### Pull Requests
- Create a pull request for each feature branch
- Link the pull request to the corresponding issue
- Use the PR title format: `[Issue #{number}] {issue-title}`
- Include in the PR description:
  - Summary of changes
  - Screenshots or demos if applicable
  - Testing instructions
  - Reference to the issue: `Closes #{number}`
- Request code reviews from appropriate team members
- All checks must pass before merging
- Use squash merging to keep the commit history clean

---

## 🧪 5. Testing Standards

- All utilities and APIs must have unit tests.
- Use **Vitest** (`pnpm test`).
- Minimum 80% coverage unless annotated with `@low-test-priority`.
- Avoid snapshots unless explicitly justified.
- Prefer real API interactions over mocks.

---

## 📄 6. Documentation Rules

- Use `README.md` for CLI commands and usage docs.
- Each package must have:
  - `PROJECT.md` – architecture decisions
  - `PROGRESS.md` – per-session implementation log
- Use GitHub Issues for:
  - Feature requests and roadmap items
  - Bug tracking
  - Task management
  - Milestone planning

### Logging Sessions
- Begin each session in `PROGRESS.md` with a dated header.
- Track:
  - Tasks completed
  - Blockers
  - Next steps
  - Git commits (e.g., `commit: 34dfae4`)

### Rotation Policy
When `PROGRESS.md` exceeds 1000 lines:
```bash
LATEST=$(ls logs/PROGRESS-*.md | sort -V | tail -1 | sed 's/.*PROGRESS-\([0-9]*\).*/\1/' || echo 0)
NEXT=$((LATEST + 1))
cp PROGRESS.md logs/PROGRESS-$NEXT.md
```

### GitHub Issues Management
- Use GitHub Issues for all feature requests, bugs, and tasks
- Follow these guidelines for issue creation:
  - **Title**: Clear, concise description of the issue/feature
  - **Description**: Detailed explanation with context
  - **Labels**: Apply appropriate labels (bug, enhancement, documentation, etc.)
  - **Milestones**: Assign to appropriate milestone for roadmap tracking
  - **Assignees**: Assign to responsible developer(s)
  - **Branch**: Include the feature branch name that will be used for implementation
- Link related issues using GitHub's referencing system (#issue-number)
- Close issues with appropriate commit messages (e.g., "Fixes #123")
- Update the issue with progress updates as work continues

### GitHub Projects for Roadmap
- Use GitHub Projects (https://github.com/users/bobmatnyc/projects/1) for roadmap tracking
- Organize issues into the following views:
  - **Kanban**: Track progress with To Do, In Progress, Done columns
  - **Roadmap**: Visualize timeline with milestones and phases
  - **Table**: Comprehensive view with all metadata
- Add all new issues to the project
- Update issue status as work progresses
- Use project fields to track:
  - Priority (High, Medium, Low)
  - Effort (Small, Medium, Large)
  - Phase (1-5)
  - Status (Backlog, Ready, In Progress, Review, Done)

---

## ⚙️ 7. CI / DevOps

- Pre-commit hooks must run:
  - Linting (`pnpm lint`)
  - Type-checking (`pnpm typecheck`)
  - Tests (`pnpm test`)
- Do not merge if any check fails.
- Secrets must go in `.env.local` – never hardcoded.
- All API clients must include comments: purpose, inputs, outputs.

---

## 🚩 8. Feature Flags

- Use `@todo`, `@in-progress`, or `experimental/*` folders.
- Wrap incomplete logic in `if (process.env.ENABLE_X)` or Zod feature schemas.
- Label clearly with TODO/FIXME and include context.

---

## 🧭 9. Final Reminder

> **Your job is not just to write code.** Your job is to write understandable, correct, and maintainable systems that scale—and to help others do the same.

If unsure: validate before changing logic, structure, or direction.
