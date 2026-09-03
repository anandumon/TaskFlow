# 🔄 Task Lifecycle & Multi-Stage Environment Promotions

## 1. Lifecycle Progression
Every deliverable transitions through the following stages:

```mermaid
stateDiagram-v2
    [*] --> TODO: Task Created
    TODO --> IN_PROGRESS: Developer Starts
    IN_PROGRESS --> IN_REVIEW: Pull Request Ready (Defaults to DEV)
    
    state IN_REVIEW {
        DEV --> SIT: Automated CI Pass
        SIT --> UAT: QA Sign-off
        UAT --> RELEASE: Release Candidate
    }
    
    IN_REVIEW --> DONE: Promoted to MAIN (Auto-Completed)
    DONE --> [*]
```

## 2. Business Rules
1. **DEV Review Default**: When a task moves to `in_review`, the review environment is initialized strictly to `DEV`.
2. **Project Environment Subsets**: Projects specify their active stages (*e.g. `['DEV', 'UAT', 'MAIN']`*). Tasks only cycle through enabled stages.
3. **MAIN Auto-Completion**: Promoting an environment to `MAIN` automatically sets `status = done` and completes the deliverable.
