# Shot Repeater — a finite launch acting on an evolving world

The original Guest Stone already supports useful physical work. This prototype asks a narrower new question: after discovering a launch, is it interesting to commit it as a small finite behavior and watch its usefulness change as the stone moves? It is `/lab/playability-repeater`. The original Guest route, geometry, coefficients, records and shelf remain unchanged.

The physical proof is positive. A repeated moderate blow advances the stone; a slightly shorter flight eventually pushes it out of its own reach, after which identical launches miss. A banked setup produces a different direction of delivery. Every repeated record exactly matches a manually continued control. **The queue adds a player decision and removes repeated clicking; it does not create new physical solution families.** Owner enjoyment of Guest Stone motivates this experiment, but enjoyment of automatic repetition has not yet been established.

## Authority

- Exact starting authority: PR #81, `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054`.
- Lane branch: `research/playability-repeater-20261122`.
- Physically measured implementation: `bb497343b565ab6f4ea93921e74c6a0a06f6e419`; the evidence script records a clean source tree at measurement start.
- Subsequent lane changes are documentation or placement of the visible Stop control, not physics changes. The integrated director packet identifies the final lane and published commit.
- Actual Babylon NullEngine + Havok, unchanged 120 Hz physics, projectile mass/radius/charge mapping, gravity and first-ground behavior. No forces, reset-to-home, target corrections or simultaneous projectiles are added.

The full before/end/settled snapshots, paths, event evidence, callback normals and incoming/outgoing velocity brackets for five representative six-shot runs are in [repeater-evidence.json](repeater-evidence.json), approximately 427 KB. [repeater-solutions.md](repeater-solutions.md) isolates numerical setups. The spoiler-free invitation is [repeater-owner.md](repeater-owner.md).

## What the player controls

Fire once commits an ordinary manual trial. Once its prop settles, the same exact setup can be selected for three, four or five **additional** shots from the resulting world. Changing any control requires a new manual trial before Start is enabled. The configuration is frozen during a sequence; the physical environment is not.

Only one ball exists. The session retires its terminal collision shape and lets the original Guest Stone lifecycle finish. Each subsequent shot starts only after a completed settled state and a 90-tick / 0.75-second observation pause. The pause is physical-step based rather than dependent on rendered frames. The world is held during the pause.

Stop is beside the visible stage, including on phone layouts. During a flight or settle, **Stop after this blow** cancels every later launch and lets the committed attempt finish naturally. During the gap, **Cancel remaining shots** launches nothing further. Reset is disabled while a committed blow is unresolved, then restores home; Undo restores the previous held starting state. The UI explains that distinction. A blocked settle cancels the queue and makes Undo/Reset available. An unfinished receipt is downloadable, with no invented settled state and no Keep eligibility.

Leaving the view, hiding the document, losing focus, page hide, unmount and disposal cancel pending launches; returning never resumes them. Restore/reload never authorizes firing. No timer or task remains running outside the active physics session. Audio stops on loss of focus; a new manual Fire/Start restores the player's sound setting. These are real new projectile sounds, not recorded musical playback.

## Physical evidence and negative result

Each row below is one manual trial followed by five identical finite repeats. Times are for the five-shot sequence including four observation gaps; the trial is additional.

| Relationship | Actual result | Sequence duration |
|---|---|---:|
| Steady direct work | Six total contacts advance the center from z=24 to z=29.782156 m | 11.666667 s |
| Reach exceeded | Trial and first three repeats hit; final two repeats strike pavement before reaching the stone. Final center z=26.374439 m | 10.825000 s |
| Strong delivery | Six total contacts advance the center to z=38.588383 m, near the receiving cradle | 12.241667 s |
| Banked delivery | Six west-bank → stone lines move the center to x=5.979671, z=28.817753 m | 13.691667 s |
| Reverse delivery | Six far-bank → stone lines move the center inward to z=17.202330 m | 19.691667 s |

All five complete sequences match the same six shots performed manually, record for record, including exact contacts, path, end state and settled state. Every next starting environment equals the preceding settled environment. The queue does not quietly replay a kept starting world.

The steady direct and banked families each retained all six stone contacts in all six single-control neighbors: yaw/elevation ±0.5°, power ±1%. The reach-exceeded case retained eventual misses in all six neighbors; +0.5° elevation and +1% power moved the first miss one attempt later. That changing horizon is a meaningful consequence of ordinary controls, rather than a between-detent numerical trick.

In the short-flight case, the last useful repeat contacts the stone at t=0.816667 s near y=0.627771 m. Its incoming velocity is approximately [0, −6.899521, 20.637806] m/s; the continuing callback at t=0.825 s records outgoing [0.283497, −4.593496, −4.585108] m/s. The next repeat lands at t=0.85 s, with pavement as its only contact and no stone contact. Raw callback times are before the fixed-step elapsed increment; velocity values bracket a step, not a reconstructed isolated impulse.

