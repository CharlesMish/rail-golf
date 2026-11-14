// Render the Chime Fan starter shots with the same OfflineAudioContext path the lab uses.
// Node has no WebAudio. Chrome loads lib/worldcraft-resonance.js and calls renderResonanceWav
// with variant tuned-even, which is what bankVoice applies to a timber bank.
//
//   node docs/experiments/chime-terraces/b-fan/repro/render-audio.mjs
//
// Wav and ogg files go to /opt/cursor/artifacts. This script writes only the small manifest.
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Havok from '@babylonjs/havok';
import { adaptRangePreset, parseRangePreset } from '../../../../../lib/worldcraft-range.js';
import { createRangeHarness } from '../../../../../scripts/range/run.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const artifactDir = '/opt/cursor/artifacts';
const shots = [
  ['opening', 0, 18, 0.55],
  ['west', -16, 24, 0.55],
  ['centre', 0, 24, 0.55],
  ['east', 16, 24, 0.55],
  ['shoulder', -28, 24, 0.55],
];

const preset = parseRangePreset(await readFile(resolve(root, 'worlds/foundry/chime-fan/preset.json'), 'utf8'));
const { world } = adaptRangePreset(preset);
const wasm = await readFile(new URL('../../../../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await Havok({ wasmBinary: wasm });
const session = createRangeHarness(havok, world, 'chime-fan-audio');
session.runtime.setDynamics('normal-speed');

const jobs = shots.map(([id, yaw, elevation, charge]) => {
  const last = session.shoot(world, { railIndex: 1, originX: 0, yaw, elevation, charge });
  const impacts = (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => {
    const copy = { ...impact };
    delete copy.callbacks;
    return copy;
  });
  return {
    id,
    setup: { railIndex: 1, originX: 0, yaw, elevation, charge },
    notes: impacts.map(impact => `${impact.piece}:${impact.note}`),
    impacts,
  };
});
session.dispose();

const html = `<!doctype html><meta charset="utf-8"><script type="module">
import { renderResonanceWav } from '/lib/worldcraft-resonance.js';
window.renderWav = impacts => renderResonanceWav(impacts, { variant: 'tuned-even' }).then(wav => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < wav.length; i += chunk) binary += String.fromCharCode(...wav.subarray(i, i + chunk));
  return btoa(binary);
});
</script>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/render.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js')) {
    res.setHeader('content-type', 'text/javascript; charset=utf-8');
    res.end(await readFile(resolve(root, url.pathname.slice(1))));
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const port = server.address().port;
const profile = await mkdtemp(resolve(tmpdir(), 'chime-fan-audio-'));
const chrome = spawn('google-chrome', [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`, '--remote-debugging-port=9334',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore' });

async function targets() {
  const response = await fetch('http://127.0.0.1:9334/json/list');
  if (!response.ok) throw new Error(`debugger list ${response.status}`);
  return response.json();
}
let page;
for (let i = 0; i < 50; i += 1) {
  try {
    const list = await targets();
    page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    if (page) break;
  } catch { /* Chrome is still binding the port. */ }
  await new Promise(done => setTimeout(done, 100));
}
if (!page) throw new Error('Chrome did not expose a page target');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done, fail) => {
  ws.addEventListener('open', done, { once: true });
  ws.addEventListener('error', fail, { once: true });
});
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
  let count = 0;
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) {
    const sample = view.getInt16(offset, true) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    sum += sample * sample;
    count += 1;
  }
  return { sampleRate: rate, seconds: dataBytes / 2 / rate, peak, rms: Math.sqrt(sum / count) };
}

await mkdir(artifactDir, { recursive: true });
const rendered = [];
try {
  let ready = false;
  for (let i = 0; i < 50 && !ready; i += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'typeof window.renderWav', returnByValue: true });
    ready = probed.result?.value === 'function';
    if (!ready) await new Promise(done => setTimeout(done, 100));
  }
  if (!ready) throw new Error('Offline renderer did not load');
  for (const job of jobs) {
    const result = await cdp('Runtime.evaluate', {
      expression: `window.renderWav(${JSON.stringify(job.impacts)})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    const wav = Buffer.from(result.result.value, 'base64');
    if (wav.subarray(0, 4).toString() !== 'RIFF') throw new Error(`${job.id} did not return a wav`);
    const wavPath = resolve(artifactDir, `chime-fan-${job.id}.wav`);
    await writeFile(wavPath, wav);
    const oggPath = resolve(artifactDir, `chime-fan-${job.id}.ogg`);
    await new Promise((done, fail) => {
      const ffmpeg = spawn('ffmpeg', ['-y', '-i', wavPath, '-c:a', 'libopus', '-b:a', '96k', oggPath], { stdio: 'ignore' });
      ffmpeg.on('exit', code => (code === 0 ? done() : fail(new Error(`ffmpeg ${code}`))));
    });
    const ogg = await readFile(oggPath);
    const stats = levels(wav);
    rendered.push({
      id: job.id,
      setup: job.setup,
      seed: 20261114,
      notes: job.notes,
      file: `chime-fan-${job.id}.ogg`,
      sha256: createHash('sha256').update(ogg).digest('hex'),
      wavSha256: createHash('sha256').update(wav).digest('hex'),
      seconds: Math.round(stats.seconds * 1000) / 1000,
      peak: Math.round(stats.peak * 10000) / 10000,
      rms: Math.round(stats.rms * 10000) / 10000,
      codec: 'opus in ogg, 96 kbps, from the wav',
    });
    console.log(job.id, job.notes.join(' > '), stats.peak.toFixed(3), stats.rms.toFixed(4));
  }
} finally {
  ws.close();
  if (chrome.exitCode === null && !chrome.killed) chrome.kill('SIGKILL');
  server.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

const manifest = {
  world: 'chime-fan',
  seed: 20261114,
  dynamics: 'normal-speed',
  variant: 'tuned-even',
  renderer: 'lib/worldcraft-resonance.js renderResonanceWav, Chrome OfflineAudioContext',
  note: 'Peak and RMS are of the wav before the opus encode. The sha256 is of the ogg.',
  shots: rendered,
};
await writeFile(resolve(here, '../audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('wrote audio-manifest.json');
