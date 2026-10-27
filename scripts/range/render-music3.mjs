// Bank voice study (music3): render every captured shot under each sound variant,
// at actual in-game gain and level-matched, and measure short-window loudness,
// phrase balance and headroom. Chrome renders with lib/worldcraft-resonance.js,
// the same code the lab plays. Listening quality is for the owner to judge.
//
//   CHROME=/path/to/chrome node scripts/range/render-music3.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rangeGitSha } from './run.mjs';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('docs/experiments/range/audio/music3/', ROOT);
const capture = JSON.parse(await readFile(new URL('docs/experiments/range/appendix/music3/contacts.json', ROOT), 'utf8'));
const VARIANTS = ['pr55', 'even-db', 'woody', 'woody-bright', 'tuned', 'tuned-long'];
const HZ = { C4: 261.6256, D4: 293.6648, E4: 329.6276 };
const RATE = 44100;
const LEVEL_MATCH_LUFS = -20; // loudest 400 ms window of each file
const CEILING_DBFS = -1;

const note = (role, material, name, time, gain, extra = {}) => ({ piece: `${role}-cal`, role, time, material, degree: 0, note: name, hz: HZ[name], gain, callbacks: 1, ...extra });
const jobs = [];
for (const shot of capture.shots) for (const variant of VARIANTS) jobs.push({ key: `${shot.id}--${variant}`, shot: shot.id, variant, impacts: shot.impacts, render: true });
// Calibration: one full-strength note per voice, and a worst-case pile-up
// (bank, ramp and plate inside 20 ms at full strength) for headroom.
for (const variant of VARIANTS) {
  jobs.push({ key: `cal-timber--${variant}`, variant, impacts: [note('bank', 'timber', 'C4', 0.1, 1, { normalSpeed: 40 })] });
  jobs.push({ key: `cal-metal--${variant}`, variant, impacts: [note('plate', 'metal', 'E4', 0.1, 1, { normalSpeed: 40 })] });
  jobs.push({ key: `stress--${variant}`, variant, impacts: [note('bank', 'timber', 'C4', 0.1, 1, { normalSpeed: 40 }), note('ramp', 'metal', 'D4', 0.11, 1, { normalSpeed: 40 }), note('plate', 'metal', 'E4', 0.12, 1, { normalSpeed: 40 })] });
}

// ---- DSP helpers ---------------------------------------------------------
function biquad(type, f0, q, gainDb = 0) {
  const A = 10 ** (gainDb / 40), w = 2 * Math.PI * f0 / RATE, c = Math.cos(w), s = Math.sin(w), alpha = s / (2 * q);
  let b, a;
  if (type === 'highshelf') {
    const r = 2 * Math.sqrt(A) * alpha;
    b = [A * ((A + 1) + (A - 1) * c + r), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - r)];
    a = [(A + 1) - (A - 1) * c + r, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - r];
  } else if (type === 'highpass') {
    b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]; a = [1 + alpha, -2 * c, 1 - alpha];
  } else {
    b = [(1 - c) / 2, 1 - c, (1 - c) / 2]; a = [1 + alpha, -2 * c, 1 - alpha];
  }
  return { b: b.map(v => v / a[0]), a: [1, a[1] / a[0], a[2] / a[0]] };
}
function filter(x, stages) {
  let y = Float64Array.from(x);
  for (const { b, a } of stages) {
    const out = new Float64Array(y.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < y.length; i++) {
      const v = b[0] * y[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
      x2 = x1; x1 = y[i]; y2 = y1; y1 = v; out[i] = v;
    }
    y = out;
  }
  return y;
}
// ITU-R BS.1770 K-weighting (RBJ form, as in pyloudnorm) and a crude small-speaker band.
const K = [biquad('highshelf', 1681.97, 0.7072, 3.9998), biquad('highpass', 38.135, 0.5003)];
const PHONE = [biquad('highpass', 500, 0.7071), biquad('highpass', 500, 0.7071), biquad('lowpass', 9000, 0.7071), biquad('lowpass', 9000, 0.7071)];
const lufs = ms => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity);
function windowMax(y, start, end, seconds) {
  const w = Math.round(seconds * RATE);
  let sum = 0, best = 0;
  const from = Math.max(0, start), to = Math.min(y.length, end);
  for (let i = from; i < to; i++) {
    sum += y[i] * y[i];
    if (i - from >= w) sum -= y[i - w] * y[i - w];
    if (i - from >= w - 1) best = Math.max(best, sum / w);
  }
  if (to - from < w) best = sum / w;
  return best;
}
const dbfs = v => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const r1 = v => (Number.isFinite(v) ? Math.round(v * 10) / 10 : null);

