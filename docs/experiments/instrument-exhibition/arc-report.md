# Antiphonal Arc — independent admission review

**Decision: admit the unchanged original to the temporary exhibition.** Real Havok establishes approachable ramp-to-canopy, canopy-to-ramp, lateral and sparse single-strike material. It does not establish all the author's surrogate predictions, or exact replay under every prior-world construction history. No repair or engine change was made to secure admission.

## Authority and preserved evidence

- Foundation: PR #92, `8278fee69fb1bd0c196c2d6fa258faaaaec452e6`.
- Review branch: `research/exhibition-arc-20261127`.
- Measured review source: `7242d04798321d7e6779e6a8d8f7855edf98b7ea`.
- Author-declared starter source: `3c67ceb9de1739c23092f6fdd8680b9047536a9f`.
- Original identity: `antiphonal-arc-v1`; raw instrument SHA-256 `65b5a447711b72ef995c97bb05bc78155f1398027c8744661cb576982a6b0e4b`.
- Acoustic profile: version 1, `normal-speed`, `tuned-even`. Original piece pitches and materials are unchanged.

The author's `EVIDENCE.md`, `OWNER-INVITATION.md`, instrument, probes and diagram remain supplied evidence. The author explicitly reported a surrogate simulator and unavailable Havok/WebGL/listening checks. Their diagram's drawn trajectories are not recorded Havok paths or rendering captures. This review's [authoritative validator output](arc-authoritative-validator.json) and [independent raw measurements](arc-independent-evidence.json) are separate evidence. Numerical launches are in [the technical appendix](arc-solutions.md), outside the player invitation.

Both authoritative instrument and probe validators passed before additional investigation. The unmodified nine supplied probes and their eight ordinary neighbors produced 81 actual-Havok results. Validator `ok` means bounded valid data and completed simulation; it does not certify the claimed sequence or musical merit.

## What survived actual physics

| Supplied family | Independent central result | Ordinary-neighbor result |
| --- | --- | --- |
| West-to-east opening | One west-near D4; no east reply | All 8 remain one west-near strike |
| Mirrored east-to-west | One east-near G4; no west reply | All 8 remain one east-near strike |
| Wide-origin triple | One east-near G4; no triple | All 8 remain one east-near strike |
| West ramp arch | Ramp C4 → outer canopy E4 | All 8 retain these first two contacts; some continue |
| East ramp arch | Ramp D4 → outer canopy E4 | All 8 retain these first two contacts; some continue |
| Direct canopy drop | Outer canopy E4 → ramp C4 | 6/8 retain the relationship; 2 become canopy-only |
| Supplied sparse throat probe | Silent | 2/8 reach the bell |
| Two supplied negatives | Both silent | All 16 neighbors silent |
| Separate original opening | One throat-bell C4 | Preserved as an opening, not substituted for a failed probe |

Three of seven intended central family sequences are confirmed; four are not. The supplied invitation's “First Fire” prediction of a cross-clearing reply is therefore unverified for the curated opening. Preserve that original document as author evidence; the exhibition's ordinary entry should not promise the unmeasured reply.

The failed west-to-east case is a real lateral redirection, followed by first ground before the receiving wing. It is not an absent collision. At 0.833333 s, the measured bank normal is approximately `[-0.906308, 0, 0.422618]`; the two-callback collision cluster changes incoming velocity `[-10.70849, -1.80306, 26.50445]` to `[22.91273, -1.62551, 6.67789]` m/s. The shot terminates at 1.683333 s near `[7.33741, 0.43, 30.10490]`. Callback-level normals, points and whole-step outgoing brackets are preserved. Those brackets are not isolated per-contact impulses.

An independently found lateral crossing does work: west-near D4 answers at east-near G4 after a 0.966667 s interval, and all eight adjacent ordinary control settings retain that two-piece order. Two other found settings produce a stable single throat note or a stable middle-canopy note, each 8/8. A low ramp-canopy setup retains its relationship in 7/7 valid neighbors; the eighth falls below the control minimum and remains explicitly rejected. None requires between-detent precision.

## Does the architecture add something beyond lateral exchange?

A common 180-shot grid samples the same ordinary origin, yaw, elevation and power domain used by the independent Exchange review. Two deliberately simpler review controls remove either the five canopy plates or the four wing banks. Remaining geometry, collision coefficients and launch settings are unchanged. Each control has its own review-only identity; neither is an exhibited revision.

| Variant, 180 settings each | Silent | 1 voiced impact | 2 | 3+ | Shots touching canopy | Cross-wing shots | Out of bounds |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Original Arc | 90 | 44 | 28 | 18 | 23 | 10 | 26 |
| No canopy | 99 | 47 | 24 | 10 | 0 | 10 | 26 |
| No wings | 128 | 36 | 10 | 6 | 23 | 0 | 30 |

The canopy contributes separate upward and downward journeys: the supplied ramp arches become ramp-only without it, and the direct canopy drop becomes silent. Removing wings preserves those vertical core relationships. The canopy does **not** increase cross-wing coverage in this sample. This is evidence for two physical families in one place, not evidence that more pieces automatically make a better lateral instrument.

The common grid reaches 10/12 pieces. A separately labeled 36-shot loft fan reaches each missing inner canopy plate in 11/18 corresponding-side samples. All twelve surfaces are therefore reachable across these bounded measurements; the coarse grid alone would have missed two. Half the common grid remains silent. This is a diagnostic sampling result, not player frequency, accessibility certainty or an enjoyment score.

