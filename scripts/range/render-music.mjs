// OfflineAudioContext renders for the five Musical Workshop arrangements.
// Node has no WebAudio. Chrome loads lib/worldcraft-resonance.js.
// The saved peak is measured on the file. Listening quality is not judged.
//
//   node scripts/range/render-music.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rangeGitSha } from './run.mjs';

const CEILING = 10 ** (-3 / 20);
const search = JSON.parse(await readFile(new URL('../../docs/experiments/range/appendix/music/search.json', import.meta.url), 'utf8'));
const branch = 'lab/wc-range-music-20261025';
const gitSha = rangeGitSha();
const names = {
  opening: 'opening-d4-e4',
  'late-catch-4': 'late-catch-d4-c4-e4',
  'early-plate-14': 'early-plate-c4-d4-e4',
  'ramp-aside': 'plate-e4',
  'opening-aim-24': 'return-d4-d4',
};
const jobs = search.arrangements.map(arrangement => {
  const stem = names[arrangement.id];
  if (!stem) throw new Error(`No wav name for ${arrangement.id}`);
  if (!arrangement.impacts?.length) throw new Error(`${arrangement.id} has no impacts`);
  return { stem, arrangement, impacts: arrangement.impacts };
});

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
const profile = await mkdtemp(join(tmpdir(), 'music-chrome-'));
const chromeBin = process.env.CHROME ?? '/usr/bin/google-chrome-stable';
const chrome = spawn(chromeBin, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=9335',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });

async function targets() {
  const response = await fetch('http://127.0.0.1:9335/json/list');
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

const audioDir = new URL('../../docs/experiments/range/audio/music/', import.meta.url);
const artifactDir = '/opt/cursor/artifacts/range-music-audio';

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
    return { wav: Buffer.from(payload.b64, 'base64'), mix: payload.mix };
  }
  const dry = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const rendered = await render(index, 1);
    const measured = measure(rendered.wav);
    dry.push(measured.peak);
  }
  const maxUnscaled = Math.max(...dry);
  const mix = maxUnscaled <= CEILING ? 1 : (CEILING * 0.98) / maxUnscaled;
  if (!(mix > 0) || mix > 1) throw new Error(`Bad mix ${mix}`);
  await mkdir(audioDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const files = [];
  for (let index = 0; index < jobs.length; index += 1) {
    const job = jobs[index];
    const rendered = await render(index, mix);
    const wav = rendered.wav;
    const measured = measure(wav);
    if (measured.clipped) throw new Error(`${job.stem} clipped`);
    if (measured.peak > CEILING + 1 / 32768) throw new Error(`${job.stem} peak ${measured.peak} exceeds -3 dBFS`);
    if (!(measured.peak > 0.01)) throw new Error(`${job.stem} is silent`);
    const wavName = `${job.stem}.wav`;
    const sidecarName = `${job.stem}.json`;
    await writeFile(new URL(wavName, audioDir), wav);
    const peakDbfs = 20 * Math.log10(measured.peak);
    const sidecar = {
      branch,
      gitSha,
      presetId: search.presetId,
      catalogPresetHash: search.catalogPresetHash,
      seed: search.seed,
      arrangementId: job.arrangement.id,
      headline: job.arrangement.headline,
      order: job.arrangement.order,
      setup: job.arrangement.setup,
      objects: job.arrangement.objects,
      bindingHash: job.arrangement.bindingHash,
      worldIdentity: job.arrangement.worldIdentity,
      contactSequence: job.arrangement.contacts,
      impacts: job.arrangement.impacts,
      wav: `docs/experiments/range/audio/music/${wavName}`,
      mix,
      unscaledPeak: dry[index],
      peak: measured.peak,
      peakDbfs,
      sampleRate: measured.sampleRate,
      seconds: measured.seconds,
      bytes: measured.bytes,
      listeningQuality: 'unverified',
      musicalQualityClaimed: false,
    };
    const sidecarText = `${JSON.stringify(sidecar, null, 2)}\n`;
    await writeFile(new URL(sidecarName, audioDir), sidecarText);
    await writeFile(join(artifactDir, wavName), wav);
    await writeFile(join(artifactDir, sidecarName), sidecarText);
    files.push({ file: sidecar.wav, headline: sidecar.headline, peakDbfs, seconds: measured.seconds, bindingHash: sidecar.bindingHash });
  }
  const manifest = {
    source: 'OfflineAudioContext',
    renderer: 'lib/worldcraft-resonance.js renderResonanceWav',
    listeningQuality: 'unverified',
    musicalQualityClaimed: false,
    branch,
    gitSha,
    seed: search.seed,
    ceilingDbfs: -3,
    mix,
    maxUnscaledPeak: maxUnscaled,
    files,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(new URL('manifest.json', audioDir), manifestText);
  await writeFile(join(artifactDir, 'manifest.json'), manifestText);
  console.log(JSON.stringify(manifest, null, 2));
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
