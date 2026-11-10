// Headless Chrome check of Descending Resonance in the real lab page.
// The dev server must already be serving /lab/worldcraft.
//
//   node docs/experiments/foundry/descending-resonance/repro/browser-check.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
//
// It opens both new worlds from the Foundry, fires the tested shots with the page's
// own controls, compares the browser's contact order with the manifest, records
// which pieces fall inside the canvas in each view, and counts bodies, meshes,
// materials, and audio nodes across repeated load and fire cycles.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../..');
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = resolve(arg('--out') ?? resolve(here, '../screenshots'));
const port = Number(arg('--port') ?? 9333);
await mkdir(out, { recursive: true });
const sleep = ms => new Promise(done => setTimeout(done, ms));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required',
  `--remote-debugging-port=${port}`, '--window-size=1280,800', `--user-data-dir=/tmp/chrome-descending-${port}`, url,
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
  return { build: s.build, mode: s.mode, phase: s.phase, view: s.view, foundryId: s.foundryId, notice: s.notice, setup: s.setup, diagnostics: s.diagnostics, voices: s.voices, audio: s.audio,
    canvas: { left: canvas.left, top: canvas.top, right: canvas.right, bottom: canvas.bottom },
    projected: s.projectedObjects,
    last: s.lastShot ? { contacts: s.lastShot.contacts.map(row => row.body), terminal: s.lastShot.terminal, notes: (s.lastShot.resonance?.impacts ?? []).map(i => i.piece) } : null,
    timeline: [...document.querySelectorAll('[data-note-row], [data-timeline-note]')].length };`);
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
/** Which piece centres fall inside the canvas rectangle in the current view. */
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

const report = { url, started: new Date().toISOString(), worlds: {}, consoleErrors };
try {
  await until(snap => snap.phase === 'ready', 'lab ready');
  for (const id of ['descending-resonance', 'descending-resonance-flat']) {
    const manifest = JSON.parse(await readFile(resolve(root, `worlds/foundry/${id}/manifest.json`), 'utf8'));
    const entry = { views: {}, shots: [], cycles: [] };
    await viewport(1280, 800);
    const opened = await play(id);
    entry.build = opened.build;
    for (const [name, width, height] of [['desktop', 1280, 800], ['portrait', 390, 844], ['landscape', 844, 390]]) {
      await viewport(width, height);
      // Two captures per size: the view the world opens in, then the other one. Files are named by the view the page reports.
      for (let pass = 0; pass < 2; pass += 1) {
        await sleep(1100);
        const snap = await snapshot();
        entry.views[`${snap.view}-${name}`] = visibility(snap);
        await shot(`${id}-${snap.view}-${name}-${width}x${height}`);
        await qa('qa.survey(); return true;');
      }
      await sleep(500);
    }
    await viewport(1280, 800);
    await play(id);
    for (const tested of manifest.testedShots) {
      const result = await fire(tested.setup);
      const expected = tested.contacts ?? [];
      const actual = result.last.contacts.filter(body => body !== 'worldcraft-ground');
      entry.shots.push({
        id: tested.id,
        contactsMatchManifest: JSON.stringify(actual) === JSON.stringify(expected),
        terminalMatchesManifest: result.last.terminal.reason === tested.terminal.reason && Object.is(result.last.terminal.elapsed, tested.terminal.elapsed) && result.last.terminal.position.every((value, index) => Object.is(value, tested.terminal.position[index])),
        notes: result.last.notes,
        seconds: result.last.terminal.elapsed,
        audioNodes: result.voices,
        audioState: result.audio,
      });
      if (['descent', 'skip-to-crown', 'wall-and-row'].includes(tested.id)) {
        await sleep(500);
        await shot(`${id}-${tested.id}-desktop-1280x800`);
        await viewport(390, 844); await sleep(600); await shot(`${id}-${tested.id}-portrait-390x844`);
        await viewport(1280, 800); await sleep(400);
      }
    }
    // Load, fire, and leave twenty times. Static bodies, meshes, materials, and textures must come back to the same counts.
    for (let cycle = 0; cycle < 20; cycle += 1) {
      await play(cycle % 2 ? 'ricochet-garden-loop' : id);
      const result = await fire(manifest.testedShots[1].setup);
      entry.cycles.push({ staticBodies: result.diagnostics.staticBodies, physicsBodies: result.diagnostics.physicsBodies, meshes: result.diagnostics.meshes, materials: result.diagnostics.materials, textures: result.diagnostics.textures, audioActive: result.voices.active });
    }
    const own = entry.cycles.filter((_, index) => index % 2 === 0);
    entry.cyclesStable = own.every(item => item.staticBodies === own[0].staticBodies && item.meshes === own[0].meshes && item.materials === own[0].materials && item.textures === own[0].textures);
    entry.cycleCounts = { first: own[0], last: own.at(-1) };
    delete entry.cycles;
    report.worlds[id] = entry;
  }
} finally {
  report.finished = new Date().toISOString();
  await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill();
}
process.stdout.write(`${JSON.stringify({ build: Object.values(report.worlds)[0]?.build, worlds: Object.fromEntries(Object.entries(report.worlds).map(([id, entry]) => [id, { shots: entry.shots.map(item => `${item.id}:${item.contactsMatchManifest && item.terminalMatchesManifest ? 'match' : 'DIFF'}`), cyclesStable: entry.cyclesStable, views: entry.views }])), consoleErrors: consoleErrors.length }, null, 2)}\n`);
