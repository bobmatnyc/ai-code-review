# 🌐 Web Application Integration Guide

> **⚠️ Note**: As of v4.5.0, the `/lib` library export has been removed. This tool is primarily designed as a CLI application. For web integration, use the CLI via child processes or build a custom wrapper around the core modules.

This guide shows alternative approaches for integrating AI Code Review into web applications.

## 📦 Installation

```bash
# In your web application
npm install @bobmatnyc/ai-code-review
```

## 🏗️ Architecture Options

### Option 1: CLI Wrapper (Recommended)

```
Web Application (Next.js)
    ↓
Child Process → AI Code Review CLI
    ↓
Review Output (JSON/Markdown)
```

### Option 2: Direct Module Integration (Advanced)

```
Web Application (Next.js)
    ↓
Import Core Modules Directly
    ↓
Core Review Engine
    ↓
AI Providers (OpenRouter, Anthropic, etc.)
```

## 🔧 Integration Approach 1: CLI Wrapper (Recommended)

### 1. Next.js API Route Example

```typescript
// pages/api/review.ts or app/api/review/route.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { target, model, reviewType, apiKey, provider } = await request.json();

    // Set environment variables for the CLI
    const env = {
      ...process.env,
      [`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`]: apiKey,
      AI_CODE_REVIEW_MODEL: model,
    };

    // Execute CLI command
    const { stdout, stderr } = await execAsync(
      `npx ai-code-review ${target} --review-type ${reviewType} --output-format json`,
      { env, maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );

    if (stderr) {
      console.error('CLI stderr:', stderr);
    }

    // Parse JSON output from CLI
    const result = JSON.parse(stdout);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## 🔧 Integration Approach 2: Direct Module Import (Advanced)

For advanced use cases, you can import core modules directly:

### 1. Direct Core Module Usage

```typescript
// pages/api/review.ts or app/api/review/route.ts
// Import core modules directly (not recommended for most use cases)
import { orchestrateReview } from '@bobmatnyc/ai-code-review/dist/core/reviewOrchestrator';

export async function POST(request: Request) {
  try {
    const { target, model, reviewType, apiKey, provider } = await request.json();
    
    const result = await performCodeReview({
      target,
      config: {
        model,
        reviewType,
        apiKeys: {
          [provider]: apiKey
        },
        outputFormat: 'json',
        includeTests: true,
        debug: false
      },
      options: {
        maxFiles: 100,
        onProgress: (progress) => {
          // Could send progress via WebSocket or Server-Sent Events
          console.log(`Progress: ${progress.stage} - ${progress.progress}%`);
        }
      }
    });
    
    return Response.json(result);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 2. Model Testing via CLI

```typescript
// pages/api/test-model.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { model, apiKey, provider } = await request.json();

    const env = {
      ...process.env,
      [`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`]: apiKey,
    };

    // Use CLI to test API connection
    const { stdout } = await execAsync(
      `npx ai-code-review test --model ${model}`,
      { env }
    );

    return Response.json({ success: true, output: stdout });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Available Models via CLI

```typescript
// pages/api/models.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout } = await execAsync('npx ai-code-review list-models');
    return Response.json({ models: stdout.split('\n').filter(Boolean) });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## 🎯 Advanced Integration

### 1. GitHub Repository Analysis via CLI

```typescript
// lib/github-integration.ts
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export async function analyzeGitHubRepository(
  owner: string,
  repo: string,
  githubToken: string,
  reviewConfig: {
    model: string;
    apiKey: string;
    provider: string;
    reviewType: string;
  }
) {
  const octokit = new Octokit({ auth: githubToken });

  // 1. Clone repository to temp directory
  const tempDir = join(tmpdir(), `review-${owner}-${repo}-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  try {
    // 2. Clone the repository
    await execAsync(`git clone https://github.com/${owner}/${repo}.git ${tempDir}`);

    // 3. Set up environment for CLI
    const env = {
      ...process.env,
      [`AI_CODE_REVIEW_${reviewConfig.provider.toUpperCase()}_API_KEY`]: reviewConfig.apiKey,
    };

    // 4. Run CLI review
    const { stdout } = await execAsync(
      `npx ai-code-review ${tempDir} --model ${reviewConfig.model} --review-type ${reviewConfig.reviewType} --output-format json`,
      { env, maxBuffer: 1024 * 1024 * 10 }
    );

    const result = JSON.parse(stdout);
    return result;
  } finally {
    // 5. Cleanup
    rmSync(tempDir, { recursive: true, force: true });
  }
}
```

### 2. Streaming CLI Output for Progress

```typescript
// lib/review-with-progress.ts
import { spawn } from 'child_process';

export async function performReviewWithProgress(
  target: string,
  config: any,
  onProgress: (line: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      [`AI_CODE_REVIEW_${config.provider.toUpperCase()}_API_KEY`]: config.apiKey,
    };

    // Spawn CLI process
    const child = spawn(
      'npx',
      ['ai-code-review', target, '--model', config.model, '--review-type', config.reviewType, '--output-format', 'json'],
      { env }
    );

    let output = '';

    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          onProgress(line);
          output += line + '\n';
        }
      });
    });

    child.stderr.on('data', (data) => {
      onProgress(`[LOG] ${data.toString()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Review process exited with code ${code}`));
      }
    });
  });
}

