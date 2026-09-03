# 🌐 Frontend Architecture Guide

## 1. Directory Layout & Layering
```text
apps/web/src/
├── app/                  # Next.js App Router Pages & Route Handlers
│   ├── (auth)/           # /login, /register
│   ├── app/              # /app/home, /app/tasks, /app/tasks/[id], /app/calendar, etc.
│   └── auth/callback/    # OAuth token exchange callback
├── components/           # Reusable shell elements (Header, Sidebar, CommandPalette, Modals)
├── features/             # Domain Feature Components
│   └── tasks/components/# TaskGitBranchCard, TaskSubtasksCard, TaskFilesChangedCard, etc.
├── stores/               # Zustand Client State Stores (Auth, Task, Project, Workspace)
├── lib/
│   ├── api/              # Strongly-typed API Clients (auth-api, task-api, project-api, workspace-api)
│   └── api-client.ts     # Axios instance with Bearer injection & refresh interceptors
```

## 2. Component Decomposition Standard
- Page components (`page.tsx`) must remain under 200 lines and act as declarative layout orchestrators.
- Domain features are broken into cohesive cards in `src/features/<domain>/components/`.
- UI state is managed in local React hooks; global shared domain state is stored in Zustand.
