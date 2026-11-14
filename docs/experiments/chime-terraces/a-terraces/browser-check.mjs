// Headless Chrome check of Chime Terraces in the lab page.
// The dev server must already be serving /lab/worldcraft.
//
//   node docs/experiments/chime-terraces/a-terraces/browser-check.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
//
// Screenshots go to /opt/cursor/artifacts/chime-terraces/. This script writes
// browser-report.json here: contact and terminal matches, and whether the piece list fits.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const out = '/opt/cursor/artifacts/chime-terraces';
const port = Number(arg('--port') ?? 9336);
await mkdir(out, { recursive: true });
const sleep = ms => new Promise(done => setTimeout(done, ms));
const chrome = spawn('google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${port}`, '--window-size=1280,800', `--user-data-dir=/tmp/chrome-chime-${port}`, url,
], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(item => item.type === 'page' && item.url?.includes('/lab/worldcraft') && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* Chrome is still booting. */ }
    await sleep(250);
  }
  throw new Error('Chrome did not open the Worldcraft lab');
}

const page = await target();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done, fail) => { ws.addEventListener('open', done); ws.addEventListener('error', fail); });
let seq = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { done, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else done(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') consoleErrors.push(message.params.exceptionDetails?.exception?.description ?? message.params.exceptionDetails?.text ?? 'exception');
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') consoleErrors.push(message.params.args.map(item => item.value ?? item.description ?? '').join(' ').slice(0, 300));
});
const send = (method, params = {}) => new Promise((done, fail) => { const id = ++seq; pending.set(id, { done, fail }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
};
await send('Runtime.enable');
const qa = expression => evaluate(`(() => { const qa = window.__worldcraftQA; if (!qa) return null; ${expression} })()`);
const snapshot = () => qa(`const s = qa.snapshot(); const canvas = document.querySelector('canvas').getBoundingClientRect();
  const parts = document.querySelector('[aria-label="Pieces"]');
  return { build: s.build, mode: s.mode, phase: s.phase, view: s.view, foundryId: s.foundryId, notice: s.notice, setup: s.setup,
    canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom },
    projected: s.projectedObjects,
    parts: parts ? { scrollHeight: parts.scrollHeight, clientHeight: parts.clientHeight, buttons: parts.querySelectorAll('button').length } : null,
    sectionTitles: [...document.querySelectorAll('h2, [class*="sectionTitle"]')].map(node => node.textContent.trim()).filter(Boolean),
    last: s.lastShot ? { contacts: s.lastShot.contacts.map(row => row.body), terminal: s.lastShot.terminal, notes: (s.lastShot.resonance?.impacts ?? []).map(impact => impact.piece + ':' + impact.note) } : null };`);
async function until(test, label, limit = 240) {
  for (let i = 0; i < limit; i += 1) { const snap = await snapshot(); if (snap && test(snap)) return snap; await sleep(250); }
  throw new Error(`Timed out: ${label}`);
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await sleep(700);
}
async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(resolve(out, `${name}.png`), Buffer.from(data, 'base64'));
}
function visibility(snap) {
  const inside = snap.projected.filter(item => item.x >= snap.canvas.left && item.x <= snap.canvas.right && item.y >= snap.canvas.top && item.y <= snap.canvas.bottom);
  return { pieces: snap.projected.length, centresInsideCanvas: inside.length, outside: snap.projected.filter(item => !inside.includes(item)).map(item => item.id) };
}

const manifest = JSON.parse(await readFile(resolve(root, 'worlds/foundry/chime-terraces/manifest.json'), 'utf8'));
const report = { url, started: new Date().toISOString(), consoleErrors };
try {
  await until(snap => snap && snap.phase === 'ready', 'lab ready');
  await qa(`qa.playFoundry('chime-terraces'); return true;`);
  const opened = await until(snap => snap.foundryId === 'chime-terraces' && snap.phase === 'ready', 'chime ready');
  report.foundryId = opened.foundryId;
  report.notice = opened.notice;
  report.sectionTitles = opened.sectionTitles;
  report.views = {};
  for (const [name, width, height] of [['desktop', 1280, 800], ['portrait', 390, 844], ['landscape', 844, 390]]) {
    await viewport(width, height);
    await sleep(900);
    const snap = await snapshot();
    report.views[name] = { ...visibility(snap), parts: snap.parts, view: snap.view };
    await shot(`chime-terraces-${name}-${width}x${height}`);
    await qa('qa.survey(); return true;');
    await sleep(500);
    const surveyed = await snapshot();
    report.views[`${name}-survey`] = { ...visibility(surveyed), parts: surveyed.parts, view: surveyed.view };
    await shot(`chime-terraces-${name}-survey-${width}x${height}`);
    await qa('qa.ready(); return true;');
    await sleep(300);
  }
  await viewport(1280, 800);
  report.shots = [];
  for (const tested of manifest.testedShots) {
    const before = await snapshot();
    if (before.phase === 'result') { await qa('qa.ready(); return true;'); await until(snap => snap.phase === 'ready', 'ready'); }
    await qa(`qa.setShot(${JSON.stringify(tested.setup)}); return true;`);
    await sleep(120);
    await qa('qa.fire(); return true;');
    const result = await until(snap => snap.phase === 'result' && snap.last, tested.id);
    const actual = result.last.contacts.filter(body => body !== 'worldcraft-ground');
    const terminal = result.last.terminal;
    const match = JSON.stringify(actual) === JSON.stringify(tested.contacts)
      && terminal.reason === tested.terminal.reason
      && Object.is(terminal.elapsed, tested.terminal.elapsed)
      && terminal.position.every((value, index) => Object.is(value, tested.terminal.position[index]));
    report.shots.push({ id: tested.id, match, notes: result.last.notes, reason: terminal.reason });
    if (tested.id === 'centre-drop' || tested.id === 'near-miss') await shot(`chime-terraces-${tested.id}-result-1280x800`);
  }
  await viewport(844, 390);
  await qa(`qa.setMode('build'); return true;`);
  await until(snap => snap.mode === 'build', 'build landscape');
  await sleep(600);
  const landscapeBuild = await snapshot();
  report.buildLandscape = landscapeBuild.parts;
  await shot('chime-terraces-build-landscape-844x390');
  await viewport(1280, 800);
  await sleep(400);
  report.buildDesktop = (await snapshot()).parts;
  await shot('chime-terraces-build-desktop-1280x800');
  report.gallery = await qa('return qa.listFoundry().map(card => [card.id, card.section]);');
} finally {
  report.finished = new Date().toISOString();
  report.consoleErrors = consoleErrors;
  await writeFile(resolve(here, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill();
}
const failed = (report.shots ?? []).filter(shot => !shot.match).map(shot => shot.id);
process.stdout.write(`${JSON.stringify({ foundryId: report.foundryId, shots: (report.shots ?? []).map(shot => `${shot.id}:${shot.match ? 'match' : 'DIFF'}`), views: report.views, failed, consoleErrors: consoleErrors.length }, null, 2)}\n`);
if (failed.length || !report.shots) process.exitCode = 1;
