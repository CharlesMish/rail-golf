# Counterline repertoire — numerical appendix

This is a technical reproducibility appendix, separate from the owner invitation. All trajectories below are actual Havok histories. Sounding counts are raw gain > 0; onset events group consecutive contacts at most 150 ms apart. Captured H playback can gate very weak strikes without changing the physical ledger.

## Sampled domains

- Historical 875: origin 0 m, yaw −24…24° in 2° steps; elevation 8, 12, 16, 20, 24, 30, 40°; power 35, 45, 55, 65, 80%.
- Matched 100: origin 0 m, yaw −20, −10, 0, 10, 20°; elevation 10, 18, 26, 40, 60°; power 20, 35, 55, 75%.
- Every setup uses central rail index 1. Neighbors are yaw ±0.5°, elevation ±0.5°, power ±1 percentage point and origin ±0.5 m.

## Representative histories

### descending-resonance

| Case | Origin m | Yaw ° | Elevation ° | Power % | Raw notes / events | Ending s | Raw pitch groups |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| opening | 0 | 0 | 18 | 55 | 1 / 1 | 1.675000 | E4 |
| single strike | 0 | -24 | 8 | 45 | 1 / 1 | 2.741667 | C4 |
| separated phrase | 0 | -10 | 20 | 65 | 3 / 3 | 1.758333 | E4>D4>C4 |
| clustered phrase | 0 | -4 | 20 | 45 | 6 / 4 | 2.933333 | E4+D4>C4>E4+D4>C4 |
| silence | 0 | -24 | 20 | 65 | 0 / 0 | 1.966667 | (silent) |
| long flight | 0 | -10 | 40 | 45 | 3 / 3 | 7.016667 | G4>D4>C4 |
| manifest descent | 0 | -1 | 24 | 56 | 3 / 3 | 1.966667 | G4>E4>C4 |
| manifest west-descent | 0 | -5 | 24 | 56 | 3 / 3 | 1.908333 | E4>D4>C4 |

Exact note timestamps, raw gain, face speed, contacts, terminal position and nearby outcomes are retained in `counterline-evidence.json`. The opening and one separated phrase also retain full sampled paths; other representatives retain their path sample count and SHA-256.

### chime-terraces

| Case | Origin m | Yaw ° | Elevation ° | Power % | Raw notes / events | Ending s | Raw pitch groups |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| opening | 0 | 0 | 18 | 55 | 2 / 1 | 2.216667 | D4+C4 |
| single strike | 0 | -24 | 8 | 35 | 1 / 1 | 2.575000 | C4 |
| separated phrase | 0 | -18 | 12 | 45 | 4 / 3 | 2.183333 | C4+E4>D4>E4 |
| clustered phrase | 0 | -24 | 12 | 80 | 4 / 1 | 1.325000 | C4+C4+C4+C4 |
| silence | 0 | -24 | 16 | 80 | 0 / 0 | 1.866667 | (silent) |
| long flight | 0 | -10 | 8 | 55 | 4 / 4 | 5.850000 | E4>G4>D4>C4 |
| manifest centre-climb | 0 | 0 | 8 | 55 | 4 / 3 | 4.083333 | E4>A4+G4>E4 |
| manifest east-walk | 0 | 8 | 20 | 65 | 3 / 2 | 2.175000 | E4+E4>D4 |

Exact note timestamps, raw gain, face speed, contacts, terminal position and nearby outcomes are retained in `counterline-evidence.json`. The opening and one separated phrase also retain full sampled paths; other representatives retain their path sample count and SHA-256.

### early-plate

| Case | Origin m | Yaw ° | Elevation ° | Power % | Raw notes / events | Ending s | Raw pitch groups |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| opening | 0 | 0 | 18 | 55 | 3 / 3 | 5.566667 | C4>D4>E4 |
| single strike | 0 | -20 | 40 | 35 | 1 / 1 | 5.191667 | D4 |
| separated phrase | 0 | 0 | 18 | 55 | 3 / 3 | 5.566667 | C4>D4>E4 |
| silence | 0 | -20 | 10 | 20 | 0 / 0 | 0.808333 | (silent) |
| long flight | 0 | 0 | 18 | 55 | 3 / 3 | 5.566667 | C4>D4>E4 |

Exact note timestamps, raw gain, face speed, contacts, terminal position and nearby outcomes are retained in `counterline-evidence.json`. The opening and one separated phrase also retain full sampled paths; other representatives retain their path sample count and SHA-256.

