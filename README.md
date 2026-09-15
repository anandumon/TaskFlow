# 🚀 TaskFlow — Engineering & Release Orchestration Platform

TaskFlow is a production-oriented project management and release orchestration platform engineered for software development teams. It unifies sprint planning, subtask engineering, Git feature branching, and multi-stage environment promotion (**DEV → SIT → UAT → RELEASE → MAIN**) with multi-tenant isolation.

---

## 🏗️ Modern Full-Stack Architecture

- **Unified Full-Stack App**: Next.js 13 (React 18, TypeScript 5, App Router).
- **Serverless API Routes**: Native Next.js route handlers (`/api/v1/...`) powering all authentication, tasks, projects, calendar sync, and due alert notifications.
- **Client State**: Zustand reactive stores with optimistic UI updates and instant local caching.
- **Styling & Aesthetics**: Tailwind CSS with custom glassmorphism, GPU-accelerated micro-animations, and liquid glass dark mode.
- **Database**: Supabase Cloud PostgreSQL with connection pooling.
- **Email Dispatch**: Native SMTP transporter configured for Gmail service with responsive HTML templates.

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js**: Node.js 18+ & npm

### 2. Run Application (Port 3000)
```bash
cd apps/web
npm install
npm run dev
```
*Web App: `http://localhost:3000`*

### 3. Default Admin Credentials
- **Email**: `admin@taskflow.dev`
- **Password**: `Admin@TaskFlow2026`

---

## 📚 Complete Developer Documentation

| Document | Description |
| :--- | :--- |
| [**Deployment Guide**](DEPLOYMENT.md) | Vercel deployment and GitHub Actions CI/CD setup |
| [**Contributing Guide**](CONTRIBUTING.md) | Branching conventions, code review standards, and PR guidelines |

---

## 🔒 Preserved Business Rules
1. **Weighted Sprint Progress**:
   $$\text{Progress} = \frac{(\text{Done} \times 100) + (\text{In Review} \times 75) + (\text{In Progress} \times 35) + (\text{To Do} \times 0)}{\text{Total Tasks}}$$
2. **Environment Promotion**:
   - `in_review` tasks strictly default to `DEV`.
   - Promoting to `MAIN` automatically sets `status = done`.
3. **6-Digit OTP Email Verification**:
   - New user registration issues a 6-digit numeric code with 10-minute expiration before sign-in is permitted.
