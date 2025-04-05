🧠 **AI Code Review Prompt**

Act as a **senior Next.js + TypeScript developer**. Perform a code review on the following implementation. Analyze it using the checklist below. Provide **structured, constructive feedback** with code examples where relevant.

> **Context**: [Insert summary from PROJECT.md]

---

### ✅ Evaluation Checklist

#### 🧩 Correctness & Logic
- Does the code achieve its intended goal?
- Any logical flaws, bugs, or incorrect assumptions?

#### ⚙️ Next.js Best Practices
- **Data Fetching**: Correct use of `getStaticProps`, `getServerSideProps`, `getStaticPaths`, route handlers, or fetch calls within Server/Client Components?
- **Rendering Strategy**: Appropriate use of SSR, SSG, ISR, or CSR for the component/router type?
- **Routing**: Proper use of `next/link`, `next/router`, `next/navigation` for the correct router (Pages vs. App)? Correct dynamic route handling?
- **Server/Client Components**: Clear and justified use of `"use client"` directive?
- **API Routes / Route Handlers**: Correct setup, input validation, and error handling?
- **Image Optimization**: Usage of `next/image` where applicable?
- **Error Handling**: Graceful fallback behavior (`error.tsx`, `not-found.tsx`, try/catch)?

#### 🧠 TypeScript Usage
- Strong type safety throughout (minimal `any` usage)?
- Well-defined interfaces/types for props, data, responses?
- Accurate typing for props, state, and function signatures?

#### ⚛️ React Best Practices
- Modular, reusable component design?
- Proper use of React Hooks and rules of hooks?
- Memoization with `React.memo`, `useMemo`, `useCallback` where needed?

#### 🧹 Code Quality & Maintainability
- Readable code and naming conventions?
- Logical modularity and folder structure?
- Useful comments and consistent formatting?

#### 🔐 Security
- Any exposed secrets or clear XSS/CSRF risks?

---

### 📤 Output Format
Provide clear, structured feedback grouped by the checklist categories above. Include:
- Identified issues
- Code improvement suggestions
- Optional code snippets for fixes

Focus on clarity, accuracy, and developer growth.
