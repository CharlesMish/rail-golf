# Rail Golf

> [!IMPORTANT]
> **Development demo — playable, not a release.** This repository is the Rail Golf
> v0.3.1 baseline for Grokbot and Cursor Origin experiments. Expect active iteration;
> no compatibility or stability promise is implied.

_Because who needs to feel like Tiger Woods when you've got artillery?_

Rail Golf is a single-player artillery trick-shot range built with Babylon.js and Havok.
Aim a rail, hold to charge it, then follow the round downstream. The official ruling is
the first ground contact—not where the projectile eventually comes to rest.

The optional **Mechanism Range** at `/practice` preserves four early prototype cards:

1. **Open Seat** — land directly on the cyan target.
2. **Timber Bank** — strike the timber wall and seat the same shot on amber.
3. **Hot Skip** — descend onto the powered pad and carry its second arc to violet.
4. **Ruckus Line** — breach the crate gate and continue to the far bell.

A target hit clears a card. A mechanism plus its target in the same shot earns the
trick stamp. Mechanism contact by itself is recorded as evidence, not a clear.

## Timber Courtyard — first slice

The front door `/` opens the Timber Courtyard; `/courtyard` remains a working alias.
Two stations share one physical mill yard with three challenges:

- **Across the Yard:** a 146-metre carry to the cyan Mill Bell. A normal target clear opens both the gallery and Lumber Walk.
- **Switchback Gallery:** bank off wall A, then wall B, and land on the amber roost in one shot for a trick stamp. A direct landing still clears.
- **Lumber Cascade:** shoot back from Lumber Walk. Land on the Receiving Bay to clear; rebound across three timber treads for the optional stamp.

Across the Yard now has a **Route Book**: Direct, Sky, Skip and Mill. Collect the
gold token, use the violet pad, or rebound from the mill, then land on the bell in
that same shot. A miss gives feedback but does not bank a route. Collect all four
across different attempts to earn **Yard Explorer**. Each route saves its latest
successful aim and power; select a collected route and **Recall winning line** to
restore its setup and charge marker. These routes are optional for progression.

Courtyard progress is saved separately from the four practice cards. Each station has three rails. Elevated seats, hinges and
moving reflectors are future authoring work. See [the slice notes](docs/timber-courtyard-slice.md).

## Controls

| Action | Pointer / touch | Keyboard |
| --- | --- | --- |
| Aim | Drag the course | Arrow keys or W/A/S/D |
| Charge and fire | Hold and release the orange control | Hold and release Space |
| Change launcher rail | Rail arrows | Q / E |
| Restore the previous setup | Previous-line chip | L |
| Survey view | Survey button | V |
| Toggle previous trajectory | Range option | G |
| Toggle audio | Range option | M |
| Retry immediately, including during flight | Retry now | R |
| Recall winning or recent lines | Shot tools & saved lines | Select with keyboard focus |

The short cyan muzzle spine shows direction only. Rail Golf intentionally does not
draw a predicted landing solution. The previous shot, first-kiss marker, and mechanism
markers are the survey instruments.

Progress is stored locally in the browser. Each card now keeps three recent attempts
and six winning contact families with their actual trails. Timed charge starts at
6 m/s, reaches 80% in two seconds and full power in three. Aim spans ±70° yaw and
5–85° elevation. Optional Set power remains available. Old Delivery saves migrate
to the new scale without changing launch speed. See [shot tools](docs/shot-tools.md).
No account or server-side save is required.

## Development

Prerequisites:

- Node.js `>=22.13.0`
- A POSIX shell; the bounded build helpers use Linux/macOS shell tools and GNU
  `timeout` in CI and Sites

Install and run the local development server:

```bash
npm ci
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
```

`npm test` performs a production build before running the Node test suite.

## Project shape

- `app/manners-game.tsx` — Babylon/Havok scene, director, input, audio, and HUD
- `lib/rail-golf-v02.js` — deterministic course rules, geometry queries, scoring,
  and progress normalization
- `tests/` — game-rule, headless Havok reachability, and rendered-metadata regressions
- `.openai/hosting.json` — existing ChatGPT Sites project identity and bindings
- `worker/`, `vite.config.ts`, and `build/` — Vinext/Cloudflare deployment path

The game uses one Havok session and one shared course. Cards change the target and
required mechanism; they do not instantiate separate games or physics identities.

## Deployment

The public game is hosted at [rail-golf.cmish.dev](https://rail-golf.cmish.dev) through
the repository’s Cloudflare deployment. `.openai/hosting.json` retains the earlier
ChatGPT Sites project identity; it is not the authority for publishing this build. Runtime credentials and local environment files must
not be committed.

This source is an application project rather than the separate single-file offline
build. A standalone HTML can be generated and distributed independently when needed.

## License

No project reuse license has been granted yet. Public repository visibility alone does
not grant permission to copy, modify, or redistribute Rail Golf. Third-party materials
remain under their respective licenses; see `THIRD_PARTY_NOTICES.md`.

### Lumber Walk

The courtyard now includes a second station and third card: **Lumber Cascade**.
An ordinary Delivery clear opens both the gallery and Lumber Walk. Select card 03
for a backward view through the yard: carry straight to the lime Receiving Bay,
or stamp three passive rebounds across descending timber stacks. Quick retry and
shot tools work at either station. See [the slice notes](docs/lumber-cascade.md).

### Diverter Floor lab

`/lab/diverter` is an isolated switchable-floor experiment, accessible from the
practice range. It is not Card 04 and does not change the three courtyard cards.
Shoot the physical switch to alternate LEVEL / RISE; Retry keeps its setting,
Reset Card returns to A, and Recall explicitly restores a saved line's starting
floor state. Every course now has a quiet build SHA for screenshot provenance.
See [the lab contract](docs/diverter-floor-lab.md); keep source QA fixtures out of
blind playtest handoffs.
