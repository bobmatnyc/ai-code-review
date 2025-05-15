# Security Policy

## Supported Versions

We actively support the following versions of `@bobmatnyc/ai-code-review`:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. Please follow these guidelines when reporting security issues:

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Use GitHub Security Advisories to report vulnerabilities privately
3. Go to the [Security tab](https://github.com/bobmatnyc/ai-code-review/security) of this repository
4. Click "Report a vulnerability"
5. Fill out the advisory form with detailed information

### What to Include

Please include the following information in your report:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any proof-of-concept code (if applicable)
- Suggested mitigation or fix (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity and complexity

### Security Considerations for Users

This tool processes your code with AI services. Please be aware:

- **API Keys**: Never commit API keys to version control
- **Code Privacy**: Your code is sent to third-party AI services (Google, Anthropic, OpenAI, OpenRouter)
- **Local Processing**: Code analysis is performed locally before AI submission
- **No Persistent Storage**: We do not store your code on our servers
- **Environment Variables**: Use `.env.local` for sensitive configuration

### Security Best Practices

When using this tool:

1. Use environment variables for all API keys
2. Add `.env.local` to your `.gitignore`
3. Be mindful of what code you're reviewing with external AI services
4. Review the tool's output before implementing suggested changes
5. Keep the tool updated to the latest version

### Security Features

- All API communications use HTTPS
- API keys are never logged or stored
- Local processing before external API calls
- No telemetry or usage tracking
- Open source code for transparency

## Responsible Disclosure

We appreciate security researchers who help improve our project's security. For verified vulnerabilities:

- We will acknowledge your contribution in the security advisory
- We may provide public recognition (with your permission)
- We'll work with you on coordinated disclosure

Thank you for helping keep our project secure!