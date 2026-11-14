// Two shots per chime world, through the lab's own synthesis, from this build.
// One is a published starter. The other is its one-step neighbour in the same phrase family.
// WAV stays out of Git. Opus files go to /opt/cursor/artifacts/chime-compare/.
//
//   node docs/experiments/chime-terraces/render-audio.mjs
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { foundryPresentation, foundryRecord } from '../../../lib/worldcraft-foundry.js';
import { adaptRangePreset } from '../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const artifactDir = '/opt/cursor/artifacts/chime-compare';
const SEED = 20261114;

const PICKS = [
  {
    world: 'chime-terraces',
    starter: 'centre-climb',
    want: 'ramp-c:E4>high-2:A4>high-3:G4>mid-3:E4>high-3:G4>mid-3:E4>ramp-c:E4',
    why: 'Same first three pieces. The charge step lets the line continue: G4 and E4 come back, then the ramp.',
  },
  {
    world: 'chime-fan',
    starter: 'west',
    want: 'plate-w-inner:E4>bank-w:G4>chime-w:A4>bank-w:G4>chime-w:A4>bank-w:G4',
    why: 'Same family. One elevation step adds a last timber G4. The difference is one more bounce, not a new phrase.',
  },
  {
    world: 'chime-garden',
    starter: 'right-leak',
    want: 'bank-r:A4>r2:E4>c2:A4>bank-c:C4',
    why: 'Same first three pieces. The neighbour adds the centre bank, C4, after them.',
  },
];

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
function nudges(setup) {
  return [
    { axis: 'yaw', yaw: round(setup.yaw - 0.5, 1), elevation: setup.elevation, charge: setup.charge },
    { axis: 'yaw', yaw: round(setup.yaw + 0.5, 1), elevation: setup.elevation, charge: setup.charge },
    { axis: 'elevation', yaw: setup.yaw, elevation: round(setup.elevation - 0.5, 1), charge: setup.charge },
    { axis: 'elevation', yaw: setup.yaw, elevation: round(setup.elevation + 0.5, 1), charge: setup.charge },
    { axis: 'charge', yaw: setup.yaw, elevation: setup.elevation, charge: round(setup.charge - 0.01, 2) },
    { axis: 'charge', yaw: setup.yaw, elevation: setup.elevation, charge: round(setup.charge + 0.01, 2) },
  ];
}
function sequenceOf(impacts) {
  return impacts.filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`).join('>');
}

const wasm = await readFile(new URL('../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const gitSha = rangeGitSha();
const first = adaptRangePreset(foundryRecord(PICKS[0].world).preset).world;
const harness = createRangeHarness(havok, first, gitSha);
harness.runtime.setDynamics('normal-speed');

const jobs = [];
try {
  for (const pick of PICKS) {
    const record = foundryRecord(pick.world);
    const presentation = foundryPresentation(pick.world);
    const world = adaptRangePreset(record.preset).world;
    const tested = record.manifest.testedShots.find(shot => shot.id === pick.starter);
    const base = harness.shoot(world, tested.setup);
    const baseImpacts = base.resonance?.impacts ?? [];
    let neighbour = null;
    for (const aim of nudges(tested.setup)) {
      const last = harness.shoot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
      const impacts = last.resonance?.impacts ?? [];
      if (sequenceOf(impacts) === pick.want) { neighbour = { aim, impacts }; break; }
    }
    if (!neighbour) throw new Error(`${pick.world} ${pick.starter} neighbour ${pick.want} was not found`);
    const variant = presentation?.bankVoice === true ? 'tuned-even' : null;
    jobs.push({
      world: pick.world,
      role: 'starter',
      id: pick.starter,
      file: `${pick.world}-${pick.starter}.ogg`,
      setup: tested.setup,
      why: pick.why,
      variant,
      bankVoice: presentation?.bankVoice === true,
      impacts: baseImpacts,
      sequence: sequenceOf(baseImpacts),
    });
    jobs.push({
      world: pick.world,
      role: 'neighbour',
      id: `${pick.starter}-neighbour`,
      file: `${pick.world}-${pick.starter}-neighbour.ogg`,
      setup: { railIndex: 1, originX: 0, ...neighbour.aim },
      axis: neighbour.aim.axis,
      why: pick.why,
      variant,
      bankVoice: presentation?.bankVoice === true,
      impacts: neighbour.impacts,
      sequence: sequenceOf(neighbour.impacts),
    });
  }
} finally {
  harness.dispose();
}

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => ({ impacts: job.impacts, variant: job.variant })))};
  window.renderOne = async index => {
    const job = jobs[index];
    const wav = await renderResonanceWav(job.impacts, job.variant ? { variant: job.variant } : {});
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
const profile = await mkdtemp(join(tmpdir(), 'chime-audio-'));
const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`, '--remote-debugging-port=9341',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });
const sleep = ms => new Promise(done => setTimeout(done, ms));
let target = null;
for (let attempt = 0; attempt < 50 && !target; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9341/json/list')).json();
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
const wavDir = await mkdtemp(join(tmpdir(), 'chime-wav-'));
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
    const wavPath = join(wavDir, `${index}.wav`);
    const oggPath = join(artifactDir, job.file);
    await writeFile(wavPath, wav);
    await new Promise((done, fail) => {
      const convert = spawn('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libopus', '-b:a', '48k', oggPath], { stdio: 'ignore' });
      convert.on('error', fail);
      convert.on('exit', code => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}`))));
    });
    const ogg = await readFile(oggPath);
    files.push({
      file: job.file,
      world: job.world,
      role: job.role,
      id: job.id,
      setup: job.setup,
      axis: job.axis ?? null,
      seed: SEED,
      seedAppliedToSolver: false,
      dynamics: 'normal-speed',
      variant: job.variant,
      why: job.why,
      sequence: job.sequence,
      sha256: createHash('sha256').update(ogg).digest('hex'),
      bytes: ogg.length,
      durationSeconds: round(measured.seconds, 3),
      peak: round(measured.peak, 4),
      rms: round(measured.rms, 4),
    });
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
  synthesis: 'lib/worldcraft-resonance.js renderResonanceWav, OfflineAudioContext, then Opus at 48 kbit/s. Level match was not applied. Worlds with bankVoice use tuned-even, the live default. Chime Terraces has no banks, so its ramps stay ordinary timber and its plates stay ordinary metal.',
  files,
};
await writeFile(resolve(here, 'audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(files.map(file => `${file.file} ${file.durationSeconds}s peak ${file.peak} rms ${file.rms}`).join('\n') + '\n');
