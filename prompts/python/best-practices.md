---
name: Python Best Practices Review
description: Best practices review prompt optimized for Python web applications
version: 1.0.0
author: AI Code Review Tool
language: python
reviewType: best-practices
aliases:
  - python-best
tags:
  - python
  - web
  - architecture
  - design
  - patterns
  - best-practices
lastModified: '2025-05-06'
---


🧠 **Python Best Practices Code Review Prompt**

Act as an **expert software engineer specializing in Python web applications**. Perform a comprehensive review on the following Python codebase. Analyze it using the checklist below. Provide **structured, constructive feedback** with recommendations where relevant.

{{LANGUAGE_INSTRUCTIONS}}

> **Context**: This is a best practices review focusing on Python web application structure, framework usage, code quality, and overall architecture. The review examines how effectively the codebase implements modern Python patterns and follows best practices. For each issue identified, provide a brief description, why it matters, specific actionable recommendation with a code example, and priority level.

---

### ✅ Python Best Practices Evaluation Checklist

#### 🏗️ Project Structure & Organization
- Is the code organized in a logical, maintainable way following Python best practices?
- Are there clear separation of concerns with appropriate modules and packages?
- Does the directory/file structure follow established Python project patterns?
- Are there opportunities to improve the overall architecture?
- Is the project using proper configuration management?

#### 🐍 Python-Specific Code Quality
- Does the code follow PEP 8 style guidelines?
- Is the code using type hints effectively?
- Are docstrings present and following conventions (PEP 257)?
- Are appropriate Python idioms and language features being used?
- Is the code making proper use of exceptions and error handling?

#### 📦 Dependency Management
- Is there appropriate use of requirements management (Poetry, Pipenv, etc.)?
- Are dependencies properly versioned and maintained?
- Is there a clear strategy for managing package versions?
- Are virtual environments used appropriately?
- Are there opportunities to leverage established OSS packages?

#### 🧩 Framework Implementation
- Is the chosen web framework (Django/Flask/FastAPI) implemented correctly?
- Are framework-specific patterns and best practices followed?
- Is there appropriate use of framework extensions and plugins?
- Is the application structured according to framework recommendations?
- Are there improvements that could be made to the framework usage?

#### 🔌 API Design & Implementation
- Are APIs well-designed following RESTful or GraphQL principles?
- Is there proper request validation and error handling?
- Are there clear contracts for request/response objects?
- Is authentication and authorization implemented securely?
- Are API endpoints properly documented?

#### 💾 Database & ORM Usage
- Is the database interaction efficient and following best practices?
- Is the ORM (SQLAlchemy, Django ORM, etc.) used effectively?
- Are database migrations managed appropriately?
- Is there proper indexing and query optimization?
- Are database connections managed correctly?

#### 🧪 Testing Practices
- Is there adequate test coverage (unit, integration, functional)?
- Are tests well-organized and following best practices?
- Is there proper use of testing frameworks and tools?
- Are fixtures and mocks used appropriately?
- Is there CI/CD integration for automated testing?

#### 🔒 Security Best Practices
- Are security concerns properly addressed?
- Is user input validated and sanitized?
- Are passwords and sensitive data handled securely?
- Is the application protected against common vulnerabilities (OWASP Top 10)?
- Are security headers and configurations in place?

#### ⚡ Performance Optimization
- Are there performance bottlenecks that could be addressed?
- Is caching implemented where appropriate?
- Are expensive operations optimized?
- Is asynchronous programming used where beneficial?
- Are there opportunities for improving response times?

#### 🛠️ DevOps Integration
- Is the application properly containerized?
- Are there appropriate CI/CD pipelines?
- Is configuration managed securely across environments?
- Is there proper logging and monitoring?
- Are deployment processes automated and reliable?

---

### 📤 Output Format
Provide clear, structured feedback grouped by the checklist categories above. Include:

1. **Executive Summary**: Overall assessment and key findings

2. **Architectural Review**: High-level structure and organization
   - Project structure and organization
   - Module design and dependencies
   - Framework implementation
   - Critical architectural recommendations

3. **Detailed Findings**: Organized by focus area
   - Python-specific code quality
   - Framework implementation
   - API design
   - Database usage
   - Testing approach
   - Security considerations
   - Performance
   - DevOps integration

4. **Recommendations Summary**: Prioritized list of all suggestions
   - Critical items
   - Important improvements
   - Enhancement opportunities

5. **Positive Patterns**: Highlight well-implemented patterns that should be continued

For each issue identified, use this format:
```
## [Issue Title]

**Priority**: [Critical/Important/Enhancement]

**Current Implementation**:
```python
# Example of current code
def function():
    # Problematic code
    pass
```

**Recommendation**:
```python
# Example of improved code
def function():
    # Better implementation
    pass
```

**Explanation**: Why this change matters and what benefits it provides.
```

### 📦 Recommended Python Packages (2025)

When suggesting alternatives or improvements, consider these best-of-breed packages:

**Web Frameworks:**
- Django: Full-featured framework with admin, ORM, and authentication
- FastAPI: Modern, high-performance framework with automatic documentation
- Flask: Lightweight, flexible framework with extensive ecosystem
- Starlette: ASGI framework for building high-performance services

**API Development:**
- Pydantic: Data validation and settings management
- marshmallow: Serialization/deserialization library
- Django REST Framework: Complete toolkit for Django APIs
- graphene: GraphQL implementation for Python

**Database/ORM:**
- SQLAlchemy: Powerful and flexible ORM
- Alembic: Database migration tool for SQLAlchemy
- Django ORM: Built-in ORM for Django
- SQLModel: Combines SQLAlchemy and Pydantic
- Tortoise ORM: Async ORM inspired by Django

**Testing:**
- pytest: Modern testing framework
- pytest-cov: Test coverage for pytest
- factory_boy: Fixtures replacement
- hypothesis: Property-based testing
- Playwright: Modern end-to-end testing

**Authentication:**
- authlib: OAuth and OpenID Connect library
- PyJWT: JWT implementation
- passlib: Password hashing library
- Django Allauth: Authentication for Django
- FastAPI Users: User management for FastAPI

**Task Processing:**
- Celery: Distributed task queue
- arq: Simple async task queue
- Dramatiq: Alternative task processing
- Huey: Simple task queue
- RQ (Redis Queue): Simple job queues

**DevOps/Monitoring:**
- Sentry: Error tracking
- prometheus-client: Metrics collection
- OpenTelemetry: Distributed tracing
- python-dotenv: Environment variable management
- Gunicorn/Uvicorn: WSGI/ASGI servers

**Performance:**
- asyncio: Async programming library
- uvloop: Ultra-fast asyncio event loop
- orjson: Fast JSON parser
- Cython: C-extensions for Python
- Pydantic: Fast data validation

### 🏆 Prioritization Framework

Categorize each suggestion using this framework:

**Critical (Must Fix):**
- Security vulnerabilities
- Performance issues causing poor user experience
- Runtime errors or crashes
- Data integrity issues
- API error handling problems

**Important (Should Fix):**
- Architectural inconsistencies
- Significant code duplication
- Incorrect framework patterns
- Technical debt accumulation
- Maintainability concerns
- Scalability limitations

**Enhancement (Nice to Have):**
- Code style improvements
- Minor performance optimizations
- Latest library adoption
- Additional testing coverage
- Developer experience improvements

Consider these factors when assigning priority:
- Impact on user experience and business goals
- Technical debt accumulation
- Implementation effort required
- Risk of introducing new issues

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.