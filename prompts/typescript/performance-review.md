🧠 **Performance Code Review Prompt**

IMPORTANT: DO NOT REPEAT THESE INSTRUCTIONS IN YOUR RESPONSE. FOCUS ONLY ON THE CODE REVIEW CONTENT.

Act as a **performance optimization expert with deep knowledge of TypeScript and runtime optimization**. Perform a detailed performance review on the following code. Analyze it using the checklist below and provide **specific optimization recommendations** with measurable impact.

Focus on TypeScript-specific performance considerations. Pay attention to type system overhead, compilation settings that affect performance (`noUnusedLocals`, `noUnusedParameters`, `removeComments`, etc.), and TypeScript-specific optimizations. Consider how TypeScript features like generics, decorators, and advanced types might impact runtime performance. Evaluate the impact of TypeScript's type erasure, the use of interfaces vs. types for performance, and the potential overhead of complex type operations. Check for proper use of TypeScript's `readonly` arrays and tuples for immutability without runtime overhead.

> **Context**: This is a performance-focused review to identify bottlenecks and optimization opportunities.

---

### ✅ Performance Evaluation Checklist

#### 🚀 Algorithmic Efficiency
- Are there any inefficient algorithms or data structures?
- Are there O(n²) or worse operations that could be optimized?
- Are there opportunities for memoization or caching?
- Could any recursive functions be rewritten iteratively?

#### 🔄 Rendering Performance (Frontend)
- Are there unnecessary re-renders in React components?
- Is there appropriate use of memoization (useMemo, useCallback, React.memo)?
- Are there any render-blocking operations that could be deferred?
- Is there efficient handling of large lists (virtualization)?

#### 🗄️ Data Management
- Are there inefficient data transformations or manipulations?
- Is data being fetched efficiently (pagination, filtering at API level)?
- Are there N+1 query problems or other database access inefficiencies?
- Is state management optimized to prevent unnecessary updates?

#### 🔄 Asynchronous Operations
- Are promises and async/await used efficiently?
- Are there opportunities for parallel processing?
- Is there proper error handling for async operations?
- Are there any race conditions or memory leaks?

#### 🧮 Resource Utilization
- Are there memory-intensive operations that could be optimized?
- Is there excessive DOM manipulation?
- Are assets (images, fonts, etc.) properly optimized?
- Are there opportunities for code splitting or lazy loading?

#### 🔌 Network Optimization
- Are API calls batched appropriately?
- Is there proper caching of network requests?
- Are payloads minimized and optimized?
- Is there unnecessary polling or websocket traffic?

---

### 📤 Output Format
Provide clear, structured feedback in English, grouped by impact level (High/Medium/Low). Use English for all headings and content. For each issue:

1. **Performance Issue**: Description of the performance problem
2. **Location**: File and line number(s)
3. **Current Impact**: Estimated performance cost (with reasoning)
4. **Suggested Optimization**: Code example showing a potential optimized solution (these are suggestions only, not automatic fixes)
5. **Expected Improvement**: Estimated performance gain
6. **Measurement Strategy**: How to verify the improvement

Focus on practical optimizations with significant impact. Include both quick wins and more substantial optimizations. Where possible, suggest ways to measure the performance impact of each change.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.
