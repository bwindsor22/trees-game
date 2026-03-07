# NN Training Progress

## Architecture

A value network (`68→128→64→32→1`, 19k params) implemented in TensorFlow.js. The 68-feature state vector encodes board piece weights (+/- by owner), LP, score differential, inventory/available flags for both players, sun position (one-hot), revolution, and score pile sizes. At inference the network is used inside a depth-2 batch minimax: all leaf states across candidate move trees are evaluated in a single `model.predict` call.

## Training approach

**Phase 1a (200 games):** Expert-vs-expert games, states labelled with the final score differential normalised to [-1, 1]. This warm-starts the network on high-quality trajectories without introducing label scale mismatch.

**Phase 1b (1,200 games, 8 batches of 150):** Expert-vs-NN self-play (NN alternates p1/p2 each game). States labelled with game outcomes. Replay buffer capped at 50k samples; training uses the most recent 20k each batch. Benchmarked every 150 games vs medium (basic eval, depth 2), hard (basic eval, depth 4), and expert (expert eval, depth 2).

## Key lessons from Phase 1 iterations

- Using `evaluateExpert(state)/200` as supervised labels produced targets clustering near zero (typical eval range is ±20, not ±200). The network learned to output ~0 for all positions, making move discrimination impossible. Fix: switched to game-outcome labels throughout — same distribution in both phases, no catastrophic forgetting.
- Benchmark variance with 10 games is extreme (0%→50%→0% swings are consistent with a true win rate of ~25%). Increased to 20 games per difficulty.
- Benchmark opponents at depth 4 dominated wall-clock time (~620s / 30 games). Reduced expert benchmark depth to 2; the eval function (`evaluateExpert` vs `evaluate`) still distinguishes difficulty levels.

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
