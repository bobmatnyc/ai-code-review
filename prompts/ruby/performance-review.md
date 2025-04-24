---
name: Ruby Performance Review
description: Reviews Ruby/Rails code for performance issues, focusing on database, memory and computation efficiency
version: 1.0.0
author: AI Code Review Team
reviewType: performance
language: ruby
tags: performance, rails, ruby
---

# Ruby/Rails Performance Code Review

As an expert on Ruby and Ruby on Rails performance optimization, please conduct a comprehensive performance review of the provided codebase. Focus on identifying performance bottlenecks and suggesting optimizations.

## Key Performance Areas to Review

### Database Performance
- Identify N+1 query problems
- Check for missing database indexes
- Review complex or inefficient queries
- Identify opportunities for eager loading with `includes`, `preload`, or `eager_load`
- Check for proper use of database transactions
- Review use of counter caches vs. COUNT queries
- Identify places where batch processing could be used
- Check for proper connection pool configuration
- Review schema design for performance issues

### ActiveRecord Optimizations
- Check for inefficient use of ActiveRecord methods
- Identify places to use `find_each` or `in_batches` for large datasets
- Review scope definitions for efficiency
- Check for unused or redundant database columns
- Identify places to use `pluck` or `select` to limit data retrieval
- Review proper use of callbacks with performance implications
- Check for opportunities to use raw SQL when appropriate
- Identify places to leverage methods like `exists?` over `present?`

### Memory Optimization
- Identify memory leaks or excessive memory usage
- Check for proper use of garbage collection
- Review large object allocations
- Identify string allocations that could be optimized
- Check for excessive use of instance variables
- Review eager loading vs. lazy loading strategies
- Check for proper caching of expensive computations

### Caching Strategies
- Identify missing or inefficient cache usage
- Review cache invalidation strategies
- Check for opportunities to use fragment caching
- Identify places to use Russian Doll caching
- Review use of `cache_key` and `touch`
- Check for proper cache store configuration
- Identify places to use counter caching
- Review HTTP caching headers and strategies

### Background Processing
- Check for operations that should be moved to background jobs
- Review job queue configuration
- Identify inefficient background job patterns
- Check for proper use of ActiveJob
- Review batch processing opportunities
- Check for proper error handling in background jobs

### Ruby-Specific Optimizations
- Identify inefficient Ruby code patterns
- Review string manipulations for performance
- Check for inefficient use of Ruby's Enumerable methods
- Identify places where custom methods could be more efficient
- Review recursive algorithms for performance improvements
- Check for proper use of Ruby's GC tuning options
- Identify opportunities to use more efficient data structures

### Rails-Specific Optimizations
- Review asset pipeline or Webpacker configuration
- Check for proper configuration of development vs. production environments
- Identify places to use non-blocking I/O
- Review middleware stack for unnecessary components
- Check for proper routing configuration
- Identify potential for HTTP/2 optimizations
- Review proper use of ActiveSupport instrumentation

## Output Format

For each performance issue found, please include:

1. **Issue Description**: A clear description of the performance problem
2. **Location**: File, class, method, and line numbers affected
3. **Severity**: Critical / High / Medium / Low - based on performance impact
4. **Current Implementation**: The current inefficient code
5. **Performance Impact**: How this affects system performance (memory, CPU, database, etc.)
6. **Optimization Suggestion**: Specific code changes or approaches to improve performance
7. **Expected Improvement**: The estimated performance benefit from implementing the suggestion
8. **Profiling Hints**: How to measure the performance before and after the optimization

## Additional Ruby/Rails Performance Guidance

### Rails Request Lifecycle
- Check for inefficient before_action callbacks in controllers
- Identify slow initializers
- Review middleware that could be affecting performance
- Check for inefficient route constraints or custom routing logic

### View Rendering
- Identify slow partials that could be cached
- Review collection rendering for efficiency
- Check for proper use of `content_for` and `yield`
- Identify places where JSON generation could be optimized
- Review template rendering strategies

### Third-Party Integrations
- Check for synchronous API calls that could be asynchronous
- Review HTTP client configurations
- Identify missing timeout settings
- Check for inefficient third-party gem usage
- Review webhook processing methods

Focus on providing actionable, specific recommendations that offer the best performance improvements for the least development effort. Prioritize issues by their potential performance impact.

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.