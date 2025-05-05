# 🔧 INSTRUCTIONS (GitHub-Centric Workflow)

Updated: 5-05-2025

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

---

## ✅ 5. Best Practices

* Use modern, community-validated standards.
* Prefer mature, well-supported libraries.
* Explain any deviations from best practices.
* Confirm before changing behavior, logic, or architecture.

---

## 🧪 6. Testing Standards

* All utilities and APIs must have unit tests.
* Use **Vitest** (`pnpm test`).
* Minimum 80% coverage unless annotated with `@low-test-priority`.
* Avoid snapshots unless explicitly justified.
* Prefer real API interactions over mocks.

---

## ⚙️ 7. CI / DevOps

* Pre-commit hooks must run lint, type-check, and tests.
* Do not merge if any check fails.
* Secrets must go in `.env.local` – never hardcoded.
* All API clients must include comments: purpose, inputs, outputs.

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
- **Squash-merge** in GitHub. Clean up the title to follow commit conventions.
- Only merge if CI passes and code is reviewed.

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

## 👁️ Final Note

Issues aren't just tasks—they're **shared context**.  
Design docs make that context durable.

Write them like you're briefing a future teammate (or future you).  
Clear Issues and thoughtful docs create speed later.