function decode(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const count = view.getUint32(40, true) / 2, x = new Float64Array(count);
  for (let i = 0; i < count; i++) x[i] = view.getInt16(44 + i * 2, true) / 32768;
  return x;
}
function encode(x, scale) {
  const out = Buffer.alloc(44 + x.length * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + x.length * 2, 4); out.write('WAVE', 8); out.write('fmt ', 12);
  out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(RATE, 24);
  out.writeUInt32LE(RATE * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) { const v = Math.max(-1, Math.min(1, x[i] * scale)); out.writeInt16LE(v < 0 ? Math.round(v * 0x8000) : Math.round(v * 0x7fff), 44 + i * 2); }
  return out;
}
function measure(x, impacts) {
  const k = filter(x, K), phone = filter(filter(x, PHONE), K);
  let peak = 0; for (const v of x) peak = Math.max(peak, Math.abs(v));
  const notes = impacts.map((impact, index) => {
    const a = Math.round(impact.time * RATE), next = impacts[index + 1] ? Math.round(impacts[index + 1].time * RATE) : x.length;
    let p = 0; for (let i = a; i < Math.min(next, a + Math.round(0.5 * RATE)); i++) p = Math.max(p, Math.abs(x[i]));
    return {
      note: impact.note, role: impact.role, time: impact.time, face: impact.normalSpeed,
      strike100: r1(lufs(windowMax(k, a, Math.min(next, a + Math.round(0.15 * RATE)), 0.1))),
      momentary400: r1(lufs(windowMax(k, a, Math.min(next, a + Math.round(0.5 * RATE)), 0.4))),
      phone400: r1(lufs(windowMax(phone, a, Math.min(next, a + Math.round(0.5 * RATE)), 0.4))),
      peakDbfs: r1(dbfs(p)),
    };
  });
  return { peakDbfs: r1(dbfs(peak)), loudest400: lufs(windowMax(k, 0, x.length, 0.4)), notes };
}

// ---- Chrome offline render (same pattern as render-music2) ---------------
const html = `<!doctype html><meta charset="utf-8"><script type="module">
window.addEventListener('error', e => { window.__err = String(e.message || e.error); });
try {
  const { renderResonanceWav } = await import('/lib/worldcraft-resonance.js');
  window.renderOne = async (impacts, variant) => {
    const wav = await renderResonanceWav(impacts, { variant, mix: 1, tail: 2.2 });
    let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode(...wav.subarray(i, i + 0x8000));
    return btoa(s);
  };
} catch (e) { window.__err = e instanceof Error ? e.stack || e.message : String(e); }
</script>`;
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/render.html') { res.setHeader('content-type', 'text/html'); res.end(html); return; }
  if (url.pathname.startsWith('/lib/') && url.pathname.endsWith('.js') && !url.pathname.includes('..')) {
    res.setHeader('content-type', 'text/javascript'); res.end(await readFile(new URL(`.${url.pathname}`, ROOT))); return;
  }
  res.statusCode = 404; res.end();
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profile = await mkdtemp(join(tmpdir(), 'music3-chrome-'));
const chrome = spawn(process.env.CHROME ?? '/usr/bin/google-chrome-stable', ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${profile}`, '--remote-debugging-port=9337', `http://127.0.0.1:${server.address().port}/render.html`], { stdio: 'ignore' });
let page;
for (let i = 0; i < 80 && !page; i++) {
  try { page = (await (await fetch('http://127.0.0.1:9337/json/list')).json()).find(t => t.type === 'page' && t.webSocketDebuggerUrl); } catch { /* binding */ }
  if (!page) await new Promise(r => setTimeout(r, 100));
}
if (!page) throw new Error('Chrome did not expose a page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
let nextId = 0;
const cdp = (method, params) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const on = event => { const m = JSON.parse(event.data); if (m.id !== id) return; ws.removeEventListener('message', on); if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result); };
  ws.addEventListener('message', on); ws.send(JSON.stringify({ id, method, params }));
});

