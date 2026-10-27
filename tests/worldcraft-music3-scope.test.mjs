// Bank-scope and replay checks for the Musical Workshop H voice.
// Seed 20261026 is provenance only. It is not applied to Havok.
// Layout: phrase-early-plate geometry from music3 (bank 0,16 yaw 80; ramp -8,40;
// plate -24,58; yaw 0, elevation 18, charge 0.55, origin 0, rail 1).
// Dynamics: normal-speed, the Musical Workshop live mapping.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { WORLDCRAFT_LIMITS } from '../lib/worldcraft-model.js';
import { adaptRangePreset, createMusicalWorkshopPreset, validateRangePreset } from '../lib/worldcraft-range.js';
import {
  MIX_LIMIT, RESONANCE_VOICES, createResonanceOutput, evenDbGain, impactAcoustics, mixLimit, noteTimeline,
  performanceFromResonance, voiceImpact,
} from '../lib/worldcraft-resonance.js';
import { createRangeHarness } from '../scripts/range/run.mjs';
import { MUSIC3_SHOTS } from '../scripts/range/music3-capture.mjs';

Logger.LogLevels = 0;
const SEED = 20261026;
const havok = await Havok({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const base = createMusicalWorkshopPreset();
const lofted = { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 };
const earlyPlate = [
  { id: 'ramp-yours', kind: 'ramp', x: -8, z: 40, yaw: 0, voice: { material: 'metal', degree: 1 } },
  { id: 'bank-yours', kind: 'bank', x: 0, z: 16, yaw: 80, voice: { material: 'timber', degree: 0 } },
  { id: 'plate-yours', kind: 'plate', x: -24, z: 58, yaw: 0, voice: { material: 'metal', degree: 2 } },
];
const asTimber = objects => objects.map(object => ({ ...object, voice: { material: 'timber', degree: object.voice.degree } }));
const worldFrom = objects => adaptRangePreset(validateRangePreset({ ...base, objects })).world;
const notesOf = shot => shot.resonance.impacts.filter(impact => ['ramp', 'bank', 'plate'].includes(impact.role));
const sameSamples = (a, b) => a.length === b.length && a.every((point, index) => Object.is(point.t, b[index].t) && Object.is(point.x, b[index].x) && Object.is(point.y, b[index].y) && Object.is(point.z, b[index].z));

function fakeAudio() {
  class Param { constructor() { this.value = 1; } setValueAtTime() {} exponentialRampToValueAtTime() {} }
  class Node {
    constructor() { this.gain = new Param(); this.frequency = new Param(); this.Q = new Param(); this.stopped = false; }
    connect() { return this; }
    start() {}
    stop() { if (this.stopped) throw new Error('already stopped'); this.stopped = true; }
    disconnect() { this.disconnected = true; }
    addEventListener() {}
  }
  class Ctx {
    constructor() { this.currentTime = 0; this.sampleRate = 44100; this.state = 'running'; this.destination = {}; }
    createOscillator() { return new Node(); }
    createGain() { return new Node(); }
    createBufferSource() { return new Node(); }
    createBiquadFilter() { return new Node(); }
    createWaveShaper() { return new Node(); }
    createBuffer(_ch, length) { return { getChannelData: () => new Float32Array(length) }; }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  const previous = globalThis.AudioContext;
  globalThis.AudioContext = Ctx;
  return () => { globalThis.AudioContext = previous; };
}

test('H is bank-specific on a real all-timber Musical Workshop shot', () => {
  assert.equal(SEED, 20261026);
  assert.equal(WORLDCRAFT_LIMITS.objects, 12);
  const session = createRangeHarness(havok, worldFrom(earlyPlate), 'music3-scope');
  session.runtime.setDynamics('normal-speed');
  try {
    const metal = session.shoot(worldFrom(earlyPlate), lofted);
    const timber = session.shoot(worldFrom(asTimber(earlyPlate)), lofted);
    const repeat = session.shoot(worldFrom(asTimber(earlyPlate)), lofted);
    assert.equal(sameSamples(metal.samples, timber.samples), true, 'timber voices do not move the shot');
    assert.equal(sameSamples(timber.samples, repeat.samples), true);
    assert.equal(metal.terminal.reason, 'first-ground-contact');
    const heard = notesOf(timber);
    assert.deepEqual(heard.map(impact => impact.role), ['bank', 'ramp', 'plate']);
    assert.deepEqual(heard.map(impact => impact.material), ['timber', 'timber', 'timber']);
    assert.ok(heard[0].normalSpeed < 8, 'opening bank contact is the soft one');
    assert.ok(heard[1].normalSpeed > 12 && heard[2].normalSpeed > 12);
    const bank = impactAcoustics(voiceImpact(heard[0], 'tuned-even'));
    assert.equal(bank.voiceName, 'timberTunedLong');
    assert.equal(bank.trim, 1.36);
    assert.equal(bank.coloured, true);
    assert.equal(voiceImpact(heard[0], 'tuned-even').gain, evenDbGain(heard[0].normalSpeed, { rangeDb: 12, shape: 1.7, knee: 32, gate: 1, gateFull: 2 }));
    for (const impact of heard.slice(1)) {
      const ordinary = impactAcoustics(voiceImpact(impact, 'tuned-even'));
      assert.equal(ordinary.voice, RESONANCE_VOICES.timber);
      assert.equal(ordinary.voiceName, 'timber');
      assert.equal(ordinary.trim, 1);
      assert.equal(ordinary.coloured, false);
      assert.equal(voiceImpact(impact, 'tuned-even').gain, evenDbGain(impact.normalSpeed));
      assert.ok(voiceImpact(impact, 'tuned-even').gain < voiceImpact({ ...impact, role: 'bank' }, 'tuned-even').gain);
    }
    const metalRamp = notesOf(metal).find(impact => impact.role === 'ramp');
    assert.equal(impactAcoustics(voiceImpact(metalRamp, 'tuned-even')).voiceName, 'metal');
    assert.equal(voiceImpact(metalRamp, 'tuned-even').gain, evenDbGain(metalRamp.normalSpeed));
  } finally { session.dispose(); }
});

test('kept lines keep the physical record and replay with the voice selected at playback', () => {
  const session = createRangeHarness(havok, worldFrom(earlyPlate), 'music3-scope');
  session.runtime.setDynamics('normal-speed');
  try {
    const shot = session.shoot(worldFrom(asTimber(earlyPlate)), lofted);
    const kept = performanceFromResonance(shot.resonance);
    const frozen = JSON.stringify(kept);
    const timeline = noteTimeline(notesOf(shot));
    for (const variant of ['pr55', 'even-db', 'tuned-even', 'tuned-forward']) {
      for (const impact of notesOf(shot)) {
        const live = voiceImpact(impact, variant);
        const stored = kept.impacts.find(row => row.piece === impact.piece && row.time === impact.time);
        const replay = voiceImpact(stored, variant);
        // The stored gain is the PR #55 smoothstep. Inverting it recovers face speed
        // to a fraction of an ulp, so the replayed gain matches the live one well
        // inside 1e-9 and is not a second physics event.
        assert.ok(Math.abs(replay.gain - live.gain) < 1e-9, `${variant} ${impact.role} ${replay.gain} vs ${live.gain}`);
        assert.equal(replay.time, impact.time);
        assert.equal(replay.note, impact.note);
        assert.equal(stored.gain, impact.gain, 'the kept gain stays the PR #55 face-speed encoding');
      }
    }
    assert.equal(JSON.stringify(kept), frozen, 'voicing does not rewrite the kept record');
    assert.deepEqual(noteTimeline(notesOf(shot)), timeline);
    assert.deepEqual(noteTimeline(notesOf(shot).map(impact => voiceImpact(impact, 'pr55'))), timeline);
    assert.equal(kept.impacts[0].normalSpeed, undefined, 'a kept line does not store face speed or the selected voice');
  } finally { session.dispose(); }
});

test('soft graze, square hit, and a repeated ramp stay role-correct', () => {
  const record = JSON.parse(readFileSyncSearch());
  const repeated = record.arrangements.find(row => row.id === 'opening-aim-24');
  const session = createRangeHarness(havok, worldFrom(earlyPlate), 'music3-scope');
  session.runtime.setDynamics('normal-speed');
  try {
    const grazeShot = MUSIC3_SHOTS.find(shot => shot.id === 'graze-85');
    const squareShot = MUSIC3_SHOTS.find(shot => shot.id === 'square-055');
    const graze = notesOf(session.shoot(worldFrom(asTimber(grazeShot.objects)), grazeShot.setup));
    const square = notesOf(session.shoot(worldFrom(asTimber(squareShot.objects)), squareShot.setup));
    assert.deepEqual(graze.map(impact => impact.role), ['bank']);
    assert.ok(graze[0].normalSpeed < 3 && graze[0].normalSpeed > 1);
    assert.ok(voiceImpact(graze[0], 'tuned-even').gain > voiceImpact(graze[0], 'even-db').gain);
    assert.equal(impactAcoustics(voiceImpact(graze[0], 'tuned-even')).voiceName, 'timberTunedLong');
    assert.ok(square.some(impact => impact.role === 'bank' && impact.normalSpeed > 20));
    const squareBank = square.find(impact => impact.role === 'bank');
    assert.ok(voiceImpact(squareBank, 'tuned-even').gain > 0.9);
    assert.ok(voiceImpact(squareBank, 'tuned-even').gain > voiceImpact(graze[0], 'tuned-even').gain);
    const twice = notesOf(session.shoot(worldFrom(asTimber(repeated.objects)), repeated.setup));
    const ramps = twice.filter(impact => impact.role === 'ramp');
    assert.ok(ramps.length >= 2, 'two contacts on the ramp outside the hold window stay two notes');
    assert.ok(ramps[1].time - ramps[0].time > 5 / 120);
    for (const impact of ramps) {
      assert.equal(impact.material, 'timber');
      assert.equal(impactAcoustics(voiceImpact(impact, 'tuned-even')).voiceName, 'timber');
      assert.equal(impactAcoustics(voiceImpact(impact, 'tuned-even')).trim, 1);
    }
  } finally { session.dispose(); }
});

test('replay releases every voice node, including a burst of replays', () => {
  const restore = fakeAudio();
  try {
    const output = createResonanceOutput();
    const impacts = [
      { role: 'bank', material: 'timber', time: 0.2, hz: 261.6256, gain: 0.05, normalSpeed: 4.36, callbacks: 1 },
      { role: 'ramp', material: 'timber', time: 1.4, hz: 293.6648, gain: 0.52, normalSpeed: 16.4, callbacks: 1 },
      { role: 'plate', material: 'timber', time: 4.2, hz: 329.6276, gain: 0.46, normalSpeed: 15.2, callbacks: 1 },
    ];
    for (let i = 0; i < 30; i += 1) {
      output.release();
      const started = output.playRecorded(impacts, i % 2 === 0 ? 'tuned-even' : 'pr55');
      assert.equal(started, 3);
      assert.ok(output.counts().active > 0);
    }
    const before = output.counts();
    assert.equal(output.release(), before.active);
    assert.equal(output.counts().active, 0);
    assert.equal(output.counts().cleaned, before.started);
    output.dispose();
    assert.equal(output.counts().active, 0);
  } finally { restore(); }
});

test('the recorded Chrome headroom stays under the ceiling and keeps quiet notes', () => {
  const record = JSON.parse(readFileSync(new URL('../docs/experiments/range/appendix/music3/headroom.json', import.meta.url), 'utf8'));
  assert.equal(record.objectLimit, 12);
  assert.equal(record.physics.sampleMismatchMetalVsAllTimber, 0);
  assert.equal(record.physics.samples, 224);
  const before = record.before['tuned-even'];
  const after = record.after['tuned-even'];
  assert.ok(before.twelveBanks.peak > 1);
  assert.ok(before.twelveBanks.over > 0);
  assert.ok(after.twelveBanks.peak <= 10 ** (-1 / 20) + 1e-3);
  assert.equal(after.twelveBanks.over, 0);
  assert.ok(Math.abs(after.bankFull.peakDbfs - before.bankFull.peakDbfs) < 0.02);
  assert.ok(Math.abs(after.bankGraze.peakDbfs - before.bankGraze.peakDbfs) < 0.02);
  assert.ok(Math.abs(after.trioStagger20.peakDbfs - before.trioStagger20.peakDbfs) < 0.02);
  assert.ok(after.rampTimberFull.peakDbfs > after.bankFull.peakDbfs, 'a full timber ramp is ordinary timber, not the trimmed bank voice');
  assert.equal(after.phraseTimber.over, 0);
  assert.ok(after.phraseTimber.peak < MIX_LIMIT.knee);
});

test('the mix limiter is transparent under the knee and bounded above it', () => {
  const ceiling = 10 ** (MIX_LIMIT.ceilingDb / 20);
  for (const sample of [0, 0.1314, 0.4847, 0.758, MIX_LIMIT.knee]) assert.equal(mixLimit(sample), sample);
  assert.ok(mixLimit(1.4486) < ceiling + 1e-12);
  assert.ok(mixLimit(5.8158) <= ceiling + 1e-12);
  assert.ok(mixLimit(1.4486) > MIX_LIMIT.knee);
  assert.ok(mixLimit(5.8158) > mixLimit(1.4486), 'a harder pile is still louder');
  assert.ok(Math.abs(mixLimit(-0.4) + 0.4) < 1e-12);
});

function readFileSyncSearch() {
  return readFileSync(new URL('../docs/experiments/range/appendix/music/search.json', import.meta.url), 'utf8');
}
