# Phase 1A — Final Technology Baseline Verification

> **Scope:** Final verification of runtime, foundation dependencies, and implementation sequence before Phase 1B begins.
> **Date:** 2026-08-23
> **Mode:** READ-ONLY Verification

---

## 1. VERIFIED RUNTIME

| Component | Verified Version | Justification |
|---|---|---|
| **Node.js LTS** | **v24.x (Active LTS)** | As of mid-2026, Node 24 is the Active LTS (Node 22 is in Maintenance; Node 26 is Current but not yet LTS). Node 24 is the most stable and appropriate baseline. |
| **npm** | **10.x / 11.x** | Bundled securely with Node.js 24 LTS. |

---

## 2. VERIFIED FOUNDATION DEPENDENCIES

| Package | Version | Purpose | Foundation? | Verification |
|---|---|---|---|---|
| `react` / `react-dom` | `^19.0.0` | Frontend UI core | **YES** | V19 is stable. |
| `typescript` | `^5.x` | Frontend language | **YES** | Required by approved stack. |
| `vite` | `^7.x` or `^8.x` | Frontend bundler | **YES** | Latest stable Vite version; fast and standard for React. |
| `express` | `^5.0.0` | Backend API | **YES** | Express 5 has been stable since Oct 2024. It provides built-in Promise/async-await error handling, making manual `try/catch` wrappers unnecessary. |
| `mongoose` | `^8.x` | Database ODM | **YES** | Required for MongoDB connectivity and schema definition. |
| `tailwindcss` | `^4.x` | Styling framework | **YES** | Tailwind v4 is the current standard (CSS-first, no config file). |
| `@tailwindcss/vite` | `^4.x` | Tailwind integration | **YES** | Required for modern Tailwind v4 Vite setup. |
| `zod` | `^3.x` | Validation | **YES** | Required for strict request validation. |
| `pino` | `^10.x` | Logging | **YES** | Required for structured, fast backend logging. |
| `helmet` | `^8.x` | Security headers | **YES** | Foundation security middleware. |
| `cors` | `^2.8.5` | Cross-Origin config | **YES** | Required for frontend-backend communication. |
| `dotenv` | `^16.x` | Environment config | **YES** | Required for `.env` management. |

---

## 3. DEFERRED DEPENDENCIES

These packages must NOT be installed during the initial bootstrap. They are deferred until their specific features are implemented.

- **`bcryptjs` / `jsonwebtoken` / `cookie-parser`**: Deferred until **Step 13 (Authentication implementation)**. They are not needed for the basic backend bootstrap or health checks.
- **`ioredis` / `bullmq`**: Deferred until the first background job or caching requirement is encountered.
- **`express-rate-limit`**: Deferred until later security hardening (post-foundation).
- **`lucide-react`**: Deferred until the frontend actually builds UI components requiring icons.
- **`framer-motion`**: Deferred until the UX implementation phase requires animations.
- **AI SDKs / File Storage SDKs**: Deferred until AI/Storage features begin.
- **E2E Testing (Playwright/Cypress)**: Deferred until core integration is stable.

---

## 4. REMOVED / REJECTED DEPENDENCIES

The following packages from previous drafts will **NOT** be installed:

- ❌ **`postcss` & `autoprefixer`**: Removed. Tailwind CSS v4 handles processing internally and no longer requires PostCSS plugins.
- ❌ **`morgan`**: Removed. We are using `pino` (and `pino-http`) as the approved structured logger.
- ❌ **`axios`**: Rejected. Native `fetch` will be used to maintain a lean frontend.
- ❌ **`redux` / `zustand`**: Rejected. React state/context is sufficient for the MVP foundation.
- ❌ **`passport.js`**: Rejected. JWT flow will be implemented directly via middleware.
- ❌ **`prisma` / `sequelize` / `typeorm`**: Rejected. Mongoose is the only approved database tool.

---

## 5. TAILWIND SETUP

The current recommended setup for Tailwind CSS v4 with Vite + React + TypeScript is significantly simplified. It does NOT use `tailwind.config.js` or `postcss.config.js`.

**1. Installation:**
```bash
npm install tailwindcss @tailwindcss/vite
```

**2. Vite Configuration (`vite.config.ts`):**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

**3. CSS Import (`src/index.css`):**
```css
@import "tailwindcss";
```

---

## 6. BACKEND FOUNDATION ORDER

Implementation will strictly follow this sequence:

1. Repository/tooling baseline
2. Backend bootstrap (Express 5 setup)
3. Configuration/environment handling (`dotenv`)
4. Error-handling foundation (utilizing Express 5 async support)
5. Logging foundation (`pino`)
6. Security middleware foundation (`helmet`, `cors`)
7. Database infrastructure (MongoDB connection via `mongoose`)
8. Health check endpoint (e.g., `/api/health`)
9. Backend testing foundation

---

## 7. FRONTEND FOUNDATION ORDER

Once the backend foundation is established, frontend implementation follows:

10. Frontend bootstrap (Vite + React 19 + TS + Tailwind v4)
11. Frontend application shell (Layouts, Routing)
12. Frontend testing foundation

---

## 8. FINAL PHASE 1B BASELINE

Following the foundation setup (Steps 1-12), the full stack integration occurs:

13. Authentication implementation (User model, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, Auth routes, Frontend Auth context, API fetch wrapper).
14. End-to-end foundation verification (Testing complete registration/login flow).

*The User model will NOT be created in Step 7. It strictly belongs to Step 13 as part of the Auth module.*

---

## 9. OPEN DECISIONS

- **Testing Frameworks:** Exact libraries for Backend (e.g., Jest/Supertest vs Node Native Test Runner) and Frontend (e.g., Vitest + React Testing Library) testing foundations remain to be finalized during Steps 9 and 12.

---

## 10. NEXT ACTION

Proceed to Phase 1B - Step 1: Repository/tooling baseline.

The Git repository already exists and is connected to the approved
GitHub remote.

Do not reinitialize Git.

Create only the required Phase 1 project directories and foundation
tooling configuration while preserving the existing docs/, AGENTS.md,
.gitignore, Git history, and all approved documentation.
