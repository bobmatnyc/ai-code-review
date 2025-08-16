# Build Number Tracking System

## Overview
A build number tracking system has been implemented to help verify deployments and track builds. Each build is assigned a unique number that increments with each build but resets when the version changes.

## Display Format
The version is now displayed as: `X.Y.Z (build N)`
- Example: `4.4.2 (build 3)`

## Files Created/Modified

### New Files
1. **`build-number.json`** - Stores the current build number, version, and last build timestamp
2. **`src/utils/buildNumberManager.ts`** - TypeScript utilities for managing build numbers
3. **`scripts/increment-build-number.js`** - Script to increment build number during builds
4. **`scripts/manage-build-number.js`** - Administrative script for managing build numbers

### Modified Files
1. **`package.json`** - Updated build scripts to include build number incrementing
2. **`scripts/generate-version.js`** - Enhanced to include build number information
3. **`scripts/build.js`** - Updated to preserve build number during compilation
4. **`src/index.ts`** - Updated to display version with build number
5. **`src/cli/argumentParser.ts`** - Updated to show build number in --version output
6. **`src/version.ts`** - Auto-generated file now includes BUILD_NUMBER and VERSION_WITH_BUILD

## Usage

### Automatic Build Number Incrementing
Build numbers are automatically incremented when running:
```bash
pnpm run build        # Full build with tests
pnpm run quick-build  # Quick build without tests
```

### Manual Build Number Management
```bash
# Check current build info
pnpm run build:info

# Reset build number to 0
pnpm run build:reset

# Set specific build number (admin use)
node scripts/manage-build-number.js --set 5
```

### Version Display
The build number is now shown in:
- CLI startup message: `AI Code Review Tool v4.4.2 (build 3)`
- Version flag output: `ai-code-review --version` outputs `4.4.2 (build 3)`

## How It Works

1. **Build Process**: When `prebuild` runs, it executes `increment-build-number.js`
2. **Version Change Detection**: If the version in `package.json` differs from `build-number.json`, the build number resets to 0
3. **Same Version**: If the version is the same, the build number increments by 1
4. **Version Generation**: The `version.ts` file is auto-generated with current build info
5. **Display**: The VERSION_WITH_BUILD constant is used throughout the application

## Build Number Rules

- Build numbers start at 0 for each new version
- They increment sequentially with each build
- They reset to 0 when the version changes
- The timestamp of the last build is recorded

## Example Scenarios

### New Version Release
```
Current: 4.4.2 (build 15)
Update package.json to 4.4.3
Next build: 4.4.3 (build 0)  // Reset to 0
```

### Continuous Builds
```
Build 1: 4.4.2 (build 0)
Build 2: 4.4.2 (build 1)
Build 3: 4.4.2 (build 2)
```

## Deployment Verification

With build numbers, you can now verify which exact build is deployed:
1. Run `ai-code-review --version` on the deployed system
2. Compare with `pnpm run build:info` in development
3. Verify the build number matches expectations

This helps identify if:
- The correct version is deployed
- The latest build is running
- A deployment succeeded or failed