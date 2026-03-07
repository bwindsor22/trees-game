# NN Training Log

Started: 2026-03-07T05:06:00.503Z
Feature dim: 68  |  Arch: 68→128→64→32→1
Phase 1a: 200 expert-outcome games  |  Phase 1b: 1200 RL games (150/batch)

## Phase 1a — Expert games, outcome labels (same distribution as Phase 1b)
| Phase1a | vs medium | 0% |
| Phase1a | vs hard | 0% |
| Phase1a | vs expert | 0% |

## Phase 1b — RL self-play (outcome labels)

| Batch | Games | Samples | Loss | MAE | vs medium | vs hard | vs expert | Saved |
|-------|-------|---------|------|-----|-----------|---------|-----------|-------|
|     1 |   150 |   13300 | 0.0181 | 0.0279 | 0% | 0% | 0% |  |
|     2 |   300 |   19000 | 0.0194 | 0.0357 | 0% | 0% | 0% |  |
|     3 |   450 |   24700 | 0.0188 | 0.0371 | 0% | 0% | 0% |  |
|     4 |   600 |   30400 | 0.0255 | 0.0395 | 0% | 0% | 0% |  |