The reverse sequence also demonstrates the limitation: almost 20 seconds of hands-off repetition is not automatically a better activity than choosing each shot. A sequence of misses does not discover a new plan by itself. The prototype deliberately leaves the failed attempts visible and stops after its chosen count; it never optimizes aim or extends the batch to force a destination.

## Records, restoration and recovery

The latest manual trial and at most five repeated attempts are held individually in memory. Each contains its exact launch, held starting environment, real path/contact evidence, projectile terminal result, ball-end prop pose and later settled prop state. A new manual trial or new sequence explicitly replaces this bounded current ledger; the UI tells the player to Keep or download first. A sequence is metadata surrounding individual shots, never a single historical line.

Each completed blow can be voluntarily Kept using the existing validated Guest record format, but a distinct local storage key protects the original Guest shelf. Four retained entries maximum, no silent overwrite; malformed saved bytes remain untouched with memory-only warning. Download preserves the separate records, exact build, approved plan and an incomplete receipt if one exists. This is evidence export, not an imported executable program. There is no sequence auto-save or reload-resume behavior.

Fresh scene restoration reproduced the entire short-flight sequence under 30, 60, 144 Hz and mixed 7/21/9/32 ms render partitions, with the same 120 Hz physical ticks. Stop was tested during flight, during prop settling, during the observation gap, and synchronously in the completion callback. Reset/Restore cancel a pending gap. Repeated load/run/reset/dispose returns owned bodies, meshes and shadow casters to zero.

Root review identified a legacy Guest wrapper edge case: its original `undo()` can retain a pending terminal flag after a blocked settle. The new controller performs Undo through the existing exact `restore(before)` path, which clears that lifecycle. Original Guest code is preserved. The regression uses explicit failure injection and is not presented as a naturally observed blocked shot. Independent review also forced an actual Havok prop to remain rotating through the settle bound, then verified Undo → idle → manual retry. That actual-Havok failure probe is now retained as the thirteenth focused regression. No representative design shot hit the settle bound.

## Cost and limits

| NullEngine metric | Finite repeater | Original manual control |
|---|---:|---:|
| Fresh ready bodies | 11 static, 0 dynamic | Identical |
| During a shot | 10 static, 2 dynamic, including the one ball | Identical |
| After settled result | 12 static, including retired terminal ball | Identical |
| World meshes / active scene meshes | 30 / 31 (includes ball) | Identical |
| World shadow casters | 10 | Identical |
| Median build, 12 samples | 1.596486 ms | 1.286439 ms |
| Six-shot headless CPU run | 20.835947 ms, includes 360 extra held ticks | 15.996332 ms |
| Median Reset rebuild | 0.192209 ms | Same rebuild implementation |
| After owned world/session disposal | 0 bodies / 0 meshes / 0 casters | Same lifecycle |

Those are shared-host CPU samples and owned resource counts, not a statistically isolated benchmark. The repeater adds no physical bodies, render meshes, draw calls or shadow casters. The active/headless mesh count excludes browser presentation meshes shared with Guest. It adds bounded JavaScript records: representative complete trial-plus-five exports ranged from approximately 51–103 KB. The UI shelf separately allows four validated records, with existing per-record bounds. This is not a heap-profiler result.

Browser WebGL was unavailable in the director's current environment; rendered camera legibility, actual sound quality, GPU frame timing, draw calls and physical-phone performance are unverified. The camera reuses Guest's simple closer/survey views. The mobile Start action brings the stage into view and Stop is placed there, but that layout decision is not a claim of rendered owner verification.

Lane checks: 13 focused tests, TypeScript and targeted ESLint pass. Root integration owns full repository checks/build and hosted preview verification. Run `node --test tests/playability-repeater.test.mjs` and `node scripts/playability/measure-repeater.mjs` to reproduce.

## Director recommendation

Keep the finite repeater as an optional operation inside a persistent-object workshop, not a separate general Worldcraft feature yet. The strong result is a visible finite behavior whose input changes after every shot. It offers one decision—how far to trust a discovered action—at very small additional physics cost. It offers fewer moment-to-moment decisions than manual work; that may feel satisfying or merely convenient.

Isolation cost was a small queue around an accepted session. Playable cost was greater: explicit permission, cancellation, camera-accessible Stop, recording every attempt, valid partial failure, separate history and audio lifecycle. Generic authoring support would need versioned lifecycle adapters and validated environmental rest contracts; one compatible stone session does not justify exposing arbitrary repeating scripts or multiple launchers.

Do not add a sphere selector merely to accumulate combinations. The sphere's single-shot comparison can be judged independently; the original stone already establishes evolving-world repetition. A future owner-positive test could invite a designer to make a compact delivery machine where a short repeat is useful, then requires deliberate adjustment or reversal. Stop pursuing a dedicated mode if owners mostly use it as a time-saving button, watch several irrelevant misses, or consistently interrupt it to regain agency.
