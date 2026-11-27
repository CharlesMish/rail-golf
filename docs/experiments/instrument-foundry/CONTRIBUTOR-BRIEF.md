# Invitation: invent one Rail Golf musical instrument

Hi! I'd like you to independently author one playable physical musical instrument
for Rail Golf. You have creative freedom over its spatial arrangement, physical
relationships and musical character within the supplied contract. Please surprise
us, and push back if a proposed direction is weak.

Rail Golf is a committed ballistic game: choose origin, yaw, elevation and power,
Fire, observe real Havok physics, listen, imagine a change, then Fire again.
There is no steering after launch. The first ground contact ends the line.
Players can Keep physical phrases, select up to two as recorded companions,
switch to another instrument, and perform a new live shot alongside them.

The owner's strongest musical experiences so far are Descending Resonance and
Chime Terraces, supplied as exact working references. The earlier compact
workshops were less rewarding because even two notes often took considerable
effort. The owner also enjoys the maintenance canopy's physically meaningful
curvature in a separate architectural world. These are evidence, not directions
to copy. Your instrument need not be an amphitheater, terrace, large building,
complete melody or high-contact-count machine.

Invent a physical relationship that invites experimentation. A small performance
that leaves room for another part is welcome. A larger structure may also work
if it is enjoyable to shoot through and offers several accessible possibilities.
Consider what catches attention on entry, what a nearby change does, and what
remains interesting after the first satisfying line. Don't optimize one fragile
solution or make the listener follow a correctness score.

## Use the supplied foundation

Repository: `CharlesMish/rail-golf`. Start at the exact kit SHA in `SOURCE.json`
or the director's published Instrument Foundry receipt; record it and create
your own branch. Read `AUTHORING.md` in this packet before changing geometry.
The current self-contained contract supersedes historical branch-specific
Foundry instructions for this invitation.

You author a bounded JSON instrument around an existing Worldcraft range preset.
The available vocabulary is static banks, ramps, blocks and plates; plates can
use the validated lift/tilt pair, and capacity24 is opt-in. The existing five
pitches, metal/timber interpretation and optional H timber-bank profile are
available. An optional bounded overview camera is also data. Do not introduce
a new mesh kind, coefficient, register or mechanism inside this submission.
If one is essential, explain the smallest missing capability separately and
deliver the strongest honest result supported by the kit.

You do **not** implement a new physics engine, collision ear, audio scheduler,
recording format, trajectory capture, sequencer or ensemble player. Import your
instrument JSON at `/lab/instrument-foundry`; the existing player handles them.
Try solo and, if useful, alongside a kept reference phrase. Sources retain
independent physical and acoustic provenance across instruments.

## Evidence that helps us choose

Demonstrate several distinct physical phrase families using actual Havok and
ordinary controls. Useful differences can involve contact region/order, register
choice within the supplied scale, a return, a pause, or a contrasting rhythm.
Use origin as well as angles and power. The supplied validator measures eight
ordinary neighbors around each probe and reports unreachable boundary neighbors
without clamping them.

Preserve a miss or disappointing outcome. Explain where the idea is robust,
where notes vary while the relationship survives, and where it is fragile.
There is no numerical contact-count quota. Two meaningful strikes can be a better
instrument than a long low-energy rattle.

Musical impact history is independent of sport redirect recognition. Solver
callbacks close together are grouped into an impact; later returns may sound
again without another qualified redirect. Use the existing resonance record,
not redirect count as a surrogate for music. Do not split solver callbacks,
quantize contact times, invent velocities or fake recorded trajectories.

Headless results establish physical behavior, not enjoyment. Inspect the actual
scene at ordinary zoom and a phone-sized viewport if you have WebGL; listen if
you have audio. State unavailable checks plainly. Check launcher, useful
surfaces, trajectory and controls are readable together. Keep successful numerical
recipes in the technical evidence, separate from the owner's invitation.

## Deliver one considered instrument

Provide:

1. `worlds/instruments/<unique-id>/instrument.json` and `probes.json`.
2. A concise design/evidence note: physical idea, meaningful families, ordinary
   sensitivity, negative results, resource/cleanup findings and limitations.
3. A spoiler-free owner invitation and brief play protocol.
4. Exact starting and ending SHAs, validator output and automated check results.
5. A draft PR against the supplied experimental kit branch, if repository
   publication is available; otherwise a small file bundle with an exact diff.

Keep changes inside your new instrument directory and evidence files. The director
will register selected submissions after audition; you need not change a central
registry to make yours playable. Preserve all historical worlds and performances.
Do not weaken tests, force-push, edit a foundation branch, merge or deploy to
production. Do not manufacture a polished success if the idea fails: a clear
negative result can be useful.

The question is: **what physical instrument would make a player want to hear
what their next slightly different shot contributes?**
