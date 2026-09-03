# ADR-007: Multi-Stage Environment Promotion Model

## Status
**ACCEPTED**

## Context
Engineering deliverables must progress through isolated validation tiers before hitting production. Different projects require different staging environments (*e.g. some require `SIT`, others only `UAT`*).

## Decision
1. Deliverables follow the progression: `DEV → SIT → UAT → RELEASE → MAIN`.
2. Projects store an enabled `environments` array (*e.g. `['DEV', 'UAT', 'MAIN']`*).
3. Deliverables moved to `in_review` strictly default to `DEV`.
4. Promoting a deliverable to `MAIN` automatically sets `status = done`.

## Consequences
- Prevents premature production deployment.
- Enforces strict verification accountability before marking items complete.
