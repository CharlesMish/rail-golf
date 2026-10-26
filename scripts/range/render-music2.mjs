// Level-matched A/B renders for Musical Workshop dynamics.
// Node has no WebAudio. Chrome loads lib/worldcraft-resonance.js.
// Each pair is the same shot. RMS is matched, then both files share one ceiling.
// Listening quality is not judged. Musical quality is not claimed.
//
//   node scripts/range/render-music2.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rangeGitSha } from './run.mjs';

const CEILING = 10 ** (-3 / 20);
const PARENT = '6ac83e3ff73c9cf72f47f0b5009aa9036557c5e4';
const CLOCKWORK = '3aede12c35154352b444ec65d41395011b9b8b1b';
const contacts = JSON.parse(await readFile(new URL('../../docs/experiments/range/appendix/music2/contacts.json', import.meta.url), 'utf8'));
const branch = 'lab/wc-range-music2-20261025';
const gitSha = rangeGitSha();

function playable(impacts) {
  return impacts.map(impact => ({
    piece: impact.piece,
    role: impact.role,
    time: impact.time,
    material: impact.material,
    degree: ['C4', 'D4', 'E4', 'G4', 'A4'].indexOf(impact.note),
    note: impact.note,
    hz: { C4: 261.6256, D4: 293.6648, E4: 329.6276, G4: 391.9954, A4: 440 }[impact.note],
    gain: impact.gainLive,
    callbacks: impact.callbacks,
  }));
}

const calibration = [
  { id: 'timber-gain-1', impacts: [{ piece: 'bank-yours', role: 'bank', time: 0.05, material: 'timber', degree: 0, note: 'C4', hz: 261.6256, gain: 1, callbacks: 1 }] },
  { id: 'timber-gain-0.5', impacts: [{ piece: 'bank-yours', role: 'bank', time: 0.05, material: 'timber', degree: 0, note: 'C4', hz: 261.6256, gain: 0.5, callbacks: 1 }] },
  { id: 'metal-gain-1', impacts: [{ piece: 'plate-yours', role: 'plate', time: 0.05, material: 'metal', degree: 2, note: 'E4', hz: 329.6276, gain: 1, callbacks: 1 }] },
  { id: 'metal-gain-0.5', impacts: [{ piece: 'plate-yours', role: 'plate', time: 0.05, material: 'metal', degree: 2, note: 'E4', hz: 329.6276, gain: 0.5, callbacks: 1 }] },
];
const pairs = contacts.ab.map(item => ({
  id: item.id,
  total: playable(item.total),
  normal: playable(item.normal),
  meta: item,
}));
const jobs = [
  ...calibration.map(item => ({ key: item.id, impacts: item.impacts })),
  ...pairs.flatMap(pair => [
    { key: `${pair.id}-total`, impacts: pair.total },
    { key: `${pair.id}-normal`, impacts: pair.normal },
  ]),
];

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

function viewOf(wav) {
  if (wav.subarray(0, 4).toString() !== 'RIFF' || wav.subarray(8, 12).toString() !== 'WAVE') throw new Error('Chrome did not return a wav');
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const channels = view.getUint16(22, true);
  const rate = view.getUint32(24, true);
  const bits = view.getUint16(34, true);
  const dataBytes = view.getUint32(40, true);
  if (channels !== 1 || bits !== 16) throw new Error(`Unexpected wav format ${channels} ch ${bits} bit`);
  return { view, rate, dataBytes, seconds: dataBytes / 2 / rate, bytes: wav.length };
}

function measure(wav) {
  const info = viewOf(wav);
  let peak = 0;
  let sum = 0;
  let clipped = false;
  const samples = info.dataBytes / 2;
  for (let offset = 44; offset < 44 + info.dataBytes; offset += 2) {
    const sample = info.view.getInt16(offset, true);
    const abs = Math.abs(sample);
    if (abs >= 32767) clipped = true;
    const unit = abs / 32768;
    if (unit > peak) peak = unit;
    sum += (sample / 32768) ** 2;
  }
  return { peak, rms: Math.sqrt(sum / samples), clipped, sampleRate: info.rate, seconds: info.seconds, bytes: info.bytes };
}

function scaleWav(wav, scale) {
  const out = Buffer.from(wav);
  const info = viewOf(out);
  for (let offset = 44; offset < 44 + info.dataBytes; offset += 2) {
    const unit = (info.view.getInt16(offset, true) / 32768) * scale;
    const clamped = Math.max(-1, Math.min(1, unit));
    info.view.setInt16(offset, clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff), true);
  }
  return out;
}

