# Roof comparison — short owner check

The roof is still an open rendering investigation. Ordinary Yard play keeps
culling and shadows, with a different shadow filter and modest bias. The
historical physical roof shape has not changed.

Open `/lab/roof-comparison`. Start with **PR86** and **Above the near slope**.
Compare **Candidate**, then try **Bias only** and **Filter only** from that same
viewpoint. Look for flickering stripes, missing faces or shadows detached from
the building. Check both gables and **Under the overhang**. **Slow orbit** helps
reveal camera-dependent flicker.

If the problem occurs only in the full Yard, switch **Scene context** to all
original architectural solids. The three final diagnostic choices temporarily
remove shadow reception, culling or the hidden building cap. They are tests,
not proposed final appearances.

The useful report is which variant and viewpoint changes the defect, and
whether it happens only in the full context. The research browser cannot render
WebGL, so no completed visual repair has been claimed.
