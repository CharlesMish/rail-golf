# Author validation command

Use the same actual runtime as the audition page. The command validates all
central inputs before constructing Havok, then fires each case and all ordinary
neighbors. It does not score musical quality or require a number of contacts.

```bash
node scripts/instrument-foundry/validate.mjs path/to/instrument.json \
  --probes path/to/probes.json --output report.json
```

Without `--probes`, it measures the curated and original openings separately.
Without `--output`, it writes the JSON report to stdout. Existing output files
are replaced deliberately. An error prints `ok:false` and exits nonzero. A valid
instrument whose launches are all silent still produces an honest successful
engineering report; the author's design assessment must recognize that limitation.

The optional probe document is at most 64 KiB and has exactly:

```json
{
  "format": "rail-golf-instrument-probes",
  "version": 1,
  "cases": [
    {
      "id": "one-relationship",
      "family": "Describe the physical relationship you are testing.",
      "kind": "family",
      "setup": {
        "railIndex": 1,
        "originX": 0,
        "yaw": 0,
        "elevation": 20,
        "charge": 0.5
      }
    }
  ]
}
```

This is a format example, not a tested successful shot. Use 1–32 cases. IDs are
unique lowercase alphanumeric/hyphen slugs of at most 64 characters. `family` is
1–240 plain-text characters; `kind` is `family` or `negative`. Unknown keys are
rejected. Central settings must lie on actual player detents and inside the
instrument's validated launch bounds/window.

For every case the validator tries ±0.5 m origin, ±0.5° yaw/elevation and
±0.01 charge. A neighbor outside the bounds is recorded as rejected. It is not
clamped to the boundary and counted as a repeated successful result.

The report records the instrument and physical-world hashes, actual source file
hashes and current repository SHA; per-shot contact rows, musical impacts with
original timestamps/pitches/gains, qualified redirects, terminal and full physical
payload/path hashes; and runtime body/mesh/material counts, CPU construction,
reset and disposal. Musical callback grouping and sport redirect qualification
remain the existing engine's independent operations. The command does not
quantize, fabricate impacts or use a decorative trajectory.

Counts are runtime-only NullEngine allocations, not rendered draw calls or frame
rates. The report's `ok:true` means valid inputs and completed measured physics.
It does not certify human discoverability, pleasing sound, device performance,
visual correctness or replay under a different body-construction history.

The two reference `probes.json` files provide real measured examples. Include at
least a useful contrast and an unsuccessful outcome when preparing your own
submission. Describe which nearby changes preserve a relationship and which
change the phrase; an exact note-sequence match is not the only useful behavior.
