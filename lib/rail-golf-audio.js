// Rail Golf range audio.
//
// Every sound in the mechanism range now lands on one master bus:
//   voice gain -> ... -> MASTER BUS GAIN -> DYNAMICS COMPRESSOR -> destination
// Nothing else is allowed to touch `context.destination` directly. See
// `tests/rail-golf-audio-structure.test.mjs` for the greppable guard on that
// rule, and `tests/rail-golf-audio-headroom.test.mjs` / `-runtime.test.mjs`
// for the Ruckus-Line "double" overlap ceiling.
//
// Art direction: this is an artillery range with a golf ceremony bolted on
// as a joke. Launch and breach keep real low-end weight; the scoring chimes
// (ace/double/breach rulings) stay small and dry by comparison. The mix is
// intentionally unbalanced in that one direction.

const SILENCE_FLOOR = 0.0001;

// A short linear attack keeps every one-shot transient from starting with a
// sample-to-peak jump (the source of the baseline's clicking).
const TONE_ATTACK_SECONDS = 0.012;
const NOISE_ATTACK_SECONDS = 0.006;

// Master bus: one gain trim into one compressor, and that is the only path
// to `context.destination` anywhere in this module.
const MASTER_BUS_GAIN = 0.92;
const COMPRESSOR_SETTINGS = Object.freeze({
  threshold: -22,
  knee: 18,
  ratio: 6,
  attack: 0.002,
  release: 0.16,
});

// Sustained flight hum. Quiet on its own; ducked whenever a transient (a
// breach) fires so it never fights the low end of the punch.
const FLIGHT_TONE_GAIN = 0.014;
const FLIGHT_TONE_ATTACK_SECONDS = 0.05;
const FLIGHT_DUCK_GAIN = FLIGHT_TONE_GAIN * 0.3;
const FLIGHT_DUCK_ATTACK_SECONDS = 0.02;
const FLIGHT_DUCK_HOLD_SECONDS = 0.16;
const FLIGHT_DUCK_RELEASE_SECONDS = 0.32;

// Charge tone (the rising whine while the fire control is held).
const CHARGE_TONE_BASE_GAIN = 0.02;
const CHARGE_TONE_SPAN_GAIN = 0.035;
const CHARGE_TONE_BASE_FREQUENCY = 62;
const CHARGE_TONE_SPAN_FREQUENCY = 330;
const CHARGE_TONE_ATTACK_SECONDS = 0.05;

// The headroom ceiling below is the number this whole module is graded
// against for the Ruckus-Line "double" cluster: sustained flight tone +
// playBreach() + playRuling("double"). See the PR body for the full
// justification; short version: -6 dBFS-ish (0.45 linear) leaves real
// margin under full scale even if every uncorrelated voice's sample peaks
// happened to line up, while still being a meaningfully tighter target
// than the baseline's ~0.733 (-2.7 dBFS).
export const RUCKUS_LINE_DOUBLE_HEADROOM_CEILING = 0.45;

