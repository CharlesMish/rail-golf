# Independent review — Places & Counterlines

This review is independent of the architectural, Counterline and continuation authors. The starting authority is PR #82 at `ddeed5b688ae8c15166c42a0302bf768bb11be70`. Charlie's latest playtest supersedes the previous packet's provisional judgments: the revised Cistern camera is enjoyable, its usable launch space is still narrow, Contact Loops is exciting, and finite repetition is more active than waiting through much of the sphere's decay.

## Acceptance questions

| Lane | Correctness gate | Design question |
| --- | --- | --- |
| Architectural place | Matching visible/collision surfaces; immutable world/station provenance; genuine first-ground endings; sampled launch bands and distinct stations; camera obstruction and ordinary controls | Does recognizing a place suggest several understandable next shots, or merely disguise one rebound fixture? |
| Counterline | One actual projectile; companion never enters physical or resonance history; shared launch/audio clock; immutable independent lines and explicit playback settings; cancellation and suspension cleanup | Does hearing the retained phrase change the intention for the next physical shot? Only owner play can answer this. |
| Direct finite repeats | Valid held starting state; at most one projectile; real settled-state gating; separate attempts; finite count and durable cancellation; old manual-trial default preserved | Is direct commitment a clear choice about repeated work rather than an unexpected automatic launch? |
| Viewport correction | Local scroll ownership at 100% zoom; essential controls reachable at short and narrow sizes; long receipts and shelves reachable; keyboard focus visible | Can the owner keep exploring without changing browser zoom or losing the shot controls? |

## Specific risks in the inherited code

- Worldcraft's original live resonance plays when callbacks reach the render loop; Contact Loops schedules against an audio clock. Combining them without a shared temporal origin could shift the accompaniment relative to the next line on slower frames. Fixed physics time and audio presentation time must be distinguished and measured.
- Historical kept performance records preserve time, pitch and gain but omit the selected bank voice and dynamics source. A new pairing may choose an explicit legacy playback policy; it cannot silently assert an exact historical timbre. Applying a face-speed voice curve to an unrelated total-speed record is a separate reinterpretation.
- Pairing settings must describe the actual audition being saved, not merely the UI selection after the flight. The two physical records remain independently inspectable and valid.
- Natural completion may allow the longer contribution and tails to finish. Stop, Retry, a new launch, source/world changes and suspension must retire stale nodes and pending async resume work. Restoring historical data never launches or starts audio.
- The spatial console has a nonshrinking firing block inside an overflow-hidden flex container. Scrolling only the upper section cannot reveal a firing block taller than the available height. Document-style experimental pages also need their own bounded scroller because production intentionally locks body scrolling.
- An architectural surface unvisited in one explicit launch grid is unsampled, not proved unreachable. More body names or contacts do not prove more physical intentions. Results should preserve both useful families and unproductive high arcs, misses, long clatter and station-specific gaps.

## Scope judgment

The two primary activities are complementary. Counterline should not depend on completion of a new architectural world; the new place should not acquire unrelated musical machinery. Additional persistent geometry is best deferred unless it provides a small, convincing new physical project. The flat garden's longer rolling motion is not by itself such a project.

The review results below will identify exact inspected source snapshots and independently repeated probes. Passing headless checks establishes neither rendered camera comfort nor musical enjoyment.

## Direct finite repeat review

Reviewed implementation checkpoint: `93ce58b` (independent usability/repeater lane). The bounded queue accepts an explicit `requireTrial:false` option only in the new route. Its default remains the historical manual-trial requirement. The new selector means **N total new shots**, with no preparatory blow. Restoring a physical record changes the held world but never restarts a queue.

The independent reviewer reran all 13 historical repeater tests and all five new direct-repeat tests: **18/18 passed**. These use actual Havok for byte-exact comparison with manual continuation, actual fixed-step partitions corresponding to 30/60/144 Hz and uneven render frames, misses caused by the changing world, interruption during flight/settling/pause, resource cleanup and adversarial blocked-settle recovery. The forced-spin blocked case is a failure-path test, not an authored shot solution.

The author corrected a small misleading Restore message that still instructed direct-mode players to fire manually. The scoped CSS change gives the complete spatial console a scroll path; document-style labs own a bounded local scroller. Production body scrolling remains untouched. Browser verification of ordinary zoom, populated shelves and short viewports remains a separate director gate.

Design disposition: preserve both direct and trial-first variants. Direct commitment is a clearer optional operation around the same physical world; it does not establish a new physical authoring capability. The existing flat garden remains an honest control. A future persistent-object study should justify rolling through a delivery, slope or receiving-channel relationship, rather than merely make the same sphere travel longer.

## Counterline review

Reviewed implementation checkpoint: `267eb91bc99f870142729e8c9a49d9a9922a1f38`. The independent reviewer reran the focused suite: **12/12 passed**. The live Havok contact ledger, path, terminal and resonance performance exactly match solo control under 15, 30, 60 and 144 Hz plus mixed frame partitions. These are equivalent synthetic time partitions, not measured browser frame rates. Historical companion events remain outside the physical runtime. The tests also cover shorter/longer contributions, tails, immediate mute, unresolved audio unlock, repeated cleanup, suspension, late delivery, scheduler failure, dense input refusal, conflicting source identities and cancellation while a hidden browser supplies no further animation frames.

Review found and the author corrected:

