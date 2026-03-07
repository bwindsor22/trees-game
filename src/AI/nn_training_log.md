# NN Training Log

Started: 2026-03-07T04:19:18.033Z
Feature dim: 68  |  Arch: 68→128→64→32→1
Phase 1a: 200 supervised games  |  Phase 1b: 1200 RL games (150/batch)

## Phase 1a — Supervised distillation (expert eval labels)
| Phase1a | vs medium | 0% |
| Phase1a | vs hard | 0% |
| Phase1a | vs expert | 0% |

## Phase 1b — RL self-play (outcome labels)

| Batch | Games | Samples | Loss | MAE | vs medium | vs hard | vs expert | Saved |
|-------|-------|---------|------|-----|-----------|---------|-----------|-------|
|     1 |   150 |   13300 | 0.1245 | 0.2362 | 0% | 0% | 0% |  |
|     2 |   300 |   19000 | 0.1513 | 0.2752 | 50% | 50% | 0% | ✓ |
|     3 |   450 |   24700 | 0.0991 | 0.1852 | 0% | 0% | 0% |  |
|     4 |   600 |   30400 | 0.0284 | 0.0525 | 0% | 0% | 0% |  |
