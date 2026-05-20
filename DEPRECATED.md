# AI Code Review — Archived

**Status**: Archived
**Final Version**: 4.6.9
**Archive Date**: 2026-05-19
**Successor**: [trusty-analyze](https://github.com/bobmatnyc/trusty-analyze)

---

After more than two years of active development across 60+ releases, `@bobmatnyc/ai-code-review` is being archived in favor of its successor, **[trusty-analyze](https://github.com/bobmatnyc/trusty-analyze)**. This document explains what that means, why we're moving on, and how to migrate.

## What This Means

### Still available
- The [GitHub repository](https://github.com/bobmatnyc/ai-code-review) remains public and cloneable.
- The [`@bobmatnyc/ai-code-review`](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) npm package remains published. `npm install -g @bobmatnyc/ai-code-review` will continue to work.
- All historical releases, tags, and CHANGELOG entries are preserved.
- The MIT license still applies — fork freely.

### No longer maintained
- No new versions, features, bug fixes, or security patches will be released.
- Issues and pull requests are closed. New ones will not be reviewed.
- Dependencies will not be updated. Model lists will not be refreshed as providers add or retire models.
- Documentation will not be updated beyond this archive notice.

### Use at your own risk
- API providers (Google, Anthropic, OpenAI, OpenRouter) periodically deprecate models. When a model in `src/clients/utils/modelMaps.ts` is retired upstream, you will need to maintain a fork to keep using it.
- The codebase is well-organized and documented; forking is straightforward for anyone who wants to continue development.

---

## Why We're Moving On

Two years of building an LLM-powered code review tool taught us something important: **the bottleneck in code review is not the analysis — it's the cost, latency, and reproducibility of running that analysis on every commit, every PR, and every refactor.**

`trusty-analyze` is a from-scratch rewrite that addresses those bottlenecks at the architectural level:

- **Deterministic.** The same code produces the same findings every time. No more "the review keeps flagging different things on each run."
- **Free per query.** Static analysis, no API calls. Run it on every save in your editor if you want.
- **Fast.** Sub-millisecond warm queries against a pre-indexed corpus. Suitable for IDE integration and pre-commit hooks.
- **Persistent.** A long-running daemon with a redb-backed knowledge graph, instead of stateless CLI invocations that re-read the world on every run.
- **Offline-capable.** No API keys, no network round-trips (after the initial index).

The honest tradeoff: trusty-analyze does not produce narrative prose. It does not explain *why* a pattern is problematic in plain English the way an LLM does. For teams that valued the educational, conversational output of ai-code-review, that's a real loss — see "[What ai-code-review Does Better](#what-ai-code-review-does-better)" below.

---

## Detailed Comparison

| Dimension | ai-code-review v4.6.8 | trusty-analyze v0.1.4 |
|---|---|---|
| **Analysis engine** | External LLM (Gemini, Claude, GPT, OpenRouter) | Deterministic static analysis (tree-sitter + rules) |
| **Result consistency** | Non-deterministic (varies per run) | Deterministic (same input → same output) |
| **Per-query cost** | API tokens (variable, $0.01–$5+ per review) | Zero |
| **Query latency** | 10–60+ seconds | Sub-10ms warm queries |
| **Runtime model** | Stateless CLI per invocation | Long-running sidecar daemon |
| **Language** | TypeScript (Node.js) | Rust 2021 |
| **MCP transports** | stdio only | stdio + HTTP/SSE |
| **Output formats** | Markdown, JSON, HTML, stdout | JSON, text, browser dashboard |
| **Language coverage** | 9 languages + frameworks | 14 tree-sitter grammars |
| **Knowledge graph** | No | Yes (redb facts store + SCIP ingest) |
| **Git blame temporal decay** | No | Yes |
| **Concept clustering** | No | Yes (k-means, BoW + neural embeddings) |
| **PR review (GitHub)** | Local file only | CLI + GitHub API + auto-post comment |
| **Embedded UI** | No | Yes (Svelte 5 + D3, served from binary) |
| **API key required** | Yes | No |
| **Offline capable** | No | Yes (after trusty-search is running) |
| **Framework-specific guidance** | Yes (Flutter, Rails, Next.js, Django, etc.) | No |
| **Narrative prose output** | Yes (LLM-authored) | No |

---

## What trusty-analyze Adds

Beyond fixing the cost/latency/reproducibility problems, trusty-analyze introduces capabilities ai-code-review never had:

- **Knowledge graph.** A persistent, queryable graph of symbols, references, and call relationships, ingested from SCIP protobuf indexes. Cross-project queries are a single lookup.
- **Git blame with temporal decay.** Findings are scored against the age and churn of the code they touch. Recently-modified hotspots rank higher than stable legacy code.
- **Concept clustering.** k-means clustering over both bag-of-words and neural embeddings, surfacing thematically-related code regions across the corpus.
- **Fowler-catalog refactor suggestions.** Detected code smells map to specific refactorings from Martin Fowler's catalog ("Extract Method," "Replace Conditional with Polymorphism," etc.).
- **Embedded browser dashboard.** A Svelte 5 + D3 UI compiled into the binary. Run `trusty-analyze serve` and open localhost — no separate web app to deploy.
- **HTTP/SSE MCP transport.** ai-code-review only supported stdio MCP. trusty-analyze speaks HTTP and Server-Sent Events, making it usable from web-based AI agents and remote clients.
- **GitHub PR comment posting.** Run the analyzer against a PR, post findings as a review comment, all from one CLI invocation.
- **Machine-wide shared index.** One index serves every project on your machine. No per-project re-indexing.

---

## What ai-code-review Does Better

This isn't a one-sided story. There are real things ai-code-review does that trusty-analyze does not, and may never do. If these matter to your workflow, ai-code-review remains a legitimate choice — it's just no longer being developed.

### Narrative prose explanations

An LLM can read a function and explain in plain English *why* its error handling is fragile, *what* an attacker could do with a particular SQL pattern, *how* a junior developer should think about the refactor. That kind of conversational, educational output is genuinely valuable, especially for:

- Teaching junior developers
- Onboarding to unfamiliar codebases
- Producing review artifacts for non-engineers (PMs, security reviewers, auditors)

trusty-analyze produces structured findings, not essays. If prose matters more than determinism for your use case, ai-code-review is still the better fit.

### Framework-specific analysis

ai-code-review ships 15+ review types and language-specific prompt templates with deep framework awareness:

- **Flutter/Dart**: widget rebuild patterns, state management (Riverpod, BLoC, Provider), platform channels
- **Ruby on Rails**: ActiveRecord N+1 queries, MVC conventions, Rails-specific security patterns
- **Next.js**: SSR/SSG choices, App Router patterns, middleware, Core Web Vitals
- **Django/Flask**: ORM optimization, DRF patterns, async views
- **Spring Boot**, **Laravel**, **Symfony**, **Phoenix**, and more

trusty-analyze is framework-agnostic by design — it analyzes structure and references, not idioms. That's a deliberate tradeoff (deterministic rules generalize better than framework-specific prompts), but it means trusty-analyze won't tell you that your Rails controller is bypassing strong parameters.

> **These features are on the roadmap for trusty-analyze.**
>
> Both narrative output and framework-specific analysis are acknowledged gaps — and actively planned. A master ticket in GitHub ([bobmatnyc/trusty-tools#4](https://github.com/bobmatnyc/trusty-tools/issues/4)) tracks this work. Here's what's coming:
>
> - **Optional LLM-augmented explanations** (`--explain` flag) — prose descriptions of findings will be opt-in, keeping the zero-cost, zero-latency default for users who don't need them.
> - **Framework detection and framework-specific rules** — Rails, Next.js, Django, Flutter, Spring Boot, and more are planned. The goal is the same depth of idiom-awareness ai-code-review provided, expressed as deterministic rules rather than prompt templates.
> - **A `--format report` mode** — readable markdown documents suitable for sharing with non-engineers, as an alternative to the default structured JSON output.
>
> If these are the features keeping you on ai-code-review, watch the [trusty-analyze releases](https://github.com/bobmatnyc/trusty-analyze/releases) — this work is in progress.

### Specialized review types

ai-code-review has 15 distinct review types tuned for different goals:

- `comprehensive`, `quick-fixes`, `architectural`, `security`, `performance`
- `unused-code`, `focused-unused-code`, `code-tracing-unused-code`
- `best-practices`, `evaluation`, `extract-patterns`
- `coding-test` (with AI-authorship detection)
- `ai-integration`, `cloud-native`, `developer-experience`

The `coding-test` type in particular — used for hiring assessments with AI-generated-code detection — has no equivalent in trusty-analyze and is not on the roadmap.

### Lower barrier to entry

ai-code-review is `npm install -g` and a single `.env.local`. trusty-analyze is a Rust binary with a daemon, an index, and a configuration model. For one-off reviews or experimentation, ai-code-review is faster to get running.

---

## The Prompt Library

Over 60+ releases, ai-code-review accumulated 92 prompt templates encoding deep, framework-specific analysis knowledge. These are not generic LLM instructions — they are the product of iterative refinement across real codebases, covering:

- **9 languages**: TypeScript, JavaScript, Python, Ruby, PHP, Go, Java, Rust, and Dart/Flutter
- **10 frameworks**: Flutter, Django, Next.js, React, Vue, Angular, Laravel, FastAPI, Flask, and Pyramid
- **15 review-type patterns**: security, architectural, performance, comprehensive, quick-fixes, unused-code, best-practices, evaluation, extract-patterns, coding-test, ai-integration, cloud-native, developer-experience, and more

The library lives under two directories in the archived repository:

- `promptText/` — the canonical prompt text, organized by `languages/` and `frameworks/` subdirectories, plus `common/` shared output formats, variable definitions, and CSS framework helpers
- `prompts/` — legacy and alternative prompt formats

These templates encode the specific things that are hard to write from scratch: which Flutter widget patterns actually cause rebuild storms, what a fat Rails controller looks like in practice, which Next.js App Router misuses are most common in real PRs, how to spot Django ORM patterns that become N+1 queries under load.

**This library is a direct reference implementation for trusty-analyze's [bobmatnyc/trusty-tools#4](https://github.com/bobmatnyc/trusty-tools/issues/4) work** — specifically for the framework-specific rules (sub-task 3) and the `--format report` narrative output (sub-task 4). Anyone implementing framework-aware analysis for trusty-analyze should consult these templates before writing rules from first principles.

The library is also immediately useful for:

- Anyone building their own LLM-based code review tooling
- Teams forking ai-code-review to continue development
- Contributors to other analysis tools who want a documented set of framework-specific anti-patterns

Browse the full library:
**https://github.com/bobmatnyc/ai-code-review/tree/main/promptText**

---

## Migrating to trusty-analyze

If you're ready to migrate, here's the short version. See the [trusty-analyze README](https://github.com/bobmatnyc/trusty-analyze) for full setup.

### 1. Install trusty-analyze

```bash
cargo install trusty-analyze
```

You'll need Rust 1.75+ installed. If you don't have Rust, [rustup](https://rustup.rs/) is the standard installer.

### 2. Index your project

```bash
cd /path/to/your/project
trusty-analyze index .
```

This populates the machine-wide redb facts store. First-time indexing takes a few seconds to a few minutes depending on codebase size.

### 3. Run an analysis

```bash
# Analyze the current directory
trusty-analyze analyze .

# Open the browser dashboard
trusty-analyze serve

# Post findings to a GitHub PR
trusty-analyze pr --repo owner/name --pr 123
```

### 4. Integrate with your AI assistant (MCP)

trusty-analyze exposes an MCP server with both stdio and HTTP/SSE transports:

```bash
# stdio (for Claude Desktop, etc.)
trusty-analyze mcp

# HTTP/SSE (for web-based agents)
trusty-analyze mcp --transport http --port 8765
```

Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "trusty-analyze": {
      "command": "trusty-analyze",
      "args": ["mcp"]
    }
  }
}
```

### 5. Remove ai-code-review (optional)

```bash
npm uninstall -g @bobmatnyc/ai-code-review
```

Or leave it installed — both tools can coexist. They have different binaries and don't share configuration.

### Workflow mapping

| ai-code-review workflow | trusty-analyze equivalent |
|---|---|
| `ai-code-review . --type security` | `trusty-analyze analyze . --category security` |
| `ai-code-review . --type unused-code` | `trusty-analyze analyze . --category dead-code` |
| `ai-code-review . --type architectural` | `trusty-analyze analyze . --category structure` + dashboard |
| `ai-code-review mcp` (Claude Desktop) | `trusty-analyze mcp` |
| Manual PR review file | `trusty-analyze pr --repo X --pr N` (auto-posts comment) |
| `--type coding-test` | No direct equivalent — keep using ai-code-review for this |
| Framework-specific deep dives | No direct equivalent — keep using ai-code-review or supplement |

---

## Continuing to Use ai-code-review

If trusty-analyze doesn't fit your workflow, or you specifically want LLM-authored prose output, ai-code-review remains usable:

```bash
# Install the final release
npm install -g @bobmatnyc/ai-code-review@4.6.9

# Set up your API key
export AI_CODE_REVIEW_GOOGLE_API_KEY=your_key_here
export AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro

# Run a review
ai-code-review . --type comprehensive
```

A few things to be aware of:

- **Model availability will drift.** As providers retire models, the bundled `MODEL_MAP` will become stale. Fork the repo and update `src/clients/utils/modelMaps.ts` to add new models.
- **No security patches.** If a dependency develops a vulnerability, you'll need to patch it yourself in a fork.
- **The code is approachable.** TypeScript, strict mode, well-tested, documented. Forks are welcome — that's what the MIT license is for.

### For forks

If you fork to continue development, we ask only that you:

1. Rename the package (don't republish under `@bobmatnyc/ai-code-review` on npm).
2. Update the README to clarify it's a community fork.
3. Link back to this archive notice for historical context.

That's it. No other restrictions beyond the MIT license.

---

## Thank You

ai-code-review started as a small TypeScript experiment in May 2024 and grew into a tool with thousands of installs, contributions across 15+ review types, support for 9 languages, and integration with every major LLM provider. None of that happens without users who tried it, filed issues, opened PRs, and pushed it into corners we didn't anticipate.

**Thank you** to everyone who:

- Filed issues that made the tool better — especially the ones that pointed out where the LLM-based approach broke down. Those reports directly shaped trusty-analyze's design.
- Contributed pull requests for language support, prompt improvements, bug fixes, and documentation. Look at the contributor list on GitHub — most of the language-specific prompts came from people who needed them and wrote them.
- Wrote about the tool, recommended it to teammates, or used it in their CI pipelines. Knowing the tool was useful made the maintenance worthwhile.
- Sent the occasional thank-you email. Those mattered more than you'd think.

Special acknowledgment to the AI provider APIs themselves — Google's Gemini, Anthropic's Claude, OpenAI's GPT, and OpenRouter — whose continued improvements over the past two years made the tool's output progressively more useful. The state of LLM-based code analysis in 2026 is dramatically better than it was in 2024, and that progress is what makes a tool like trusty-analyze possible: we can now rely on deterministic static analysis for the heavy lifting and use LLMs only where they add genuine value.

The repository will remain online for as long as GitHub continues to host it. The npm package will remain published for as long as npm continues to host it. The MIT license means it's yours to fork, modify, and continue.

We're excited about what trusty-analyze enables next. We hope you'll come along.

— Bob Matsuoka and contributors
2026-05-19

---

## Links

- **Successor**: [trusty-analyze on GitHub](https://github.com/bobmatnyc/trusty-analyze)
- **This repo (archived)**: [ai-code-review on GitHub](https://github.com/bobmatnyc/ai-code-review)
- **Final npm release**: [`@bobmatnyc/ai-code-review@4.6.9`](https://www.npmjs.com/package/@bobmatnyc/ai-code-review)
- **Full release history**: [CHANGELOG.md](CHANGELOG.md)
- **License**: [MIT](LICENSE)