// Usage in API route with Server-Sent Events
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target');
  const model = searchParams.get('model');

  const stream = new ReadableStream({
    start(controller) {
      performReviewWithProgress(
        target,
        { model, provider: 'openrouter', apiKey: process.env.API_KEY },
        (line) => {
          controller.enqueue(`data: ${JSON.stringify({ type: 'progress', line })}\n\n`);
        }
      ).then((output) => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'complete', result: JSON.parse(output) })}\n\n`);
        controller.close();
      }).catch((error) => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

## 🔒 Security Considerations

### 1. API Key Management

```typescript
// lib/secure-config.ts

export function createSecureEnv(userSettings: any) {
  // Never store API keys in database - use them directly from user input
  const env = {
    ...process.env,
  };

  // Add API keys to environment for CLI execution
  if (userSettings.openrouterKey) {
    env.AI_CODE_REVIEW_OPENROUTER_API_KEY = userSettings.openrouterKey;
  }
  if (userSettings.anthropicKey) {
    env.AI_CODE_REVIEW_ANTHROPIC_API_KEY = userSettings.anthropicKey;
  }
  if (userSettings.googleKey) {
    env.AI_CODE_REVIEW_GOOGLE_API_KEY = userSettings.googleKey;
  }

  return env;
}
```

### 2. Rate Limiting

```typescript
// lib/rate-limiting.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

export async function performRateLimitedReview(
  userId: string,
  target: string,
  cliArgs: string,
  env: any,
  limits: { maxPerHour: number }
) {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;

  const userLimits = userRequestCounts.get(userId);
  if (!userLimits || now > userLimits.resetTime) {
    userRequestCounts.set(userId, { count: 1, resetTime: now + hourMs });
  } else if (userLimits.count >= limits.maxPerHour) {
    throw new Error('Rate limit exceeded. Please try again later.');
  } else {
    userLimits.count++;
  }

  const { stdout } = await execAsync(`npx ai-code-review ${target} ${cliArgs}`, { env });
  return JSON.parse(stdout);
}
```

## 📊 Usage Tracking

```typescript
// lib/usage-tracking.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function performTrackedReview(
  userId: string,
  target: string,
  cliArgs: string,
  env: any,
  onUsage: (usage: {
    userId: string;
    tokensUsed: number;
    reviewType: string;
    model: string;
    duration: number;
  }) => void
) {
  const startTime = Date.now();

  const { stdout } = await execAsync(`npx ai-code-review ${target} ${cliArgs}`, { env });
  const result = JSON.parse(stdout);

  const duration = Date.now() - startTime;

  // Track usage for billing/analytics
  onUsage({
    userId,
    tokensUsed: result.tokenUsage?.total || 0,
    reviewType: result.reviewType || 'unknown',
    model: result.model || 'unknown',
    duration
  });

  return result;
}
```

## 🚀 Deployment Considerations

### 1. Environment Variables

```bash
# In your web application .env
AI_CODE_REVIEW_LOG_LEVEL=info
NODE_ENV=production

# User API keys should NOT be in environment
# They should come from user input or secure session storage
```

### 2. Memory Management

```typescript
// For large repositories, consider:
const config = {
  // ... other config
  maxFiles: 100,        // Limit files processed
  maxTokens: 50000,     // Limit token usage
  includeTests: false,  // Skip test files for faster processing
};
```

### 3. Error Handling

```typescript
// lib/error-handling.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function safePerformReview(target: string, cliArgs: string, env: any) {
  try {
    const { stdout, stderr } = await execAsync(
      `npx ai-code-review ${target} ${cliArgs}`,
      { env, maxBuffer: 1024 * 1024 * 10 }
    );

    if (stderr) {
      console.warn('CLI warnings:', stderr);
    }

    return JSON.parse(stdout);
  } catch (error) {
    // Log error for debugging
    console.error('Review failed:', error);

    // Return user-friendly error
    if (error.message.includes('API key')) {
      throw new Error('Invalid API key. Please check your configuration.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.message.includes('timeout') || error.message.includes('maxBuffer')) {
      throw new Error('Review timed out. Try reviewing a smaller codebase.');
    } else {
      throw new Error('Review failed. Please try again.');
    }
  }
}
```

## 🎯 Best Practices

1. **Use CLI wrapper approach** for simplest integration
2. **Implement rate limiting** to prevent abuse
3. **Never store API keys** in your database
4. **Stream CLI output** for real-time progress updates
5. **Handle errors gracefully** with user-friendly messages
6. **Set maxBuffer** appropriately for large codebases
7. **Track usage** for billing and analytics
8. **Implement proper logging** for debugging
9. **Clean up temporary files** after reviews
10. **Use child process timeouts** to prevent hung processes

## 📝 Migration Notes

If you previously used the `/lib` export (v4.4.x and earlier), you'll need to migrate to the CLI wrapper approach:

**Before (v4.4.x)**:
```typescript
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';
const result = await performCodeReview({ target, config });
```

**After (v4.5.0+)**:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const { stdout } = await execAsync(`npx ai-code-review ${target} --output-format json`, { env });
const result = JSON.parse(stdout);
```

This CLI-first approach provides better isolation, easier debugging, and aligns with the tool's primary design as a command-line application! 🚀
