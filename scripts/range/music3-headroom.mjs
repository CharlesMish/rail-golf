// Re-measure Musical Workshop headroom after the bank-role fix and mix limiter.
// Chrome OfflineAudioContext, float peak before the WAV clamp. The `before`
// block is the same jobs measured on this machine before that change.
//
//   node scripts/range/music3-headroom.mjs
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { WORLDCRAFT_LIMITS } from '../../lib/worldcraft-model.js';
import { adaptRangePreset, createMusicalWorkshopPreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { createRangeHarness } from './run.mjs';
import { MUSIC3_SHOTS } from './music3-capture.mjs';

Logger.LogLevels = 0;
const BEFORE = {
  note: 'Chrome float peak, tuned-even, before the bank-role fix and before the mix limiter. Timber ramp and plate matched the bank because both took the bank voice.',
  'tuned-even': {
    bankFull: { peak: 0.4847, peakDbfs: -6.29, over: 0 },
    bankGraze: { peak: 0.1314, peakDbfs: -17.63, over: 0 },
    bankSquare: { peak: 0.4847, peakDbfs: -6.29, over: 0 },
    rampTimberFull: { peak: 0.4847, peakDbfs: -6.29, over: 0 },
    plateTimberFull: { peak: 0.4847, peakDbfs: -6.29, over: 0 },
    rampMetalFull: { peak: 0.4902, peakDbfs: -6.19, over: 0 },
    trioStagger20: { peak: 0.7581, peakDbfs: -2.41, over: 0 },
    trioTogether: { peak: 1.4486, peakDbfs: 3.22, over: 21 },
    timberTrioTogether: { peak: 1.454, peakDbfs: 3.25, over: 21 },
    twelveTogether: { peak: 5.7943, peakDbfs: 15.26, over: 813 },
    twelveBanks: { peak: 5.8158, peakDbfs: 15.29, over: 826 },
    twelveStagger5: { peak: 1.5285, peakDbfs: 3.69, over: 206 },
  },
};

const HZ = [261.6256, 293.6648, 329.6276, 391.9954, 440];
const note = (role, material, index, time, normalSpeed = 40) => ({
  piece: `${role}-${index}`, role, time, material, degree: index % 5, note: 'N', hz: HZ[index % 5],
  gain: 1, normalSpeed, callbacks: 1,
});
const jobs = {
  bankFull: [note('bank', 'timber', 0, 0.05)],
  bankGraze: [note('bank', 'timber', 0, 0.05, 2.0927)],
  bankSquare: [note('bank', 'timber', 0, 0.05, 36.7032)],
  rampTimberFull: [note('ramp', 'timber', 1, 0.05)],
  plateTimberFull: [note('plate', 'timber', 2, 0.05)],
  rampMetalFull: [note('ramp', 'metal', 1, 0.05)],
  trioStagger20: [note('bank', 'timber', 0, 0.1), note('ramp', 'metal', 1, 0.12), note('plate', 'metal', 2, 0.14)],
  trioTogether: [note('bank', 'timber', 0, 0.05), note('ramp', 'metal', 1, 0.05), note('plate', 'metal', 2, 0.05)],
  timberTrioTogether: [note('bank', 'timber', 0, 0.05), note('ramp', 'timber', 1, 0.05), note('plate', 'timber', 2, 0.05)],
  twelveTogether: Array.from({ length: 12 }, (_, i) => note(i === 0 ? 'bank' : i < 7 ? 'ramp' : 'plate', i === 0 || i < 7 ? 'timber' : 'metal', i, 0.05)),
  twelveBanks: Array.from({ length: 12 }, (_, i) => note('bank', 'timber', i, 0.05)),
  twelveStagger5: Array.from({ length: 12 }, (_, i) => note(i === 0 ? 'bank' : 'plate', i === 0 ? 'timber' : 'metal', i, 0.05 + i * 0.005)),
};

const base = createMusicalWorkshopPreset();
const worldFrom = objects => adaptRangePreset(validateRangePreset({ ...base, objects })).world;
const asTimber = objects => objects.map(object => ({ ...object, voice: { material: 'timber', degree: object.voice.degree } }));
const havok = await Havok({ wasmBinary: await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const early = MUSIC3_SHOTS.find(shot => shot.id === 'phrase-early-plate');
const session = createRangeHarness(havok, worldFrom(early.objects), 'music3-headroom');
session.runtime.setDynamics('normal-speed');
const metal = session.shoot(worldFrom(early.objects), early.setup);
const timber = session.shoot(worldFrom(asTimber(early.objects)), early.setup);
const graze = session.shoot(worldFrom(MUSIC3_SHOTS.find(shot => shot.id === 'graze-85').objects), MUSIC3_SHOTS.find(shot => shot.id === 'graze-85').setup);
const square = session.shoot(worldFrom(MUSIC3_SHOTS.find(shot => shot.id === 'square-055').objects), MUSIC3_SHOTS.find(shot => shot.id === 'square-055').setup);
const late = MUSIC3_SHOTS.find(shot => shot.id === 'phrase-late-catch');
const lateShot = session.shoot(worldFrom(late.objects), late.setup);
session.dispose();
const piece = shot => shot.resonance.impacts.filter(impact => ['ramp', 'bank', 'plate'].includes(impact.role)).map(impact => ({
  piece: impact.piece, role: impact.role, material: impact.material, note: impact.note, hz: impact.hz,
  time: impact.time, gain: impact.gain, normalSpeed: impact.normalSpeed, callbacks: impact.callbacks, degree: impact.degree,
}));
let sampleMismatch = 0;
for (let i = 0; i < metal.samples.length; i += 1) {
  const a = metal.samples[i], b = timber.samples[i];
  if (!b || !Object.is(a.t, b.t) || !Object.is(a.x, b.x) || !Object.is(a.y, b.y) || !Object.is(a.z, b.z)) sampleMismatch += 1;
}

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', e => { window.__err = String(e.message || e.error); });
try {
  const { voiceImpact, scheduleImpact, renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  window.peakOf = async (impacts, variant) => {
    const rate = 44100;
    const end = impacts.reduce((m, i) => Math.max(m, i.time), 0) + 0.35;
    const ctx = new OfflineAudioContext(1, Math.ceil(end * rate), rate);
    for (const impact of impacts) scheduleImpact(ctx, impact.time, voiceImpact(impact, variant));
    const data = (await ctx.startRendering()).getChannelData(0);
    let peak = 0, over = 0;
    for (let i = 0; i < data.length; i++) { const a = Math.abs(data[i]); if (a > peak) peak = a; if (a > 1) over++; }
    return JSON.stringify({ peak, over });
  };
  window.renderWav = async (impacts, variant) => {
    const wav = await renderResonanceWav(impacts, { variant, mix: 1, tail: 2.5 });
    let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode(...wav.subarray(i, i + 0x8000));
    let peak = 0; const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength); const n = view.getUint32(40, true) / 2;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(view.getInt16(44 + i * 2, true)) / 32768);
    return JSON.stringify({ b64: btoa(s), peak });
  };
} catch (e) { window.__err = e instanceof Error ? e.stack || e.message : String(e); }
</script>`;
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/render.html') { res.setHeader('content-type', 'text/html'); res.end(html); return; }
  if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js') && !url.pathname.includes('..')) {
    res.setHeader('content-type', 'text/javascript'); res.end(await readFile(new URL(`../..${url.pathname}`, import.meta.url))); return;
  }
  res.statusCode = 404; res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'music3-headroom-'));
const chrome = spawn(process.env.CHROME ?? '/usr/bin/google-chrome-stable', ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, '--remote-debugging-port=9341', `http://127.0.0.1:${server.address().port}/render.html`], { stdio: 'ignore' });
let page;
for (let i = 0; i < 80 && !page; i += 1) {
  try { page = (await (await fetch('http://127.0.0.1:9341/json/list')).json()).find(item => item.type === 'page' && item.webSocketDebuggerUrl); } catch { /* binding */ }
  if (!page) await new Promise(r => setTimeout(r, 100));
}
if (!page) throw new Error('Chrome did not expose a page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let nextId = 0;
const cdp = (method, params) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const on = event => { const message = JSON.parse(event.data); if (message.id !== id) return; ws.removeEventListener('message', on); if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result); };
  ws.addEventListener('message', on); ws.send(JSON.stringify({ id, method, params }));
});
for (let i = 0; i < 80; i += 1) {
  const ready = await cdp('Runtime.evaluate', { expression: 'typeof window.peakOf', returnByValue: true });
  if (ready.result?.value === 'function') break;
  if (i === 79) throw new Error(String((await cdp('Runtime.evaluate', { expression: 'window.__err', returnByValue: true })).result?.value));
  await new Promise(r => setTimeout(r, 100));
}
const dbfs = value => 20 * Math.log10(value);
const round = value => Math.round(value * 10000) / 10000;
const after = {};
const realJobs = { ...jobs, phraseTimber: piece(timber), phraseMetal: piece(metal) };
for (const variant of ['tuned-even', 'pr55']) {
  after[variant] = {};
  for (const [name, impacts] of Object.entries(realJobs)) {
    const out = await cdp('Runtime.evaluate', { expression: `window.peakOf(${JSON.stringify(impacts)}, ${JSON.stringify(variant)})`, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error(JSON.stringify(out.exceptionDetails));
    const measured = JSON.parse(out.result.value);
    after[variant][name] = { peak: round(measured.peak), peakDbfs: Math.round(dbfs(measured.peak) * 100) / 100, over: measured.over };
    console.log(variant, name, after[variant][name].peakDbfs, 'over', measured.over);
  }
}

const abDir = new URL('../../docs/experiments/range/audio/music3/ab/', import.meta.url);
await mkdir(abDir, { recursive: true });
const abJobs = [
  ['graze-85--pr55.wav', piece(graze), 'pr55'],
  ['graze-85--even-db.wav', piece(graze), 'even-db'],
  ['graze-85--tuned-even.wav', piece(graze), 'tuned-even'],
  ['square-055--pr55.wav', piece(square), 'pr55'],
  ['square-055--tuned-even.wav', piece(square), 'tuned-even'],
  ['phrase-early-plate--pr55.wav', piece(metal), 'pr55'],
  ['phrase-early-plate--tuned-even.wav', piece(metal), 'tuned-even'],
  ['phrase-early-plate-all-timber--tuned-even.wav', piece(timber), 'tuned-even'],
  ['phrase-late-catch--tuned-even.wav', piece(lateShot), 'tuned-even'],
];
const files = [];
for (const [file, impacts, variant] of abJobs) {
  const out = await cdp('Runtime.evaluate', { expression: `window.renderWav(${JSON.stringify(impacts)}, ${JSON.stringify(variant)})`, awaitPromise: true, returnByValue: true });
  if (out.exceptionDetails) throw new Error(JSON.stringify(out.exceptionDetails));
  const rendered = JSON.parse(out.result.value);
  const wav = Buffer.from(rendered.b64, 'base64');
  await writeFile(new URL(file, abDir), wav);
  files.push({ file, variant, bytes: wav.length, wavPeak: round(rendered.peak), wavPeakDbfs: Math.round(dbfs(rendered.peak) * 100) / 100, notes: impacts.map(impact => `${impact.role}:${impact.note}:${impact.material}`) });
  console.log('wav', file, wav.length, files.at(-1).wavPeakDbfs);
}
ws.close(); chrome.kill('SIGKILL'); server.close();

const slim = impacts => impacts.map(impact => ({ role: impact.role, note: impact.note, material: impact.material, time: round(impact.time), normalSpeed: round(impact.normalSpeed), gain: impact.gain }));
const record = {
  seed: 20261026,
  seedMeaning: 'Provenance only. Not applied to gravity, mass, or the solver.',
  dynamics: 'normal-speed',
  objectLimit: WORLDCRAFT_LIMITS.objects,
  workshopAllowance: { ramp: 1, bank: 1, plate: 1 },
  renderer: 'Chrome headless OfflineAudioContext, lib/worldcraft-resonance.js scheduleImpact after voiceImpact. Float peak is before WAV clamp.',
  limiter: { knee: 0.85, ceilingDb: -1, preGain: 1 / 16, law: 'identity at and below the knee; tanh toward -1 dBFS above it' },
  physics: {
    layout: 'phrase-early-plate',
    setup: early.setup,
    samples: metal.samples.length,
    sampleMismatchMetalVsAllTimber: sampleMismatch,
    terminalReason: metal.terminal.reason,
    metalNotes: slim(piece(metal)),
    timberNotes: slim(piece(timber)),
    graze: slim(piece(graze)),
    square: slim(piece(square)),
    lateCatch: slim(piece(lateShot)),
  },
  before: BEFORE,
  after,
  ab: files,
};
await mkdir(new URL('../../docs/experiments/range/appendix/music3/', import.meta.url), { recursive: true });
await writeFile(new URL('../../docs/experiments/range/appendix/music3/headroom.json', import.meta.url), JSON.stringify(record, null, 2) + '\n');
await writeFile(new URL('manifest.json', abDir), JSON.stringify({ source: 'scripts/range/music3-headroom.mjs', tailSeconds: 2.5, files }, null, 2) + '\n');
console.log('wrote headroom and', files.length, 'wavs', files.reduce((sum, file) => sum + file.bytes, 0), 'bytes');
