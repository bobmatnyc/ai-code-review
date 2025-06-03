# 🔁 Atlas Message Agent - Development Workflow

**Version**: 1.0  
**Updated**: 5-21-2025  
**Reference**: This document contains the complete workflow procedures for the Atlas Message Agent project. It should be referenced from `INSTRUCTIONS.md`.

**Changes in v1.0**:
- Extracted from INSTRUCTIONS.md for better organization
- Added GitHub API milestone management procedures  
- Complete Git workflow and branch naming conventions
- Issue tracking with structured labels and templates
- Design document workflow requirements

---

## 🔁 1. Git Workflow & Version Control

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

## 🧭 2. GitHub Issue Tracking

We use **GitHub Issues** for all tracked work—features, bugs, ideas, spikes.  
Submit via GitHub Issues REST API with `GITHUB_TOKEN`. No automation scripts.

Each issue answers: *What are we doing, why does it matter, and how will we know it's done?*

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

## 📅 3. Milestones & Roadmap Management

Milestones replace a static `ROADMAP.md`. Use them to group issues by cycle or theme.

### Creating Milestones

**Use GitHub API** (gh CLI doesn't support milestones):

```bash
# Create a new milestone
gh api repos/OWNER/REPO/milestones --method POST \
  --field title='Phase 1: Foundation' \
  --field description='Core infrastructure and MVP setup' \
  --field due_on='2025-06-04T23:59:59Z' \
  --field state='open'

# Assign issue to milestone
gh issue edit ISSUE_NUMBER --milestone 'Phase 1: Foundation'
```

### Milestone Guidelines

- **Include**: goal (1–2 lines), timeframe, and summary
- **Examples**: `Phase 1: Foundation & MVP`, `Q2 2025 Infrastructure`, `Semantic Intelligence`
- **Optionally close** with a wrap-up issue
- **Design docs** should be linked for each milestone initiative
- **Due dates** should be realistic and account for dependencies

### Milestone Structure

- **Phase 1**: Foundation & MVP (2 weeks)
- **Phase 2**: Semantic Intelligence (2 weeks)  
- **Phase 3**: Agent API & Operations (2 weeks)
- **Phase 4**: Self-Learning & Training (2 weeks)
- **Future Enhancements**: Long-term improvements (no due date)

---

## 📌 4. Decision Logs

Capture important design or architectural decisions as `type:decision` issues.

* Use titles like `📌 Decision: Move to Mastra`
* Include rationale and resolution in comments
* Reference relevant **design documents** if one informed the decision

---

## 🧾 5. How to Write Good Issues

* Start with **why**
* Use checklists if multiple deliverables
* Use code blocks and links to previous Issues/PRs
* Link relevant design docs from `docs/design/`

---

## 🚀 6. Proposing New Work

Anyone can open an Issue. Use this template:

```md
### Summary
What's the idea or problem?

### Why it matters
Why now? What impact does it have?

### Proposal (if known)
How might we tackle this? Link to any relevant design doc in `docs/design/`.

### Success Criteria
What does "done" look like?
```

Apply appropriate `type:` and `theme:` labels.

---

## 🔗 7. Design Document Workflow

Design documents live in `docs/design/` and are required for all substantial features, architecture changes, or systems work.

### Design Doc Requirements

- Each major issue **must reference a design doc** unless trivial
- GitHub Issues proposing large features must either embed or link to the doc
- Revisit/update the design doc post-launch with a closing summary

### Design Doc Structure

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

---

## 🔄 8. Milestone API Commands Reference

### Common Milestone Operations

```bash
# List all milestones
gh api repos/OWNER/REPO/milestones

# Create milestone with due date
gh api repos/OWNER/REPO/milestones --method POST \
  --field title='Milestone Name' \
  --field description='Milestone description' \
  --field due_on='2025-12-31T23:59:59Z' \
  --field state='open'

# Update milestone
gh api repos/OWNER/REPO/milestones/NUMBER --method PATCH \
  --field title='Updated Title' \
  --field state='closed'

# Assign issue to milestone
gh issue edit ISSUE_NUMBER --milestone 'Milestone Name'

# List issues in milestone
gh issue list --milestone 'Milestone Name'
```

### Milestone States

- **open**: Active milestone accepting issues
- **closed**: Completed milestone (automatically closes when due date passes)

---

## 🔁 9. Replaces These Docs

* `ROADMAP.md` → use Milestones
* `PROGRESS.md` → use Labels + Issues  
* Task trackers (Notion, Google Docs) → link Issues and **Design Docs**

---

## 🚀 10. Quick Reference: Issue Commands

```bash
# Create new issue
gh issue create --title "Issue title" --body "Description" --label "type:feature"

# List issues
gh issue list --state open
gh issue list --milestone "Phase 1"
gh issue list --label "prio:high"

# Edit issue
gh issue edit NUMBER --title "New title"
gh issue edit NUMBER --milestone "Phase 1"
gh issue edit NUMBER --add-label "status:in-progress"

# Close issue
gh issue close NUMBER --comment "Completed in PR #123"
```

---

## 👁️ Final Note

Issues aren't just tasks—they're **shared context**.  
Design docs make that context durable.

Write them like you're briefing a future teammate (or future you).  
Clear Issues and thoughtful docs create speed later.