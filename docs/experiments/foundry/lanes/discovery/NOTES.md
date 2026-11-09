# Right Angle

Shot study. Lane `discovery`. The player does not build anything.

Two banks meet at a right angle, off to the right of the clearing. One face is timber and one is metal, so the corner reads as two walls rather than one slab. The banks are fixed. Origin, aim, and power can change. There is no pin and no score. A circle in the open ground would also be reachable by a short shot that never touches a bank, so none is placed.

The opening shot runs straight down the middle and misses both banks. The corner is the thing to aim at. What that shot does is left for play. Measured setups, the family, and the narrow side path are in [SOLUTIONS.md](SOLUTIONS.md).

Why fire again: the corner is one relationship, and a small change of aim moves where the ball finishes. The study is that relationship, not a long workshop.

Kit SHA this lane was cut from: `1ad3166d0839ea042379f5a861ed7523cb46d47e`. Physics was not edited. The physics baseline under that kit is `46e59a781722081546457086e1d87a7d2e8f7453`. `sourceBuild` in the manifest is the kit SHA.

Sweeps, all headless Havok at 120 Hz, seed 20261109:

| Script | Result |
| --- | --- |
| `scripts/foundry/discovery-sweep.mjs` | `sweep-coarse.json` |
| `scripts/foundry/discovery-family.mjs` | `sweep-family.json` |
| `scripts/foundry/discovery-bisector.mjs` | `sweep-bisector.json` |
| `scripts/foundry/discovery-corner.mjs` | `sweep-corner.json` |
| `scripts/foundry/discovery-neighborhood.mjs` | `sweep-neighborhood.json` |

Limitations recorded on the manifest, and not built:

- Banks have no height offset, so the corner cannot be lifted or given a lip.
- Open ground in front of the corner is also reachable by a direct arc, which is why there is no circle.
- Survey does not label the corner.
- The validator replays recorded shots and does not search neighbours. The neighbour grid stays a lane script.

Not verified: whether anyone enjoys it, and how it feels on a physical phone. The phone screenshot is a resized browser viewport, not a device.
