# 🚀 TaskFlow — Engineering & Release Orchestration Platform

TaskFlow is a production-oriented project management and release orchestration platform engineered for software development teams. It unifies sprint planning, subtask engineering, Git feature branching, and multi-stage environment promotion (**DEV → SIT → UAT → RELEASE → MAIN**) with tenant isolation.

---

## 🏗️ Architecture & Stack

- **Frontend**: Next.js 13.5.11 (React 18, TypeScript 5, App Router), Zustand client stores, Tailwind CSS, Lucide Icons.
- **Backend**: Spring Boot 3.3.4 (Java 17/21), Spring Security 6, JJWT (HMAC-SHA512), Flyway migrations.
- **Database**: Supabase Cloud PostgreSQL with SSL connection pooling.

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Java**: OpenJDK 17 or 21
- **Node.js**: Node.js 18+ & npm
- **Gradle**: Gradle 8.10 (or wrapper)

### 2. Run Backend (Port 8080)
```bash
cd services/backend
gradle bootJar -x test
java -jar build/libs/taskflow-backend.jar
```
*Health Check: `http://localhost:8080/api/v1/auth/login`*

### 3. Run Frontend (Port 3000)
```bash
cd apps/web
npm run dev
```
*Web App: `http://localhost:3000`*

### 4. Default Admin Credentials
- **Email**: `admin@taskflow.dev`
- **Password**: `admin`

---

## 📚 Complete Developer Documentation

| Document | Description |
| :--- | :--- |
| [**Architecture Overview**](docs/architecture/system-overview.md) | High-level system topology, modular monolith boundaries, and layers |
| [**Frontend Architecture**](docs/architecture/frontend-architecture.md) | Component decomposition, Zustand stores, and typed API clients |
| [**Backend Architecture**](docs/architecture/backend-architecture.md) | Domain modules, thin controllers, services, and DTO contracts |
| [**Database Architecture**](docs/architecture/database-architecture.md) | Supabase schema, Flyway migrations (`V1`-`V10`), and JSONB persistence |
| [**Security & Auth Architecture**](docs/architecture/security-architecture.md) | 6-digit OTP verification, JWT Bearer tokens, and OAuth flows |
| [**Business Workflows**](docs/business/task-lifecycle.md) | Multi-stage environment promotions, weighted progress calculation, and Git branches |
| [**Architecture Decision Records (ADRs)**](docs/architecture/adr/) | ADR-001 through ADR-007 documenting key architectural choices |
| [**How-To Developer Guides**](docs/development/how-to/add-new-api.md) | Step-by-step guides for adding APIs, pages, fields, and migrations |
| [**Contributing Guide**](CONTRIBUTING.md) | Branching conventions, code review standards, and PR guidelines |
| [**Refactoring Report**](REFACTORING_REPORT.md) | Senior engineering refactoring summary and quality gates |

---

## 🔒 Preserved Business Rules
1. **Weighted Sprint Progress**:
   $$\text{Progress} = \frac{(\text{Done} \times 100) + (\text{In Review} \times 75) + (\text{In Progress} \times 35) + (\text{To Do} \times 0)}{\text{Total Tasks}}$$
2. **Environment Promotion**:
   - `in_review` tasks strictly default to `DEV`.
   - Promoting to `MAIN` automatically sets `status = done`.
3. **6-Digit OTP Email Verification**:
   - New user registration issues a 6-digit numeric code with 15-minute expiration before sign-in is permitted.
