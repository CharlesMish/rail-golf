# Rail Golf Instrument Foundry starter

Read `CONTRIBUTOR-BRIEF.md`, then `AUTHORING.md`. The two reference folders contain
unchanged Descending Resonance and Chime Terraces instruments plus measured probe
inputs. `template/instrument.json` is a renamed Descending scaffold with an explicit
overview camera, not a new independently authored instrument. Invent your own
idea; do not submit the scaffold unchanged.

This is a small data-and-instructions packet. It deliberately reuses the public
Rail Golf engine instead of embedding a second physics/audio implementation.
`SOURCE.json` contains the exact kit commit, repository and audition route.

For browser-only preparation, edit JSON and import it into the pinned audition
page from the publication receipt. The page validates the data and exposes the
ordinary solo/duet/trio player. Keep/export actual performances for discussion.

For reproducible author evidence, clone the repository and check out the exact
`kitCommit` from `SOURCE.json` onto a new branch. Run `npm run install:ci` with
Node 22.13 or later. Copy your edited folder under `worlds/instruments/`, then use
the validator commands in `AUTHORING.md`. Run `npm run dev` for local audition.

The packet's checksum list covers each packaged file. The zip is reproducible
from its named source commit with `scripts/instrument-foundry/package.py`.
The source repository, actual dependency lockfile and established runtime are
required for headless physics checks; this packet is not an offline standalone
game or a promise that any supplied browser has WebGL.

Return one instrument, probe inputs, a short evidence note, exact SHAs and a
spoiler-free play invitation. Do not merge or deploy to production.
