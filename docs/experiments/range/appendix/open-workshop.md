# Appendix — Open Workshop measurements

Not part of the owner index. These numbers describe the supplied arrangement on the fixed rail (origin 0 m, yaw 0°, elevation 18°, charge 0.55). They are not a puzzle solution: the preset has no pin and no target.

Headless Havok, same runtime as the lab, seed `20261024` recorded and not applied to the solver:

- Termination `first-ground-contact` at `(0, 0.429999977350235, 91.8843994140625)`.
- Contacts: `worldcraft-object-ramp-yours` first 1.4249999999999974 s, count 2; `worldcraft-object-plate-yours` first 4.458333333333345 s, count 2; `worldcraft-ground` first 7.208333333333481 s, count 1.
- Outcome `{ kind: "none", status: "none", scored: false }`.
- Preset hash of the canonical document: `10e4321f3f2b88c4afaae198bdaec59dee7ed6de2b298d5652a7409f30c863e4`.

Turning the ramp is the edit used to check the two-trail comparison. The previous trail is the recorded sample list from the first shot, not a second simulation.

## Chrome preset reload

Headless Chrome 156, SwiftShader WebGL (`--use-gl=angle --use-angle=swiftshader-webgl`), `/lab/worldcraft?qa=1`. These frame times are software rendering, not a phone or a desktop GPU. `performance.memory` was enabled.

Open Workshop just loaded, before the two shots: static bodies 5, physics bodies 5, live bodies 0, meshes 5, materials 12, rebuild count 2, last rebuild 3.699999999953434 ms. Frame deltas over 29 samples: median 21.699999999953434 ms, p95 40.300000000046566 ms, max 45.800000000046566 ms. Heap used 42633016, total 60661652. Voices started 0, cleaned 0, finished 0, active 0. House Shot, before that load, had 3 static bodies and 3 physics bodies.

The browser then fired the fixed rail, turned the ramp +5°, and fired the same setup. The amber comparison matched the first shot's recorded points and that shot's bound record. The cyan trail differed. Both `worldcraft-before-line` and `worldcraft-actual-line` were in the scene. Outcome `{ kind: "none", status: "none", scored: false }`. The revised shot's preset hash was `b6a48c07a0fbb674638bd55138fab08711eb3d005a3e6b08dd103520f3856d0c`. The canonical preset hash above did not change.

Twenty reset-to-preset plus save/reload cycles each rebuilt physics once and left static bodies and physics bodies at 5. Rebuild time per cycle was between 0.7999999998137355 ms and 1.3999999999068677 ms.

After those 20 cycles: static bodies 5, physics bodies 5, live bodies 0, meshes 5, materials 13, rebuild count 43, last rebuild 0.8999999999068677 ms. Frame deltas over 29 samples: median 20.5999999998603 ms, p95 24.5999999998603 ms, max 26 ms. Heap used 44498011, total 83760111. Voices started 15, cleaned 15, finished 0, active 0. `finished` stays 0 because release stops a node before its ended event; `cleaned` counts that stop. No voice stayed active.
