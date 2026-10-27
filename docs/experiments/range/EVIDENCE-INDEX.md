# Where the Musical Workshop evidence lives

This file is the map. It does not replace the branches it names. Those branches are evidence. Nothing here merges them or asks for a production deploy.

| | Branch | SHA | Pull request |
|---|---|---|---|
| Integrated range, no music renders | `lab/wc-range-integrated-20261024` | `6cf951576d29cd051109d119e1d11381aeae0450` | base of #54 |
| Musical Workshop | `lab/wc-range-music-20261025` | `6ac83e3ff73c9cf72f47f0b5009aa9036557c5e4` | https://github.com/CharlesMish/rail-golf/pull/54 |
| Face-speed dynamics | `lab/wc-range-music2-20261025` | `9d8278ba9126a0579cfce35104417aba704248cd` | https://github.com/CharlesMish/rail-golf/pull/55 |
| Bank voice study, owner chose H | `lab/wc-range-music3-bank-voice` | `2c975014477264b870f578d7866a682431db2cd0` | https://github.com/CharlesMish/rail-golf/pull/56 |
| Bank-role fix and mix limiter | `lab/wc-range-music3-20261026` | `c48cfc92f5ef1157be644f7ece5377a0db4960e1` | no pull request |

#54 contains 5 WAV blobs, 2.80 MB, not present on `6cf9515`. #55 adds 6 WAV blobs, 2.18 MB. #56 adds 248 WAV blobs, 97.90 MB, under `docs/experiments/range/audio/music3/`. The figure of about 72.5 MB / 198 files is the same study counted a different way; the object list from `9d8278b..2c97501` is the larger one.

Paths on `2c97501`:

- `docs/experiments/range/audio/music/` — five arrangement renders
- `docs/experiments/range/audio/music2/` — face-speed pair renders
- `docs/experiments/range/audio/music3/in-game/` and `level-matched/` — the variant matrix
- `docs/experiments/range/audio/music3/manifest.json` — loudness for that matrix
- `docs/experiments/range/MUSIC.md`, `MUSIC-2.md`, `MUSIC-3.md`

The lean branch `lab/wc-range-music-lean-20261026` is cut from `6cf951576d29cd051109d119e1d11381aeae0450` so those blobs are not in its ancestry. It carries the implementation, the tests, these notes, and nine listening files in `docs/experiments/range/audio/music3/ab/` (4,045,108 bytes). It does not supersede #54, #55, or #56. Its own tip is the head of that branch.
