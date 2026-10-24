// OfflineAudioContext renders for Resonant Run. Node has no WebAudio.
// Chrome loads the same lib/worldcraft-resonance.js the lab uses.
// A first pass measures peaks. The saved pass uses one mix so every
// sounding file stays at or under -3 dBFS. The sound-off file is the
// prescribed impacts with mix 0. Live playback gain is not changed.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CEILING = 10 ** (-3 / 20);
const audioDir = new URL('../../docs/experiments/range/audio/', import.meta.url);
const artifactDir = '/opt/cursor/artifacts/resonant-run';
const exemplars = JSON.parse(await readFile(new URL('exemplars.json', audioDir), 'utf8'));
const search = JSON.parse(await readFile(new URL('../../docs/experiments/range/appendix/resonant-run/search.json', import.meta.url), 'utf8'));
const timber = search.retune?.timber?.[0];
if (!timber?.resonance?.impacts?.length) throw new Error('Search has no all-timber retune');

const byRole = Object.fromEntries(exemplars.map(item => [item.role, item]));
for (const role of ['opening', 'prescribed', 'contrast']) {
  if (!byRole[role]?.resonance?.impacts?.length) throw new Error(`Missing exemplar ${role}`);
}

async function recordHash(name) {
  const bytes = await readFile(new URL(`records/${name}`, audioDir));
  return createHash('sha256').update(bytes).digest('hex');
}

const jobs = [
  { file: 'opening-de.wav', label: 'opening D4 metal then E4 metal', shotHash: byRole.opening.shotHash, record: 'opening.json', impacts: byRole.opening.resonance.impacts, sounding: true },
  { file: 'early-cooccur-cde.wav', label: 'prescribed C4 timber, D4 metal, E4 metal, thunk', shotHash: byRole.prescribed.shotHash, record: 'early-cooccur.json', impacts: byRole.prescribed.resonance.impacts, sounding: true },
  { file: 'late-plate-dce.wav', label: 'contrast D4 metal, C4 timber, E4 metal, thunk', shotHash: byRole.contrast.shotHash, record: 'late-plate-3.json', impacts: byRole.contrast.resonance.impacts, sounding: true },
  { file: 'early-cooccur-all-timber.wav', label: 'same early-cooccur contacts, ramp and plate retuned to timber', shotHash: timber.shotHash, record: 'early-cooccur-all-timber.json', impacts: timber.resonance.impacts, sounding: true },
  { file: 'early-cooccur-sound-off.wav', label: 'prescribed impacts with mix 0', shotHash: byRole.prescribed.shotHash, record: 'early-cooccur.json', impacts: byRole.prescribed.resonance.impacts, sounding: false },
];
for (const job of jobs) {
  const hash = await recordHash(job.record);
  if (hash !== job.shotHash) throw new Error(`${job.record} sha256 ${hash} != shotHash ${job.shotHash}`);
  job.recordSha256 = hash;
}

