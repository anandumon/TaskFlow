# 📊 Weighted Progress Calculation Engine

## 1. Mathematical Formula
Sprint and Project progress is calculated using stage-weighted completion:

$$\text{Progress \%} = \text{round}\left( \frac{(\text{Done} \times 100) + (\text{In Review} \times 75) + (\text{In Progress} \times 35) + (\text{To Do} \times 0)}{\text{Total Tasks}} \right)$$

## 2. Stage Weights Definition
| Status | Weight Value | Constant Reference |
| :--- | :---: | :--- |
| `todo` | **0%** | `TaskConstants.WEIGHT_TODO` |
| `in_progress` | **35%** | `TaskConstants.WEIGHT_IN_PROGRESS` |
| `in_review` | **75%** | `TaskConstants.WEIGHT_IN_REVIEW` |
| `done` | **100%** | `TaskConstants.WEIGHT_DONE` |

## 3. Empty Edge Cases
If $\text{Total Tasks} = 0$, progress evaluates to $0\%$.
