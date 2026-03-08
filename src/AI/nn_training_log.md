# NN Training Log

Started: 2026-03-07T23:49:46.181Z
Arch: 68→128→64→32→1
Phase 1a: 200 expert-vs-expert games
Phase 1b: 3000 mixed-curriculum games (300/batch)

## Phase 1a — Expert games, outcome labels
(Phase 1a skipped — existing model loaded)

## Phase 1b — Medium-vs-NN self-play

| Batch | Games | Samples | Loss | MAE | vs easy | vs medium | vs expert | Saved |
|-------|-------|---------|------|-----|---------|-----------|-----------|-------|
|     1 |   300 |   11400 | 0.0212 | 0.0352 | 80% | 0% | 0% | ✓ |
|     2 |   600 |   22800 | 0.0224 | 0.0316 | 70% | 0% | 0% |  |
|     3 |   900 |   34200 | 0.0218 | 0.0316 | 70% | 0% | 0% |  |
|     4 |  1200 |   45600 | 0.0350 | 0.0436 | 60% | 0% | 0% |  |
|     5 |  1500 |   57000 | 0.0216 | 0.0258 | 60% | 0% | 0% |  |
|     6 |  1800 |   68400 | 0.0244 | 0.0288 | 90% | 0% | 0% | ✓ |
|     7 |  2100 |   79800 | 0.0288 | 0.0325 | 60% | 0% | 0% |  |
|     8 |  2400 |   91200 | 0.0291 | 0.0328 | 80% | 0% | 0% |  |
|     9 |  2700 |  102600 | 0.0206 | 0.0267 | 50% | 0% | 0% |  |
|    10 |  3000 |  114000 | 0.0305 | 0.0479 | 60% | 0% | 50% | ✓ |

## Final summary

Total samples: 114000
Best vs easy: 90.0%
Best vs medium: 0.0%
Best vs expert: 50.0%
