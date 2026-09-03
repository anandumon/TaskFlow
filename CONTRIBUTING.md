# 🤝 TaskFlow Contributing Guide

## 1. Branching & Commit Conventions
- **Feature Branches**: `feature/<service-name>/<ticket-slug>`
- **Bug Fix Branches**: `fix/<service-name>/<ticket-slug>`
- **Conventional Commits**:
  - `feat(task): add subtask branch validation`
  - `fix(auth): correct 6-digit OTP expiration check`
  - `refactor(web): decompose TaskDetailsPage into modular components`
  - `docs(adr): record ADR-007 environment promotion model`

---

## 2. Core Development Standards

### Backend (Java / Spring Boot)
- **Layering**: Keep controllers thin; domain logic belongs in Services.
- **DTOs**: Never return or accept JPA Entities directly in REST controllers.
- **Transactions**: Place `@Transactional` at the service boundary.
- **Constants**: Reference domain constants (*e.g., `TaskConstants.WEIGHT_IN_REVIEW`*) rather than inline magic numbers.

### Frontend (Next.js / React / TypeScript)
- **Component Size**: Keep page components under 250 lines by extracting feature components into `src/features/<domain>/components/`.
- **API Calls**: Route all HTTP calls through `src/lib/api/` rather than raw Axios calls in UI components.
- **State**: Separate server state from transient UI state.

---

## 3. Database Migration Protocol
1. **Never edit or delete applied migrations** (`V1` to `V10`).
2. Add forward-only migrations (`V11__...sql`) for any future schema changes.
3. Test all migrations locally before opening a pull request.
