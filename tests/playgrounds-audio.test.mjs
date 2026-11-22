import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaygroundAudio } from '../lib/playgrounds-audio.js';

function mockAudio(t, { suspended = false, failGain = false, rejectResume = false } = {}) {
  const old = globalThis.AudioContext, oldWebkit = globalThis.webkitAudioContext;
  const contexts = [];
  class Param {
    value = 1; calls = [];
    setValueAtTime(...args) { this.calls.push(['set', ...args]); }
    exponentialRampToValueAtTime(...args) { this.calls.push(['ramp', ...args]); }
    setTargetAtTime(...args) { this.calls.push(['target', ...args]); }
    cancelScheduledValues(...args) { this.calls.push(['cancel', ...args]); }
  }
  class Node {
    constructor(kind, ctx) { this.kind = kind; this.ctx = ctx; this.gain = new Param(); this.frequency = new Param(); this.disconnected = false; this.started = false; this.stops = []; ctx.nodes.push(this); }
    connect(next) { this.connected = next; return next; }
    disconnect() { this.disconnected = true; }
    start(when = 0) { this.started = true; this.startTime = when; }
    stop(when = 0) { this.stops.push(when); }
    end() { this.onended?.(); }
  }
  class Context {
    constructor() { this.currentTime = 0; this.sampleRate = 8000; this.state = suspended ? 'suspended' : 'running'; this.destination = {}; this.nodes = []; this.resumeCount = 0; this.closeCount = 0; contexts.push(this); }
    createGain() { if (failGain) throw new Error('audio device failed'); return new Node('gain', this); }
    createOscillator() { return new Node('oscillator', this); }
    createBufferSource() { return new Node('noise', this); }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { this.resumeCount++; if (rejectResume) return Promise.reject(new Error('blocked')); this.state = 'running'; return Promise.resolve(); }
    close() { this.closeCount++; this.state = 'closed'; return Promise.resolve(); }
  }
  globalThis.AudioContext = Context; globalThis.webkitAudioContext = undefined;
  t.after(() => { globalThis.AudioContext = old; globalThis.webkitAudioContext = oldWebkit; });
  return { contexts, sources: () => contexts.flatMap(ctx => ctx.nodes.filter(n => n.kind !== 'gain')), active: () => contexts.flatMap(ctx => ctx.nodes.filter(n => n.kind !== 'gain' && !n.disconnected)), finish: () => contexts.forEach(ctx => ctx.nodes.filter(n => n.kind !== 'gain').forEach(n => n.end())) };
}

test('Playgrounds sound never creates audio from physics or startup; unlock is gesture-owned', t => {
  const mock = mockAudio(t, { suspended: true }), audio = createPlaygroundAudio();
  audio.chargeStart(); audio.launch(); audio.contact({ speed: 12 }); audio.terminal('first-ground-contact');
  assert.equal(mock.contexts.length, 0);
  assert.equal(audio.unlock(), true);
  assert.equal(mock.contexts.length, 1); assert.equal(mock.contexts[0].resumeCount, 1);
  audio.unlock(); assert.equal(mock.contexts.length, 1);
  audio.dispose(); assert.equal(audio.unlock(), false); assert.equal(mock.contexts.length, 1);
});

test('missing, rejected and partially failed audio devices cannot prevent gameplay callbacks', async t => {
  const mock = mockAudio(t, { suspended: true, rejectResume: true }), audio = createPlaygroundAudio();
  assert.equal(audio.unlock(), true); await Promise.resolve();
  audio.launch(); audio.contact({ speed: 8 }); audio.terminal('first-ground-contact'); audio.dispose();
  assert.equal(mock.contexts[0].closeCount, 1);
  globalThis.AudioContext = undefined;
  const missing = createPlaygroundAudio(); assert.equal(missing.unlock(), false);
  assert.doesNotThrow(() => { missing.launch(); missing.chargeStart(); missing.chargeUpdate(1); missing.chargeStop(); missing.contact({ speed: 6 }); missing.terminal('settled'); missing.dispose(); });
});

test('partial context initialization closes the owned context', t => {
  const mock = mockAudio(t, { failGain: true }), audio = createPlaygroundAudio();
  assert.equal(audio.unlock(), false); assert.equal(mock.contexts[0].closeCount, 1);
  audio.dispose(); assert.equal(mock.contexts[0].closeCount, 1);
});

