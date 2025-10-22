# Release Process

This document describes the automated release process for AI Code Review.

## Overview

The AI Code Review project uses a fully automated release system with:
- ✅ **Semantic versioning** (patch/minor/major)
- ✅ **Automated testing** and validation
- ✅ **GitHub Actions** for CI/CD
- ✅ **Automatic npm publishing**
- ✅ **Changelog generation**
- ✅ **GitHub releases** with assets

## Quick Release

For most releases, use these simple commands:

```bash
# 1. Pre-release validation
pnpm run pre-release

# 2. Create release (patch version bump)
pnpm run release:patch

# 3. Push to trigger automated publishing
git push origin main --tags
```

## Detailed Process

### 1. Pre-Release Validation

Always run pre-release checks before creating a release:

```bash
pnpm run pre-release
```

This validates:
- ✅ Build system integrity
- ✅ TypeScript compilation
- ✅ Code linting and formatting
- ✅ Test coverage
- ✅ Documentation completeness
- ✅ Security audit
- ✅ Version consistency
- ✅ Git status (clean working directory)
- ✅ Build output verification

### 2. Version Bumping

Choose the appropriate version bump:

```bash
# Patch release (4.4.6 -> 4.4.7) - Bug fixes
pnpm run release:patch

# Minor release (4.4.6 -> 4.5.0) - New features
pnpm run release:minor

# Major release (4.4.6 -> 5.0.0) - Breaking changes
pnpm run release:major

# Dry run to preview changes
pnpm run release:dry-run
```

### 3. Automated Publishing

Once you push the tag, GitHub Actions automatically:

1. **Builds and tests** the release
2. **Updates package.json** version
3. **Generates changelog** from git commits
4. **Creates GitHub release** with release notes
5. **Publishes to npm** with public access
6. **Uploads CLI binary** as release asset
7. **Verifies publication** on npm

### 4. Monitor Release

Track the release progress:
- **GitHub Actions**: https://github.com/bobmatnyc/ai-code-review/actions
- **npm Package**: https://www.npmjs.com/package/@bobmatnyc/ai-code-review
- **GitHub Releases**: https://github.com/bobmatnyc/ai-code-review/releases

## Release Types

### Patch Release (x.y.Z)
- Bug fixes
- Documentation updates
- Minor improvements
- Security patches

```bash
pnpm run release:patch
```

### Minor Release (x.Y.0)
- New features
- New review types
- New language support
- CLI enhancements

```bash
pnpm run release:minor
```

### Major Release (X.0.0)
- Breaking changes
- API changes
- Major architecture updates
- Removed features

```bash
pnpm run release:major
```

## Manual Release (Emergency)

If automated release fails, you can publish manually:

```bash
# 1. Build the package
pnpm run build

# 2. Update version manually
npm version patch --no-git-tag-version

# 3. Publish to npm
pnpm publish --access public

# 4. Create git tag
git tag v$(node -p "require('./package.json').version")
git push origin main --tags
```

## Troubleshooting

### Pre-release Validation Fails

**Linting Issues:**
```bash
pnpm run lint:fix
```

**Test Failures:**
```bash
pnpm test
# Fix failing tests, then re-run
```

**Security Vulnerabilities:**
```bash
npm audit fix
# Review and fix security issues
```

**Version Mismatch:**
```bash
node scripts/manage-build-number.js --reset
```

### GitHub Actions Fails

1. **Check workflow logs** in GitHub Actions tab
2. **Verify secrets** are configured:
   - `NPM_TOKEN` for npm publishing
   - `GITHUB_TOKEN` (automatic)
3. **Re-run failed jobs** if transient issue

### npm Publishing Fails

**Authentication Issues:**
- Verify `NPM_TOKEN` secret in GitHub
- Check npm account permissions

**Version Conflicts:**
- Ensure version doesn't already exist on npm
- Use `npm view @bobmatnyc/ai-code-review versions --json`

## Configuration

### Required Secrets

Configure these in GitHub repository settings:

```
NPM_TOKEN=npm_xxxxxxxxxxxxxxxxxxxx
```

### Package Configuration

The package is configured for public publishing:

```json
{
  "publishConfig": {
    "registry": "https://registry.npmjs.org/",
    "access": "public"
  }
}
```

## Best Practices

1. **Always run pre-release validation** before releasing
2. **Use semantic versioning** appropriately
3. **Write meaningful commit messages** (used in changelog)
4. **Test releases** in development environment first
5. **Monitor release** completion and npm availability
6. **Update documentation** for new features
7. **Communicate breaking changes** clearly

## Scripts Reference

| Script | Purpose |
|--------|---------|
| `pnpm run pre-release` | Comprehensive pre-release validation |
| `pnpm run release:patch` | Create patch release |
| `pnpm run release:minor` | Create minor release |
| `pnpm run release:major` | Create major release |
| `pnpm run release:dry-run` | Preview release changes |
| `node scripts/manage-build-number.js` | Manage build numbers |

---

For questions or issues with the release process, check the GitHub Actions logs or create an issue in the repository.
