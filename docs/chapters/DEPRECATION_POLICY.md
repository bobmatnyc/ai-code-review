# Deprecation Policy

This document outlines the deprecation policy for the AI Code Review tool to ensure smooth transitions and maintain backward compatibility.

## Overview

The AI Code Review tool follows semantic versioning and provides clear deprecation warnings before removing features. This policy ensures users have adequate time to migrate to new APIs and configurations.

## Deprecation Timeline

### Standard Deprecation Schedule

1. **Announcement**: Feature marked as deprecated with warnings
2. **Grace Period**: 6 months minimum for major features, 3 months for minor features
3. **Removal**: Feature removed in next major version

### Emergency Deprecations

For security issues or critical bugs:
- **Immediate**: Feature disabled with error messages
- **Hotfix**: Alternative provided within 1 week
- **Removal**: Next patch or minor version

## Current Deprecations

### Environment Variables (Deprecated in v4.2.0)

**Deprecated**: `CODE_REVIEW_*` prefixes
**Replacement**: `AI_CODE_REVIEW_*` prefixes
**Timeline**: Remove in v5.0.0 (estimated Q3 2025)

```bash
# Deprecated (shows warnings)
CODE_REVIEW_GOOGLE_API_KEY=key
CODE_REVIEW_OPENROUTER_API_KEY=key
CODE_REVIEW_ANTHROPIC_API_KEY=key
CODE_REVIEW_OPENAI_API_KEY=key

# Current (recommended)
AI_CODE_REVIEW_GOOGLE_API_KEY=key
AI_CODE_REVIEW_OPENROUTER_API_KEY=key
AI_CODE_REVIEW_ANTHROPIC_API_KEY=key
AI_CODE_REVIEW_OPENAI_API_KEY=key
```

### Configuration Modules (Deprecated in v4.2.0)

**Deprecated**: Multiple configuration modules
**Replacement**: `unifiedConfig.ts`
**Timeline**: Remove in v5.0.0

```typescript
// Deprecated
import { getConfig } from './utils/config';
import { loadEnv } from './utils/envLoader';
import { ConfigManager } from './utils/configManager';

// Current
import { getUnifiedConfig } from './utils/unifiedConfig';
```

### Directory Structure (Deprecated in v4.2.0)

**Deprecated**: Nested utility directories
**Replacement**: Flattened structure
**Timeline**: Remove in v5.0.0

```typescript
// Deprecated
import { sanitizeContent } from './utils/parsing/sanitizer';
import { fileExists } from './utils/files/fileSystem';
import { getPromptTemplate } from './utils/templates/promptTemplateManager';

// Current
import { sanitizeContent } from './utils/sanitizer';
import { fileExists } from './utils/fileSystemUtils';
import { getPromptTemplate } from './utils/promptTemplateManager';
```

## Deprecation Process

### 1. Marking as Deprecated

When deprecating a feature:

```typescript
/**
 * @deprecated Use newFunction() instead. Will be removed in v5.0.0
 * @see {@link newFunction}
 */
export function oldFunction() {
  console.warn('DEPRECATION WARNING: oldFunction() is deprecated. Use newFunction() instead.');
  // ... existing implementation
}
```

### 2. Documentation Updates

- Add deprecation notice to README
- Update migration guides
- Add to CHANGELOG
- Update TypeScript definitions with `@deprecated` tags

### 3. Warning Messages

Deprecated features should show clear warnings:

```typescript
logger.warn('⚠️  DEPRECATION WARNING: CODE_REVIEW_* environment variables are deprecated.');
logger.warn('   Please use AI_CODE_REVIEW_* instead.');
logger.warn('   Support will be removed in v5.0.0');
```

### 4. Migration Guides

Provide clear migration paths:
- Step-by-step instructions
- Code examples
- Automated migration scripts when possible
- Timeline for removal

## Version Compatibility

### Major Versions (x.0.0)
- May remove deprecated features
- Breaking changes allowed
- Comprehensive migration guide provided

### Minor Versions (x.y.0)
- New deprecations may be introduced
- No breaking changes
- Backward compatibility maintained

### Patch Versions (x.y.z)
- Bug fixes only
- No new deprecations
- No breaking changes

## Communication Channels

### Deprecation Announcements
1. **GitHub Releases**: Detailed changelog
2. **README**: Updated with deprecation notices
3. **Runtime Warnings**: Clear console messages
4. **Documentation**: Migration guides and timelines

### Getting Help with Migrations
- **GitHub Issues**: Tag with `migration-help`
- **Documentation**: Check `docs/CONFIGURATION_MIGRATION.md`
- **Examples**: See `docs/examples/` for updated patterns

## Best Practices for Users

### Stay Updated
- Subscribe to GitHub releases
- Read changelogs before upgrading
- Test in development before production updates

### Handle Deprecations
- Address warnings promptly
- Don't wait until removal deadline
- Test migrations thoroughly

### Version Pinning
```json
{
  "dependencies": {
    "@bobmatnyc/ai-code-review": "~4.2.0"
  }
}
```

## Best Practices for Contributors

### Before Deprecating
- Ensure replacement functionality exists
- Provide clear migration path
- Consider impact on users

### Deprecation Implementation
- Add comprehensive warnings
- Update all documentation
- Provide migration examples
- Set clear timeline

### Removal Process
- Verify grace period has passed
- Update major version
- Remove deprecated code completely
- Update documentation

## Exception Handling

### Security Issues
- Immediate deprecation allowed
- Emergency patches provided
- Clear security advisory issued

### Critical Bugs
- Fast-track deprecation possible
- Alternative provided quickly
- Clear communication about urgency

### External Dependencies
- Follow upstream deprecation schedules
- Provide abstractions when possible
- Communicate third-party changes

## Monitoring Deprecations

### Automated Checks
- CI/CD warnings for deprecated usage
- Dependency scanning for deprecated packages
- Regular audits of deprecated features

### User Feedback
- Monitor GitHub issues for migration problems
- Track usage of deprecated features
- Adjust timelines based on adoption

## Future Considerations

### Planned Deprecations (v5.0.0)
- Legacy configuration system
- Old environment variable prefixes
- Nested directory imports
- Some CLI argument formats

### Long-term Goals
- Simplified configuration
- Consistent API patterns
- Better TypeScript support
- Improved error messages

---

This policy ensures that the AI Code Review tool can evolve while maintaining stability and user trust. For questions about specific deprecations, please open a GitHub issue.
