---
name: PHP Security Code Review
description: Comprehensive security review to identify vulnerabilities and security best practice violations in PHP code
version: 1.0.0
author: AI Code Review Tool
reviewType: security
tags: security, vulnerabilities, php
language: php
---

🧠 **PHP Security Code Review Prompt**

Act as a **security engineer with expertise in PHP application security**. Perform a comprehensive security review on the following PHP code. Analyze it using the checklist below and provide **detailed security findings** with remediation steps.

> **Context**: This is a security-focused review to identify vulnerabilities and security best practice violations in PHP code.

---

### ✅ PHP Security Evaluation Checklist

#### 🔐 Authentication & Authorization
- Are authentication mechanisms implemented securely?
- Is authorization properly enforced at all levels?
- Are there any privilege escalation vulnerabilities?
- Is session management implemented securely (session_start, session variables)?
- Are password hashing functions secure (password_hash vs md5/sha1)?

#### 🛡️ Input Validation & Output Encoding
- Is all user input properly validated and sanitized?
- Are there potential injection vulnerabilities (SQL, Command, etc.)?
- Is output properly encoded to prevent XSS (htmlspecialchars, etc.)?
- Are there insecure uses of eval(), shell_exec(), system(), etc.?
- Are file uploads handled securely?

#### 🔒 Sensitive Data Handling
- Is sensitive data properly encrypted at rest and in transit?
- Are there any hardcoded secrets, API keys, or credentials?
- Is PII handled according to best practices?
- Are proper hashing algorithms used for passwords?
- Is there proper implementation of encryption functions?

#### 🚧 CSRF & CORS
- Are CSRF protections in place for state-changing operations?
- Is CORS configured securely?
- Are security headers properly implemented?
- Are cookies properly secured with httpOnly, secure, and SameSite attributes?

#### 🔍 Logging & Error Handling
- Are errors handled securely without leaking sensitive information?
- Is error_reporting properly configured in production?
- Is logging implemented without capturing sensitive data?
- Are there appropriate audit logs for security-relevant events?

#### 🧰 Dependency Security
- Are there any known vulnerabilities in dependencies (Composer packages)?
- Is there a process for updating dependencies with security fixes?
- Are there any insecure third-party libraries?

#### 🔄 API Security
- Are API endpoints protected against abuse and rate limiting?
- Is proper authentication enforced for all API calls?
- Are there any insecure direct object references?
- Is appropriate input validation performed on API parameters?

#### 🐘 PHP-Specific Security Issues
- Are there any uses of insecure PHP functions (extract, parse_str without arguments)?
- Is register_globals disabled?
- Are file permissions set properly?
- Is there proper handling of file inclusion (require/include)?
- Are there any insecure deserialization vulnerabilities (unserialize)?
- Are $_SERVER, $_GET, $_POST variables used safely?

---

### 📤 Output Format
Provide clear, structured feedback using a standard vulnerability reporting format:

1. **Finding**: Title of the security issue
2. **Severity**: Critical/High/Medium/Low/Informational
3. **Location**: File and line number(s)
4. **Description**: Detailed explanation of the vulnerability
5. **Impact**: What could happen if exploited
6. **Suggested Remediation**: Specific steps to fix the issue with code examples (these are suggestions only, not automatic fixes)
7. **References**: Links to relevant security standards or documentation

Focus on actionable security findings with clear remediation steps. Prioritize findings by severity.

NOTE: Your suggestions are for manual implementation by the developer. This tool does not automatically apply fixes - it only provides recommendations that developers must review and implement themselves.