# Gallery Cistern — architectural playground research

Gallery Cistern establishes a credible architectural ingredient: broad receiving surfaces at different heights, joined to an enclosing room and a side chamber, can support different spatial intentions from one launch area. The most useful evidence is the contrast between a low landing followed by an inward return, a shallow circuit around high stone, and a visit to the side chamber that comes back into the room. Contact counts are not the design objective.

This is a compact prototype of the enclosing Ringwell/stepwell proposal, not the full proposed multilevel place. The room has a high entry, three receiving regions, connected side chamber and meaningful failed landings. It has no moving mechanisms, weather, goals, imported custom physics or music puzzle. Fifteen static bodies are sufficient. Its present weaknesses are long settling tails and unverified rendered framing; there is no owner enjoyment evidence yet.

## Authority and scope

| Item | Exact authority |
| --- | --- |
| Branch | `research/playgrounds-architecture-20261121` |
| Foundation | `4dab6e187720ea45f02dfdec74dd1aaa12ea7fdb` — Horizons fixed-step spatial session and actual-path contracts |
| Geometry/runtime source | `137cea268fcbded104b7e2d21eadcd6756b44abf` |
| Measured source including camera correction | `8bc8ed707788a17b1f388f97aad4f546a434f453` |
| Playable route | `/lab/playgrounds-architecture` |
| Physical layout identity | `playgrounds-ringwell-v1` |
| Raw evidence | [architecture-evidence.json](architecture-evidence.json) |
| Camera geometry evidence | [architecture-camera.json](architecture-camera.json) |
| Bounded negative comparison | [architecture-floor-comparison.json](architecture-floor-comparison.json) |

The foundation is neutral to the amphitheater work. Review included the supplied spatial originals, Horizons lane reports, Foundry authoring/vocabulary and the earlier Vertical Yard implementation. Vertical Yard supplies precedent for honest elevated solid geometry and a raised station; Horizons supplies the existing real fixed-step session. This lane changes neither foundation branch nor production. Shared opening overview, persistent Keep/Restore and contact audio are opt-in director integration dependencies, not lane-owned engine changes.

Stock Foundry pieces cannot conveniently express these wide, thick architectural regions or a 20 m launch station. The prototype therefore follows the historical specialized-lab pattern: code-owned Babylon boxes whose dimensions and transforms also define Havok boxes. This is not a generic import/schema extension. The full layout validator accepts only its exact one-field identity; comparison worlds carry a separate probe identity plus serialized actual geometry and cannot be restored as full Cistern lines.

Projectile radius, mass, speed mapping, gravity, first-ground termination and 120 Hz stepping remain inherited. Stone uses the existing stock bank/ramp contact material (.86 restitution, .18 friction); the dark terminal floor and launch pier use existing ground values (.1, .8). We did not tune the ball, gravity or restitution to obtain a route.

## Roof transfer proof before choosing a place

Before worldbuilding, two broad roof boxes were tested at different heights with the same ordinary shot and four first-roof orientations. The flat and downhill roofs produced actual first-roof → second-roof → ground transfers; the uphill and crosswise variants missed the second roof at that setup. Removing the first roof caused ground contact before reaching the second. The numerical appendix records vectors and flight gaps.

This was a successful ingredient proof, not a roof-town rejection. Downhill pitch retained the second-roof contact at all six adjacent aim/power detents; flat pitch retained four of six. Pitch alone did not imply a useful destination: the uphill roof preserved a positive forward velocity but spent much more of its departure on height, and the crosswise roof sent the ball sideways. A connected roof neighborhood is worth a future independent authoring attempt. For this commission, the enclosing place was selected because it offered three visibly different regions within one coherent room without constructing an entire neighborhood around a transfer demonstration.

## Place and physical relationships

The entry is 20 m above the terminal floor. The east gallery has a broad top at 18 m, the west gallery and side chamber at 10 m, and the far low landing at 5 m. Walls enclose the room; a gap in the west wall leads into the real side chamber. The chamber end wall is angled, and its receiving floor joins the west gallery flush. There are no decorative surfaces pretending to be playable, invisible collision planes or solid walls hidden by a cutaway. An obstructive header was removed from both mesh and collision geometry.

