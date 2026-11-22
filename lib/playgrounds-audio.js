// Opt-in feedback for the new Playgrounds labs. These are the incumbent
// charge, launch and impact voice patterns from manners-game.tsx, at a quieter
// shared output trim. No sound callback advances or alters physical state.
const OUTPUT_GAIN = .35;
const MAX_TRANSIENTS = 12;
const CONTACT_INTERVAL = .065;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function createPlaygroundAudio() {
  let ctx = null, master = null, charge = null, disposed = false, enabled = true;
  let lastContact = -Infinity, groundHeard = false, terminalHeard = false;
  const voices = new Set();
  const active = () => !disposed && enabled && ctx && ctx.state !== 'closed';

  const release = voice => {
    if (!voice || voice.released) return;
    voice.released = true;
    voice.source.onended = null;
    try { voice.source.disconnect(); } catch { /* Already disconnected. */ }
    try { voice.gain.disconnect(); } catch { /* Already disconnected. */ }
    voices.delete(voice);
    if (charge === voice) charge = null;
  };
  const stop = voice => {
    if (!voice || voice.released) return;
    try { voice.source.stop(); } catch { /* A scheduled source may have ended. */ }
    release(voice);
  };
  const watch = (source, gain) => {
    const voice = { source, gain, released: false };
    voices.add(voice);
    source.onended = () => release(voice);
    return voice;
  };
  const tone = (start, end, seconds, level, type = 'sine') => {
    if (!active() || voices.size >= MAX_TRANSIENTS) return;
    const source = ctx.createOscillator(), gain = ctx.createGain(), now = ctx.currentTime;
    source.type = type;
    source.frequency.setValueAtTime(start, now);
    source.frequency.exponentialRampToValueAtTime(Math.max(20, end), now + seconds);
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + seconds);
    source.connect(gain).connect(master);
    watch(source, gain);
    source.start(now);
    source.stop(now + seconds + .03);
  };
  const noise = (seconds, level) => {
    if (!active() || voices.size >= MAX_TRANSIENTS) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    // Audio texture only; this random noise never enters a shot record or solver.
    for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / samples.length) ** 1.8;
    source.buffer = buffer;
    gain.gain.value = level;
    source.connect(gain).connect(master);
    watch(source, gain);
    source.start(ctx.currentTime);
  };
  const thud = (strength, ground) => {
    if (ground) {
      // A dense volley must not mask the actual shot-ending contact.
      while (voices.size > MAX_TRANSIENTS - 2) stop(voices.values().next().value);
      tone(110, 45, .18, .075 * strength, 'triangle');
      noise(.14, .045 * strength);
    } else {
      tone(180, 65, .2, .13 * strength, 'triangle');
      tone(390, 170, .13, .04 * strength);
      noise(.11, .055 * strength);
    }
  };

  return {
    setEnabled(value) {
      if (disposed) return;
      enabled = value === true;
      if (!enabled) for (const voice of [...voices]) stop(voice);
      // Enabling never starts or resumes sound from an earlier event.
    },
    // Call synchronously from a player gesture. Physics callbacks deliberately
    // never create/resume an AudioContext, so autoplay policy cannot affect play.
    unlock() {
      if (disposed || !enabled) return false;
      try {
        if (!ctx) {
          const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
          if (!Context) return false;
          ctx = new Context({ latencyHint: 'interactive' });
          master = ctx.createGain();
          master.gain.value = OUTPUT_GAIN;
          master.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') Promise.resolve(ctx.resume()).catch(() => {});
        return ctx.state !== 'closed';
      } catch {
        // Audio availability must never prevent a launch or world restore.
        if (ctx) { try { Promise.resolve(ctx.close()).catch(() => {}); } catch { /* No context to close. */ } }
        ctx = null; master = null;
        return false;
      }
    },
    chargeStart() {
      this.chargeStop();
      if (!active()) return;
      // Leave room for the charge control even during a dense previous contact.
      if (voices.size >= MAX_TRANSIENTS) stop(voices.values().next().value);
      const source = ctx.createOscillator(), gain = ctx.createGain();
      source.type = 'sawtooth'; source.frequency.value = 62; gain.gain.value = .025;
      source.connect(gain).connect(master); charge = watch(source, gain); source.start();
    },
    chargeUpdate(value) {
      if (!charge || !active() || !Number.isFinite(value)) return;
      const amount = clamp(value, 0, 1), now = ctx.currentTime;
      charge.source.frequency.setTargetAtTime(62 + amount * 330, now, .025);
      charge.gain.gain.setTargetAtTime(.022 + amount * .035, now, .025);
    },
    chargeStop() {
      if (!charge) return;
      const fading = charge; charge = null;
      if (!active()) { stop(fading); return; }
      const now = ctx.currentTime;
      fading.gain.gain.cancelScheduledValues(now);
      fading.gain.gain.setTargetAtTime(.0001, now, .02);
      try { fading.source.stop(now + .09); } catch { release(fading); }
    },
    launch(power = .55) {
      this.chargeStop();
      groundHeard = false; terminalHeard = false; lastContact = -Infinity;
      if (!active()) return;
      const amount = Number.isFinite(power) ? clamp(power, 0, 1) : .55;
      tone(76 + amount * 54, 25, .58, .24, 'sawtooth');
      tone(760, 115, .27, .06, 'square');
      noise(.32, .12);
    },
    contact({ speed, ground = false } = {}) {
      if (!active() || terminalHeard || !Number.isFinite(speed) || speed < .6) return;
      if (ground) {
        if (groundHeard) return;
        groundHeard = true;
      } else if (ctx.currentTime - lastContact < CONTACT_INTERVAL) return;
      lastContact = ctx.currentTime;
      thud(clamp(speed / 18, .18, 1), ground);
    },
    terminal(reason) {
      this.chargeStop();
      if (terminalHeard) return;
      terminalHeard = true;
      // Interrupted shots have no synthetic collision. A real terminal ground
      // callback already sounded; do not add a second thud at the same event.
      if (!active() || reason === 'interrupted') return;
      if (reason === 'first-ground-contact') { if (!groundHeard) thud(.55, true); }
      else if (reason === 'out-of-bounds') tone(110, 45, .18, .04, 'triangle');
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const voice of [...voices]) stop(voice);
      try { master?.disconnect(); } catch { /* Already disconnected. */ }
      if (ctx) { try { Promise.resolve(ctx.close()).catch(() => {}); } catch { /* Already closed. */ } }
      charge = null; master = null; ctx = null;
    },
  };
}
