# ADR-001: Modular Monolith Architecture for Backend

## Status
**ACCEPTED**

## Context
TaskFlow manages core domain concepts including identity, multi-tenant organizations, workspaces, projects, deliverables, and audit trails. The backend needs to be maintainable, testable, and have low operational complexity.

## Decision
Adopt a **Modular Monolith** architecture inside Spring Boot with explicit module boundaries (`identity`, `organization`, `workspace`, `project`, `task`, `common`, `rbac`, `audit`) rather than splitting into distributed microservices.

## Consequences
- **Positive**: Single deployable artifact, atomic database transactions across domains, simple local development, no network latency overhead between domains.
- **Negative**: Requires strict module boundary discipline to prevent circular dependencies.
