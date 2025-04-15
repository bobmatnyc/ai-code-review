# 🧠 AI Assistant Instructions
- Updated 4-15-2025

## 🔧 Core Principles
let'
### ✅ Best Practices

- Always implement using modern, community-validated best practices.
- Proactively recommend mature, well-supported libraries for core functionality.
- Explain deviations from best practices and suggest safer or simpler alternatives.

### 🌟 Simplicity and Elegance

- Prioritize simplicity and clarity in all solutions.
- Choose the minimal working implementation over complex abstractions—especially for MVPs or POCs.
- Confirm with the user if a request risks over-engineering.

### 🔐 Confirmation & Safety

- Confirm explicitly before changing behavior, logic, or architecture.
- Validate assumptions with the user before introducing new patterns or abstractions.

### 📝 Documentation

- Document _intent_, not just behavior, for complex or non-obvious logic.
- All functions must include JSDoc with TypeScript annotations.
- Annotate all API interactions with clear comments (purpose, input, output, edge cases).
- Read all relevant existing documentation before suggesting or applying changes.

---

## 🧪 Code Quality & Workflow

### 🔭 Development Flow

- Run linting and typechecking after all changes—non-negotiable.
- Ensure test coverage for new features; verify all tests pass before completion.
- Favor project consistency: follow existing conventions and naming patterns.
- Optimize for clarity, maintainability, and fast onboarding.
- Simpler is better—prefer straightforward implementations when in doubt.

### 🎮 Playground Apps

- Use real package functionality unless mocks are explicitly required.
- Demonstrate real-world usage scenarios.
- Apply the same testing and quality standards as production features.
- Document test configurations or overrides clearly.

### 🌐 API Integration

- Use structured error handling for all external requests.
- Respect API token budgeting and performance best practices.
- Manage environment variables via `.env`, supporting `.env.local` (e.g., in Next.js).
- Never hardcode secrets or keys.

### 🔄 Automation Support

- Use pre-commit hooks to enforce linting, formatting, and type safety.
- Integrate CI to run all tests and checks before merging.
- Document any custom Git workflow (e.g., feature branches, squash merging).

### 🚩 Feature Flags and Experimental Code

- Wrap experimental or in-progress features in flags or annotations.
- Clearly label blocks that are incomplete or need validation.
- Use TODO/FIXME comments to prompt human follow-up.

### 🤔 Testing Standards

- Unit tests required for all core logic and utilities.
- Integration tests for API services or multi-component flows.
- Use mocks/stubs only when external dependencies are involved.
- Prefer `Vitest`, `Jest`, or the project’s default test runner.
- All tests must pass with >80% coverage unless justified.

---

## 📚 Documentation System

### File Roles

- `README.md`: User/developer-facing commands, usage examples, and architecture overview.
- `INSTRUCTIONS.md`: AI assistant directives (this document).
- `PROJECT.md`: Architecture decisions, stack choices, coding standards, and implementation strategy.
- `PROGRESS.md`: Session logs with status, blockers, tasks, and commits.
- `ABOUT.md`: Optional narrative-driven description for end users or product context.

### 📄 Updating `PROJECT.md`

Update this file when any of the following occur:

- Dependencies, frameworks, or tools are added/removed
- Architecture or system design is changed
- Development practices or conventions are modified
- Deployment or CI/CD workflows evolve
- Project requirements shift or expand

> **Each update must:**
>
> - Be timestamped (e.g., `// Updated: 2025-04-04`)
> - Maintain chronological order within its section

---

### 📈 Managing `PROGRESS.md`

At the start of every session, add a dated header:

- Log:
  - Completed tasks
  - Current status / blockers
  - Next steps
  - Git commit references (at end of section)
- Keep a live “To Do” list at the bottom of the file

---

### 🔁 Log Rotation Policy

When `PROGRESS.md` exceeds 1000 lines or at the end of the month:

1. Archive the current file:

   ```bash
   LATEST=$(ls -1 /logs/PROGRESS-*.md | sort -V | tail -1 | sed 's/.*PROGRESS-\([0-9]*\).*/\1/')
   NEXT=$((LATEST + 1))
   cp PROGRESS.md /logs/PROGRESS-$NEXT.md
   ```

2. Start a fresh `PROGRESS.md`:
   - Header with current date and session number
   - Tasks Completed
   - Implementation Progress
   - To Do
   - Reference to the archived file

---

## 🧠 Summary

Build with rigor. Document with clarity. Validate assumptions. Prioritize simplicity and elegance. Treat this assistant as a collaborator, not a script.