test('charge follows the familiar bounded voice and cancellation fades then releases every node', t => {
  const mock = mockAudio(t), audio = createPlaygroundAudio(); audio.unlock();
  const ctx = mock.contexts[0]; assert.equal(ctx.nodes[0].gain.value, .35);
  audio.chargeStart(); const source = mock.sources()[0], gain = source.connected;
  assert.equal(source.type, 'sawtooth'); assert.equal(source.frequency.value, 62);
  audio.chargeUpdate(2); assert.deepEqual(source.frequency.calls.at(-1), ['target', 392, 0, .025]);
  assert.ok(gain.gain.calls.at(-1)[1] <= .0571);
  audio.chargeUpdate(-1); assert.equal(source.frequency.calls.at(-1)[1], 62);
  const before = source.frequency.calls.length; audio.chargeUpdate(NaN); assert.equal(source.frequency.calls.length, before);
  audio.chargeStop(); assert.equal(source.stops.at(-1), .09); assert.equal(gain.gain.calls.at(-1)[1], .0001);
  source.end(); assert.equal(source.disconnected, true); assert.equal(gain.disconnected, true);
  audio.chargeStart(); audio.dispose(); audio.dispose();
  assert.equal(mock.active().length, 0); assert.equal(ctx.closeCount, 1);
  assert.ok(ctx.nodes.every(n => n.disconnected));
});

test('contact callback storms are throttled and bounded even when ended callbacks never arrive', t => {
  const mock = mockAudio(t), audio = createPlaygroundAudio(); audio.unlock();
  for (let i = 0; i < 500; i++) audio.contact({ speed: 20 });
  assert.equal(mock.sources().length, 3, 'one physical impact voice, not one voice per solver callback');
  for (let i = 0; i < 500; i++) { mock.contexts[0].currentTime += .07; audio.contact({ speed: 1e9 }); assert.ok(mock.active().length <= 12); }
  const beforeGround = mock.sources().length;
  audio.contact({ speed: 12, ground: true });
  assert.equal(mock.sources().length - beforeGround, 2, 'actual ground retains priority under saturation');
  assert.ok(mock.active().length <= 12);
  audio.dispose(); assert.equal(mock.active().length, 0);
});

test('actual ground and end event produce one terminal sound, reset only by a new launch', t => {
  const mock = mockAudio(t), audio = createPlaygroundAudio(); audio.unlock();
  const impact = Object.freeze({ speed: 12, ground: true }); audio.contact(impact);
  assert.equal(mock.sources().length, 2);
  audio.terminal('first-ground-contact'); audio.contact(impact); audio.terminal('first-ground-contact');
  assert.equal(mock.sources().length, 2);
  mock.finish(); audio.launch(.8); assert.equal(mock.sources().length, 5);
  audio.terminal('first-ground-contact'); assert.equal(mock.sources().length, 7, 'ground fallback exists when UI did not forward the collision');
  audio.terminal('first-ground-contact'); assert.equal(mock.sources().length, 7);
  mock.finish(); audio.launch(); const count = mock.sources().length;
  audio.terminal('interrupted'); assert.equal(mock.sources().length, count, 'stopping a shot does not fabricate collision feedback');
  audio.dispose();
});

test('quiet/resting contacts are silent and repeated world disposal leaves no active source or context', t => {
  const mock = mockAudio(t);
  for (let i = 0; i < 25; i++) {
    const audio = createPlaygroundAudio(); audio.unlock();
    audio.contact({ speed: 0 }); audio.contact({ speed: NaN });
    assert.equal(mock.active().length, 0);
    audio.chargeStart(); audio.launch(); audio.contact({ speed: 9 }); audio.terminal('first-ground-contact');
    audio.dispose(); assert.equal(mock.active().length, 0);
  }
  assert.ok(mock.contexts.every(ctx => ctx.state === 'closed' && ctx.closeCount === 1 && ctx.nodes.every(n => n.disconnected)));
});

test('mute stops active voices and charge; enabling never replays a past sound', t => {
  const mock = mockAudio(t), audio = createPlaygroundAudio();
  audio.setEnabled(false); assert.equal(audio.unlock(), false); assert.equal(mock.contexts.length, 0);
  audio.setEnabled(true); assert.equal(mock.contexts.length, 0, 'enabling alone does not request an audio device');
  audio.unlock(); audio.launch(.8); audio.chargeStart(); assert.ok(mock.active().length > 0);
  audio.setEnabled(false); assert.equal(mock.active().length, 0);
  const count = mock.sources().length;
  audio.contact({ speed: 20 }); audio.chargeStart(); audio.chargeUpdate(1); audio.launch();
  assert.equal(mock.sources().length, count);
  audio.setEnabled(true); assert.equal(mock.sources().length, count); assert.equal(mock.active().length, 0);
  audio.contact({ speed: 10 }); assert.equal(mock.sources().length, count + 3, 'only a new contact can sound');
  audio.setEnabled(false); audio.terminal('first-ground-contact'); audio.setEnabled(true);
  audio.contact({ speed: 20 }); assert.equal(mock.sources().length, count + 3, 'an ended muted shot does not resume sounding');
  audio.dispose(); audio.setEnabled(true); assert.equal(audio.unlock(), false);
});
