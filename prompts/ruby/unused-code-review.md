---
name: Ruby Unused Code Review
description: Identifies unused or dead code in Ruby/Rails projects, focusing on methods, classes, and dependencies
version: 1.0.0
author: AI Code Review Team
reviewType: unused-code
language: ruby
tags:
  - maintenance
  - cleanup
  - ruby
  - rails
lastModified: '2025-04-24'
---


# Ruby/Rails Unused Code Review

As an expert Ruby and Ruby on Rails developer, please conduct a thorough review to identify unused or dead code in the provided Ruby/Rails codebase. Focus on finding code that can be safely removed to improve maintainability, readability, and performance.

## Key Areas to Review

### Unused Methods and Classes
- Identify methods that are never called
- Find classes that are not instantiated or extended
- Look for modules that are never included or extended
- Identify constants that are never referenced
- Check for methods that are always overridden
- Find classes with no public methods that are ever called

### Rails-Specific Unused Elements
- Identify unused routes in `config/routes.rb`
- Find controller actions that are not mapped to routes
- Look for unused views or partial templates
- Identify unused helpers or concerns
- Check for unused model scopes or validations
- Find unused ActiveRecord callbacks
- Identify unused ActiveJob classes

### Dead Code Patterns
- Find code branches that can never be executed
- Identify redundant conditions
- Look for code after unconditional returns
- Check for variables that are set but never used
- Find duplicate code implementations
- Identify commented-out code that should be removed

### Unused Dependencies
- Check for gem dependencies that are not used
- Find `require` statements for files that are never used
- Identify unnecessary Rails engines or plugins
- Look for unused JavaScript or CSS libraries
- Check for unnecessary Rails middleware
- Find unused initializers

### Database-Related Dead Code
- Identify unused database columns in models
- Look for migrations that could be consolidated
- Find unused database indexes
- Check for unused foreign keys or constraints
- Identify unused or redundant database queries

## Output Format

Please organize your findings into the following categories:

1. **High Confidence Unused Code**: Code that is definitely unused and can be safely removed
   - Location (file, line numbers)
   - Type of unused code (method, class, route, etc.)
   - Explanation of why it's unused
   - Recommendation for removal
   - Potential risks or considerations

2. **Medium Confidence Unused Code**: Code that appears unused but requires verification
   - Location (file, line numbers)
   - Type of potentially unused code
   - Explanation of why it might be unused
   - Suggested approach to verify
   - Recommendation for removal if verified

3. **Low Confidence Unused Code**: Code that shows signs of being unused but requires careful analysis
   - Location (file, line numbers)
   - Reasons for suspicion
   - Potential external dependencies to check
   - Suggested verification approach

4. **Other Cleanup Opportunities**: Code that could be refactored for clarity, even if used
   - Location (file, line numbers)
   - Issue description
   - Recommendation

## Detection Methods

When analyzing for unused code, consider:

1. **Static Analysis**: Trace method calls and references throughout the codebase
2. **Dynamic Routes**: Check if routes are ever hit in the application
3. **Reflection Considerations**: Check for use of Ruby's metaprogramming features
4. **External API Analysis**: Determine if methods might be called externally via API
5. **Rake Tasks**: Check if code might be used in rake tasks or schedulers

## Additional Ruby/Rails-Specific Guidance

### Ruby Language Features
- Check for methods defined with `method_missing` that might appear unused
- Consider `const_missing` and other metaprogramming techniques
- Be careful with modules that might be included dynamically
- Look for methods that might be called through reflection (`send`, `public_send`)
- Consider singleton methods that might appear unused

### Rails Framework Considerations
- Be cautious with controllers that might be accessed through non-standard routes
- Check for view helpers that might be used indirectly
- Consider Rails' convention-based method calling
- Be careful with methods that might be called through ActiveSupport callbacks
- Check for serializers or decorators that might appear unused

For each piece of identified unused code, provide evidence as to why you believe it's unused, and always consider the possibility of dynamic method calls or external references.

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.