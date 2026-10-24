// Headed-or-headless Chrome check for the range selector, Open Workshop
// two-trail comparison, and 20 preset load / rebuild / save-reload cycles.
// The dev server must already be serving /lab/worldcraft.
//
//   node scripts/range/browser-check.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1 --out /tmp/range-browser
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? '/tmp/range-browser';
const port = Number(arg('--port') ?? 9222);
await mkdir(out, { recursive: true });

// Call chrome-stable directly. The google-chrome wrapper forces
// --use-angle=swiftshader, which drops the WebGL backend this lab needs.
const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-range-profile',
  url,
], {
  stdio: 'ignore',
  // sites-env points HOME and TMPDIR at the repo. SwiftShader then has no GL,
  // and Chrome temp files reload the Vite page.
  env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' },
});

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function target() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(item => item.type === 'page' && item.url?.includes('/lab/worldcraft') && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* chrome still booting */ }
    await sleep(250);
  }
  throw new Error('Chrome did not open the Worldcraft lab');
}
function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}
function summarize(frames) {
  const body = frames.slice(1);
  return { samples: body.length, medianMs: percentile(body, .5), p95Ms: percentile(body, .95), maxMs: Math.max(...body) };
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
function send(method, params = {}) {
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
async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  return result.result.value;
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 80; i++) {
    try {
      const snap = await evaluate(`(() => {
        const qa = window.__worldcraftQA;
        if (qa?.snapshot) return qa.snapshot();
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        return { phase: 'booting', href: location.href, qa: typeof qa, webgl: gl ? gl.getParameter(gl.RENDERER) : 'no-gl', text: (document.body?.innerText || '').slice(0, 180) };
      })()`);
      last = snap;
      if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
      if (snap?.phase === 'error') throw new Error(snap.notice);
    } catch (error) {
      last = String(error);
    }
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready: ' + JSON.stringify(last));
}
async function shot() {
  await evaluate('window.__worldcraftQA.fire()');
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.phase === 'result' && snap.shotRecord?.bindingHash) return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}
async function png(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  const house = await waitReady();
  const selector = await png('range-selector');
  await evaluate("window.__worldcraftQA.enterPreset('open-workshop')");
  const opened = await waitReady();
  if (opened.presetId !== 'open-workshop' || opened.goal?.kind !== 'none') throw new Error('Open Workshop did not load: ' + opened.notice);
  const beforeFrames = summarize(await evaluate('window.__worldcraftQA.sampleFrames(30)', true));
  const before = { frames: beforeFrames, memory: await evaluate('window.__worldcraftQA.memory()'), diagnostics: opened.diagnostics ?? (await evaluate('window.__worldcraftQA.snapshot()')).diagnostics, voices: (await evaluate('window.__worldcraftQA.snapshot()')).voices };
  await evaluate("window.__worldcraftQA.setMode('play')");
  const first = await shot();
  await evaluate("window.__worldcraftQA.setMode('build')");
  await evaluate("window.__worldcraftQA.selectPiece('ramp-yours')");
  await evaluate('window.__worldcraftQA.nudgeYaw(5)');
  const edited = await waitReady();
  if (edited.world.objects.find(object => object.id === 'ramp-yours').yaw !== 5) throw new Error('Ramp yaw did not change');
  await evaluate("window.__worldcraftQA.setMode('play')");
  const second = await shot();
  const sameTrail = JSON.stringify(second.comparison?.points) === JSON.stringify(first.trail.points);
  const movedTrail = JSON.stringify(second.trail.points) !== JSON.stringify(first.trail.points);
  const recorded = JSON.stringify(second.comparison?.points) === JSON.stringify(first.shotRecord.points);
  if (!sameTrail || !movedTrail || !recorded) {
    throw new Error(JSON.stringify({ sameTrail, movedTrail, recorded, meshes: second.visibleTrailMeshes, notice: second.notice }));
  }
  if (second.shotRecord.outcome.scored !== false || second.shotRecord.outcome.kind !== 'none') throw new Error('Open Workshop scored a shot');
  if (!second.visibleTrailMeshes.includes('worldcraft-before-line') || !second.visibleTrailMeshes.includes('worldcraft-actual-line')) {
    throw new Error('Both trails were not on screen: ' + second.visibleTrailMeshes.join(','));
  }
  await evaluate('window.__worldcraftQA.survey()');
  await sleep(400);
  const compare = await png('open-workshop-two-trail');
  const cycles = [];
  for (let i = 0; i < 20; i++) {
    await evaluate('window.__worldcraftQA.resetPreset()');
    await waitReady();
    const saved = await evaluate('window.__worldcraftQA.saveReload()');
    if (!saved?.ok) throw new Error('Save/reload failed: ' + JSON.stringify(saved));
    cycles.push({ rebuilds: saved.rebuilds, rebuildMs: saved.rebuildMs, staticBodies: saved.diagnostics.staticBodies, physicsBodies: saved.diagnostics.physicsBodies });
  }
  const afterSnap = await evaluate('window.__worldcraftQA.snapshot()');
  const afterFrames = summarize(await evaluate('window.__worldcraftQA.sampleFrames(30)', true));
  const report = {
    url, selector, compare, house: { presetId: house.presetId, staticBodies: house.diagnostics.staticBodies, physicsBodies: house.diagnostics.physicsBodies },
    before: { ...before, presetId: opened.presetId, staticBodies: opened.diagnostics.staticBodies, physicsBodies: opened.diagnostics.physicsBodies },
    trails: { sameTrail, movedTrail, recorded, meshes: second.visibleTrailMeshes, outcome: second.shotRecord.outcome, bindingHash: second.shotRecord.bindingHash, presetHash: second.shotRecord.presetHash },
    cycles,
    after: { frames: afterFrames, memory: await evaluate('window.__worldcraftQA.memory()'), diagnostics: afterSnap.diagnostics, voices: afterSnap.voices },
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
