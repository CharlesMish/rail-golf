# The Carry

Construction lane on `lab/wc-foundry-lane-construction-20261109`, cut from `1ad3166d0839ea042379f5a861ed7523cb46d47e`.

Solution numbers, poses, and the direct aims are in [SOLUTIONS.md](SOLUTIONS.md). This page does not give them.

## What it is

A workshop. The launcher is fixed. One ramp can be moved. A gold circle sits farther down the clearing than the opening flight. The ramp starts on the near ground, under the flight, and the opening shot does not touch it.

The player fires, sees the ball fall short, and moves the ramp. The question is whether a placed ramp can carry that same shot into the circle, and whether more than one placement does it.

Play, Reset, and Make a copy are the foundry controls. Make a copy is a new saved world. It does not change this preset.

## What was measured

Headless Havok, seed `20261109`, which is recorded and not applied to the solver. Scripts:

- `scripts/foundry/construction-discover.mjs` — coarse search across ramp, bank, and block.
- `scripts/foundry/construction-launch-probe.mjs` — a few locked shots, to keep the landing in the middle of the yard.
- `scripts/foundry/construction-sweep.mjs` — ramp poses on the 0.5 m and 5° steps, plus direct aims on a free launcher.
- `scripts/foundry/construction-followup.mjs` — block and bank lattices, direct-aim widths, and the shots quoted in the solutions.

The opening misses. Removing the ramp misses. Clears from the ramp grid all touch the ramp. Runs along the ramp's across, along, and turn are wider than one step, and the next step outside those runs misses. Direct aims with no ramp can also reach the circle. The fixed rail rejects them before a shot is fired. The block lattice and the bank lattice that were fired did not clear.

The shared landing panel still talks about aiming, and about a block and a bank. That sentence was not changed. Bank and block buttons show and stay disabled.

SwiftShader screenshots at 1400×900 and 390×844 are in `screenshots/`. On both, the opening survey shows the ramp and the circle. That is not a phone in a hand.

## Not verified

Enjoyment. Whether a person finds the ramp relationship. A physical phone. SwiftShader is not that phone. The sweeps are lattices, not a chance a player hits.
