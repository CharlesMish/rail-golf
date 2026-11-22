# Two-Shadow Theatre — numerical appendix

These are technical fixtures, intentionally absent from the owner invitation.
All setups are real UI positions. `charge` is a 0–1 fraction. Rail indices map to
x = −4, 0, +4 m; the station is x0, y0, z0, heading +z.

| ID | Rail | Yaw | Elevation | Charge | Observed family |
|---|---:|---:|---:|---:|---|
| open | 1 | 0° | 30° | .50 | Open arc, ground at 2.316667 s |
| side | 1 | 15° | 30° | .55 | Flat broad face, x reversal |
| rostrum | 1 | −15° | 30° | .55 | Sloping top, upward departure |
| over | 1 | 15° | 45° | .55 | Clears the flat; no piece contact |
| corner | 1 | 25° | 30° | .55 | Flat end/corner, depth reversal too |
| near-rhyme | 1 | 0° | 36° | .40 | Front resembles open; shorter depth |

Code-owned collision layout:

- Ground box: center (0, −0.5, 42), size (96, 1, 116), terminal top y0.
- Upright flat: center (11, 8, 35), size (1.4, 16, 26), no rotation.
- Rostrum: center (−13, 4, 45), size (18, 1.5, 18), pitch −15°.
- Both physical pieces use the accepted bank/ramp restitution .86 and friction
  .18. Ground uses .1/.8. Ball values and gravity come unchanged from the accepted
  session. No custom impulse, material switching or contact rewriting is used.

Raw evidence includes every representative sampled path, contact callback,
normal, incoming/outgoing velocity, terminal, eight neighbors per principal
fixture, the 63-shot coarse grid, ablations, frame-partition reproduction and
lifecycle measurements. Contact timestamps are pre-step callback times; the
terminal record is after that fixed step. Consecutive contact callbacks comprise
one contact episode, not multiple intentional rebounds.