| Family | Actual result | Adjacent ordinary controls | Interpretation |
| --- | --- | --- | --- |
| Low return | Low top → far wall → floor, 5.075 s | 8/8 preserve top then wall | A low receiving surface changes a short wall rebound into a deeper inward return. |
| High circuit | East top → walls and other stone → floor, 7.242 s | 7/7 available; lower elevation neighbor is outside controls | A shallow approach can travel around the room instead of dropping into its center. Later west contact is a side, not a top. |
| Side chamber return | Enters chamber, redirects at its angled end, reaches west top, returns to central floor, 8.692 s | 8/8 retain chamber visit and return; one rail neighbor lasts 39.225 s | The side region changes where the shot goes and comes back from. Retaining a family does not establish comfortable duration. |
| Opposite galleries | East wall → east top → west top → west wall → floor, 8.767 s | 5/8 | A genuine cross-room top-to-top transfer, with a 33.789 m contact-point separation and 2.842 s callback-free interval. Secondary discovery, not the main broad entry. |
| West reception | Low top → far wall → west top → floor via walls, 6.925 s | 7/8 | The west receiver is broad, but the initial low contact is only 0.156 m from its edge. Do not promote this as a broad first contact. |

Neighbors change one control at a time: yaw ±0.5°, elevation ±0.5°, power ±1 percentage point, or adjacent launch rail. These are controls a player can use, not hidden continuous origins. Family retention is deliberately weaker than reproducing the whole contact sequence. We report it as local sensitivity, not discovery probability.

Top-face claims were checked against contact normals, downward incoming velocity, actual contact-point height and face-interior margins. For the opposite-gallery line, separated redirect contact points are y18.000322 and y10.000322; their nearest top edges are 1.871 m and 0.971 m away. The west top after the chamber has a 0.641 m margin. A deliberately lower crossing contacts the west side at y8.426 and is not counted as a top reception. Raw callback velocities can momentarily be zero during resolution; the evidence preserves them separately from the session's separated outgoing vectors.

## Matched simpler layouts

Ablations use exactly the same shot settings, material and simulation cadence. Walls-only keeps the enclosing main walls, terminal entry pier and floor but removes galleries and the chamber. Receivers-only keeps the three main receiving solids, terminal pier and floor but removes enclosing walls and chamber. Those two controls distinguish the room's major ingredients; they are not intended to isolate every individual chamber surface.

| Setup family | Full Cistern | Walls only | Receivers only |
| --- | --- | --- | --- |
| Low return | Low top then far wall, floor at z30.275 after 5.075 s | Far wall then floor at z66.129 after 2.450 s | Low top then exits z100 at 4.392 s |
| Opposite galleries | Two actual gallery tops, 8.767 s | East wall then floor, 3.308 s | Ground only, 3.233 s |
| High circuit | East top, enclosing walls and other stone, 7.242 s | East wall then floor, 2.158 s | East top then outside-room floor, 3.517 s |
| Side chamber | Chamber visit and return, 8.692 s | Ground only, 2.442 s | Ground only, 2.442 s |

The extra geometry does more than decorate a stock bank: the whole enclosure keeps some departures inside, receiving tops renew their vertical travel, and the connected chamber gives a different place to enter and leave. The low-return family alone would still be a familiar rebound study. The case for keeping the prototype comes from the alternatives in the same readable place, not the complexity of that one line.

## Misses and stopping judgment

A 270-shot coarse atlas sampled ordinary detents, with no optimization or success ranking: 224 first-ground endings, 43 exits from bounds, 3 settled endings and zero safety timeouts. Sixty-two shots touched no structure before the terminal floor; 58 visited more than one named receiving region. All major solids were contacted somewhere in the atlas. This shows accessible empty space and several regions, not that players will discover or enjoy them.

The short miss hits only the terminal floor at 2.000 s. A high escape leaves the room without a structural contact at 3.408 s. The lower cross-room shot hits the west gallery side rather than its top. These remain useful contrasts and are preserved as fixtures.