const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', event => { window.__err = String(event.message || event.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  const jobs = ${JSON.stringify(jobs.map(job => job.impacts))};
  window.renderOne = async (index, mix) => {
    const wav = await renderResonanceWav(jobs[index], { mix });
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < wav.length; i += chunk) binary += String.fromCharCode(...wav.subarray(i, i + chunk));
    return JSON.stringify({ mix, b64: btoa(binary) });
  };
} catch (error) {
  window.__err = error instanceof Error ? error.stack || error.message : String(error);
}
</script>`;

function measure(wav) {
  if (wav.subarray(0, 4).toString() !== 'RIFF' || wav.subarray(8, 12).toString() !== 'WAVE') throw new Error('Chrome did not return a wav');
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const channels = view.getUint16(22, true);
  const rate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  const dataBytes = view.getUint32(40, true);
  if (channels !== 1 || bits !== 16) throw new Error(`Unexpected wav format ${channels} ch ${bits} bit`);
  let peak = 0;
  let clipped = false;
  for (let offset = 44; offset < 44 + dataBytes; offset += 2) {
    const sample = view.getInt16(offset, true);
    const abs = Math.abs(sample);
    if (abs >= 32767) clipped = true;
    if (abs / 32768 > peak) peak = abs / 32768;
  }
  return { peak, clipped, sampleRate: rate, seconds: dataBytes / 2 / rate, bytes: wav.length };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/render.html') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }
    if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js') && !url.pathname.includes('..')) {
      const file = await readFile(new URL(`../..${url.pathname}`, import.meta.url));
      res.setHeader('content-type', 'text/javascript; charset=utf-8');
      res.end(file);
      return;
    }
    res.statusCode = 404;
    res.end('missing');
  } catch (error) {
    res.statusCode = 500;
    res.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const profile = await mkdtemp(join(tmpdir(), 'resonant-run-chrome-'));
const chromeBin = process.env.CHROME ?? 'google-chrome';
const chrome = spawn(chromeBin, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=9334',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });

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
  await new Promise(resolve => setTimeout(resolve, 100));
}
if (!page) throw new Error('Chrome did not expose a page target');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', reject, { once: true });
});
let nextId = 0;
function cdp(method, params) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = event => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      ws.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

try {
  let ready = false;
  for (let i = 0; i < 50 && !ready; i += 1) {
    const probed = await cdp('Runtime.evaluate', { expression: 'typeof window.renderOne', returnByValue: true });
    ready = probed.result?.value === 'function';
    if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!ready) {
    const reason = await cdp('Runtime.evaluate', { expression: 'window.__err || document.documentElement.outerHTML.slice(0, 500)', returnByValue: true });
    throw new Error(`Offline renderer did not load: ${reason.result?.value ?? 'no page error'}`);
  }

  async function render(index, mix) {
    const rendered = await cdp('Runtime.evaluate', {
      expression: `window.renderOne(${index}, ${mix})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (rendered.exceptionDetails) throw new Error(JSON.stringify(rendered.exceptionDetails));
    const payload = JSON.parse(rendered.result.value);
    if (!(Math.abs(payload.mix - mix) < 1e-12)) throw new Error(`Renderer echoed mix ${payload.mix}, expected ${mix}`);
    return measure(Buffer.from(payload.b64, 'base64'));
  }

  const dryPeaks = [];
  for (let index = 0; index < jobs.length; index += 1) {
    if (!jobs[index].sounding) continue;
    const measured = await render(index, 1);
    dryPeaks.push(measured.peak);
    jobs[index].unscaledPeak = measured.peak;
  }
  const maxUnscaled = Math.max(...dryPeaks);
  const mix = maxUnscaled <= CEILING ? 1 : (CEILING * 0.98) / maxUnscaled;
  if (!(mix > 0) || mix > 1) throw new Error(`Bad mix ${mix} from peaks ${dryPeaks.join(',')}`);

  await mkdir(audioDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const files = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const used = job.sounding ? mix : 0;
    const rendered = await cdp('Runtime.evaluate', {
      expression: `window.renderOne(${index}, ${used})`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (rendered.exceptionDetails) throw new Error(JSON.stringify(rendered.exceptionDetails));
    const payload = JSON.parse(rendered.result.value);
    if (!(Math.abs(payload.mix - used) < 1e-12)) throw new Error(`${job.file} echoed mix ${payload.mix}, expected ${used}`);
    const wav = Buffer.from(payload.b64, 'base64');
    const measured = measure(wav);
    if (measured.clipped) throw new Error(`${job.file} clipped`);
    if (measured.peak > CEILING + 1 / 32768) throw new Error(`${job.file} peak ${measured.peak} exceeds -3 dBFS at mix ${used}; unscaled ${job.unscaledPeak}`);
    if (job.sounding && !(measured.peak > 0.01)) throw new Error(`${job.file} is silent`);
    if (!job.sounding && measured.peak !== 0) throw new Error(`${job.file} was not silent`);
    const dest = new URL(job.file, audioDir);
    await writeFile(dest, wav);
    await copyFile(dest, join(artifactDir, job.file));
    files.push({
      file: `docs/experiments/range/audio/${job.file}`,
      label: job.label,
      shotHash: job.shotHash,
      record: `docs/experiments/range/audio/records/${job.record}`,
      recordSha256: job.recordSha256,
      mix: used,
      unscaledPeak: job.unscaledPeak ?? null,
      peak: measured.peak,
      peakDbfs: measured.peak === 0 ? null : 20 * Math.log10(measured.peak),
      clipped: measured.clipped,
      sampleRate: measured.sampleRate,
      seconds: measured.seconds,
      bytes: measured.bytes,
    });
  }
  const prescribed = files.find(file => file.file.endsWith('early-cooccur-cde.wav'));
  const silent = files.find(file => file.file.endsWith('early-cooccur-sound-off.wav'));
  if (prescribed.seconds !== silent.seconds) throw new Error('Sound-off duration differs from the prescribed render');
  const manifest = {
    source: 'OfflineAudioContext',
    renderer: 'lib/worldcraft-resonance.js renderResonanceWav',
    listeningQuality: 'unverified',
    scaleMembershipIsMusicality: false,
    livePlaybackGainChanged: false,
    ceilingDbfs: -3,
    ceilingLinear: CEILING,
    mix,
    maxUnscaledPeak: maxUnscaled,
    files,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(new URL('manifest.json', audioDir), manifestText);
  await writeFile(join(artifactDir, 'manifest.json'), manifestText);
  console.log(JSON.stringify({ mix, maxUnscaledPeak: maxUnscaled, files: files.map(file => ({ file: file.file, peak: file.peak, peakDbfs: file.peakDbfs, seconds: file.seconds, shotHash: file.shotHash })) }, null, 2));
} finally {
  ws.close();
  if (chrome.exitCode === null && !chrome.killed) chrome.kill('SIGKILL');
  await new Promise(resolve => {
    if (chrome.exitCode !== null || chrome.signalCode) resolve();
    else chrome.once('exit', resolve);
  });
  server.close();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
