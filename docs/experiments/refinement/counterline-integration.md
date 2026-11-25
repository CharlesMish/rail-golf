# Counterline repertoire integration

This lane reuses the registered Descending Resonance and Chime Terraces worlds. No object, pitch, material, physics coefficient, world identity, or Foundry document changed. The earlier two Musical Workshop arrangements remain selectable controls. Solo is the first option; accompaniment still means one historical phrase beside one new Havok projectile.

Base: PR #84, `8b02b8ceab95f28383f607cc4e891fe7e31dfc7a`. Branch: `research/counterline-repertoire-20261125`. First independently reviewable implementation: `2144bc84b45602e1e720dadbde13c1389c2e47fb`. Final publication SHA, draft and pinned preview belong in the director's publication ledger.

## Starting conditions and physical authority

The bounded adapter reads `foundryRecord()` and `rangeOpeningSetup()`, then uses the existing world validation contract for launcher constraints. It reads fixed origin/rail and any aim window rather than imposing workshop assumptions. Both selected registered worlds currently permit origin −10…10 m, yaw −70…70°, elevation 5…85°, power 0…100%; those limits are inherited, not expanded. Capacity 24 remains explicit for the original 21-piece Terraces.

The Counterline arrival setup is visibly labelled **Falling phrase** for Descending and **Rising chimes** for Terraces. These use existing manifest-tested setups, not new geometry or a rewritten preset. **Original opening** loads the unchanged authored opening silently. Both arrivals retain at least three separated onset events in all eight measured ordinary neighboring changes, including origin. The original Descending opening is one note; the original Terraces opening has two notes in one grouped event. Keeping only those openings would repeat the owner's accessibility problem.

The matched-grid and neighborhood evidence supports richer available musical material, not a human success rate or pleasing composition. Read [the physical report](counterline-physics.md), [raw evidence](counterline-evidence.json), and the separate [numerical appendix](counterline-solutions.md). Inherited construction-history sensitivity affects 15 of 875 Descending survey rows around touching surfaces, including a changed later destination. The historical survey is exactly reproduced after its historical construction sequence; cold initialization differs. The selected arrivals survive both histories. No solver or collision behavior was modified to conceal this limitation.

## Acoustic interpretation and memory

Descending's manifest opts into face-speed dynamics and the H tuned timber-bank voice. Terraces opts into face-speed dynamics with ordinary metal plates and timber ramps. The adapter respects those settings. The two workshop controls retain the previous Counterline canonical sound.

The existing Worldcraft v1 physical line remains unchanged. A new, separate `rail-golf-counterline-recording` v1 envelope contains that line and a bounded acoustic sidecar: versioned dynamics/bank-voice profile and measured incoming face speeds in contact order. For H playback, each captured face speed must reproduce its source line's stored face-speed gain. Pitches, timestamps, contact order and world provenance come exclusively from the physical source; the sidecar cannot add, retime or repitch a contact. It does not execute scripts or accept unknown voices. Imports establish internal consistency, not authenticity of arbitrary supplied bytes.

New pair v2 retains two independent physical sources plus their individual acoustic policies. Legacy pair v1 remains exactly canonical. A null policy explicitly means historical stored gains and canonical timbres, even when another saved copy of the same physical source has a capture. Unannotated old records are never passed through the face-speed inversion or silently labelled as H. Their unknown historical timbre is disclosed. Captured source identifiers cannot be reused with differing physical or acoustic bytes.

Four ordinary physical Keep slots are retained. Capture metadata is a separate bounded four-slot storage value. Failed/corrupt/concurrent writes preserve old bytes and visibly report that capture data may only be in memory; downloads include it. Silent lines remain valid physical records and can be imported/restored, but are not offered as musical companions. Recorded timelines distinguish quiet contacts from sounding notes. The ordinary physical export remains available separately for historical Worldcraft / Contact Loops interoperability; it cannot preserve the added acoustic sidecar.

Import, restore, changing companions/worlds and saved-pair selection stay silent. Restoring a captured line restores its acoustic interpretation for the next manual shot. Restoring an unannotated line selects the registered world's current authored presentation where recognized and says so; its historical companion playback remains canonical. Pair import does not retimbre an unrelated currently selected live world.

## Synchronization and lifecycle

The existing common audio clock, 100 ms acoustic buffer, fixed 120 Hz stepping and one-projectile authority remain. Historical events never enter the live collision ledger, recognition, resonance history or trajectory. Live/Historical scheduling preserves original physical event times; no grid or tempo quantization exists.

H's longer resonator needs up to 2.32 seconds; captured performances therefore reserve 2.4 seconds after the later musical ending. Legacy canonical pairs keep 2.1 seconds. The same 24-attack voice budget remains, using the applicable tail window. Zero-gain contacts consume no voice budget. Survey maxima are five voiced attacks per 2.4 seconds for Descending and ten for Terraces; doubling these measured maxima stays below 24, but an arbitrary pathological import still stops explicitly.

The previous interruption safeguards remain: explicit Stop, Retry, new launch, changed world/companion, blur, page hide, navigation, stale context resume, and unmount cancel obsolete sound. Natural physical completion lets the companion and tails finish. Mid-performance mute changes preserve individual Keeps but disable a falsely fixed saved pairing. Nothing automatically resumes after reload.

## Verification and limits

Twenty-one focused tests pass: the original twelve plus nine repertoire tests. They include actual rich-world Havok equality against the same-runtime solo control at 30/144 Hz and mixed frame partitions, independent acoustic policy validation, tamper/identity rejection, historical gain preservation, quiet physical records, full H tails and rich pairs staying within the voice budget. Original coverage includes 15/30/60/144 Hz, pause/retry/suspend, both natural ending orders, muting and repeated resource cleanup. TypeScript and targeted lint pass at the implementation checkpoint. Full repository/build/Foundry and browser results belong in the director packet.

`?qa=1` provides selectable rich-world recorded pairs for actual browser OfflineAudioContext rendering and an AudioContext/rAF notification probe. These use four small actual-Havok capture fixtures. They are explicitly recorded audio tests, not live WebGL simulation. Root browser observations determine whether rendered output was available. NullEngine counts and timings in the physical report establish allocations/CPU cost, not rendered draw calls, frame rate, phone performance, or auditory enjoyment.

## Musical Exchange Yard feasibility

Feasible, but it is a separate integration: Spatial Lab supplies qualified physical events and station/version provenance; Worldcraft supplies contact-to-note mapping and validated v1 histories. A musical yard should adapt actual Spatial Lab contacts into a separately versioned acoustic performance and retain spatial station identity, not forge a Worldcraft line or add companion collisions. Region-level note assignment and camera legibility would need authorship as well as code. Defer that work until these richer existing worlds establish what kinds of musical answering the owner wants. No musical Exchange Yard was implemented here.

## Camera check

The taller worlds reuse their existing Foundry side-result orbit on completion and Overview. Launch view can be explicitly restored after a result. The old workshop lens clipped four outer ramp corners in Terraces at the sampled desktop/portrait canvas sizes; a small Terraces-only lens widening removes that clipping. All 264 solid corners across both worlds fit launch and overview frusta in each of four sampled canvas shapes (2,112 corner projections); all measured contact points of four actual fixture histories fit the reused side-result frame at three shapes. This is a mathematical framing check, not an occlusion, rendered lighting or camera-comfort judgment. Script: `scripts/refinement/counterline-camera.mjs`; raw evidence: `counterline-camera.json`.
