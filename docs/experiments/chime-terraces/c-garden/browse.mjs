// Play Chime Garden in the lab and check the starter shots against the manifest.
// The dev server must already be up.
//
//   node docs/experiments/chime-terraces/c-garden/browse.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const url = arg('--url');
const out = resolve(arg('--out') ?? '/opt/cursor/artifacts');
const port = Number(arg('--port') ?? 9333);
if (!url) throw new Error('Need --url');
await mkdir(out, { recursive: true });

const manifest = JSON.parse(await readFile(new URL('../../../../worlds/foundry/chime-garden/manifest.json', import.meta.url), 'utf8'));

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(done => setTimeout(done, ms));

function percentile(values, p) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
}
function summarize(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return {
    n: sorted.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    p95: percentile(sorted, 0.95),
  };
}

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-chime-garden',
  url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

async function target() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* chrome still booting */ }
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
async function png(name) {
  await sleep(500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: height > width });
  await sleep(500);
}

const report = { url, screenshots: [], shots: [], frames: {}, pieceList: null, panel: null, gl: null };
try {
  await send('Page.enable');
  await send('Runtime.enable');
  let last = null;
  for (let i = 0; i < 120; i += 1) {
    const snap = await evaluate(`(() => { const qa = window.__worldcraftQA; return qa?.snapshot ? qa.snapshot() : { phase: 'booting' }; })()`);
    last = snap;
    if (snap?.phase === 'ready' || snap?.phase === 'result') break;
    if (snap?.phase === 'error') throw new Error(snap.notice || 'worldcraft error');
    await sleep(250);
  }
  if (last?.phase !== 'ready' && last?.phase !== 'result') throw new Error(`Worldcraft did not become ready: ${JSON.stringify(last)?.slice(0, 400)}`);
  await evaluate(`window.__worldcraftQA.playFoundry('chime-garden')`);
  let opened = null;
  for (let i = 0; i < 40; i += 1) {
    opened = await evaluate('window.__worldcraftQA.snapshot()');
    if (opened.foundryId === 'chime-garden' && (opened.phase === 'ready' || opened.phase === 'result')) break;
    await sleep(200);
  }
  if (opened?.foundryId !== 'chime-garden') throw new Error('Chime Garden did not open');
  report.gl = await evaluate('window.__worldcraftQA.gl()');
  report.panel = await evaluate(`(() => {
    const card = document.querySelector('[data-foundry-play]');
    return {
      heading: card?.querySelector('strong')?.textContent ?? '',
      invitation: card?.querySelector('p')?.textContent ?? '',
      rules: card?.querySelector('[data-foundry-rules]')?.textContent ?? '',
    };
  })()`);
  await setViewport(1280, 800);
  report.screenshots.push(await png('chime-garden-desktop'));
  const survey = await evaluate('window.__worldcraftQA.sampleDetail(90)', true);
  report.frames.survey = summarize((survey ?? []).map(sample => sample.dt));
  await setViewport(390, 844);
  report.screenshots.push(await png('chime-garden-portrait'));
  await setViewport(844, 390);
  report.pieceList = await evaluate('window.__worldcraftQA.pieceList()');
  report.screenshots.push(await png('chime-garden-landscape'));
  await setViewport(1280, 800);
  for (const tested of manifest.testedShots) {
    await evaluate('window.__worldcraftQA.ready()');
    await sleep(200);
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({
      originX: tested.setup.originX,
      yaw: tested.setup.yaw,
      elevation: tested.setup.elevation,
      charge: tested.setup.charge,
    })})`);
    if (tested.id === 'centre') {
      const flightPromise = evaluate('window.__worldcraftQA.sampleFlight(240)', true);
      await evaluate('window.__worldcraftQA.fire()');
      const flight = await flightPromise;
      report.frames.flight = summarize((flight ?? []).filter(sample => sample.phase === 'flight').map(sample => sample.dt));
    } else {
      await evaluate('window.__worldcraftQA.fire()');
    }
    let snap = null;
    for (let i = 0; i < 40; i += 1) {
      snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.phase === 'result') break;
      if (snap.phase === 'error') throw new Error(snap.notice || `${tested.id} errored`);
      await sleep(250);
    }
    if (snap?.phase !== 'result') throw new Error(`${tested.id} did not resolve`);
    const actualContacts = (snap.lastShot?.contacts ?? []).filter(row => row.body !== 'worldcraft-ground').map(row => row.body);
    const terminal = snap.lastShot?.terminal ?? null;
    const same = terminal
      && terminal.reason === tested.terminal.reason
      && Object.is(terminal.elapsed, tested.terminal.elapsed)
      && terminal.position.every((item, index) => Object.is(item, tested.terminal.position[index]))
      && actualContacts.length === tested.contacts.length
      && actualContacts.every((body, index) => body === tested.contacts[index]);
    report.shots.push({
      id: tested.id,
      same,
      expected: { terminal: tested.terminal, contacts: tested.contacts },
      actual: { terminal, contacts: actualContacts },
    });
    if (tested.id === 'centre') report.screenshots.push(await png('chime-garden-centre-result'));
  }
  await evaluate(`window.__worldcraftQA.setMode('build')`);
  await sleep(400);
  await setViewport(844, 390);
  report.pieceList = await evaluate('window.__worldcraftQA.pieceList()');
  report.screenshots.push(await png('chime-garden-build-landscape'));
  await writeFile(`${out}/chime-garden-browser.json`, `${JSON.stringify(report, null, 2)}\n`);
  const missed = report.shots.filter(shot => !shot.same);
  if (missed.length) {
    process.stderr.write(`${JSON.stringify(missed, null, 2)}\n`);
    process.exitCode = 1;
  }
  process.stdout.write(`${JSON.stringify({ screenshots: report.screenshots, frames: report.frames, pieceList: report.pieceList, shots: report.shots.map(shot => ({ id: shot.id, same: shot.same })), panel: report.panel, gl: report.gl }, null, 2)}\n`);
} finally {
  ws.close();
  chrome.kill('SIGKILL');
}
