# Counterline Ensemble integration

Branch `research/counterline-ensemble-20261126` begins at the independent PR85
candidate `6f080b78efb5afbeb5d8d087b1426e5681d6726d`. It has no dependency on the
new architectural experiment. Published HEAD and preview are recorded in the
owner draft PR.

The new `counterline-ensemble.js` module imports recording validation and sound
scheduling, never the physics runtime. The live route still creates one physical
projectile and advances the same Havok runtime at 120 Hz. Companions remain
recorded events at their original times. There is no loop, quantization, pitch
transposition or automation timeline.

The additive `rail-golf-counterline-ensemble` v1 format has exactly three source
slots: optional companion 1, optional companion 2, and the completed live source.
It retains each complete Worldcraft v1 physical line independently and stores
three explicit acoustic policies. Null means historical stored gains and
canonical timbre, regardless of another shelf copy's captured policy. The live
source may be silent. A conflicting physical ID is rejected. The current live
world is not inferred from companions or replaced by loading an arrangement.

Settings contain the fixed 100 ms delay plus three bounded gain/mute pairs.
Default gain is .30 per source, deliberately lower than the previous .45 pair
setting to leave room for a third contribution. Gains range from zero to .45;
legacy pair imports restore their original .45 settings. This does not promise
perceptual loudness matching. Levels are fixed throughout playback and tails.
Mute changes cut the selected layer's nodes and invalidate a fixed saved
arrangement; unmute never replays past events. Every Fire freezes independent
source and acoustic snapshots. Selecting or replacing either slot is silent.

The conservative voice accounting reserves a full 2.4 seconds per sounding
attack, covering the existing 2.32-second H resonator tail. A sorted rolling
window is bounded at 36 attacks; node cost also depends on timbre and is measured
separately. Known companion schedules are checked before committing playback.
Unexpected live density halts all audio explicitly and interrupts the active
shot rather than silently dropping later notes. All layers share one audio
origin. The existing 8 ms lateness tolerance, 120 ms scheduling-stall rejection,
12-tick physical-backlog limit and explicit retry behavior remain.

Four existing Keep slots and their storage keys remain unchanged. A separate
four-slot ensemble library embeds immutable sources; deleting a Keep cannot
remove a source from a saved arrangement. Each record is limited to 900,000
characters, and the library to 3.6 million. Load and save enforce the same bounds.
Concurrent changes, unreadable bytes and unavailable storage fail visibly and
preserve existing bytes. The ordinary Worldcraft physical export is unchanged;
Contact Loops can import it. New ensemble files have their own explicit format.
Old pairs and captures still import without rewriting their histories.

Recorded-only audition uses the same scheduler and clearly labels every part as
historical. Loading remains silent; only an explicit Audition or Fire opens
playback. Stop, Retry, source/world change, blur, pagehide, suspension, stale
asynchronous unlock and component disposal cancel obsolete voices. A natural
physical ending lets later companion events and full tails finish. Saving or
downloading a new combination waits for natural audio completion; Stop or an
audio failure while its music is pending invalidates that candidate. Stopping
a recorded-only audition does not erase its already recorded arrangement.

The four registered musical world files, geometry, pitches, capacities, authored
profiles and opening options are unchanged. Their measured material spans
separated versus clustered contacts in a common C4/D4/E4/G4/A4 register; this does
not yet establish distinct bass/percussion instruments. A future independent
instrument-authoring invitation should seek sparse, approachable short timber
phrases that leave room for a response, before adding another register or engine
feature. No additional world was implemented in this lane.

Actual physics/resource evidence and negative cases belong in
`ensemble-physics.md`; browser OfflineAudioContext/real-clock observations and
rendered limitations belong in the director verification. Audio peaks and phrase
counts do not establish musical enjoyment.
