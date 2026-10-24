// Synthesized strike. No sample, no network. A handful of inharmonic partials with a short decay.

const PARTIALS = Object.freeze([
  Object.freeze({ ratio: 1, gain: .5, decay: 1.05 }),
  Object.freeze({ ratio: 2.01, gain: .26, decay: .7 }),
  Object.freeze({ ratio: 2.76, gain: .16, decay: .46 }),
  Object.freeze({ ratio: 3.41, gain: .09, decay: .3 }),
  Object.freeze({ ratio: 5.04, gain: .05, decay: .2 }),
]);
const FUNDAMENTAL = 415;
const MASTER_DECAY = 1.15;

/** Schedule a short metallic bong on an already-running AudioContext. Duration stays under 1.2 s. */
export function playBellBong(context, when = context.currentTime) {
  const master = context.createGain();
  master.gain.setValueAtTime(.0001, when);
  master.gain.exponentialRampToValueAtTime(.2, when + .008);
  master.gain.exponentialRampToValueAtTime(.0001, when + MASTER_DECAY);
  master.connect(context.destination);
  for (const partial of PARTIALS) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(FUNDAMENTAL * partial.ratio, when);
    const gain = context.createGain();
    gain.gain.setValueAtTime(partial.gain, when);
    gain.gain.exponentialRampToValueAtTime(.0001, when + partial.decay);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + partial.decay + .02);
  }
  return { duration: MASTER_DECAY, partials: PARTIALS.length };
}
