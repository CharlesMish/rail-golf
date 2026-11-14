// Headless Chrome check of Chime Fan in the lab page.
// The dev server must already be serving /lab/worldcraft.
//
//   node docs/experiments/chime-terraces/b-fan/repro/browser-check.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
//
// Fires every tested shot with the page's own controls and compares the contact
// order and the terminal with the manifest. Screenshots go to /opt/cursor/artifacts.
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = '/opt/cursor/artifacts';
const port = Number(arg('--port') ?? 9341);
const sleep = ms => new Promise(done => setTimeout(done, ms));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${port}`, '--window-size=1280,800', `--user-data-dir=/tmp/chrome-chime-fan-${port}`, url,
], { stdio: 'ignore' });

async function target() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(item => item.type === 'page' && item.url?.includes('/lab/worldcraft') && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* chrome still booting */ }
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
  if (message.id && pending.has(message.id)) { const { done, fail } = pending.get(message.id); pending.delete(message.id); if (message.error) fail(new Error(message.error.message)); else done(message.result); }
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
  return { build: s.build, mode: s.mode, phase: s.phase, view: s.view, foundryId: s.foundryId, notice: s.notice, setup: s.setup, diagnostics: s.diagnostics,
    canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom, width: canvas.width, height: canvas.height },
    projected: s.projectedObjects,
    pieceList: typeof qa.pieceList === 'function' ? qa.pieceList() : null,
    last: s.lastShot ? { contacts: s.lastShot.contacts.map(row => row.body), terminal: s.lastShot.terminal, notes: (s.lastShot.resonance?.impacts ?? []).filter(i => i.gain > 0).map(i => i.piece + ':' + i.note) } : null };`);
async function until(test, label, limit = 240) {
  for (let i = 0; i < limit; i += 1) { const snap = await snapshot(); if (snap && test(snap)) return snap; await sleep(250); }
  throw new Error(`Timed out: ${label}`);
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
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
async function play(id) {
  await qa(`qa.playFoundry(${JSON.stringify(id)}); return true;`);
  return until(snap => snap.foundryId === id && snap.mode === 'play' && snap.phase === 'ready', `play ${id}`);
}
async function fire(setup) {
  const before = await snapshot();
  if (before.phase === 'result') { await qa('qa.ready(); return true;'); await until(snap => snap.phase === 'ready', 'ready'); }
  await qa(`qa.setShot(${JSON.stringify(setup)}); return true;`);
  await sleep(120);
  await qa('qa.fire(); return true;');
  return until(snap => snap.phase === 'result', `result for ${JSON.stringify(setup)}`);
}

const manifest = JSON.parse(await readFile(resolve(root, 'worlds/foundry/chime-fan/manifest.json'), 'utf8'));
const report = { url, started: new Date().toISOString(), views: {}, shots: [], pieceList: {}, consoleErrors };
try {
  await until(snap => snap.phase === 'ready', 'lab ready');
  await viewport(1280, 800);
  const opened = await play('chime-fan');
  report.build = opened.build;
  for (const [name, width, height] of [['desktop', 1280, 800], ['portrait', 390, 844], ['landscape', 844, 390]]) {
    await viewport(width, height);
    await sleep(900);
    const snap = await snapshot();
    report.views[name] = { ...visibility(snap), view: snap.view, canvas: snap.canvas };
    report.pieceList[name] = snap.pieceList;
    await shot(`chime-fan-${name}-${width}x${height}`);
  }
  await viewport(1280, 800);
  await play('chime-fan');
  for (const tested of manifest.testedShots) {
    const result = await fire(tested.setup);
    const expected = tested.contacts ?? [];
    const actual = result.last.contacts.filter(body => body !== 'worldcraft-ground');
    const entry = {
      id: tested.id,
      contactsMatchManifest: JSON.stringify(actual) === JSON.stringify(expected),
      terminalMatchesManifest: result.last.terminal.reason === tested.terminal.reason && Object.is(result.last.terminal.elapsed, tested.terminal.elapsed) && result.last.terminal.position.every((value, index) => Object.is(value, tested.terminal.position[index])),
      notes: result.last.notes,
      view: result.view,
    };
    report.shots.push(entry);
    if (tested.id === 'west' || tested.id === 'opening') {
      await sleep(400);
      await shot(`chime-fan-${tested.id}-desktop-1280x800`);
      await viewport(390, 844);
      await sleep(500);
      await shot(`chime-fan-${tested.id}-portrait-390x844`);
      await viewport(1280, 800);
      await sleep(300);
    }
  }
} finally {
  report.finished = new Date().toISOString();
  await writeFile(resolve(here, '../raw/browser-check.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill();
}
const bad = report.shots.filter(item => !item.contactsMatchManifest || !item.terminalMatchesManifest);
process.stdout.write(`${JSON.stringify({ build: report.build, shots: report.shots, views: report.views, errors: consoleErrors.length, bad: bad.length }, null, 2)}\n`);
if (bad.length || consoleErrors.length) process.exitCode = 1;
