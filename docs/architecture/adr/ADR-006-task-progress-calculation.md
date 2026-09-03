# ADR-006: Weighted Progress Engine Formula

## Status
**ACCEPTED**

## Context
Standard task management systems use naive completed / total task counts. In software engineering release workflows, tasks in review or in progress represent significant invested engineering effort.

## Decision
Compute project and sprint completion using a four-stage weighted progress formula:
- **`To Do`**: $0\%$
- **`In Progress`**: $35\%$
- **`In Review`**: $75\%$
- **`Done (MAIN)`**: $100\%$

$$\text{Weighted Progress \%} = \frac{(\text{Done} \times 100) + (\text{In Review} \times 75) + (\text{In Progress} \times 35) + (\text{To Do} \times 0)}{\text{Total Tasks}}$$

## Consequences
- Accurate reflection of sprint delivery status.
- Consistent progress calculation across Overview, Projects, and Analytics.
