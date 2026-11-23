# Independent review — Playability, Persistence & Repetition

Review baseline: PR #81, `a90785ac2a03f3f0f00a4dbd758b05f6f49a3054`.
The owner has now enjoyed Gallery Cistern and Guest Stone. The earlier packet's
"enjoyment unmeasured" entries are historical, not the current design judgment.
The owner found Theatre less immediately rewarding; preservation rather than
expansion is the appropriate response.

This review is independent of the lane authors. It separates correctness gates
from design reasons to continue. Passing the former does not establish enjoyment.

| Reviewed lane snapshot | Exact local SHA |
| --- | --- |
| Cistern implementation | `48cdec9422a38e37c1e115b61febb1b449bedf45` |
| Rolling implementation and recovery UI | `298b0234952f727a00796c4d5bcc1f6cf0daccd9` |
| Repeater implementation, mobile cancellation and evidence | `b831f38e06cdadc4c8f9eb5776d7fb5821d6691f` |
| Recorded-contact loops | `cf88d50ce0f5fc5215d5491a8a347159a7f0c841` |

The director's publication ledger records later documentation/integration commits
and the published candidate. These local source snapshots identify what this
review examined; they are not promises about an unobserved deployment.

## Acceptance questions

| Lane | Required correctness evidence | Design question |
| --- | --- | --- |
| Cistern | Default launch framing, actual-ball follow, reversible overview, recoverable natural and interrupted endings; matched physics before/after presentation work; real escape classification | Does following the journey make another region or route easier to choose? |
| Rolling object | Honest sphere collider, visible rotation, exact held pose/quaternion restoration; projectile unchanged; separate ball-end and settled snapshots; matched original stone and damping controls | Does rolling create useful movement, or mainly add waiting and overshoot? |
| Physical repeater | Finite explicit sequence; one projectile; held-state continuation; every attempt has its own record; cancellation survives every lifecycle boundary | Does choosing one setup produce interesting evolving work, or merely automate a chore? |
| Recorded loops | Actual shot provenance, original contact times, disclosed event selection and padding; audio-only label; immediate stop/mute and resource cleanup | Do two rhythms create a combination the owner wants to keep hearing or revise? |

A useful failure has to remain visible. Cistern escapes should not all be sealed;
a repeater that starts hitting and later misses should not secretly re-aim;
a rolling prop that fails its rest criterion must block continuation rather than
be teleported into a desired result. A stopped flight is interrupted, never a
natural first-ground result.

## Scope recommendation

Do not add the optional fourth lane before these gates are met. The owner has
already supplied evidence for two activities. Additional mechanisms would divert
attention from camera legibility and physical-state continuity, the practical
limits exposed by that playtest.

Generic authoring is a separate decision. Code-owned solid architecture,
approved passive-body templates, bounded repeat policies and recorded-event
playback can be useful labs without granting imported worlds custom scripts,
physics coefficients or arbitrary assets.

## Findings changed by review

- The rolling wrapper inherited a blocked-settle recovery hazard: clearing the
  projectile during Undo could leave a pending terminal lifecycle that later
  dereferenced that cleared projectile. The new wrapper clears that lifecycle;
  the repeater restores the recorded held starting state through the safe
  Restore path. The original Guest Stone implementation remains unchanged.
- Rolling Yard's first UI draft could advertise Undo after a blocked settle but
  disable the button because only completed records populated its visible last
  result. Blocked recovery is now available independently of a completed result.
- The repeated-shot ledger initially paired a new manual trial with an older
  sequence's plan. Starting a new manual trial now clears the preceding bounded
  sequence association while preserving the current physical world.
- The contact-loop importer initially allowed its underlying packer to create
  a missing line identity and timestamp. Source identity must be supplied; both
  missing and nullish provenance are rejected. Start/end path correspondence and
  strictly increasing timestamps are also required. These checks establish
  internal consistency, not cryptographic authenticity of arbitrary imports.
