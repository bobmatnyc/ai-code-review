# Unused Code Cleanup Strategy

To maintain a clean, maintainable codebase, we use a two-part strategy to detect and eliminate unused code:

- ✅ `ts-prune` to detect unused **exports**
- ✅ `eslint` with `@typescript-eslint/no-unused-vars` to catch unused **locals, params, and internals**

---

## Why This Matters

Dead code:
- Bloats the codebase
- Increases cognitive load
- Can introduce confusion or risk during refactors

This strategy ensures we catch **everything that’s unused**—both public APIs and internal scaffolding.

---

## 1. ts-prune: Detect Unused Exports

### 🔧 Installation

```bash
npm install --save-dev ts-prune
```

### 🚀 Usage

```bash
npx ts-prune
```

### 📌 Example Output

```
src/utils/math.ts:4 - add (used in module)
src/api/legacy.ts:12 - deprecatedEndpoint
```

- `used in module`: only used internally; maybe shouldn't be exported
- no usage: likely safe to delete

---

## 2. ESLint + @typescript-eslint/no-unused-vars

### 🔧 Installation

```bash
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 🔧 `.eslintrc.js` Example

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: true,
    }]
  }
};
```

### 🚀 Usage

```bash
npx eslint . --ext .ts,.tsx
```

---

## 3. Combined Workflow

### 💡 Add a script to `package.json`

```json
"scripts": {
  "lint": "eslint . --ext .ts,.tsx",
  "prune": "ts-prune",
  "check-unused": "npm run lint && npm run prune"
}
```

### ✅ Run it

```bash
npm run check-unused
```

---

## ⚠️ Notes

- `ts-prune` only checks static imports—dynamic requires or CLI entrypoints may be missed
- `eslint` only looks within files—it won't catch exported but unused code
- Always **review deletions** manually if you’re unsure about dynamic usage

---

## 📎 Summary

| Tool       | What It Catches                | Where It's Useful                  |
|------------|--------------------------------|------------------------------------|
| `ts-prune` | Unused exports                 | Public APIs, utils, internal libs  |
| `eslint`   | Unused vars, args, locals      | Inside modules/functions           |

Keep both in your CI pipeline or local cleanup script to ensure a lean and focused codebase.
