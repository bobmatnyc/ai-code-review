---
name: Ruby Code Tracing Unused Code Review
description: Performs deep code tracing to identify unused code in Ruby/Rails projects with high confidence
version: 1.0.0
author: AI Code Review Team
reviewType: code-tracing-unused-code
language: ruby
tags: maintenance, cleanup, tracing, ruby, rails
---

# Ruby/Rails Code Tracing Unused Code Review

As an expert Ruby and Ruby on Rails developer, please conduct a comprehensive code tracing analysis to identify unused or dead code in the provided Ruby/Rails codebase with high confidence. Use a multi-pass approach to deeply analyze the codebase and find code that can be safely removed.

## Multi-Pass Analysis Approach

### Pass 1: Entry Point Identification
- Identify all application entry points:
  - Public controller actions mapped to routes
  - Rake tasks
  - Background jobs
  - API endpoints
  - Initializers and configuration files
  - Mailers and their actions
  - ActiveRecord callbacks
  - View helpers used in templates
  - Test files that may use certain classes

### Pass 2: Deep Dependency Tracing
- From each entry point, trace through all method calls and references
- Track object instantiations and class/module usage
- Follow inheritance hierarchies
- Identify all included modules
- Trace through associations and Active Record relations
- Map out the complete dependency graph
- Identify conditional logic paths and evaluate branch reachability

### Pass 3: Verification & Classification
- Cross-reference calls and definitions
- Check for dynamically defined or invoked methods
- Verify calls through metaprogramming techniques
- Consider reflection-based method calls
- Assess confidence levels for each potentially unused element
- Flag special cases that might need manual verification

## Ruby-Specific Analysis Techniques

### Method and Class Usage Analysis
- Account for Ruby's dynamic method invocation (`send`, `method`, `public_send`)
- Check for method_missing implementation
- Track `extend` and `include` usage
- Analyze singleton methods and eigenclasses
- Consider constants lookup and inheritance
- Track class variables and their usage

### Rails-Specific Analysis
- Analyze routes.rb and map to controller actions
- Check for convention-based method calls (filters, callbacks)
- Analyze template rendering and helper usage
- Track concerns and their inclusion
- Analyze ActiveRecord associations and scopes
- Check for counter cache usage
- Track callbacks and their triggers
- Analyze view rendering paths
- Check Service objects and their invocation patterns

### Metaprogramming Considerations
- Track `define_method` usage
- Check for `class_eval` and `instance_eval`
- Analyze `const_get` and `const_set` usage
- Track dynamic constant assignment
- Check for `delegate` usage
- Analyze ActiveSupport::Concern extensions
- Track ActiveRecord dynamic finders

## Output Format

For each identified unused code element, provide:

1. **Element Information**:
   - Type (Class, Module, Method, Route, etc.)
   - Location (File path and line numbers)
   - Full definition context

2. **Evidence of Non-Usage**:
   - Complete trace evidence showing why it's determined to be unused
   - Call graph analysis results
   - Any potential conflicts or edge cases

3. **Risk Assessment**:
   - Confidence level (High, Medium, Low)
   - Potential impact of removal
   - Verification steps before removal
   - Any external dependencies to check

4. **Removal Recommendation**:
   - Clear steps to safely remove the code
   - Any dependencies that would also need removal
   - Suggested commit message explaining the removal
   - Tests to verify functionality after removal

## Special Considerations

### Dynamic Ruby Features
- Pay special attention to `method_missing` implementations
- Flag any uses of `const_missing`
- Analyze `included` and `extended` hooks
- Check for `respond_to_missing?` implementations
- Consider any use of `binding` or `eval`
- Track usage of `define_singleton_method`

### Rails Framework Specifics
- Check if seemingly unused methods might be ActiveJob handlers
- Consider HTTP verb constraints in routes
- Analyze controller callbacks and filters
- Check for template lookup paths
- Consider engine mounting points
- Check for any use of `rails/all` that might include unused components
- Analyze ActiveStorage attachments
- Check for Action Cable channels and subscriptions

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.