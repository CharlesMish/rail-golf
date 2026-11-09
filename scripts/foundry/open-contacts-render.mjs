// Offline renders for two Open Contacts shots. Node has no WebAudio.
// Chrome loads the existing renderer. Each pair is one shot: the gallery
// total-speed voice, and tuned-even applied to the same impacts. RMS is
// matched inside the pair, then both files share one ceiling. Musical
// quality is not claimed. Live playback of this preset does not pass
// tuned-even.
//
//   node scripts/foundry/open-contacts-render.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { impactGain } from '../../lib/worldcraft-resonance.js';
import { rangeGitSha } from '../range/run.mjs';

const CEILING = 10 ** (-3 / 20);
const sweep = JSON.parse(await readFile(new URL('../../docs/experiments/foundry/lanes/expressive/sweep.json', import.meta.url), 'utf8'));
const byId = Object.fromEntries(sweep.exemplars.map(item => [item.id, item]));
for (const id of ['opening', 'rattle']) {
  if (!byId[id]?.impacts?.length) throw new Error(`Missing exemplar ${id}`);
}

function playable(impacts, gallery) {
  return impacts.map(impact => ({
    piece: impact.piece,
    role: impact.role,
    time: impact.time,
    material: impact.material,
    degree: impact.degree,
    note: impact.note,
    hz: impact.hz,
    gain: gallery ? impactGain(impact.speed) : impact.gain,
    speed: impact.speed,
    normalSpeed: impact.normalSpeed,
    callbacks: impact.callbacks,
  }));
}

const jobs = ['opening', 'rattle'].flatMap(id => [
  { id, voice: 'gallery', variant: null, impacts: playable(byId[id].impacts, true) },
  { id, voice: 'tuned-even', variant: 'tuned-even', impacts: playable(byId[id].impacts, false) },
]);

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => ({ impacts: job.impacts, variant: job.variant })))};
  window.renderOne = async (index) => {
    const job = jobs[index];
    const wav = await renderResonanceWav(job.impacts, job.variant ? { variant: job.variant } : {});
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < wav.length; i += chunk) binary += String.fromCharCode(...wav.subarray(i, i + chunk));
    return btoa(binary);
  };
} catch (error) {
  window.__err = error instanceof Error ? error.stack || error.message : String(error);
}
</script>`;

function viewOf(wav) {
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  return { view, dataBytes: view.getUint32(40, true), rate: view.getUint32(24, true) };
}

function measure(wav) {
  if (wav.subarray(0, 4).toString() !== 'RIFF') throw new Error('Chrome did not return a wav');
  const info = viewOf(wav);
  let peak = 0;
  let sum = 0;
  const samples = info.dataBytes / 2;
  for (let offset = 44; offset < 44 + info.dataBytes; offset += 2) {
    const unit = info.view.getInt16(offset, true) / 32768;
    peak = Math.max(peak, Math.abs(unit));
    sum += unit ** 2;
  }
  return { peak, rms: Math.sqrt(sum / samples), seconds: samples / info.rate, bytes: wav.length };
}

function scaleWav(wav, scale) {
  const out = Buffer.from(wav);
  const info = viewOf(out);
  for (let offset = 44; offset < 44 + info.dataBytes; offset += 2) {
    const unit = Math.max(-1, Math.min(1, (info.view.getInt16(offset, true) / 32768) * scale));
    info.view.setInt16(offset, unit < 0 ? Math.round(unit * 0x8000) : Math.round(unit * 0x7fff), true);
  }
  return out;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/render.html') {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(html);
    return;
  }
  if (url.pathname.startsWith('/lib/')) {
    readFile(new URL(`../..${url.pathname}`, import.meta.url)).then(body => {
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(body);
    }).catch(() => { res.statusCode = 404; res.end('missing'); });
    return;
  }
  res.statusCode = 404;
  res.end('missing');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--mute-audio',
  `--user-data-dir=/tmp/chrome-open-contacts-render`, `http://127.0.0.1:${port}/render.html`,
  '--remote-debugging-port=9227',
], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch('http://127.0.0.1:9227/json')).json();
      const page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* booting */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Chrome did not open the renderer');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) pending.get(message.id)(message);
});
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
function cdp(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, message => {
      pending.delete(id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
  });
}

try {
  let ready = false;
  let reason = '';
  for (let i = 0; i < 50 && !ready; i += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'window.renderOne ? "ok" : (window.__err || "wait")', returnByValue: true });
    ready = probed.result?.value === 'ok';
    reason = probed.result?.value ?? '';
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error(`Renderer did not load: ${reason}`);
  const rendered = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const result = await cdp('Runtime.evaluate', { expression: `window.renderOne(${index})`, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    rendered.push(Buffer.from(result.result.value, 'base64'));
  }
  const dir = 'docs/experiments/foundry/lanes/expressive/audio';
  await mkdir(dir, { recursive: true });
  const files = [];
  for (let index = 0; index < jobs.length; index += 2) {
    const left = measure(rendered[index]);
    const right = measure(rendered[index + 1]);
    const target = Math.min(left.rms, right.rms);
    let scaleLeft = target / left.rms;
    let scaleRight = target / right.rms;
    const hotter = Math.max(left.peak * scaleLeft, right.peak * scaleRight);
    const ceilingScale = hotter > CEILING ? CEILING / hotter : 1;
    scaleLeft *= ceilingScale;
    scaleRight *= ceilingScale;
    for (const [offset, scale, raw] of [[0, scaleLeft, left], [1, scaleRight, right]]) {
      const job = jobs[index + offset];
      const wav = scaleWav(rendered[index + offset], scale);
      const after = measure(wav);
      if (after.peak > CEILING + 1 / 32768) throw new Error(`${job.id} ${job.voice} peak ${after.peak}`);
      const name = `${job.id}-${job.voice}.wav`;
      await writeFile(`${dir}/${name}`, wav);
      files.push({ file: name, voice: job.voice, shot: job.id, scale, rawPeak: raw.peak, rawRms: raw.rms, peak: after.peak, rms: after.rms, seconds: after.seconds, bytes: after.bytes });
    }
  }
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
  const record = {
    gitSha: rangeGitSha(),
    seed: sweep.seed,
    ceilingDbfs: -3,
    musicalQualityClaimed: false,
    livePlaybackUsesTunedEven: false,
    totalBytes,
    files,
  };
  await writeFile(`${dir}/render.json`, JSON.stringify(record, null, 2) + '\n');
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
  if (totalBytes > 2 * 1024 * 1024) throw new Error(`Renders are ${totalBytes} bytes`);
} finally {
  ws.close();
  chrome.kill();
  server.close();
}