The authored canopy is five separate leaning flat plates, and each wing is two separate banks. They are faceted arrangements of existing honest collision forms, not a continuous smooth curved collider. Material contrast is preserved by the profile and voiced events; its perceptual value still requires listening. The sparse bell, spaced lateral pair and ramp/canopy phrases offer plausible ensemble material without demanding a long optimized sequence.

## Construction history and gaps: a material qualification

The selected five representative settings reproduce their complete physical hashes in 35/35 comparisons after actual opening shots in Descending Resonance, Chime Terraces, Exchange and Hairpin, including three complete catalog cycles. Hashes include physical world/setup/launch, contact ledger, samples, recognition evidence, terminal and resonance history.

That result does **not** extend to every seam-adjacent launch. A targeted twenty-setting fan near the central canopy gaps compares a fresh scene with the same shot after Hairpin opening → Terraces opening → Arc. Sixteen match exactly; four differ. All four retain exactly the same sounding piece order, pitches, onset times and voiced gains. Three have material physical changes: two terminal positions move about 0.379 m; another moves 0.618 m, terminates one fixed step later and changes qualified redirect count from one to zero. The fourth terminal displacement is about 0.000677 m. Both outcomes, their hashes, contact traces, normals and setup are preserved under `seamFan.rows[].switched` and detailed in the appendix.

All 66 piece pairs have positive supporting-axis separation; the minimum reported supporting-axis gap is 0.503924 m. This is a separating-axis measure, **not an exact Euclidean surface distance**. More importantly, separate nonpenetrating boxes do not imply a ball cannot contact two bodies: the projectile diameter is 0.86 m, and the targeted traces actually contain same-step callbacks on neighboring canopy bodies. The supplied “clearance to avoid solver-sensitive seams” claim is consequently too strong. The evidence identifies a construction-history sensitivity around multiple-body contacts, not a proven engine-level root cause.

This is an explicit replay boundary, not a reason to silently reshape the instrument. Recorded companions retain captured physical/acoustic history rather than re-simulating it. No stored line was rewritten and no change to redirect recognition was made to hide the discrepancy. Preserve this case for future geometry guidance and owner comparison.

## Runtime costs, lifecycle and cameras

| Runtime-only scene | Ready static bodies | Dynamic at ready / during shot | Meshes | Materials | Observed warm build CPU time |
| --- | ---: | ---: | ---: | ---: | ---: |
| Original Arc | 14 | 0 / 1 | 20 | 13 | 4.413 ms |
| No canopy | 9 | 0 / 1 | 10 | 8 | 1.784 ms |
| No wings | 10 | 0 / 1 | 16 | 13 | 1.910 ms |

The original has twelve authored bodies plus ground and tee. The first authoritative-validator build measured 41.026 ms; these single warm observations are noisy and affected by compilation/caching and concurrent work. They are not rendered frame times. Counts exclude the presentation layer, launcher, trails and shadows. This lane does not establish GPU draw calls, shadow cost, memory high-water marks or phone performance.

Every measured clear/reset returns to its pre-shot body/mesh/material counts; disposal leaves zero runtime bodies, meshes and materials. A single active projectile is asserted at every launch. The common grid and history cycles exercise repeated load, fire, clear and switch. The separate ensemble/audio review owns cross-instrument companion scheduling and storage tests; this lane supplies captured sources and does not substitute physics traces for listening evidence.

Explicit aspect-ratio frustum checks at canvas sizes 960×650, 390×397 and 844×290 include all piece corners in authored Overview. Curated left-aim Launch excludes the opposite near-wing center at the first two sizes and partially clips other opposite-side pieces; the wide landscape canvas includes all pieces. This is geometric framing only, not an inspection of occlusion, WebGL artifacts or camera comfort. Overview is the appropriate comparison view for the whole court. No browser rendering or listening claim is made by this lane.

## Reproduction and checks

Run from the final exhibition checkout; these explicit paths avoid depending on the measurement script's original intake defaults:

```sh
node scripts/instrument-foundry/validate.mjs worlds/instruments/exhibition/antiphonal-arc-v1/instrument.json --probes worlds/instruments/exhibition/antiphonal-arc-v1/probes.json --output /tmp/arc-authoritative.json
node scripts/exhibition/measure-arc.mjs worlds/instruments/exhibition/antiphonal-arc-v1/instrument.json worlds/instruments/exhibition/exchange/instrument.json worlds/instruments/exhibition/hairpin-fable-v1/instrument.json
node --test tests/instrument-foundry.test.mjs tests/instrument-author-validator.test.mjs tests/instrument-restore-policy.test.mjs
bash scripts/sites-env.sh -- npx eslint scripts/exhibition/measure-arc.mjs
```

The focused suite passed 11/11 and the new script passed lint. The director's integrated verification report owns full-suite, TypeScript, application lint/build and rendered-browser findings. Re-running the measurement writes a new `sourceSha` and environment-dependent CPU observations; it does not change the original inputs. The committed raw evidence's source SHA identifies the exact reviewed script, whose SHA-256 is `1194ec54897765c34d9823bd2860949e4d607e28805bd059d86f280dce911212`.

**Recommendation:** invite owner audition of the unchanged work, especially its low-to-high versus high-to-low phrases and sparse contributions against another instrument. Keep its failed surrogate predictions and canopy-gap replay sensitivity visible in the technical handoff. There is no measured need for a new geometry capability or synthesis engine to admit this contribution.