### original-workshop

| Case | Origin m | Yaw ° | Elevation ° | Power % | Raw notes / events | Ending s | Raw pitch groups |
| --- | ---: | ---: | ---: | ---: | --- | ---: | --- |
| opening | 0 | 0 | 18 | 55 | 2 / 2 | 7.216667 | D4>E4 |
| single strike | 0 | 0 | 10 | 75 | 1 / 1 | 4.800000 | D4 |
| silence | 0 | -20 | 10 | 20 | 0 / 0 | 0.808333 | (silent) |
| long flight | 0 | 0 | 18 | 55 | 2 / 2 | 7.216667 | D4>E4 |

Exact note timestamps, raw gain, face speed, contacts, terminal position and nearby outcomes are retained in `counterline-evidence.json`. The opening and one separated phrase also retain full sampled paths; other representatives retain their path sample count and SHA-256.

## Curated arrival details

Descending’s manifest `descent` (origin 0, yaw −1°, elevation 24°, power 56%) yields G4 from `high-c` at 1.108333 s, E4 from `wall-near-e` at 1.375000 s, C4 from `wall-far-w` at 1.691667 s. First ground is at 1.966667 s. All eight neighbors preserve the same three-piece family. `west-descent` (yaw −5°, same other controls) yields E4→D4→C4 and also preserves its family in all eight neighbors.

Terraces’ `centre-climb` (origin 0, yaw 0°, elevation 8°, power 55%) gives E4→A4+G4→E4 under the 150 ms analysis grouping. All eight neighbors retain at least three onset events; piece families can change. Its original opening (0°, 18°, 55%) gives D4+C4 simultaneously at 0.708333 s. Both remain selectable/readable source conditions; the manifest/preset itself was not changed.

## Construction-history negative result

All files and physics rules are held fixed. A fresh Descending scene is compared with one initialized as Terraces, then firing each original opening in Terraces → Fan → Garden before loading Descending. The following differences are inherited; the new Counterline adapter changes neither document nor solver.

| Construction history | Setup (yaw / elevation / power) | Contact-derived pitch timings s | Terminal |
| --- | --- | --- | --- |
| Fresh | 4° / 20° / 35% | ramp-e D4 @0.833333 (gain 0.205073); ramp-w C4 @0.833333 (gain 0.207474); high-c G4 @1.991667 (gain 0.222804); wall-near-e E4 @2.583333 (gain 0.233463); wall-far-w C4 @3.116667 (gain 0.221101) | first-ground-contact @3.441667; position [-0.5717683434486389, 0.42999982833862305, 29.44904136657715] |
| Fresh | -1° / 24° / 56% | high-c G4 @1.108333 (gain 0.831766); wall-near-e E4 @1.375000 (gain 0.650465); wall-far-w C4 @1.691667 (gain 0.52492) | first-ground-contact @1.966667; position [-0.7058256268501282, 0.43000108003616333, 28.29458236694336] |
| Terraces → Fan → Garden | 4° / 20° / 35% | ramp-w C4 @0.833333 (gain 0.207474); ramp-e D4 @0.841667 (gain 0.000355398); high-c G4 @2.000000 (gain 0.239937); top-c A4 @2.008333 (gain 1.0593e-05) | first-ground-contact @3.383333; position [0.8476619720458984, 0.42999693751335144, 19.661029815673828] |
| Terraces → Fan → Garden | -1° / 24° / 56% | high-c G4 @1.108333 (gain 0.831766); wall-near-e E4 @1.375000 (gain 0.650465); wall-far-w C4 @1.691667 (gain 0.52492) | first-ground-contact @1.966667; position [-0.7058256268501282, 0.43000108003616333, 28.29458236694336] |

The sampled-path SHA-256 for the selected central descent matches across both histories. The shared-ramp negative does not. Reduced historical rows match 860/875 under a fresh construction and 875/875 with the historical construction sequence. An earlier report’s exact aggregate is not sufficient evidence of universal replay identity.

## Reproduction

```sh
node scripts/refinement/counterline-measure.mjs
```

This rewrites the evidence and four public audio-QA recordings. The source SHA records the checked-out commit; source hashes identify the measured script and acoustic module when those files are not yet committed. Recordings use fixed IDs and timestamps for deterministic fixture bytes, plus the actual build identity and physical history. Timing measurements vary with host load.