The serious negative is slow dead clatter. Fourteen of 270 shots exceed 15 s; six exceed 25 s; the longest lasts 40.625 s and settles on stone. It is not forty seconds of meaningful varied motion. A bounded comparison merged the two joined receiving floors to test whether the seam was the cause: it still produced three settled shots, fourteen beyond 15 s and a 40.808 s maximum. A three-degree sloped replacement removed settled endings but increased shots beyond 15 s to 21, reduced chamber-end reach from 36 to 24, and changed the clear flat receiver. That change was rejected. No arbitrary timeout or altered collision rule was introduced to conceal the tail.

Stop/Retry must remain accessible. If owner play finds these tails frequent or confusing, reject or revise the chamber/floor relationship before widening this capability. The successful nearby cases do not cancel this negative result.

## Resource and camera evidence

These are NullEngine fixture measurements, not browser or phone performance. Counts exclude the shared launcher, projectile presentation, path lines, lights and UI; firing adds one dynamic projectile body. Idle worlds have no animated or dynamic bodies and no texture assets.

| World fixture | Static bodies / meshes | Shadow caster registrations | Triangles / submeshes | Warm median construction, 7 cycles |
| --- | --- | --- | --- | --- |
| Cistern | 15 / 15 | 13 | 180 / 15 | 3.475 ms |
| Walls only | 8 / 8 | 6 | 96 / 8 | 2.273 ms |
| Receivers only | 5 / 5 | 3 | 60 / 5 | 1.715 ms |
| Existing Vertical Yard | 23 / 85 | 85 | 1,020 / 85 | 8.258 ms |

The Cistern fixture has eight materials including the harness material, fifteen geometries and 360 vertices. Across eight construct/fire/reset/dispose cycles per configuration, counts returned to idle and owned bodies, meshes, geometries, materials and caster registrations returned to zero after disposal. No retained-resource growth was observed in these explicit object counts. Heap/GPU memory, rendered draw calls, shader cost, frame timings, visual audio operation and phone performance remain unmeasured. Submeshes are a structural cost indicator, not a measured draw-call number.

The camera was raised after projection exposed clipping. Its final fixed overview is (-25,145,28), looking at (-7,10,43). Actual world-box corners and every sampled representative trajectory fit inside 1440×900, 390×844 and 844×390 canvas frusta. Geometric line-of-sight rays reach all samples of the three main families and the opposite-gallery line; six of 408 samples in the long settling negative are blocked by the real chamber near wall. This checks geometry, not visibility through UI, pixel size, lighting or contrast. Browser WebGL was unavailable to the director's final visual check. The bottom console can still obscure part of a phone overview; owner browser review is required before calling the presentation successful.

## Verification and recommendation

Focused tests pass (four cases): physical box authority and first-ground behavior; nearby main families and actual top/side distinction; matched ablations and environment identity separation; repeat/reset and complete owned-resource cleanup, including the long settled negative. Lane TypeScript and ESLint checks passed. Exact repeat shots compare equal for low return, opposite galleries and chamber return. The director runs the repository-wide tests/build/validator after integration; those results belong in the main handoff.

Reproduce with `node --test tests/playgrounds-architecture.test.mjs`, `node scripts/playgrounds/architecture-measure.mjs`, `node scripts/playgrounds/architecture-camera.mjs` and `node scripts/playgrounds/architecture-floor-compare.mjs`. The raw evidence names the actual committed source; the later report/evidence commit does not change physics.

Recommend carrying this small prototype into owner play and keeping broad elevated receiving solids on the shortlist for future bounded authoring. Do not add unrestricted box modeling or configurable materials merely because this specialized implementation works. A future declarative slab/architectural-block primitive needs size/height bounds, honest collision shape, clear terminal-surface semantics and a body budget; it should be justified by more than this one world.

Invite a future independent author to make a compact roof neighborhood with two or three broad places to land and visible routes between them, using the measured roof-direction result rather than a contact quota. Evidence that would change this recommendation: owner inability to perceive the gallery relationships, repeated early stops from dead clatter, camera distance making the ball unreadable, or a simpler small arrangement proving equally inviting. Technically demonstrated and authorable in code are established; discoverability is plausible, expression has nearby physical evidence, and enjoyment is unresolved.
