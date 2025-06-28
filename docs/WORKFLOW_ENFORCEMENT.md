# Workflow Enforcement

This document describes the automated workflow enforcement mechanisms in place to maintain code quality and consistency.

## Overview

The AI Code Review project uses multiple layers of automated enforcement to ensure:
- Code quality and consistency
- Proper migration from deprecated features
- Documentation accuracy
- Security best practices
- Build integrity

## Enforcement Layers

### 1. Pre-commit Hooks

**Location**: `.pre-commit-config.yaml`
**Setup**: Run `./scripts/setup-pre-commit.sh`

#### Code Quality Hooks
- **ESLint**: Enforces coding standards and catches common errors
- **TypeScript**: Type checking before commits
- **Trailing whitespace**: Automatically removes trailing spaces
- **File endings**: Ensures proper line endings

#### Migration Enforcement
- **Deprecated environment variables**: Blocks commits with `CODE_REVIEW_*` variables
- **Import path validation**: Prevents use of old nested import paths
- **Configuration validation**: Warns about deprecated config usage

#### Security Hooks
- **Secret detection**: Scans for accidentally committed API keys
- **Private key detection**: Prevents committing private keys
- **Large file detection**: Blocks files over 1MB

#### Documentation Hooks
- **Package manager consistency**: Ensures pnpm-first documentation
- **JSON/YAML validation**: Validates configuration files
- **Merge conflict detection**: Prevents committing merge conflicts

### 2. GitHub Actions (CI/CD)

**Location**: `.github/workflows/`

#### Build Validation
```yaml
- name: Build validation
  run: pnpm run build
  
- name: Type checking
  run: pnpm run build:types
  
- name: Lint checking
  run: pnpm run lint
```

#### Test Enforcement
```yaml
- name: Unit tests
  run: pnpm test
  
- name: Integration tests
  run: pnpm run test:integration
```

#### Security Scanning
```yaml
- name: Dependency audit
  run: pnpm audit
  
- name: Security scan
  uses: github/super-linter@v4
```

### 3. Package.json Scripts

**Enforcement through npm scripts**:

```json
{
  "scripts": {
    "precommit": "lint-staged",
    "prepush": "pnpm run build && pnpm test",
    "ci:local": "pnpm run lint && pnpm run build:types && pnpm test && pnpm run build"
  }
}
```

### 4. IDE Integration

#### VSCode Settings
**Location**: `.vscode/settings.json`

```json
{
  "typescript.preferences.includePackageJsonAutoImports": "off",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true
  }
}
```

#### Recommended Extensions
**Location**: `.vscode/extensions.json`

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss"
  ]
}
```

## Enforcement Rules

### Critical (Blocks commits/builds)
1. **TypeScript errors**: Must be zero
2. **ESLint errors**: Must be resolved
3. **Build failures**: Must pass
4. **Test failures**: Must pass
5. **Security issues**: Must be addressed
6. **Deprecated environment variables**: Must be migrated

### Warnings (Allows commits but shows warnings)
1. **Deprecated imports**: Suggests migration
2. **Code complexity**: Suggests refactoring
3. **Performance issues**: Suggests optimization
4. **Documentation gaps**: Suggests updates

### Auto-fixes (Applied automatically)
1. **Code formatting**: Prettier/ESLint auto-fix
2. **Import sorting**: Automatic organization
3. **Trailing whitespace**: Automatic removal
4. **Line endings**: Automatic normalization

## Bypass Mechanisms

### Emergency Commits
```bash
# Skip pre-commit hooks (use sparingly)
git commit --no-verify -m "emergency: critical hotfix"

# Skip specific hooks
SKIP=eslint git commit -m "fix: urgent change"
```

### CI Skip
```bash
# Skip CI for documentation-only changes
git commit -m "docs: update README [skip ci]"
```

### Temporary Disables
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response;

// TODO: Remove this disable after migration
// @ts-ignore
legacyFunction();
```

## Configuration Files

### ESLint Configuration
**Location**: `.eslintrc.json`

Key rules enforced:
- No unused variables
- Consistent import ordering
- TypeScript strict mode
- No deprecated API usage

### TypeScript Configuration
**Location**: `tsconfig.json`

Key settings:
- Strict mode enabled
- No implicit any
- Unused locals detection
- Path mapping for clean imports

### Pre-commit Configuration
**Location**: `.pre-commit-config.yaml`

Hooks configuration:
- Language versions
- File patterns
- Exclusion rules
- Custom validation scripts

## Monitoring and Metrics

### Enforcement Metrics
- Pre-commit hook success rate
- CI/CD build success rate
- Time to fix violations
- Repeat violation patterns

### Quality Metrics
- Code coverage percentage
- TypeScript strict compliance
- ESLint rule compliance
- Security scan results

## Troubleshooting

### Common Issues

#### Pre-commit Hook Failures
```bash
# Update hooks
pre-commit autoupdate

# Clear cache
pre-commit clean

# Reinstall
pre-commit uninstall && pre-commit install
```

#### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Rebuild types
pnpm run build:types
```

#### ESLint Errors
```bash
# Auto-fix what's possible
pnpm run lint:fix

# Check specific files
pnpm exec eslint src/specific-file.ts
```

### Performance Issues

#### Slow Pre-commit Hooks
- Use `--files` flag for specific files
- Configure hook exclusions
- Optimize TypeScript project references

#### Large Repository Issues
- Use `.gitignore` effectively
- Exclude generated files
- Use sparse checkout for large repos

## Best Practices

### For Developers
1. **Run checks locally**: Use `pnpm run ci:local` before pushing
2. **Fix issues promptly**: Don't accumulate technical debt
3. **Understand the rules**: Read ESLint and TypeScript docs
4. **Use IDE integration**: Configure your editor for real-time feedback

### For Maintainers
1. **Keep rules updated**: Regular dependency updates
2. **Monitor metrics**: Track enforcement effectiveness
3. **Adjust thresholds**: Balance strictness with productivity
4. **Document exceptions**: Clear rationale for bypasses

### For Contributors
1. **Follow the setup guide**: Use provided setup scripts
2. **Ask for help**: Open issues for unclear violations
3. **Suggest improvements**: Propose better enforcement rules
4. **Test thoroughly**: Ensure changes don't break enforcement

## Future Enhancements

### Planned Improvements
- Automated dependency updates
- Performance regression detection
- Code complexity monitoring
- Security vulnerability scanning

### Integration Opportunities
- GitHub Projects automation
- Slack notifications for violations
- Automated issue creation
- Performance benchmarking

---

This enforcement system ensures consistent code quality while providing flexibility for legitimate exceptions. For questions or issues with enforcement rules, please open a GitHub issue.