- The Cistern viewing switch now clears the previous follow sample and reacquires
  a local view. Otherwise, returning from Overview could apply the accumulated
  ball displacement as one camera transport step.
- An interrupted Cistern attempt remains explicitly interrupted and cannot be
  kept in the inherited natural-ending shelf. This preserves the old shelf
  contract and physical identity. Allowing a new record type in the same shared
  key would make the historical route reject that collection.

The baseline-check lane also challenged audio scheduling independently. It found
and verified fixes for asynchronous file-import/playback races, thrown scheduling
callbacks and audio-context suspension. None may leave a live timer/context or
resume an old listen without a new Start.

## Independently repeated evidence

The review reran the existing persistence, shelf and audio contract tests
(**26/26**), new Cistern tests (**4/4**), new rolling tests (**8/8**), physical
repeater tests (**12/12**) and corrected contact-loop tests (**13/13**). The
baseline-check lane independently reran that expanded loop suite too. The
director's integrated checks supersede these lane counts.

The rolling tests include actual Havok restoration at equivalent 30, 60 and
144 Hz frame partitions, ordinary neighboring launch detents, two receiving
places, original-stone physical comparison and repeated cleanup. A separate
review probe measured the opening sphere displacement as **2.744864 m**, with
the ball ending at **0.775 s** and the object ready at **4.750 s**. Its net
rotation was **0.587509 rad**, whereas distance/radius was **0.784247 rad**.
The motion combines rotation and sliding; it is not pure no-slip rolling.
Exact pose, contacts and source hashes are in
[review-rolling-evidence.json](review-rolling-evidence.json).

The reviewer separately forced sustained prop spin only inside an adversarial
Havok recovery test. Both object lifecycle and repeater reached the bounded
blocked state; no settled result was fabricated. Repeater Undo restored the
original held state, survived 120 idle ticks, and permitted a new manual shot
that settled normally at **1.633333 s**. This is failure-path evidence, not a
claim that ordinary owner play produces that forced condition.

The Cistern report's matched fixtures retain exactly the old physical output.
Its reproduced slow example still takes **40.625 s**; removing the proposed
floor seam takes **40.808333 s**. In the late tail the ball travels across the
top at y≈10.43 m while horizontal speed falls gradually. That is evidence against
fixing this case by sealing a seam or adding an environmental force. Giving the
player an honest Stop is the smaller intervention.

Launch camera-to-muzzle segments were separately checked on all three rails and
yaw −70…70° in 5° increments, with no solid obstruction. The lane author extends
this to three aspect ratios and actual flight ray/frustum audits. Those are
geometric checks, not a rendered usability certification or universal tunneling
proof. The director's browser lacked WebGL for the three-dimensional scenes.

## Recommendation

Gallery Cistern deserves continued architectural work because the owner already
enjoyed its routes. The current priority remains seeing and understanding those
routes. Do not add more architecture until the revised local follow view has
been played; its motion and framing remain an owner gate.

The sphere is a useful comparison, not an automatic replacement for the chunky
stone. At matched coefficients it travels farther and visibly rotates, but the
opening shot waits **3.975 s after ball termination** for its held state. The
original stone remains the stronger provisional tool for precise, quick work.

Finite repetition merits a specialized prototype. Identical shots act on an
evolving world and can begin hitting, then miss. It adds a choice about committing
to repeated behavior, not a new physical outcome unavailable through equivalent
manual shots. Do not promote it to a general mode without owner evidence that
choosing and revising the sequence is worthwhile.

Recorded loops are an inexpensive separate listening instrument. Their event
provenance, natural timing and cleanup are testable; their musical value requires
listening and owner response. A finite repeated launch must never be described
as the same operation as scheduling this historical audio.

Defer the optional fourth investigation and unrestricted authoring additions.
No result here certifies rendered camera quality, physical-phone performance,
musical quality or the enjoyment of the new variants.

No outstanding correctness blocker remained in the reviewed lane snapshots.
That disposition is conditional on the integrated checks and on preserving the
explicit browser and listening limitations in the owner handoff.
