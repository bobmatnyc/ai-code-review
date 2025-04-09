# AI Code Review Tool — Roadmap

> Last Updated: 2025-04-09

This roadmap outlines the evolution of the AI Code Review Tool, focused on improving configurability, robustness, usability, and developer experience. Features are grouped by priority and phase.

---

## ✅ Phase 1: Stabilization & Configuration (Q2 2025)

**Goal**: Strengthen configuration, improve DX, and lay groundwork for extensibility.

- [x] Create `config/` module with schema validation (Zod)
- [x] Add `.env.example` with all supported variables
- [ ] Migrate all API clients to use centralized config
- [ ] Fail-fast validation for missing or invalid config
- [ ] CLI flags to override config/env settings at runtime
- [ ] Add `bin` entry in `package.json` for CLI usage

---

## 🚧 Phase 2: Plugin & Strategy Architecture (Q2–Q3 2025)

**Goal**: Make the review engine more composable, swappable, and testable.

- [ ] Decouple review logic from orchestrator into `strategies/`
- [ ] Support for user-defined review strategies via plugins
- [ ] Add `--strategy` CLI flag to choose logic
- [ ] Move prompt templates to external files for better testing/versioning
- [ ] Add unit tests for review strategies

---

## ✨ Phase 3: Prompt Enhancements (Q3 2025)

**Goal**: Add meta-prompting and user-defined prompts.

- [ ] Implement meta-prompting layer for prompt optimization
- [ ] Add support for `--prompt [PROMPT].md` CLI flag
- [ ] Allow injection of user prompts into the prompt builder
- [ ] Cache improved prompts for reuse
- [ ] Expose model-specific prompt strategy selection

---

## 📦 Phase 4: Review Output Enhancements (Q3 2025)

**Goal**: Improve output quality, formatting, and traceability.

- [ ] Add metadata headers to each review (model, token cost, timestamp)
- [ ] Embed original code context alongside suggestions
- [ ] Include model confidence or explanation (if available)
- [ ] Support HTML and CLI-rendered output options
- [ ] Add inline annotations in markdown output (like GitHub PRs)

---

## 🌐 Phase 5: Multi-Provider + Caching (Q3–Q4 2025)

**Goal**: Enhance reliability and cost-effectiveness with provider fallback + caching.

- [ ] Retry/fallback support across Gemini/OpenRouter/Anthropic
- [ ] Smart routing based on token pricing or quota
- [ ] In-memory and disk-level prompt/response caching
- [ ] Add cache layer to orchestrator
- [ ] CLI flag `--no-cache` to disable cache

---

## 🧪 Phase 6: Unit Testing & Validation (Q2–Q3 2025)

**Goal**: Strengthen test coverage and enforce contract correctness.

- [ ] Add unit tests for config loading and schema validation
- [ ] Add unit tests for CLI argument parsing and routing
- [ ] Add unit tests for prompt builder and meta-prompting
- [ ] Add test harness for model adapters and mock responses
- [ ] Introduce Jest + ts-jest configuration (or Vitest if migrated)

---

## 🧪 Ongoing: Quality, Testing & Docs

- [ ] Type-check config and response shapes
- [ ] Add CONTRIBUTING.md with dev setup and testing
- [ ] Add architecture diagram to PROJECT.md
- [ ] Track usage patterns to inform future features

