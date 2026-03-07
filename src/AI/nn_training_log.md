# NN Training Log

Started: 2026-03-07T23:24:03.018Z
Arch: 68→128→64→32→1
Phase 1a: 200 expert-vs-expert games
Phase 1b: 3000 mixed-curriculum games (300/batch)

## Phase 1a — Expert games, outcome labels
| Phase1a | vs easy | 9W/0L/1D | 90% |
| Phase1a | vs medium | 0W/10L/0D | 0% |
| Phase1a | vs expert | 0W/10L/0D | 0% |

## Phase 1b — Medium-vs-NN self-play

| Batch | Games | Samples | Loss | MAE | vs easy | vs medium | vs expert | Saved |
|-------|-------|---------|------|-----|---------|-----------|-----------|-------|
|     1 |   300 |   19000 | 0.0327 | 0.0540 | 70% | 0% | 0% |  |
|     2 |   600 |   30400 | 0.0178 | 0.0227 | 100% | 0% | 0% | ✓ |
