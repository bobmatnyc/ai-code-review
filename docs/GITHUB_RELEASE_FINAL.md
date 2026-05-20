# v4.6.9 — Archive Release

**The final release of `@bobmatnyc/ai-code-review`.**

After two years, 60+ releases, and contributions from across the community, ai-code-review is being archived. This release marks the project as complete and points users to its successor: [**trusty-analyze**](https://github.com/bobmatnyc/trusty-analyze).

The repository and npm package remain available indefinitely. Everything you've built on top of ai-code-review will keep working. We're just done shipping new versions.

---

## What's in This Release

This is an **archival release**. There are no new features and no bug fixes. The release exists to:

1. Mark the project as officially archived in CHANGELOG and README.
2. Publish a final `4.6.9` version to npm so the version on disk matches the "this is the final release" message.
3. Ship the new [`DEPRECATED.md`](https://github.com/bobmatnyc/ai-code-review/blob/main/DEPRECATED.md) document with the full comparison, migration guide, and acknowledgments.

If you're happily using `4.6.8`, there is no functional reason to upgrade to `4.6.9`. The code behaves identically.

```bash
npm install -g @bobmatnyc/ai-code-review@4.6.9
```

---

## Meet the Successor: trusty-analyze

[**trusty-analyze**](https://github.com/bobmatnyc/trusty-analyze) is a deterministic static analysis daemon written in Rust. It addresses the architectural limits we ran into with an LLM-based approach:

| | ai-code-review | trusty-analyze |
|---|---|---|
| **Reproducible** | No — LLMs vary | Yes — same input, same output |
| **Cost per query** | API tokens | Zero |
| **Latency** | 10–60+ seconds | Sub-10ms warm |
| **Runtime** | Stateless CLI | Long-running daemon |
| **Offline** | No | Yes |
| **API key** | Required | None |
| **Knowledge graph** | No | Yes (redb + SCIP) |
| **Git temporal decay** | No | Yes |
| **Concept clustering** | No | Yes (k-means + neural embeddings) |
| **GitHub PR comments** | Local file only | Auto-post |
| **Browser dashboard** | No | Yes (Svelte 5 + D3, embedded) |
| **MCP transports** | stdio | stdio + HTTP/SSE |

The headline differences:

- **Determinism.** Run the analyzer twice, get the same findings. No more "the review surfaced different issues each run."
- **Free.** No API costs. Run it on every save, every commit, every PR.
- **Fast.** Sub-millisecond queries against a pre-indexed corpus. Suitable for editor integration.
- **Knowledge graph.** Cross-project symbol and reference queries are a single lookup.

The honest tradeoff: trusty-analyze does not yet produce prose, and it is not yet framework-aware. It surfaces structured findings, not LLM-authored essays. If conversational explanations or framework-specific guidance were what you valued most, see "What ai-code-review still does better" in [DEPRECATED.md](https://github.com/bobmatnyc/ai-code-review/blob/main/DEPRECATED.md#what-ai-code-review-does-better).

**Both of those gaps are on the trusty-analyze roadmap.** Optional prose explanations (via `--explain`), framework-specific rules (Rails, Next.js, Django, Flutter, Spring Boot), and a `--format report` markdown mode are all actively planned and tracked in GitHub ([bobmatnyc/trusty-tools#4](https://github.com/bobmatnyc/trusty-tools/issues/4)). The zero-cost, zero-latency default stays intact — explanations will always be opt-in.

---

## What's Still Available

Nothing disappears. Specifically:

- **GitHub repository**: [`bobmatnyc/ai-code-review`](https://github.com/bobmatnyc/ai-code-review) stays public. Clone it, fork it, mine the prompt templates for your own tools.
- **npm package**: [`@bobmatnyc/ai-code-review`](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) stays published. All historical versions back to 1.0 remain installable.
- **All releases**: Every tagged release stays on GitHub. CHANGELOG is complete.
- **License**: MIT, unchanged. Fork freely.

## What Changes

- **No more releases.** No new features, bug fixes, or security patches.
- **Issues and PRs are closed.** New ones will not be reviewed.
- **No dependency updates.** When upstream dependencies develop CVEs, you'll need to patch them in a fork.
- **No model list updates.** As providers retire models, `src/clients/utils/modelMaps.ts` will go stale. Forks can keep it current.

---

## Migrating

The short version:

```bash
# Install trusty-analyze (requires Rust 1.75+)
cargo install trusty-analyze

# Index your project
cd /path/to/project
trusty-analyze index .

# Run analysis
trusty-analyze analyze .

# Or open the embedded dashboard
trusty-analyze serve
```

For Claude Desktop or other MCP clients, swap the server config:

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

Full migration guide, including a workflow mapping table, is in [DEPRECATED.md](https://github.com/bobmatnyc/ai-code-review/blob/main/DEPRECATED.md#migrating-to-trusty-analyze).

---

## When to Keep Using ai-code-review

trusty-analyze is the right answer for most use cases, but not all. Stay with ai-code-review (or fork it) if you specifically need:

- **Narrative prose explanations** — LLM-authored "here's why this is fragile" output for teaching or non-engineering audiences.
- **Framework-specific deep dives** — Flutter widget rebuilds, Rails ActiveRecord patterns, Next.js App Router conventions, Django ORM optimization. trusty-analyze is framework-agnostic by design.
- **The `coding-test` review type** — Hiring assessments with AI-authorship detection. No equivalent exists in trusty-analyze.
- **Zero-setup one-off reviews** — `npm install -g` and an API key is genuinely lower-friction than installing a Rust toolchain and a daemon.

These are real strengths, not consolation prizes. If they describe your workflow, ai-code-review remains the right tool — it's just frozen at 4.6.9.

Note: narrative output and framework-specific analysis are the two gaps the trusty-analyze team considers highest-priority. Both are actively in development — see [bobmatnyc/trusty-tools#4](https://github.com/bobmatnyc/trusty-tools/issues/4) for status. The `coding-test` review type has no equivalent planned.

---

## The Prompt Library Lives On

The 92 prompt templates in `promptText/` — covering 9 languages, 10 frameworks, and 15 review types — represent years of refinement and are preserved in this repository. Organized by `promptText/languages/` (TypeScript, Python, Ruby, PHP, Go, Java, Rust, Dart) and `promptText/frameworks/` (Flutter, Django, Next.js, React, Vue, Angular, Laravel, FastAPI, Flask, Pyramid), they encode the framework-specific anti-pattern knowledge that was the hardest part of building this tool.

These templates serve as the reference implementation for trusty-analyze's planned framework analysis work ([bobmatnyc/trusty-tools#4](https://github.com/bobmatnyc/trusty-tools/issues/4)). The sub-tasks for framework-specific smell rules and the `--format report` narrative output have a head start: the logic for what to look for in a Flutter widget tree, a Rails controller, or a Next.js App Router file is already documented there, in plain language, ready to be translated into deterministic rules.

If you're building your own tooling, forking this project, or contributing to the trusty-analyze roadmap, start there:
**https://github.com/bobmatnyc/ai-code-review/tree/main/promptText**

---

## A Note on Forking

If you fork to continue development, we ask only that you:

1. Rename the package — don't republish under `@bobmatnyc/ai-code-review` on npm.
2. Update the README to make clear it's a community fork.
3. Link back to this archive notice for historical context.

That's it. No other restrictions beyond the MIT license. We'd genuinely love to see a community fork if there's demand for one — drop a link in the [trusty-analyze discussions](https://github.com/bobmatnyc/trusty-analyze/discussions) and we'll signal-boost it.

---

## Thank You

Two years. 60+ releases. Support for 9 languages, integration with every major LLM provider, 15 distinct review types, an MCP server, a library mode, a TreeSitter-based semantic chunker that cut typical reviews from 196K tokens to 4K.

None of that happens without users who tried it, filed issues, opened PRs, and pushed it into corners we didn't anticipate. Thank you to everyone who:

- **Filed bug reports** — especially the ones that pointed out where the LLM-based approach broke down. Those directly shaped trusty-analyze's design.
- **Contributed prompts and language support** — most of the framework-specific templates came from people who needed them and wrote them. Look at the contributor list; it's not a one-person project.
- **Wrote about the tool, recommended it, used it in CI** — knowing it was useful made the maintenance worthwhile.
- **Sent thank-you emails** — they mattered more than you'd think.

Also thanks to the AI provider APIs themselves — Google's Gemini, Anthropic's Claude, OpenAI's GPT, and OpenRouter — whose continued improvements made the tool's output progressively more useful. The state of LLM-based code analysis in 2026 is dramatically better than it was in 2024, and that progress is exactly what makes a tool like trusty-analyze possible. We can now rely on deterministic static analysis for the heavy lifting and use LLMs only where they add unique value.

The repository stays online. The package stays published. The license stays MIT.

See you in [trusty-analyze](https://github.com/bobmatnyc/trusty-analyze).

— Bob Matsuoka
2026-05-19

---

## Links

- 🔗 **Successor project**: https://github.com/bobmatnyc/trusty-analyze
- 📦 **npm package** (final): https://www.npmjs.com/package/@bobmatnyc/ai-code-review
- 📖 **Full archive announcement**: [DEPRECATED.md](https://github.com/bobmatnyc/ai-code-review/blob/main/DEPRECATED.md)
- 📜 **Complete changelog**: [CHANGELOG.md](https://github.com/bobmatnyc/ai-code-review/blob/main/CHANGELOG.md)
- ⚖️ **License**: [MIT](https://github.com/bobmatnyc/ai-code-review/blob/main/LICENSE)