const results = {};
try {
  for (let i = 0; i < 80; i++) {
    const ready = await cdp('Runtime.evaluate', { expression: 'typeof window.renderOne', returnByValue: true });
    if (ready.result?.value === 'function') break;
    if (i === 79) throw new Error('renderer did not load: ' + (await cdp('Runtime.evaluate', { expression: 'window.__err', returnByValue: true })).result?.value);
    await new Promise(r => setTimeout(r, 100));
  }
  await mkdir(new URL('in-game/', OUT), { recursive: true });
  await mkdir(new URL('level-matched/', OUT), { recursive: true });
  for (const job of jobs) {
    const call = `window.renderOne(${JSON.stringify(job.impacts)}, ${JSON.stringify(job.variant)})`;
    const out = await cdp('Runtime.evaluate', { expression: call, awaitPromise: true, returnByValue: true });
    if (out.exceptionDetails) throw new Error(JSON.stringify(out.exceptionDetails));
    const wav = Buffer.from(out.result.value, 'base64');
    const x = decode(wav);
    const m = measure(x, job.impacts);
    results[job.key] = { shot: job.shot ?? null, variant: job.variant, ...m, loudest400: r1(m.loudest400) };
    if (!job.render) continue;
    await writeFile(new URL(`in-game/${job.key}.wav`, OUT), wav);
    const scale = Math.min(10 ** ((LEVEL_MATCH_LUFS - m.loudest400) / 20), 10 ** (CEILING_DBFS / 20) / 10 ** (m.peakDbfs / 20));
    results[job.key].levelMatchDb = r1(dbfs(scale));
    await writeFile(new URL(`level-matched/${job.key}.wav`, OUT), encode(x, scale));
  }
} finally {
  ws.close(); chrome.kill('SIGKILL'); server.close();
}

const manifest = {
  branch: 'lab/wc-range-music3-bank-voice', parent: '9d8278ba9126a0579cfce35104417aba704248cd', gitSha: rangeGitSha(),
  renderer: 'lib/worldcraft-resonance.js renderResonanceWav (Chrome OfflineAudioContext)', sampleRate: RATE,
  variants: VARIANTS, inGame: 'mix 1, no normalisation: what the lab plays', levelMatched: `scaled so the loudest 400 ms K-weighted window is ${LEVEL_MATCH_LUFS} LUFS, peaks capped at ${CEILING_DBFS} dBFS`,
  measures: {
    strike100: 'max 100 ms K-weighted loudness in the first 150 ms of the note (LUFS): how hard the hit reads',
    momentary400: 'max 400 ms K-weighted loudness (BS.1770 momentary) within 0.5 s of the note',
    phone400: 'momentary400 after a crude small-speaker band (500 Hz–9 kHz, 4th order)',
    peakDbfs: 'sample peak',
  },
  listeningQuality: 'owner to judge', physicsChanged: false,
  results,
};
await writeFile(new URL('manifest.json', OUT), JSON.stringify(manifest, null, 1) + '\n');
console.log(`rendered ${jobs.filter(j => j.render).length} files, measured ${jobs.length}`);
