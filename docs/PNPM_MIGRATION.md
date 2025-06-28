# pnpm Migration Guide

This project has standardized on **pnpm** as the package manager for better performance, disk efficiency, and dependency management.

## Why pnpm?

- **Faster**: Up to 2x faster than npm
- **Disk efficient**: Uses hard links to save disk space
- **Strict**: Better dependency resolution and security
- **Compatible**: Works with existing npm packages and scripts

## Quick Migration

### Automated Migration

Run the migration script to automatically switch from npm/yarn to pnpm:

```bash
./scripts/migrate-to-pnpm.sh
```

This script will:
1. Install pnpm if not already installed
2. Remove existing lock files and node_modules
3. Install dependencies with pnpm
4. Verify the installation

### Manual Migration

If you prefer to migrate manually:

1. **Install pnpm**:
   ```bash
   # Recommended: Use Corepack (Node.js 16.10+)
   corepack enable
   corepack prepare pnpm@latest --activate
   
   # Alternative: Use npm
   npm install -g pnpm
   ```

2. **Clean existing files**:
   ```bash
   rm -f package-lock.json yarn.lock
   rm -rf node_modules
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

## Command Equivalents

| npm command | pnpm equivalent |
|-------------|-----------------|
| `npm install` | `pnpm install` |
| `npm install <pkg>` | `pnpm add <pkg>` |
| `npm install -D <pkg>` | `pnpm add -D <pkg>` |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` |
| `npm uninstall <pkg>` | `pnpm remove <pkg>` |
| `npm run <script>` | `pnpm run <script>` or `pnpm <script>` |
| `npx <command>` | `pnpm exec <command>` |
| `npm update` | `pnpm update` |
| `npm outdated` | `pnpm outdated` |

## Project Configuration

The project now includes:

- **package.json**: `engines.pnpm` field to enforce pnpm version
- **package.json**: `packageManager` field for Corepack integration
- **.npmignore**: Excludes yarn.lock and package-lock.json from published package
- **Documentation**: All docs updated to show pnpm commands first

## CI/CD Integration

The project's CI/CD pipelines use pnpm:

- GitHub Actions workflows use `pnpm` commands
- Build scripts are optimized for pnpm
- Dependabot is configured for npm ecosystem (which includes pnpm projects)

## Troubleshooting

### pnpm not found

If you get "pnpm: command not found":

1. **Check if Corepack is enabled**:
   ```bash
   corepack enable
   ```

2. **Install pnpm globally**:
   ```bash
   npm install -g pnpm
   ```

3. **Restart your terminal** after installation

### Permission errors

If you get permission errors during global installation:

```bash
# On macOS/Linux, you might need sudo
sudo corepack enable

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Workspace issues

If you're working in a monorepo or workspace:

```bash
# Install dependencies for all workspace packages
pnpm install -r

# Run a script in all workspace packages
pnpm run -r build
```

## Benefits for AI Code Review

Using pnpm provides several benefits for this project:

1. **Faster builds**: Reduced installation time in CI/CD
2. **Consistent dependencies**: Strict dependency resolution prevents version conflicts
3. **Better security**: Isolated node_modules structure
4. **Disk efficiency**: Shared dependencies across projects

## Migration Checklist

- [ ] Install pnpm using Corepack or npm
- [ ] Remove old lock files (`package-lock.json`, `yarn.lock`)
- [ ] Remove `node_modules` directory
- [ ] Run `pnpm install`
- [ ] Update your IDE/editor to use pnpm
- [ ] Update any local scripts or aliases
- [ ] Verify all project scripts work with `pnpm run`

## Getting Help

- **pnpm Documentation**: https://pnpm.io/
- **Migration Issues**: Check the project's GitHub issues
- **Command Reference**: Run `pnpm --help` for available commands

## Rollback (if needed)

If you need to rollback to npm:

```bash
# Remove pnpm files
rm -f pnpm-lock.yaml
rm -rf node_modules

# Reinstall with npm
npm install
```

Note: We recommend staying with pnpm for the benefits listed above, but rollback is possible if needed.
