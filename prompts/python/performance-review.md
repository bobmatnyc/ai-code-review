---
name: Python Performance Code Review
description: Detailed performance review to identify bottlenecks and optimization opportunities in Python code
version: 1.0.0
author: AI Code Review Tool
reviewType: performance
tags:
  - performance
  - optimization
  - efficiency
  - bottlenecks
  - python
language: python
lastModified: '2025-04-24'
---


🧠 **Python Performance Code Review Prompt**

Act as a **Python performance optimization expert with deep knowledge of runtime optimization**. Perform a detailed performance review on the following Python code. Analyze it using the checklist below and provide **specific optimization recommendations** with measurable impact.

> **Context**: This is a performance-focused review to identify bottlenecks and optimization opportunities in Python code.

---

### ✅ Python Performance Evaluation Checklist

#### 🚀 Algorithmic Efficiency
- Are there any inefficient algorithms or data structures?
- Are there O(n²) or worse operations that could be optimized?
- Are there opportunities for memoization or caching?
- Could any recursive functions be rewritten iteratively?
- Are there any unnecessary computations inside loops?

#### 🐍 Python-Specific Optimizations
- Are there opportunities to use built-in functions or standard library modules?
- Could list/dict/set comprehensions replace loops for better performance?
- Are generator expressions used where appropriate to reduce memory usage?
- Are appropriate data structures used (dict vs list for lookups, sets for membership tests)?
- Are string operations optimized (avoiding + for concatenation in loops)?

#### 🔄 CPU-Bound Performance
- Are there CPU-intensive operations that could be vectorized with NumPy?
- Could multiprocessing be used for CPU-bound tasks?
- Are there opportunities to use numba, Cython, or other acceleration techniques?
- Could any code benefit from just-in-time compilation?

#### 🗄️ Data Management & I/O
- Are there inefficient data transformations or manipulations?
- Is data being loaded efficiently (streaming for large files, etc.)?
- Are database queries optimized (if applicable)?
- Is there proper use of lazy loading for large datasets?
- Are file I/O operations batched appropriately?

#### 🔄 Asynchronous Operations
- Could asyncio be used for I/O-bound operations?
- Are promises and async/await used efficiently where applicable?
- Are there opportunities for parallel processing?
- Is there proper error handling for async operations?

#### 🧮 Memory Utilization
- Are there memory leaks or unnecessary object retention?
- Are large objects released when no longer needed?
- Are there opportunities to use more memory-efficient data structures?
- Could object pools or flyweight patterns reduce memory pressure?
- Is there excessive use of in-memory data when streaming would be better?

#### 🔌 Library & Framework Usage
- Are there inefficient uses of libraries/frameworks?
- Are there better alternatives to current libraries for performance-critical parts?
- Are there optimized configurations that could improve performance?
- Are there batch processing opportunities with libraries?

---

### 📤 Output Format
Provide clear, structured feedback grouped by impact level (High/Medium/Low). For each issue:

1. **Performance Issue**: Description of the performance problem
2. **Location**: File and line number(s)
3. **Current Impact**: Estimated performance cost (with reasoning)
4. **Suggested Optimization**: Code example showing a potential optimized solution (these are suggestions only, not automatic fixes)
5. **Expected Improvement**: Estimated performance gain
6. **Measurement Strategy**: How to verify the improvement (e.g., using timeit, profilers, etc.)

Focus on practical optimizations with significant impact. Include both quick wins and more substantial optimizations. Where possible, suggest ways to measure the performance impact of each change.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.