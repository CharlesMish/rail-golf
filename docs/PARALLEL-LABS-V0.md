# Rail Golf parallel experiments v0

Accepted control: `354c4084fcf12cfed037ba3d341989edef61d07e`.

Four separate lab routes, not one combined level. Each lane was authored on an isolated worktree and reviewed before integration. No experimental world is mounted by the normal front door, `/lab/lines`, or `/lab/mechanism-range`.

| Route | Question | What physical fixtures establish | Main unknown |
|---|---|---|---|
| `/lab/timber-receiver` | Can one short receiver rescue far-side departures? | Gate tread/lumber lines that formerly went OOB return into the existing yard; Walk receiver departures continue into lumber/treads. | Full existing-feature → receiver → another collider chain has not been established. Human readability and trivial-backboard risk remain open. |
| `/lab/mechanism-vocabulary` | Can visible local wind and one moving body compose honestly? | Bounded deterministic fan states and real ANIMATED paddle collisions; per-launch phase and lifecycle are controlled. | Readability, enjoyment and speeds outside the tested collision envelope. |
| `/lab/travelling-tee` | Do wider stopped origins earn their complexity? | Three rails versus five stops versus half-metre carriage placement; identical aim/power can contact different families. No inherited platform velocity. | Whether continuous placement adds useful families beyond five stops. |
| `/lab/vertical-yard` | Does height alone produce new relationships? | Elevated launch, low/upper/cross-space routes, and a broad family returning from a high face into lower space. | Whether far-face/gantry overlap reads in real play. A further surface contact after the high return is not established. |

## Director recommendation

Give **Vertical Yard** the first five manual minutes. It changes the spatial question most directly while retaining familiar equipment and adding no mechanism/state burden. Test whether upper/lower choices read from launch and Survey, then whether a return into lower space invites another attempt. Physical feasibility is established; that visual invitation is not.

Next compare Travelling Tee's three rails with five stops while keeping aim/power fixed. Only then try its continuous-style slider. Receiver is the most conservative candidate for eventual courtyard integration, but stays a variant until its backboard risk is played. The vocabulary lab is a feasibility packet: wind and moving collisions work within the tested envelope, not a recommendation to add both to the current yard.

## Shared authority and isolation

After the independent lane inspections established overlap, the new B/C/D routes were connected to one new `SpatialLab` presentation shell. It reuses accepted launcher and Rail Round meshes, range input adapters, charge/MAX rules, FAMILIAR framing math, follow camera, qualified-contact rings and ordered terminal receipts.

`createMechanismSession` received optional station/environment/step/lifecycle hooks. Its default call path remains the accepted Mechanism Range authority. The new routes configure that same sphere/impulse/solver/contact/redirect implementation; they do not independently fork projectile physics. Elevated Vertical Yard adds only its station's y offset to the incumbent muzzle and camera. The stopped carriage resolves its origin before launch and snapshots it in evidence.

Only Lane B supplies an added bounded wind force and animated obstacle, explicitly required by its experiment. All other routes retain incumbent gravity, spherical collision shape, mass, speed curve and contact materials. No score rules or generic recognition gates changed. Receiver's qualified face uses the existing COMMON rule and an isolated copy of the established survey/archive namespaces. Its links retain the physical variant.

The accepted world's geometry, controls and presentation remain intact. Existing recorded MR fixtures must stay byte-identical; production and line-lab tests must remain green. The baseline commit above remains the exact recoverable control.

## Review repairs

- Origin mode changes use the authored nearest-origin mapping, not an accidental jump to the centre. Origin controls lock before charging/flight, including keyboard and delayed-handler guards.
- The animated paddle must stop its physical velocities after resolution and reset phase safely on recovery. A target transform alone would otherwise leave residual angular velocity while the result screen is open.
- Recovery remains ordered: release held inputs, finish/clear the actual body, restore setup/environment, place camera, publish READY. Recall restores exact power and clears MAX.

## Verification limits

Real Havok fixtures and browser-equivalent physics-observable stepping establish physical authority. NullEngine projections establish camera math, not rendered sightline quality. The available cloud browser reports WebGL unavailable, so no rendered gameplay screenshot or human discoverability result is claimed.

Each lane's adjacent design packet records its candidate/fixture evidence and what remains unproven. QA setups stay in source fixtures, never in the player brief. No lane should be promoted to production on the strength of headless existence alone.

## Integrated verification

`npm test`: production build and **348/348 tests passed** (307 baseline tests plus 41 experiment/runtime checks). `npm run typecheck` passed. `npm run lint` passed with the two existing MannersGame hook-dependency warnings. Fourteen stored Mechanism Range reference-record hashes remain exact. Added checks cover paired receiver/OOB outcomes and storage isolation; wind bounds/repeatability; twelve moving-paddle approaches and post-result idle; carriage origin mapping, launch-velocity identity and locked origin controls; elevated launch and broad high-return families; familiar camera translation; recovery and Recall.

The real-time hosted page/BUILD checks are separate from those physical claims. WebGL is unavailable in this verification browser; visual play remains Charlie's next review.
