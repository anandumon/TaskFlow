# 📜 TaskFlow Changelog

All structural and architectural improvements to the codebase are documented in this file.

## [2.1.0] - Senior Engineering Structuring & Refactoring (Current)
### Refactored
- **Frontend Architecture**: Decomposed 780-line monolithic `TaskDetailsPage` into modular feature components (`TaskGitBranchCard`, `TaskSubtasksCard`, `TaskFilesChangedCard`, `TaskPropertiesCard`, `TaskDiscussionCard`).
- **Typed API Client Layer**: Created centralized API client modules in `src/lib/api/` (`auth-api.ts`, `task-api.ts`, `project-api.ts`, `workspace-api.ts`).
- **Backend Domain Constants**: Centralized magic values into `AuthConstants.java` and `TaskConstants.java` for progress weights, OTP TTL, and review environment standards.
- **Characterization Testing**: Added `TaskProgressTest.java` and `TaskEnvironmentLifecycleTest.java` characterization regression safety suites.
- **Documentation**: Established comprehensive `docs/` tree, system architecture guides, 7 ADRs, and step-by-step developer how-to guides.

### Preserved
- 100% of existing business functionality, routes, UI design system, and Supabase PostgreSQL schema.