function dbfs(peak) {
  return peak > 0 ? 20 * Math.log10(peak) : null;
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
const profile = await mkdtemp(join(tmpdir(), 'music2-chrome-'));
const chromeBin = process.env.CHROME ?? '/usr/bin/google-chrome-stable';
const chrome = spawn(chromeBin, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--disable-dev-shm-usage',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=9336',
  `http://127.0.0.1:${port}/render.html`,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp' } });

async function targets() {
  const response = await fetch('http://127.0.0.1:9336/json/list');
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

const audioDir = new URL('../../docs/experiments/range/audio/music2/', import.meta.url);
const artifactDir = '/opt/cursor/artifacts/range-music2-audio';

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
  async function render(index) {
    const rendered = await cdp('Runtime.evaluate', {
      expression: `window.renderOne(${index}, 1)`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (rendered.exceptionDetails) throw new Error(JSON.stringify(rendered.exceptionDetails));
    const payload = JSON.parse(rendered.result.value);
    if (payload.mix !== 1) throw new Error(`Renderer echoed mix ${payload.mix}`);
    return Buffer.from(payload.b64, 'base64');
  }
  const rendered = [];
  for (let index = 0; index < jobs.length; index += 1) rendered.push(await render(index));
  const measured = rendered.map(measure);

  const timberDrop = dbfs(measured[1].peak) - dbfs(measured[0].peak);
  const metalDrop = dbfs(measured[3].peak) - dbfs(measured[2].peak);
  if (Math.abs(timberDrop + 6.0206) > 0.2) throw new Error(`Timber gain is not linear: ${timberDrop}`);
  if (Math.abs(metalDrop + 6.0206) > 0.2) throw new Error(`Metal gain is not linear: ${metalDrop}`);

  function levelSpread(role, field, unityPeak) {
    const stats = contacts.byRole[role][field];
    if (!stats) return null;
    const toDb = value => (value > 0 ? unityPeak + 20 * Math.log10(value) : null);
    const min = toDb(stats.min);
    const medianDb = toDb(stats.median);
    const max = toDb(stats.max);
    return { n: stats.n, min, median: medianDb, max, spread: max - min, unityPeakDbfs: unityPeak };
  }
  const levels = {
    timberUnityDbfs: dbfs(measured[0].peak),
    metalUnityDbfs: dbfs(measured[2].peak),
    timberHalfDrop: timberDrop,
    metalHalfDrop: metalDrop,
    bank: {
      totalSpeed: levelSpread('bank', 'gainTotal', dbfs(measured[0].peak)),
      normalSpeed: levelSpread('bank', 'gainNormal', dbfs(measured[0].peak)),
      impulse: levelSpread('bank', 'gainImpulse', dbfs(measured[0].peak)),
    },
    ramp: {
      totalSpeed: levelSpread('ramp', 'gainTotal', dbfs(measured[2].peak)),
      normalSpeed: levelSpread('ramp', 'gainNormal', dbfs(measured[2].peak)),
      impulse: levelSpread('ramp', 'gainImpulse', dbfs(measured[2].peak)),
    },
    plate: {
      totalSpeed: levelSpread('plate', 'gainTotal', dbfs(measured[2].peak)),
      normalSpeed: levelSpread('plate', 'gainNormal', dbfs(measured[2].peak)),
      impulse: levelSpread('plate', 'gainImpulse', dbfs(measured[2].peak)),
    },
  };

  await mkdir(audioDir, { recursive: true });
  await mkdir(artifactDir, { recursive: true });
  const files = [];
  for (const pair of pairs) {
    const totalIndex = jobs.findIndex(job => job.key === `${pair.id}-total`);
    const normalIndex = jobs.findIndex(job => job.key === `${pair.id}-normal`);
    const rawTotal = measured[totalIndex];
    const rawNormal = measured[normalIndex];
    const target = Math.min(rawTotal.rms, rawNormal.rms);
    let scaleTotal = target / rawTotal.rms;
    let scaleNormal = target / rawNormal.rms;
    const matchedHotter = Math.max(rawTotal.peak * scaleTotal, rawNormal.peak * scaleNormal);
    const listen = 10 ** (-6 / 20);
    let ceilingScale = 1;
    if (matchedHotter > CEILING) ceilingScale = CEILING / matchedHotter;
    else if (matchedHotter < listen) ceilingScale = listen / matchedHotter;
    scaleTotal *= ceilingScale;
    scaleNormal *= ceilingScale;
    const outputs = [
      { mapping: 'total-speed', impacts: pair.meta.total, wav: scaleWav(rendered[totalIndex], scaleTotal), scale: scaleTotal, raw: rawTotal },
      { mapping: 'normal-speed', impacts: pair.meta.normal, wav: scaleWav(rendered[normalIndex], scaleNormal), scale: scaleNormal, raw: rawNormal },
    ];
    for (const output of outputs) {
      const after = measure(output.wav);
      const stem = `${pair.id}-${output.mapping === 'total-speed' ? 'total' : 'normal'}`;
      if (after.clipped) throw new Error(`${stem} clipped`);
      if (after.peak > CEILING + 1 / 32768) throw new Error(`${stem} peak ${after.peak} exceeds -3 dBFS`);
      if (!(after.peak > 0.001)) throw new Error(`${stem} is silent`);
      const wavName = `${stem}.wav`;
      const sidecar = {
        branch,
        gitSha,
        parent: PARENT,
        clockwork: CLOCKWORK,
        clockworkModified: false,
        presetId: 'musical-workshop',
        seed: 20261025,
        seedAppliedToSolver: false,
        shotId: pair.id,
        mapping: output.mapping,
        liveMapping: 'normal-speed',
        setup: pair.meta.setup,
        objects: pair.meta.objects,
        terminal: pair.meta.terminal,
        trajectoriesBitIdentical: pair.meta.identical,
        impacts: output.impacts,
        rawGains: output.impacts.map(impact => ({ role: impact.role, note: impact.note, gain: impact.gainLive, speed: impact.speed, normalSpeed: impact.normalSpeed })),
        wav: `docs/experiments/range/audio/music2/${wavName}`,
        mix: 1,
        rmsMatch: 'The two files of this shot are scaled so their RMS matches, then a shared factor sets the hotter peak near -6 dBFS without passing -3. A one-note shot then has the same envelope. The raw peaks and raw gains are the level difference.',
        rawPeak: output.raw.peak,
        rawPeakDbfs: dbfs(output.raw.peak),
        rawRms: output.raw.rms,
        rmsScale: output.scale,
        ceilingScale,
        ceilingDbfs: -3,
        peak: after.peak,
        peakDbfs: dbfs(after.peak),
        rms: after.rms,
        sampleRate: after.sampleRate,
        seconds: after.seconds,
        bytes: after.bytes,
        listeningQuality: 'unverified',
        musicalQualityClaimed: false,
      };
      const sidecarText = `${JSON.stringify(sidecar, null, 2)}\n`;
      await writeFile(new URL(wavName, audioDir), output.wav);
      await writeFile(new URL(`${stem}.json`, audioDir), sidecarText);
      await writeFile(join(artifactDir, wavName), output.wav);
      await writeFile(join(artifactDir, `${stem}.json`), sidecarText);
      files.push({ file: sidecar.wav, shotId: pair.id, mapping: output.mapping, peakDbfs: sidecar.peakDbfs, rawPeakDbfs: sidecar.rawPeakDbfs, rmsScale: output.scale, notes: output.impacts.map(impact => impact.note) });
    }
  }
  const manifest = {
    source: 'OfflineAudioContext',
    renderer: 'lib/worldcraft-resonance.js renderResonanceWav',
    listeningQuality: 'unverified',
    musicalQualityClaimed: false,
    branch,
    gitSha,
    parent: PARENT,
    clockwork: CLOCKWORK,
    seed: 20261025,
    ceilingDbfs: -3,
    levelMatch: 'Per pair, scale so RMS matches. A shared factor then lifts a quiet pair until the hotter peak is about -6 dBFS, or cuts both if a peak would pass -3 dBFS. Relative contour is unchanged. A one-note pair becomes the same envelope; its raw peaks are the level difference.',
    calibration: {
      timberUnityDbfs: levels.timberUnityDbfs,
      metalUnityDbfs: levels.metalUnityDbfs,
      timberHalfDrop: levels.timberHalfDrop,
      metalHalfDrop: levels.metalHalfDrop,
    },
    levels,
    files,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(new URL('manifest.json', audioDir), manifestText);
  await writeFile(join(artifactDir, 'manifest.json'), manifestText);
  contacts.levels = levels;
  await writeFile(new URL('../../docs/experiments/range/appendix/music2/contacts.json', import.meta.url), `${JSON.stringify(contacts, null, 2)}\n`);
  console.log(JSON.stringify({ calibration: manifest.calibration, levels, files }, null, 2));
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
