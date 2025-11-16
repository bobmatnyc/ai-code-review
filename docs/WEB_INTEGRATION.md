# 🌐 Web Application Integration Guide

This guide shows how to integrate AI Code Review as a library into web applications, specifically for the Next.js web dashboard.

## 📦 Installation

```bash
# In your web application
npm install @bobmatnyc/ai-code-review
```

## 🏗️ Architecture

The CLI tool provides a clean library interface that web applications can use:

```
Web Application (Next.js)
    ↓
AI Code Review Library (/lib export)
    ↓
Core Review Engine
    ↓
AI Providers (OpenRouter, Anthropic, etc.)
```

## 🔧 Basic Integration

### 1. Next.js API Route Example

```typescript
// pages/api/review.ts or app/api/review/route.ts
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

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

### 2. Model Testing API

```typescript
// pages/api/test-model.ts
import { testModelConnection } from '@bobmatnyc/ai-code-review/lib';

export async function POST(request: Request) {
  try {
    const { model, apiKey, provider } = await request.json();
    
    // Temporarily set API key for testing
    const originalEnv = process.env[`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`];
    process.env[`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`] = apiKey;
    
    try {
      const result = await testModelConnection(model);
      return Response.json(result);
    } finally {
      // Restore original environment
      if (originalEnv) {
        process.env[`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`] = originalEnv;
      } else {
        delete process.env[`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`];
      }
    }
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Available Models API

```typescript
// pages/api/models.ts
import { getAvailableModels } from '@bobmatnyc/ai-code-review/lib';

export async function GET() {
  try {
    const models = getAvailableModels();
    return Response.json(models);
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

## 🎯 Advanced Integration

### 1. GitHub Repository Analysis

```typescript
// lib/github-integration.ts
import { Octokit } from '@octokit/rest';
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

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
  
  // 1. Get repository contents
  const { data: contents } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: ''
  });
  
  // 2. Create temporary directory
  const tempDir = join(tmpdir(), `review-${owner}-${repo}-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  
  // 3. Download files (simplified - in reality you'd handle directories recursively)
  for (const item of contents) {
    if (item.type === 'file' && item.download_url) {
      const response = await fetch(item.download_url);
      const content = await response.text();
      writeFileSync(join(tempDir, item.name), content);
    }
  }
  
  // 4. Perform review
  const result = await performCodeReview({
    target: tempDir,
    config: {
      model: reviewConfig.model,
      reviewType: reviewConfig.reviewType,
      apiKeys: {
        [reviewConfig.provider]: reviewConfig.apiKey
      },
      outputFormat: 'json'
    }
  });
  
  // 5. Cleanup (in production, use proper temp file management)
  // rmSync(tempDir, { recursive: true, force: true });
  
  return result;
}
```

### 2. Real-time Progress Updates

```typescript
// lib/review-with-progress.ts
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

export async function performReviewWithProgress(
  target: string,
  config: any,
  onProgress: (progress: any) => void
) {
  return await performCodeReview({
    target,
    config,
    options: {
      onProgress: (progress) => {
        // Send progress updates via WebSocket, Server-Sent Events, or polling
        onProgress({
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

// Usage in API route with Server-Sent Events
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get('target');
  
  const stream = new ReadableStream({
    start(controller) {
      performReviewWithProgress(
        target,
        { /* config */ },
        (progress) => {
          controller.enqueue(`data: ${JSON.stringify(progress)}\n\n`);
        }
      ).then((result) => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
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
import { validateLibraryConfig } from '@bobmatnyc/ai-code-review/lib';

export function createSecureConfig(userSettings: any) {
  // Never store API keys in database - use them directly from user input
  const config = {
    model: userSettings.defaultModel,
    reviewType: userSettings.defaultReviewType,
    apiKeys: {
      // Get from secure environment or user session
      openrouter: process.env.USER_OPENROUTER_KEY || userSettings.tempApiKey,
      // ... other providers
    }
  };
  
  const validation = validateLibraryConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }
  
  return config;
}
```

### 2. Rate Limiting

```typescript
// lib/rate-limiting.ts
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

const userRequestCounts = new Map<string, { count: number; resetTime: number }>();

export async function performRateLimitedReview(
  userId: string,
  target: string,
  config: any,
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
  
  return await performCodeReview({ target, config });
}
```

## 📊 Usage Tracking

```typescript
// lib/usage-tracking.ts
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

export async function performTrackedReview(
  userId: string,
  target: string,
  config: any,
  onUsage: (usage: {
    userId: string;
    tokensUsed: number;
    reviewType: string;
    model: string;
    duration: number;
  }) => void
) {
  const startTime = Date.now();
  
  const result = await performCodeReview({ target, config });
  
  const duration = Date.now() - startTime;
  
  // Track usage for billing/analytics
  onUsage({
    userId,
    tokensUsed: result.tokenUsage?.total || 0,
    reviewType: config.reviewType,
    model: config.model,
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
import { performCodeReview } from '@bobmatnyc/ai-code-review/lib';

export async function safePerformReview(target: string, config: any) {
  try {
    return await performCodeReview({ target, config });
  } catch (error) {
    // Log error for debugging
    console.error('Review failed:', error);
    
    // Return user-friendly error
    if (error.message.includes('API key')) {
      throw new Error('Invalid API key. Please check your configuration.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Review timed out. Try reviewing a smaller codebase.');
    } else {
      throw new Error('Review failed. Please try again.');
    }
  }
}
```

## 🎯 Best Practices

1. **Always validate configuration** before performing reviews
2. **Implement rate limiting** to prevent abuse
3. **Never store API keys** in your database
4. **Use progress callbacks** for better UX
5. **Handle errors gracefully** with user-friendly messages
6. **Limit file/token counts** for performance
7. **Track usage** for billing and analytics
8. **Implement proper logging** for debugging

This integration approach keeps the CLI tool focused on its core functionality while providing a clean, powerful library interface for web applications! 🚀
