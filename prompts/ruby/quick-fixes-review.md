---
name: Ruby Quick Fixes Review
description: Identifies quick wins and easy improvements in Ruby code, focusing on common Ruby/Rails patterns and idioms
version: 1.0.0
author: AI Code Review Team
reviewType: quick-fixes
language: ruby
tags: ruby, rails, quick-fixes
---

# Ruby/Rails Quick Fixes Code Review

As an expert Ruby and Ruby on Rails developer, please conduct a review to identify "quick win" improvements in the provided Ruby/Rails codebase. Focus on finding issues that can be easily fixed and will improve code quality, readability, performance, or security.

## Key Areas to Review

### Ruby Style and Best Practices
- Identify non-idiomatic Ruby code
- Check for verbose code that could use Ruby's concise syntax
- Identify opportunities to use Ruby's enumerable methods
- Check for proper use of Ruby's conditional expressions
- Identify unnecessary temporary variables
- Check string interpolation vs. concatenation
- Review method naming conventions

### Rails Conventions
- Check for adherence to Rails naming conventions
- Identify non-RESTful actions and routes
- Check for opportunities to use Rails shortcuts and helpers
- Review for proper use of ActiveRecord methods and scopes
- Identify controller actions that could be simplified
- Check for proper use of Rails validators
- Identify areas to use Rails' built-in methods instead of custom code

### Performance Quick Wins
- Identify obvious N+1 query issues
- Check for missing database indexes
- Identify opportunities for eager loading with `includes`
- Check for redundant queries or operations
- Identify simple caching opportunities
- Look for unnecessary computations in loops

### Security Fixes
- Identify potential mass assignment vulnerabilities
- Check for proper parameter sanitization
- Identify obvious CSRF vulnerabilities
- Check for proper authorization checks
- Identify SQL injection risks

### Code Organization and Readability
- Identify overly complex methods that could be broken down
- Check for unused code or dead code
- Identify magic numbers or strings that should be constants
- Check for proper commenting and documentation
- Identify opportunities for using modules or concerns
- Check for repeated code

### Refactoring Opportunities
- Identify methods with too many parameters
- Check for excessive nesting
- Identify redundant conditionals
- Check for law of demeter violations
- Identify inappropriate uses of class variables

## Output Format

For each issue found, please include:

1. **Issue Description**: A clear description of the issue and why it matters
2. **Location**: File and method/line number where the issue is found
3. **Impact**: Low/Medium/High - how significant is this issue?
4. **Current Code**: The current problematic code
5. **Suggested Fix**: The improved code that addresses the issue
6. **Explanation**: Why this fix is better (more readable, efficient, secure, etc.)

## Additional Ruby/Rails-Specific Guidance

### Ruby Language
- Suggest using Ruby's built-in methods (`select`, `map`, `reject`) over manual iteration
- Identify opportunities to use Ruby's shorthand syntax
- Check for inefficient string operations
- Identify places to use Ruby's method chaining
- Check for proper use of blocks, procs, and lambdas
- Identify opportunities to use Ruby's destructuring assignment

### Rails Framework
- Check for proper use of ActiveRecord query methods
- Identify opportunities to use Rails' form helpers
- Check for proper routing and controller organization
- Identify places to use Rails' built-in utility methods
- Check for proper use of Rails' asset pipeline or Webpacker
- Identify opportunities to use ActiveRecord callbacks appropriately

Focus on providing actionable, specific feedback that the developer can immediately implement to improve the code. Prioritize easy fixes that provide significant improvements.

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.