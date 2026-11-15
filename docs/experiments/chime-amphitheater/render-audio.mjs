// Real shots through the lab synthesis, at the impact gain the ear stored.
// WAV stays out of git. Files go to /opt/cursor/artifacts/chime-amphitheater/.
//
//   node docs/experiments/chime-amphitheater/render-audio.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const artifactDir = '/opt/cursor/artifacts/chime-amphitheater';
const SEED = 20261114;

const PICKS = [
  {
    id: 'opening',
    setup: { railIndex: 1, originX: 0, yaw: 0, elevation: 18, charge: 0.55 },
    why: 'The aim the world opens on. Raised centre, then standing centre.',
  },
  {
    id: 'opening-yaw',
    setup: { railIndex: 1, originX: 0, yaw: 0.5, elevation: 18, charge: 0.55 },
    why: 'One yaw step from the opening. Same two plates.',
  },
  {
    id: 'walk',
    setup: { railIndex: 1, originX: 0, yaw: -4, elevation: 24, charge: 0.45 },
    why: 'Four contacts, each on its own plate, gaps above 150 ms.',
  },
];

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
function sequenceOf(impacts) {
  return impacts.filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`).join('>');
}

const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const gitSha = rangeGitSha();
const world = adaptRangePreset(foundryRecord('chime-tiers').preset).world;
const harness = createRangeHarness(havok, world, gitSha);
if (!harness.runtime.setDynamics('normal-speed')) throw new Error('face speed was rejected');

const jobs = [];
try {
  for (const pick of PICKS) {
    const last = harness.shoot(world, pick.setup);
    const impacts = last.resonance?.impacts ?? [];
    if (!impacts.some(impact => impact.gain > 0)) throw new Error(`${pick.id} was silent`);
    jobs.push({ ...pick, impacts, sequence: sequenceOf(impacts), file: `chime-tiers-${pick.id}.wav` });
  }
} finally {
  harness.dispose();
}

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => ({ impacts: job.impacts })))};
  window.renderOne = async index => {
    const wav = await renderResonanceWav(jobs[index].impacts, {});
    let binary = '';
    for (let i = 0; i < wav.length; i += 0x8000) binary += String.fromCharCode(...wav.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  window.__ready = true;
} catch (error) {
  window.__err = error instanceof Error ? error.stack || error.message : String(error);
}
</script>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/render.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js') && !url.pathname.includes('..')) {
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.end(await readFile(resolve(root, url.pathname.slice(1))));
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'amph-audio-'));
const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`, '--remote-debugging-port=9343',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let target = null;
for (let attempt = 0; attempt < 50 && !target; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9343/json/list')).json();
    target = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
  } catch { /* Chrome is still binding. */ }
  if (!target) await sleep(100);
}
if (!target) throw new Error('Chrome did not expose a page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((done, fail) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', fail, { once: true }); });
let nextId = 0;
function cdp(method, params) {
  const id = ++nextId;
  return new Promise((done, fail) => {
    const onMessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (message.error) fail(new Error(JSON.stringify(message.error)));
      else done(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}
function levels(wav) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const rate = view.getUint32(24, true);
  const dataBytes = view.getUint32(40, true);
  let peak = 0;
  let sum = 0;
  const samples = dataBytes / 2;
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) {
    const sample = view.getInt16(offset, true) / 32768;
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    sum += sample * sample;
  }
  return { peak, rms: Math.sqrt(sum / samples), sampleRate: rate, seconds: samples / rate };
}

await mkdir(artifactDir, { recursive: true });
const files = [];
try {
  let ready = false;
  let err = null;
  for (let attempt = 0; attempt < 50 && !ready; attempt += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'window.__ready ? "yes" : (window.__err || "")', returnByValue: true });
    if (probed.result?.value === 'yes') ready = true;
    else if (probed.result?.value) err = probed.result.value;
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error(err || 'Render page did not load');
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const rendered = await cdp('Runtime.evaluate', { expression: `window.renderOne(${index})`, returnByValue: true, awaitPromise: true });
    if (rendered.exceptionDetails) throw new Error(rendered.exceptionDetails.text || 'render failed');
    const wav = Buffer.from(rendered.result.value, 'base64');
    const measured = levels(wav);
    await writeFile(join(artifactDir, job.file), wav);
    files.push({
      file: job.file,
      setup: job.setup,
      why: job.why,
      sequence: job.sequence,
      sha256: createHash('sha256').update(wav).digest('hex'),
      bytes: wav.length,
      durationSeconds: round(measured.seconds, 3),
      peak: round(measured.peak, 4),
      rms: round(measured.rms, 4),
      sampleRate: measured.sampleRate,
    });
    process.stdout.write(`${job.file} ${job.sequence} peak ${measured.peak.toFixed(3)} rms ${measured.rms.toFixed(3)}\n`);
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

const manifest = {
  seed: SEED,
  seedAppliedToSolver: false,
  gitSha,
  dynamics: 'normal-speed',
  mix: 1,
  note: 'renderResonanceWav at the stored face-speed gain. No bank-voice variant. WAV files are artifacts, not committed.',
  files,
};
await writeFile(resolve(here, 'audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
