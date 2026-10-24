# Appendix — Soft Landing solutions

Not part of the owner index. The measurement record is [../soft-landing.md](../soft-landing.md). Both documents use preset id `soft-landing`, the same gold circle `(0, 64)` radius 2.5 m, and an adjustable launcher. The bank stays at x −18, z 28, yaw 0.

| | Fragile | Forgiving |
| --- | --- | --- |
| Document | [fragile.json](fragile.json) | [forgiving.json](forgiving.json) |
| Preset hash | `5223f22e33796059e08741c94c81209581913a21a830ed8661bc3cb414217e1a` | `a81bb95cb06c3bf4212a2b1669635db9bf124912caf0981b7176dcf081b369f5` |
| Block | x 18, z 86, yaw 0 | x 0, z 69, yaw 0 |
| Aim | yaw 0°, elevation 25°, charge 0.61, origin 0 | yaw 0°, elevation 25°, charge 0.66, origin 0 |
| Role | Direct ballistic into the circle. No block contact. | Dull block on the circle's back edge. The shot touches the block, then the ground. |

The opening preset hash is `f981320378ddcb92c4bf6a162189df6bf11a79ca77cd77adcba5571952560db3` (block parked, elevation 18°, charge 0.55). That shot misses.

Folded numbers: [summary.json](summary.json), measured at `e045039b15c30e3c7e89c7d882be523f9dd2a92c`. Player-walk protocols: [player-opening.json](player-opening.json), [player-near.json](player-near.json). Raw JSONL is under [../runs/](../runs/) as `soft-landing-grid.jsonl`, `soft-landing-neighborhood.jsonl`, `soft-landing-area.jsonl`, `soft-landing-player.jsonl`, and `soft-landing-reproduction.jsonl`.

Single-setup files for the runner live under [../setups/](../setups/) as `soft-landing-opening.json`, `soft-landing-fragile.json`, and `soft-landing-forgiving.json`. The forgiving world is not the opening preset, so it is fired with `--preset-file appendix/soft-landing/forgiving.json`.

Browser, SwiftShader, save/reload and two imported refires: [browser-report.json](browser-report.json). Screenshots: [soft-landing-preset.png](soft-landing-preset.png), [soft-landing-comparison.png](soft-landing-comparison.png).
