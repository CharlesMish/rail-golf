// Render the Chime Garden starter shots with the game's own synthesis.
// Node has no WebAudio. Chrome loads lib/worldcraft-resonance.js.
// Files go to /opt/cursor/artifacts. This script prints the manifest fields.
//
//   node docs/experiments/chime-terraces/c-garden/render-notes.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { validateWorldcraftShot } from '../../../../lib/worldcraft-model.js';
import { adaptRangePreset, validateRangePreset } from '../../../../lib/worldcraft-range.js';
import { createRangeHarness, rangeGitSha } from '../../../../scripts/range/run.mjs';

Logger.LogLevels = 0;
const here = dirname(fileURLToPath(import.meta.url));
const out = '/opt/cursor/artifacts';
await mkdir(out, { recursive: true });

const shots = [
  { id: 'centre', yaw: 0, elevation: 12, charge: 0.55 },
  { id: 'left', yaw: -14, elevation: 12, charge: 0.55 },
  { id: 'right', yaw: 18, elevation: 12, charge: 0.55 },
  { id: 'near-miss', yaw: 0, elevation: 16, charge: 0.55 },
  { id: 'left-reverse', yaw: -22, elevation: 8, charge: 0.65 },
];

const wasm = await readFile(new URL('../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const preset = validateRangePreset(JSON.parse(await readFile(resolve(here, '../../../../worlds/foundry/chime-garden/preset.json'), 'utf8')));
const { world } = adaptRangePreset(preset);
const harness = createRangeHarness(havok, world, rangeGitSha());
const jobs = shots.map(aim => {
  const setup = validateWorldcraftShot(world, { railIndex: 1, originX: 0, yaw: aim.yaw, elevation: aim.elevation, charge: aim.charge });
  const last = harness.shoot(world, setup);
  const impacts = last.resonance?.impacts ?? [];
  if (!impacts.length) throw new Error(`${aim.id} has no impacts`);
  return { ...aim, impacts };
});
harness.dispose();

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => job.impacts))};
  window.renderOne = async index => {
    const wav = await renderResonanceWav(jobs[index], { variant: 'tuned-even' });
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < wav.length; i += chunk) binary += String.fromCharCode(...wav.subarray(i, i + chunk));
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
    const file = await readFile(new URL(`../../../../${url.pathname}`, import.meta.url));
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.end(file);
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  `--remote-debugging-port=9344`, '--user-data-dir=/tmp/chrome-chime-audio',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });

const sleep = ms => new Promise(done => setTimeout(done, ms));
async function target() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch('http://127.0.0.1:9344/json')).json();
      const page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* booting */ }
    await sleep(250);
  }
  throw new Error('Chrome did not open');
}
const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) pending.get(message.id)(message);
});
await new Promise(done => ws.addEventListener('open', done, { once: true }));
function send(method, params = {}) {
  const messageId = ++seq;
  ws.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((done, reject) => {
    pending.set(messageId, message => {
      pending.delete(messageId);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else done(message.result);
    });
  });
}
async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text} ${result.result?.description ?? ''}`);
  return result.result.value;
}
await send('Runtime.enable');
for (let i = 0; i < 40; i += 1) {
  const ready = await evaluate('window.__ready === true');
  if (ready) break;
  const err = await evaluate('window.__err || null');
  if (err) throw new Error(err);
  await sleep(200);
}

function levels(wav) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const rate = view.getUint32(24, true);
  const dataBytes = view.getUint32(40, true);
  let peak = 0;
  let sum = 0;
  const count = dataBytes / 2;
  const samples = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const sample = view.getInt16(44 + i * 2, true) / 32768;
    samples[i] = sample;
    const abs = Math.abs(sample);
    if (abs > peak) peak = abs;
    sum += sample * sample;
  }
  return { peak, rms: Math.sqrt(sum / count), sampleRate: rate, seconds: count / rate, samples };
}

function dominantHz(samples, rate, start, end) {
  const from = Math.max(0, Math.floor(start * rate));
  const to = Math.min(samples.length, Math.floor(end * rate));
  const n = to - from;
  if (n < 64) return null;
  let best = 0;
  let bestPower = 0;
  for (let hz = 200; hz <= 1200; hz += 1) {
    const w = (2 * Math.PI * hz) / rate;
    let re = 0;
    let im = 0;
    for (let i = 0; i < n; i += 4) {
      const sample = samples[from + i];
      re += sample * Math.cos(w * i);
      im -= sample * Math.sin(w * i);
    }
    const power = re * re + im * im;
    if (power > bestPower) { bestPower = power; best = hz; }
  }
  return best;
}

const manifest = [];
for (let index = 0; index < jobs.length; index += 1) {
  const job = jobs[index];
  const b64 = await evaluate(`window.renderOne(${index})`, true);
  const wav = Buffer.from(b64, 'base64');
  const wavPath = `${out}/chime-garden-${job.id}.wav`;
  const oggPath = `${out}/chime-garden-${job.id}.ogg`;
  await writeFile(wavPath, wav);
  await new Promise((done, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libopus', '-b:a', '96k', oggPath], { stdio: 'ignore' });
    ffmpeg.on('exit', code => code === 0 ? done() : reject(new Error(`ffmpeg ${code}`)));
  });
  const ogg = await readFile(oggPath);
  const measured = levels(wav);
  const bands = [];
  for (let note = 0; note < job.impacts.length; note += 1) {
    const impact = job.impacts[note];
    const next = job.impacts[note + 1]?.time ?? impact.time + 0.35;
    bands.push({
      piece: impact.piece,
      note: impact.note,
      hz: impact.hz,
      time: impact.time,
      heardHz: dominantHz(measured.samples, measured.sampleRate, impact.time, Math.min(next, impact.time + 0.4)),
    });
  }
  manifest.push({
    id: job.id,
    setup: { railIndex: 1, originX: 0, yaw: job.yaw, elevation: job.elevation, charge: job.charge },
    seed: 20261114,
    variant: 'tuned-even',
    sequence: job.impacts.map(impact => `${impact.piece}:${impact.note}`).join(' > '),
    file: `chime-garden-${job.id}.ogg`,
    sha256: createHash('sha256').update(ogg).digest('hex'),
    seconds: Math.round(measured.seconds * 1000) / 1000,
    peak: Math.round(measured.peak * 10000) / 10000,
    rms: Math.round(measured.rms * 10000) / 10000,
    bands,
  });
  process.stdout.write(`${job.id} ${manifest.at(-1).seconds}s peak ${manifest.at(-1).peak} rms ${manifest.at(-1).rms}\n`);
}

const manifestPath = resolve(here, 'audio.json');
await writeFile(manifestPath, `${JSON.stringify({ seed: 20261114, variant: 'tuned-even', shots: manifest }, null, 2)}\n`);
process.stdout.write(`${manifestPath}\n`);
ws.close();
chrome.kill('SIGKILL');
server.close();
