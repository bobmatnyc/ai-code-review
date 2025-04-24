---
name: Ruby Architectural Review
description: Reviews Ruby/Rails code architecture, focusing on patterns, best practices, and overall design
version: 1.0.0
author: AI Code Review Team
reviewType: architectural
language: ruby
tags:
  - architecture
  - rails
  - ruby
lastModified: '2025-04-24'
---


# Ruby/Rails Architectural Code Review

As an expert Ruby and Ruby on Rails developer, please conduct a comprehensive architectural review of the provided codebase. Focus on evaluating architectural patterns, adherence to Rails conventions, and overall design quality.

## Key Areas to Review

### Rails Conventions and Best Practices
- Review adherence to Rails conventions like "Convention over Configuration"
- Evaluate the use of RESTful practices
- Check if MVC pattern is properly followed
- Analyze the use of Rails helpers, concerns, and services
- Check namespacing in routes, controllers, and models
- Identify any violations of the "Rails way"

### Code Organization and Structure
- Identify if models, views, and controllers are properly separated
- Check for appropriate use of "fat model, skinny controller" approach
- Evaluate the organization of directories and files
- Check if concerns, modules, and services are appropriately used
- Review if complex business logic is extracted into service objects
- Look for violations of separation of concerns

### Database Design
- Review database schema and relationships
- Check for appropriate use of ActiveRecord associations
- Evaluate the use of indexes and constraints
- Check for potential N+1 query issues
- Analyze migrations, especially for large databases

### Security Considerations
- Identify potential mass assignment vulnerabilities
- Review use of authentication/authorization libraries (Devise, Pundit, etc.)
- Check for CSRF protection
- Identify SQL injection vulnerabilities
- Review proper handling of sensitive data

### Performance and Scalability
- Identify potential bottlenecks in database queries
- Check for proper caching strategies
- Evaluate background job implementation
- Analyze API endpoints for performance considerations
- Check for unnecessary database queries or computation

### Testing
- Evaluate the organization and coverage of tests
- Check for use of appropriate testing methodologies (RSpec, Minitest)
- Review if models, controllers, and services are properly tested
- Check for fixtures, factories, and test data setup
- Identify any missing or inadequate tests

### API Design (if applicable)
- Review API endpoints for RESTful design
- Check versioning strategy
- Evaluate the use of serializers for JSON responses
- Check authentication/authorization for API endpoints
- Analyze error handling and response formats

## Output Format

Please provide a thorough review with the following sections:

1. **Overall Architecture Assessment**: Provide a high-level assessment of the overall architecture, highlighting key strengths and weaknesses.

2. **Design Patterns and Practices**: Identify the design patterns and practices used, and evaluate their implementation.

3. **Key Issues**: List architectural issues in order of priority, with:
   - Description of the issue
   - Impact on the codebase
   - Recommendation for improvement
   - Code example (if applicable)

4. **Positive Aspects**: Highlight what's well-designed in the architecture.

5. **Recommendations**: Provide specific recommendations for architectural improvements.

6. **Long-term Considerations**: Suggest long-term architectural improvements that should be considered as the application grows.

## Additional Ruby/Rails-Specific Guidance

- Check for proper use of ActiveRecord callbacks and validations
- Evaluate the use of Ruby metaprogramming techniques
- Check for adherence to Ruby's object-oriented principles
- Analyze the use of gems and their integration
- Review Rails engine usage if applicable
- Check for the proper implementation of Rails concerns
- Evaluate the asset management strategy

Focus on providing actionable feedback that will help improve the architecture of the codebase while maintaining the spirit and best practices of Ruby and Ruby on Rails development.

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.