# Rail Golf

> [!IMPORTANT]
> **Development demo — playable, not a release.** This repository is the Rail Golf
> v0.3.1 baseline for Grokbot and Cursor Origin experiments. Expect active iteration;
> no compatibility or stability promise is implied.

_Because who needs to feel like Tiger Woods when you've got artillery?_

Rail Golf is a single-player artillery trick-shot range built with Babylon.js and Havok.
Aim a rail, hold to charge it, then follow the round downstream. The official ruling is
the first ground contact—not where the projectile eventually comes to rest.

The current **Mechanism Range** contains four cards in one shared course:

1. **Open Seat** — land directly on the cyan target.
2. **Timber Bank** — strike the timber wall and seat the same shot on amber.
3. **Hot Skip** — descend onto the powered pad and carry its second arc to violet.
4. **Ruckus Line** — breach the crate gate and continue to the far bell.

A target hit clears a card. A mechanism plus its target in the same shot earns the
trick stamp. Mechanism contact by itself is recorded as evidence, not a clear.

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
| Reset the current card | Reset address | R |

The short cyan muzzle spine shows direction only. Rail Golf intentionally does not
draw a predicted landing solution. The previous shot, first-kiss marker, and mechanism
markers are the survey instruments.

Progress is stored locally in the browser. No account or server-side save is required.

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

The canonical hosted build uses ChatGPT Sites. `.openai/hosting.json` contains an
opaque project identifier, not a secret, and is retained so the repository can remain
connected to that deployment. Runtime credentials and local environment files must
not be committed.

This source is an application project rather than the separate single-file offline
build. A standalone HTML can be generated and distributed independently when needed.

## License

No project reuse license has been granted yet. Public repository visibility alone does
not grant permission to copy, modify, or redistribute Rail Golf. Third-party materials
remain under their respective licenses; see `THIRD_PARTY_NOTICES.md`.
