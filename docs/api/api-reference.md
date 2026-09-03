# 🔌 REST API Reference

Base URL: `http://localhost:8080`

## Authentication Endpoints (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Registers user, generates 6-digit OTP code (password min 8 chars).
- `POST /api/v1/auth/verify-email` — Verifies 6-digit OTP code (`{ email, code }`).
- `POST /api/v1/auth/resend-code` — Re-issues a new 6-digit OTP code.
- `POST /api/v1/auth/login` — Authenticates user, issues JWT access token + refresh token.
- `POST /api/v1/auth/oauth` — OAuth social login (Google, GitHub, Microsoft).
- `POST /api/v1/auth/refresh` — Token rotation.
- `POST /api/v1/auth/logout` — Revokes refresh token.
- `GET  /api/v1/auth/me` — Authenticated user profile.

## Task Endpoints
- `GET    /api/v1/workspaces/{wsId}/tasks` — List all tasks in workspace.
- `POST   /api/v1/workspaces/{wsId}/tasks` — Create task with assignees, reviewer, DEV default.
- `GET    /api/v1/tasks/{id}` — Fetch task with subtasks, file diffs, notes, and logs.
- `PATCH  /api/v1/tasks/{id}` — Update task properties, environment, status, or branch.
- `DELETE /api/v1/tasks/{id}` — Delete task.

## Project Endpoints
- `GET    /api/v1/workspaces/{wsId}/projects` — List projects with weighted progress.
- `POST   /api/v1/workspaces/{wsId}/projects` — Create project with custom environments array.
- `DELETE /api/v1/projects/{id}` — Delete project.
