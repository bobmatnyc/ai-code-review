---
name: Ruby Security Review
description: Reviews Ruby/Rails code for security vulnerabilities, focusing on common Rails security issues
version: 1.0.0
author: AI Code Review Team
reviewType: security
language: ruby
tags: security, rails, ruby
---

# Ruby/Rails Security Code Review

As an expert in Ruby/Rails security, please conduct a comprehensive security review of the provided codebase. Focus on identifying security vulnerabilities and suggesting fixes for them.

## Key Security Areas to Review

### Authentication & Authorization
- Review Devise or other authentication system implementation
- Check for proper authorization (Pundit, CanCanCan, etc.)
- Identify missing authorization checks
- Check for improper session management
- Review password policies and implementation
- Check for proper role/permission validations
- Identify JWT or API token security issues

### Input Validation & Sanitization
- Check for SQL injection vulnerabilities
- Identify potential XSS vulnerabilities
- Check for CSRF protection
- Review mass assignment vulnerabilities
- Identify parameter tampering opportunities
- Check for proper sanitization of user input
- Review file upload security

### Rails-Specific Security
- Check for proper use of strong parameters
- Review direct object reference vulnerabilities
- Check if protect_from_forgery is enabled
- Identify sensitive data in logs
- Review the use of Rails security features
- Check for insecure redirect_to calls
- Review content security policy implementation

### Data Protection
- Check for sensitive data exposure
- Review storage of sensitive information
- Identify improper handling of PII
- Check for secure communication (SSL/TLS)
- Review database security settings
- Identify insecure default settings
- Check for proper encryption usage

### API Security
- Review API authentication
- Check for rate limiting implementation
- Identify missing request validation
- Review error responses for information leakage
- Check for API versioning security issues
- Identify insecure API endpoints
- Review CORS configuration

### Dependency Security
- Check for outdated gems with known vulnerabilities
- Review usage of third-party libraries
- Identify insecure dependency configurations
- Check for proper dependency management

### Configuration & Environment
- Check for secrets in source code
- Review environment-specific security settings
- Identify insecure deployment configurations
- Check for debug flags or modes in production
- Review database.yml and other config files
- Identify hardcoded credentials or API keys

## Output Format

For each security issue found, please include:

1. **Vulnerability**: A clear name and description of the vulnerability
2. **Severity**: Critical / High / Medium / Low / Info
3. **Location**: Exact file, class, method, and line numbers affected
4. **OWASP Category**: The relevant OWASP Top 10 or OWASP API Top 10 category
5. **Impact**: What could happen if this vulnerability is exploited
6. **Description**: Detailed explanation of the vulnerability
7. **Proof of Concept**: How the vulnerability could be exploited (if applicable)
8. **Recommended Fix**: Specific code changes or approaches to remediate the issue
9. **References**: Links to relevant documentation or best practices

## Additional Ruby/Rails-Specific Security Guidance

### ActiveRecord
- Check for unscoped finds (`Model.find(params[:id])` vs. proper scoping)
- Look for raw SQL queries using string interpolation
- Review use of `update_attribute`, which skips validations
- Check for missing database constraints that complement model validations

### Controllers
- Review `render` calls that might expose sensitive data
- Check for `redirect_to params[:url]` or similar patterns
- Review any `send_file` or `send_data` usage
- Check for controller methods that allow mass updates

### Views
- Look for `raw`, `html_safe`, or `sanitize` usage
- Check for inclusion of user input in JavaScript
- Review form helpers for proper security attributes
- Identify places where user data is rendered without escaping

### API-Specific
- Check for proper token validation
- Review error messages for information disclosure
- Look for sensitive data in responses
- Check if HTTPS is enforced for all communications

Focus on providing actionable, specific recommendations for addressing each security issue. Prioritize vulnerabilities by severity and ease of exploitation.

Use English for all headings and content. Format your review with clear sections, bullet points, and code examples where appropriate.