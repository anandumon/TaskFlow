# ⚙️ Backend Architecture Guide

## 1. Domain Module Layout
```text
com.taskflow/
├── common/               # Security filters, JwtProvider, BaseEntity, domain constants
│   └── constant/         # AuthConstants, TaskConstants
├── identity/             # Users, 6-digit OTP, OAuth, JWT, Refresh Tokens
│   ├── controller/
│   ├── service/
│   ├── entity/
│   ├── repository/
│   └── dto/
├── organization/         # Organizations, memberships, tenant isolation
├── workspace/            # Workspaces, organization scoping
├── project/              # Projects, environment pipelines, weighted progress engine
└── task/                 # Deliverables, subtasks JSON, Git branches, review staging
```

## 2. Layering Responsibilities
- **Controllers**: Thin request handlers. Validate DTOs, extract `UserPrincipal`, invoke services, return `ApiResponse<T>`.
- **Services**: Own transactions (`@Transactional`), business rules, and domain state transitions.
- **Repositories**: Standard Spring Data JPA interfaces. Zero business logic.
- **DTOs**: Explicit input/output contracts. JPA Entities are never leaked to the client.
