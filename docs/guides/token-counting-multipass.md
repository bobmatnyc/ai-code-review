# Token Counting and Multi-Pass Review

This document describes the token counting and multi-pass review features of the AI code review tool.

## Overview

Large codebases often exceed the context window limits of AI models, making it challenging to provide comprehensive reviews. The token counting and multi-pass features address this by:

1. Accurately analyzing token usage before review
2. Automatically splitting large reviews into multiple passes
3. Maintaining context between passes to ensure consistent analysis
4. Providing detailed cost estimation to help manage API costs

## Token Analysis

The token analysis system provides accurate token counting and estimation for all supported AI providers:

- Claude (Anthropic)
- GPT (OpenAI)
- Gemini (Google)
- Various models via OpenRouter

### Usage

Token analysis happens automatically before each review to determine if multi-pass mode is needed. You can also run it explicitly with the `--estimate` flag:

```bash
pnpm run dev code-review project-name path/to/files --estimate
```

This will output detailed token usage information and recommend whether to use multi-pass mode.

### TokenAnalyzer API

The `TokenAnalyzer` class provides methods for analyzing token usage:

```typescript
// Analyze a single file
const fileAnalysis = TokenAnalyzer.analyzeFile(file, options);

// Analyze multiple files
const analysisResult = TokenAnalyzer.analyzeFiles(files, options);
```

The analysis results include:
- Token counts per file
- Total token usage
- Estimation of whether content fits in the model's context window
- Chunking recommendations if multi-pass is needed

## Multi-Pass Reviews

When a codebase is too large for a single review, the multi-pass system automatically divides it into manageable chunks and processes them sequentially, maintaining context between passes.

### How It Works

1. **Analysis Phase**: Files are analyzed to determine token usage
2. **Chunking Decision**: If content exceeds the model's context window, multi-pass mode is activated
3. **Context Initialization**: A `ReviewContext` is created to maintain state between passes
4. **Per-Pass Processing**: Each chunk of files is processed with awareness of previous passes
5. **Context Maintenance**: Key findings, code elements, and relationships are tracked across passes
6. **Results Consolidation**: Output from all passes is combined into a comprehensive report

### Usage

Multi-pass mode is activated automatically when needed, but you can enable it explicitly:

```bash
pnpm run dev code-review project-name path/to/files --multiPass
```

Additional options:
- `--contextMaintenanceFactor=0.2`: Control how much context is preserved between passes (0-1)

### ReviewContext

The `ReviewContext` class maintains state between passes:

- Tracking important code elements (functions, classes, etc.)
- Recording findings from previous passes
- Generating summaries of files seen in previous passes
- Creating context for each new pass

## Cost Estimation

The system provides detailed cost estimates for multi-pass reviews, accounting for:

- Token usage per pass
- Context maintenance overhead
- Repeated elements between passes

Cost estimates are shown:
- Before review (with `--estimate`)
- In the final review output
- As part of the progress display during multi-pass reviews

## Progress Tracking

Multi-pass reviews include real-time progress tracking:

- Current pass and total passes
- Files being processed
- Elapsed time
- Estimated completion time

Progress is displayed in the terminal during review execution.

## Implementation Details

### Key Components

- **TokenAnalyzer**: Fast, provider-agnostic pre-analyzer for token usage
- **ReviewContext**: State management between passes
- **MultiPassReviewStrategy**: Orchestration of multi-pass reviews
- **MultiPassProgressTracker**: Real-time progress reporting

### Architecture

The multi-pass system extends the existing review strategy pattern:

```
ReviewOrchestrator
├── TokenAnalyzer (determines if multi-pass is needed)
└── StrategyFactory
    ├── StandardReviewStrategy
    └── MultiPassReviewStrategy
        ├── ReviewContext
        └── MultiPassProgressTracker
```

### Chunking Algorithm

Files are divided into chunks based on:
1. Token count relative to context window size
2. File relationships (trying to keep related files together)
3. Order of importance (higher priority files first)

The context maintenance factor (default 0.15) reserves a portion of the context window for maintaining state between passes.

## Extensibility

The system is designed for extensibility:

- New AI providers can be added by implementing model-specific tokenizers
- Chunking strategies can be modified or extended
- Context maintenance can be customized for different review types