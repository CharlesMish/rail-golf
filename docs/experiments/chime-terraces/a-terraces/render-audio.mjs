// Offline renders of the Chime Terraces starter shots.
// Node has no WebAudio. Chrome loads lib/worldcraft-resonance.js, the same
// synthesis the lab uses, and renders each shot's face-speed impacts.
//
//   node docs/experiments/chime-terraces/a-terraces/render-audio.mjs
//
// WAV stays out of Git. Opus files go to /opt/cursor/artifacts/chime-terraces/.
// audio-manifest.json in this directory records setup, seed, hash, duration, peak, and RMS.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { adaptRangePreset, parseRangePreset } from '../../../../lib/worldcraft-range.js';
import { createRangeHarness } from '../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const artifactDir = '/opt/cursor/artifacts/chime-terraces';
const ROLES = ['centre-climb', 'centre-drop', 'west-climb', 'east-climb', 'near-miss'];
const SEED = 20261114;

function sameTerminal(actual, expected) {
  return actual.reason === expected.reason
    && Object.is(actual.elapsed, expected.elapsed)
    && actual.position.every((value, index) => Object.is(value, expected.position[index]));
}

const presetText = await readFile(resolve(root, 'worlds/foundry/chime-terraces/preset.json'), 'utf8');
const manifest = JSON.parse(await readFile(resolve(root, 'worlds/foundry/chime-terraces/manifest.json'), 'utf8'));
const world = adaptRangePreset(parseRangePreset(presetText)).world;
const wasm = await readFile(new URL('../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const harness = createRangeHarness(havok, world, '6d9da5df');
harness.runtime.setDynamics('normal-speed');
const jobs = [];
for (const role of ROLES) {
  const tested = manifest.testedShots.find(shot => shot.id === role);
  if (!tested) throw new Error(`Missing tested shot ${role}`);
  const last = harness.shoot(world, tested.setup);
  if (!sameTerminal(last.terminal, tested.terminal)) throw new Error(`${role} terminal drifted under face-speed`);
  const impacts = last.resonance?.impacts ?? [];
  if (!impacts.length) throw new Error(`${role} produced no notes`);
  jobs.push({
    role,
    file: `chime-terraces-${role}.ogg`,
    setup: tested.setup,
    notes: impacts.map(impact => ({
      piece: impact.piece,
      note: impact.note,
      material: impact.material,
      gain: impact.gain,
      time: impact.time,
    })),
    impacts,
  });
}
harness.dispose();

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => job.impacts))};
  window.renderOne = async index => {
    const wav = await renderResonanceWav(jobs[index]);
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
    const file = await readFile(resolve(root, url.pathname.slice(1)));
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.end(file);
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'chime-audio-'));
const chrome = spawn('google-chrome-stable', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`, '--remote-debugging-port=9335',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore' });

function sleep(ms) { return new Promise(done => setTimeout(done, ms)); }
async function page() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await (await fetch('http://127.0.0.1:9335/json/list')).json();
      const found = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (found) return found;
    } catch { /* Chrome is still binding. */ }
    await sleep(100);
  }
  throw new Error('Chrome did not expose a page');
}
const target = await page();
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
  for (let i = 0; i < 50 && !ready; i += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'window.__ready ? "yes" : (window.__err || "")', returnByValue: true });
    if (probed.result?.value === 'yes') ready = true;
    else if (probed.result?.value) err = probed.result.value;
    if (!ready) await sleep(100);
  }
  if (!ready) throw new Error(err || 'Render page did not load');
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const rendered = await cdp('Runtime.evaluate', { expression: `window.renderOne(${index})`, returnByValue: true, awaitPromise: true });
    if (rendered.exceptionDetails) throw new Error(rendered.exceptionDetails.text);
    const wav = Buffer.from(rendered.result.value, 'base64');
    const measured = levels(wav);
    const wavPath = join(wavDir, `${job.role}.wav`);
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
      role: job.role,
      setup: job.setup,
      seed: SEED,
      seedAppliedToSolver: false,
      dynamics: 'normal-speed',
      notes: job.notes,
      sha256: createHash('sha256').update(ogg).digest('hex'),
      bytes: ogg.length,
      durationSeconds: measured.seconds,
      peak: measured.peak,
      rms: measured.rms,
    });
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
}

const record = {
  world: 'chime-terraces',
  seed: SEED,
  seedAppliedToSolver: false,
  dynamics: 'normal-speed',
  voices: 'Ordinary metal on every plate. Ordinary timber on every ramp. No bank-voice variant: that voice applies to timber banks only, and this world has none.',
  synthesis: 'lib/worldcraft-resonance.js renderResonanceWav, OfflineAudioContext, then Opus at 48 kbit/s. Level match was not applied.',
  files,
};
await writeFile(resolve(here, 'audio-manifest.json'), `${JSON.stringify(record, null, 2)}\n`);
process.stdout.write(files.map(file => `${file.role} ${file.durationSeconds.toFixed(2)}s peak ${file.peak.toFixed(3)} rms ${file.rms.toFixed(3)} ${file.bytes}B`).join('\n') + '\n');