- Audio failure could dispose the live body from inside a collision callback. The page now defers that interruption until the physics step and its post-step work finish.
- A fifth Keep could throw without a usable response. The four-slot shelf is explicit, disables further Keep, and catches record/storage errors. Existing sources are never evicted implicitly.
- A duplicate imported source identifier could refer to different physical bytes while showing an earlier source's selector label. Conflicting imports are now refused; byte-identical copies remain usable.
- A muted or unmuted contribution halfway through a run must not be saved as an exact audition with only the starting mask. The individual physical line remains keepable, while saving that pairing is disabled and explained.
- A timing assertion used the rounded display value 6.8 instead of the actual recorded timestamp. It now compares the exact original source timestamp; no timing quantization or tolerance was introduced.

The chosen canonical timber/metal presentation is explicit. It does not promise the unrecorded bank-voice choice of legacy lines. Both contributions have the same 100 ms acoustic delay and gain. That delay is intentional scheduling headroom: it preserves their relative physical timing but adds audible lag relative to the visible collision, plus the device's own output latency. Owner listening should decide whether that feels acceptable. A long frame stall interrupts the pairing instead of dropping simulation ticks or accumulating late notes. This stricter continuation policy may need adjustment on a slower real device; it is not a reason to claim unmeasured phone performance.

The dedicated musical layout and additional companion layers are correctly deferred. An established accessible arrangement is enough to test whether remembered music gives the next committed physical shot a new intention. The original solo editor and Contact Loops remain separate first-class controls.

## Exchange Yard review

Reviewed physical/camera implementation: `319ef3e60701cecc394d1275024730c9f555bf73`. The reviewer independently reran **15/15** new architecture, inherited architecture and shelf tests. A separate [review probe](../../../scripts/places/review-architecture.mjs) reproduced all nine selected actual Havok records exactly after JSON serialization, checked both station identities through Keep, rejected station tampering, and found zero surviving owned bodies, meshes or shadow casters after disposal. [Raw independent evidence](review-architecture-evidence.json) records source hashes and exact numerical setups separately from the owner guide.

The underpass is a real opening. Across 43 actual 120 Hz samples inside the bridge depth, the projectile's top stayed at or below **7.2405 m** under the **9.5 m** underside, with lateral extent **0.43 m** inside the **8.5 m** inner pier faces. This is a spatial relationship, not a collision fabricated by a decorative arch. The matching bridge-absent control retains that low delivery trajectory, while front interception and top landing change. Thus the bridge supplies a visible choice between routes; it does not alter every flight merely by existing. Removing the station roof turns the retained roof-return examples into out-of-bounds flights, establishing a causal receiving/return role for the pitched physical surface.

The author addressed two substantive negatives during review:

- The initial side station faced a nearby high retaining wall. Opening a real service court made cross-yard access plausible instead of treating the second station's mere existence as greater freedom.
- An added long-tail camera audit exposed an **8.24 m / 9.03 m** one-frame camera move at 60 / 30 Hz around a trapped ball. The obstruction was an actual shallow pocket under a projecting store eave. Making that store roof flush with its wall reduced the preserved 24.4-second case to **13.333 seconds**, and removed the large camera move. This was an authored geometry correction with a cost: the earlier fragile roof-to-gallery transfer lost its remaining nearby matches. Six stronger relationships retained all six tested neighboring detents. The rejected version and its evidence remain recoverable.

The final author camera audit contains **7,715** sampled frames across nine real flights and three viewport/rate combinations, with zero sampled occluded ball rays, camera-inside-solid positions, between-frame solid crossings or out-of-frustum ball positions. After the first half-second, maximum camera moves are **1.233 m at 60 Hz** and **1.996 m at 30 Hz**; minimum ball distance is **7.538 m**. These are reviewed numerical outputs, not a rendered comfort certification. The owner should still judge launch framing, transitions and architectural legibility on an actual WebGL device.

The broad atlas must remain honest:

| Same explicit 294-shot grid | Forecourt | Service station | Cistern control |
| --- | ---: | ---: | ---: |
| At least one nonterminal contact | 99 | 155 | 164 |
| No nonterminal contact | 195 | 139 | 130 |
| Out of bounds | 29 | 36 | 58 |
| Flights longer than 15 seconds | 0 | 2 | 20 |

Exchange Yard does **not** demonstrate fewer dead settings across the complete sampled grid. Its stronger claim is different recognizable relationships—under the crossing, onto it, off a roof, across a service court—with complementary station access and much less long-tail waiting in this sample. The two stations together reach every substantial authored solid in the grid; several remain unvisited from each individual station. Neither counts as a player discovery rate, and a ground-only shot is not automatically a failed experience.

The new shared shelf normalization removes only known absent optional fields on accepted recognition rejections before storing their JSON representation. It fixes real repeat-feature Keeps without changing the physical record or relaxing imported-entry validation. The station selector also retains the player's current adjusted launch settings instead of silently restoring the previous shot while changing stations.

## Review disposition

No unresolved correctness blocker remained in the reviewed lane snapshots. Integration still needs the director's complete build/test gates and browser checks. Architectural coherence, musical intention and ordinary exploration remain owner-play questions; the evidence supports making the two activities available, not choosing one universal mode or expanding a general world schema.

Prioritize the place and the one-companion interaction as distinct activities. Preserve direct repeats as a small explicit option. Defer a new musical world, extra accompaniment layers and new persistent-object geometry until play reveals a specific unmet need.
