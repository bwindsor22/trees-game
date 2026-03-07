# NN Training Progress

## Architecture

A value network (`68→128→64→32→1`, 19k params) implemented in TensorFlow.js. The 68-feature state vector encodes board piece weights (+/- by owner), LP, score differential, inventory/available flags for both players, sun position (one-hot), revolution, and score pile sizes. At inference the network is used inside a depth-2 batch minimax: all leaf states across candidate move trees are evaluated in a single `model.predict` call.

## Training approach

**Phase 1a (200 games):** Expert-vs-expert games, states labelled with the final score differential normalised to [-1, 1]. This warm-starts the network on high-quality trajectories without introducing label scale mismatch.

**Phase 1b (3,000 games, 10 batches of 300):** Medium-vs-NN self-play (NN alternates p1/p2 each batch). Medium is basic depth-2; wins ~60-70% of games vs untrained NN → mixed labels → NN learns from both wins and losses. Replay buffer capped at 55k samples; training uses most recent 20k each batch. Benchmarked after every batch vs easy / medium / expert.

## Key lessons from Phase 1 iterations

- Using `evaluateExpert(state)/200` as supervised labels produced targets clustering near zero (typical eval range is ±20, not ±200). The network learned to output ~0 for all positions, making move discrimination impossible. Fix: switched to game-outcome labels throughout — same distribution in both phases, no catastrophic forgetting.
- NN-vs-NN self-play produced near-zero label variance (both players equally bad early → diff ≈ 0 → all labels ≈ 0 → loss=0.0004 but no learning).
- Expert-vs-NN: expert wins 100% → ALL NN labels ≈ -1 → NN learns "all positions bad" → 0% vs medium after 3,000 games.
- Medium-vs-NN: medium ALSO beats NN 100% initially (Phase 1a benchmark shows 0W/10L vs medium) → same all-negative label problem → 0% vs medium after 3 batches.
- Fix: **Mixed curriculum** — 1/3 games NN-vs-easy (NN wins → positive labels), 1/3 easy-vs-NN (NN wins again), 1/3 medium-vs-NN (NN loses → negative labels). Guarantees both +1 and -1 labels so the NN can actually distinguish good vs bad positions.
- Benchmark opponents at depth 4 dominated wall-clock time. Hard (depth 4) removed from benchmark entirely. Current benchmarks: easy (random), medium (basic/depth 2), expert (expert/depth 2).
- Benchmark should be ≤10% of batch data-collection time. With expert-vs-NN batches (~272s for 300 games), 10 games × 3 difficulties ≈ 15-20s → ~6% ratio. ✓
- Benchmark variance with 10 games can still be high. More games per difficulty is always better if time budget allows.

## Files

| File | Role |
|---|---|
| `sim_core.js` | CommonJS shared game engine (coords, move generation, eval functions, game runner) |
| `nn_trainer_tf.js` | Training loop (Node.js, tfjs-node native backend) |
| `ai_minimax.js` | ES module — minimax search with pluggable eval |
| `ai_nn.js` | ES module — browser NN inference, loads `/nn_model/model.json` |
| `ai.js` | Thin entry point routing difficulty → minimax or NN |
| `heuristic_trainer.js` | Tunes expert heuristic params (not NN) |
| `nn_training_data.tsv` | Per-benchmark metrics for charts (written by trainer) |
| `nn_training_log.md` | Human-readable run log |