export function createRailGolfAudio(options = {}) {
  const { createContext = defaultCreateContext, muted: initialMuted = false } = options;

  let context = null;
  let master = null;
  let muted = Boolean(initialMuted);
  let chargeTone = null;
  let flightTone = null;

  function ensureContext() {
    if (!context) {
      context = createContext();
      master = buildMasterBus(context);
    }
    if (context.state === "suspended" && typeof context.resume === "function") {
      void context.resume();
    }
    return context;
  }

  function connectToMaster(node) {
    node.connect(master.input);
  }

  // A one-shot pitched transient: short attack, exponential decay, routed
  // through the master bus. Never connects to destination itself.
  function tone(startFrequency, endFrequency, duration, gainValue, type = "sine", delay = 0) {
    if (muted) return;
    const ctx = ensureContext();
    const now = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(SILENCE_FLOOR, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + TONE_ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(SILENCE_FLOOR, now + duration);
    oscillator.connect(gain);
    connectToMaster(gain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  // A band-limited noise burst. `filterType`/`frequency`/`Q` decide where the
  // burst sits in the spectrum: low and wide for weight (launch/breach), high
  // and narrow for the small dry scoring chimes, so the two families never
  // smear into the same band.
  function noise(duration, gainValue, { delay = 0, filterType = "lowpass", frequency = 900, q = 0.8 } = {}) {
    if (muted) return;
    const ctx = ensureContext();
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channel.length, 1.8);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    const now = ctx.currentTime + delay;
    gain.gain.setValueAtTime(SILENCE_FLOOR, now);
    gain.gain.linearRampToValueAtTime(gainValue, now + NOISE_ATTACK_SECONDS);
    gain.gain.exponentialRampToValueAtTime(SILENCE_FLOOR, now + duration);
    source.connect(filter);
    filter.connect(gain);
    connectToMaster(gain);
    source.start(now);
  }

  function stopLiveTone(live, releaseSeconds = 0.09) {
    if (!live || !context) return;
    const now = context.currentTime;
    live.gain.gain.cancelScheduledValues(now);
    live.gain.gain.setTargetAtTime(SILENCE_FLOOR, now, 0.02);
    try {
      live.oscillator.stop(now + releaseSeconds);
    } catch {
      // The oscillator may already be stopping after a phase transition.
    }
  }

  function stopChargeTone() {
    stopLiveTone(chargeTone);
    chargeTone = null;
  }

  function stopFlightTone() {
    stopLiveTone(flightTone);
    flightTone = null;
  }

  // The flight tone is the one sustained voice in the range. When a
  // transient (a breach) fires mid-flight, duck it hard and let it recover
  // afterward instead of letting it sit at full gain underneath the punch.
  function duckFlightTone() {
    if (!flightTone || !context) return;
    const now = context.currentTime;
    const param = flightTone.gain.gain;
    param.cancelScheduledValues(now);
    param.setTargetAtTime(FLIGHT_DUCK_GAIN, now, FLIGHT_DUCK_ATTACK_SECONDS);
    param.setTargetAtTime(
      FLIGHT_TONE_GAIN,
      now + FLIGHT_DUCK_ATTACK_SECONDS + FLIGHT_DUCK_HOLD_SECONDS,
      FLIGHT_DUCK_RELEASE_SECONDS,
    );
  }

  function playChargeStart() {
    tone(54, 92, 0.16, 0.025, "triangle");
  }

  function startChargeTone() {
    if (muted) return;
    stopChargeTone();
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sawtooth";
    oscillator.frequency.value = CHARGE_TONE_BASE_FREQUENCY;
    gain.gain.setValueAtTime(SILENCE_FLOOR, now);
    gain.gain.linearRampToValueAtTime(CHARGE_TONE_BASE_GAIN, now + CHARGE_TONE_ATTACK_SECONDS);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 620;
    filter.Q.value = 0.6;
    oscillator.connect(filter);
    filter.connect(gain);
    connectToMaster(gain);
    oscillator.start(now);
    chargeTone = { oscillator, gain };
  }

  function updateChargeTone(charge) {
    if (!chargeTone || !context) return;
    const now = context.currentTime;
    chargeTone.oscillator.frequency.setTargetAtTime(
      CHARGE_TONE_BASE_FREQUENCY + charge * CHARGE_TONE_SPAN_FREQUENCY,
      now,
      0.025,
    );
    chargeTone.gain.gain.setTargetAtTime(CHARGE_TONE_BASE_GAIN + charge * CHARGE_TONE_SPAN_GAIN, now, 0.025);
  }

  function startFlightTone() {
    if (muted) return;
    stopFlightTone();
    const ctx = ensureContext();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = 96;
    gain.gain.setValueAtTime(SILENCE_FLOOR, now);
    gain.gain.linearRampToValueAtTime(FLIGHT_TONE_GAIN, now + FLIGHT_TONE_ATTACK_SECONDS);
    oscillator.connect(gain);
    connectToMaster(gain);
    oscillator.start(now);
    flightTone = { oscillator, gain };
  }

  function updateFlightTone(speed) {
    if (!flightTone || !context) return;
    flightTone.oscillator.frequency.setTargetAtTime(72 + Math.min(180, speed * 2.7), context.currentTime, 0.04);
  }

  // Weight + low-end punch: a falling sawtooth/square pair plus a
  // low-passed noise thump. Excluded from the Ruckus-Line overlap ceiling
  // (it fires once, well before a breach or ruling can land on top of it).
  function playLaunch(power) {
    tone(76 + power * 54, 25, 0.5, 0.24, "sawtooth");
    tone(760, 115, 0.24, 0.06, "square");
    noise(0.3, 0.14, { filterType: "lowpass", frequency: 260, q: 0.7 });
  }

  // Mechanism breach: a falling square-wave punch plus a tight low-passed
  // debris burst. This and playRuling("double") are the two transients that
  // can land on top of the sustained flight tone in the same window, so
  // this is one third of the Ruckus-Line headroom cluster.
  function playBreach() {
    duckFlightTone();
    tone(138, 40, 0.42, 0.16, "square");
    noise(0.4, 0.09, { filterType: "lowpass", frequency: 420, q: 0.8 });
  }

  // Scoring rulings. Deliberately small and dry next to playLaunch/playBreach
  // — the joke is the golf ceremony is tiny next to the gun. The "double"
  // branch (breach + target in one shot, Ruckus Line's signature trick) is
  // the other third of the headroom cluster; its two chime tones and its
  // noise tick are pushed up in frequency so they sit above the breach's low
  // band instead of piling directly on top of it.
  function playRuling(outcome) {
    duckFlightTone();
    stopFlightTone();
    if (outcome === "wet") {
      noise(0.7, 0.09, { filterType: "bandpass", frequency: 480, q: 1.1 });
      tone(210, 52, 0.7, 0.06, "sine");
      return;
    }
    if (outcome === "double") {
      tone(164, 656, 0.5, 0.045, "triangle");
      tone(246, 984, 0.56, 0.035, "triangle", 0.07);
      noise(0.3, 0.05, { filterType: "bandpass", frequency: 2400, q: 3.2 });
      return;
    }
    if (outcome === "ace") {
      tone(196, 392, 0.34, 0.05, "triangle");
      tone(294, 588, 0.44, 0.038, "triangle", 0.1);
      noise(0.26, 0.045, { filterType: "bandpass", frequency: 1900, q: 2.6 });
      return;
    }
    if (outcome === "breach") {
      tone(84, 31, 0.56, 0.15, "sawtooth");
      noise(0.5, 0.1, { filterType: "lowpass", frequency: 380, q: 0.7 });
      return;
    }
    tone(74, 35, 0.36, 0.08, "sine");
    noise(0.24, 0.04, { filterType: "bandpass", frequency: 900, q: 1.4 });
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) {
      stopChargeTone();
      stopFlightTone();
    }
  }

  function dispose() {
    stopChargeTone();
    stopFlightTone();
    if (context && typeof context.close === "function") {
      context.close().catch(() => undefined);
    }
    context = null;
    master = null;
  }

  return {
    setMuted,
    isMuted: () => muted,
    playChargeStart,
    startChargeTone,
    updateChargeTone,
    stopChargeTone,
    playLaunch,
    startFlightTone,
    updateFlightTone,
    stopFlightTone,
    playBreach,
    playRuling,
    dispose,
    getContext: () => context,
  };
}

function buildMasterBus(ctx) {
  const input = ctx.createGain();
  input.gain.value = MASTER_BUS_GAIN;
  const compressor = ctx.createDynamicsCompressor();
  if (compressor.threshold) compressor.threshold.value = COMPRESSOR_SETTINGS.threshold;
  if (compressor.knee) compressor.knee.value = COMPRESSOR_SETTINGS.knee;
  if (compressor.ratio) compressor.ratio.value = COMPRESSOR_SETTINGS.ratio;
  if (compressor.attack) compressor.attack.value = COMPRESSOR_SETTINGS.attack;
  if (compressor.release) compressor.release.value = COMPRESSOR_SETTINGS.release;
  input.connect(compressor);
  compressor.connect(ctx.destination);
  return { input, compressor };
}

function defaultCreateContext() {
  if (typeof AudioContext !== "undefined") return new AudioContext();
  throw new Error("AudioContext is unavailable in this environment; pass options.createContext for testing.");
}
