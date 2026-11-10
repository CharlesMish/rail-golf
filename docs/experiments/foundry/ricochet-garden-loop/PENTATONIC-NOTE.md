# A major or minor pentatonic switch

Design only. Nothing here changes the scale, the voices, or a shot.

## Where the pitches live

`WORLDCRAFT_SCALE` in `lib/worldcraft-resonance.js` is five equal-temperament degrees: 0 C4 (261.6256 Hz), 1 D4 (293.6648), 2 E4 (329.6276), 3 G4 (391.9954), 4 A4 (440). That is a major pentatonic. A piece stores `voice.material` and `voice.degree` (an integer 0–4), not a frequency. `resonanceOf` looks the degree up in that table and copies the note name and the hertz onto the impact when the contact is heard. The travelling bell is fixed on index 4, so it is A4 today. The same lookup names a piece in the impact headline.

The H bank voice does not choose the pitch. Foundry worlds that set `presentation.bankVoice` play the selected sound variant. The default variant is `tuned-even`, labelled “H · G, grazes lifted”: a timber bank uses the long tuned-wood bar, a 1.36 trim, and a 12 dB range. A metal bank stays ordinary metal. Gain still comes from face speed or total speed (`presetDynamics`). Hertz is only the oscillator frequency.

The timeline prints the note name from that impact (`C4`, `E4`, …) plus the time. Phrase goals compare the stored degrees, not the names.

## What a switch would do

One global choice, defaulting to the table above, would map the same degrees onto a minor pentatonic. A C minor reading keeps degree 0 on C4 and moves the others to Eb4, F4, G4, and Bb4, derived from A4 = 440 the way the current numbers are. Pieces, contacts, restitution, the solver step, contact times, and the gain curves stay as they are. The lookup happens after the ledger row exists.

The smallest change is the scale table and the lookups in `resonanceOf` (pieces and the bell) and the label helper in `lib/worldcraft-resonance.js`. A control, if one is shown, is a selector in `app/lab/worldcraft/worldcraft.tsx` that does not write the world. Tests that freeze the five names stay green while the default remains the current table.

## What stays put

Saved worlds store the degree. They do not store hertz. The v1 export hash `127a033284941a110bd174e59e51700f5bdce4ca3b74a6f6c381786586141389` is the sha256 of the House Shot, Orc Stand-in, starter, and empty world documents. Those documents do not contain frequencies, and they gain no field, so the hash stays. A kept line stores the note name and the hertz it already resolved. Replay schedules `impact.hz`. It does not look the degree up again, so a later switch does not rewrite a saved history. Firing the world again would resolve through whichever table is active. That is a new shot.

## Risks

Timeline cells and headlines are note names. The same degree would print Eb4 instead of D4, including two plates that already share E4 and are now told apart by position. A kept line’s marks keep the names from the shot that made them. Musical Workshop’s phrase is degrees 0, 1, 2, described as C4, D4, E4. The goal would still match on the degrees, and the melody the presets were authored to play would not be the one that sounds if the default ever moved. The bell would move with index 4 even though no world document changed. Scripts that turn the names C4–A4 back into hertz assume the major table. The switch must stay off the world document. A new required field would change those four exports and the hash.
