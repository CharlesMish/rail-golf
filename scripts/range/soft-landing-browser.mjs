// Headless Chrome check for Soft Landing: the opening preset, a two-trail
// comparison of the fragile and forgiving shots, and save/import/refire.
// The dev server must already be serving /lab/worldcraft.
//
//   node scripts/range/soft-landing-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1 --out docs/experiments/range/appendix/soft-landing
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? 'docs/experiments/range/appendix/soft-landing';
const port = Number(arg('--port') ?? 9223);
await mkdir(out, { recursive: true });
const forgivingText = await readFile(new URL('../../docs/experiments/range/appendix/soft-landing/forgiving.json', import.meta.url), 'utf8');

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-soft-landing-profile',
  url,
], {
  stdio: 'ignore',
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
    const snap = await evaluate(`(() => {
      const qa = window.__worldcraftQA;
      if (qa?.snapshot) return qa.snapshot();
      return { phase: 'booting' };
    })()`);
    last = snap;
    if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
    if (snap?.phase === 'error') throw new Error(snap.notice);
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
  const image = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(image.data, 'base64'));
  return file;
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  await evaluate("window.__worldcraftQA.enterPreset('soft-landing')");
  const opened = await waitReady();
  if (opened.presetId !== 'soft-landing' || opened.goal?.kind !== 'first-ground-zone') throw new Error('Soft Landing did not load: ' + opened.notice);
  if (opened.world.rules?.rail !== null) throw new Error('Soft Landing locked the rail');
  await evaluate("window.__worldcraftQA.camera('home')");
  await sleep(300);
  const preset = await png('soft-landing-preset');
  await evaluate("window.__worldcraftQA.setMode('play')");
  await evaluate('window.__worldcraftQA.setShot({ originX: 0, yaw: 0, elevation: 25, charge: 0.61 })');
  const fragile = await shot();
  if (fragile.shotRecord.outcome.scored !== true) throw new Error('Fragile shot missed: ' + JSON.stringify(fragile.shotRecord.outcome));
  await evaluate("window.__worldcraftQA.setMode('build')");
  await waitReady();
  await evaluate("window.__worldcraftQA.placePiece('backstop', { x: 0, z: 69, yaw: 0 })");
  const placed = await waitReady();
  const block = placed.world.objects.find(object => object.id === 'backstop');
  if (block.x !== 0 || block.z !== 69 || block.yaw !== 0) throw new Error('Backstop was not placed: ' + JSON.stringify(block));
  await evaluate("window.__worldcraftQA.setMode('play')");
  await evaluate('window.__worldcraftQA.setShot({ originX: 0, yaw: 0, elevation: 25, charge: 0.66 })');
  const forgiving = await shot();
  if (forgiving.shotRecord.outcome.scored !== true) throw new Error('Forgiving shot missed: ' + JSON.stringify(forgiving.shotRecord.outcome));
  if (!forgiving.shotRecord.contacts.some(contact => contact.body === 'worldcraft-object-backstop')) throw new Error('Forgiving shot missed the block');
  const sameTrail = JSON.stringify(forgiving.comparison?.points) === JSON.stringify(fragile.shotRecord.points);
  const movedTrail = JSON.stringify(forgiving.trail.points) !== JSON.stringify(fragile.shotRecord.points);
  if (!sameTrail || !movedTrail) throw new Error(JSON.stringify({ sameTrail, movedTrail }));
  if (!forgiving.visibleTrailMeshes.includes('worldcraft-before-line') || !forgiving.visibleTrailMeshes.includes('worldcraft-actual-line')) {
    throw new Error('Both trails were not on screen: ' + forgiving.visibleTrailMeshes.join(','));
  }
  await evaluate('window.__worldcraftQA.survey()');
  await evaluate("window.__worldcraftQA.camera('home')");
  await sleep(500);
  const comparison = await png('soft-landing-comparison');
  const saved = await evaluate('window.__worldcraftQA.saveReload()');
  if (!saved?.ok || saved.diagnostics.staticBodies < 4) throw new Error('Save/reload failed: ' + JSON.stringify(saved));
  await evaluate('window.__worldcraftQA.importText(' + JSON.stringify(forgivingText) + ')');
  const imported = await waitReady();
  if (imported.world.objects.find(object => object.id === 'backstop').z !== 69) throw new Error('Import did not restore the forgiving block');
  if (imported.setup.charge !== 0.66 || imported.setup.elevation !== 25) throw new Error('Import did not restore the forgiving aim: ' + JSON.stringify(imported.setup));
  await evaluate("window.__worldcraftQA.setMode('play')");
  const first = await shot();
  await evaluate('window.__worldcraftQA.importText(' + JSON.stringify(forgivingText) + ')');
  await waitReady();
  await evaluate("window.__worldcraftQA.setMode('play')");
  const second = await shot();
  if (first.shotRecord.outcome.scored !== true || second.shotRecord.outcome.scored !== true) throw new Error('Imported refire missed');
  if (JSON.stringify(first.shotRecord.terminal) !== JSON.stringify(second.shotRecord.terminal)) throw new Error('Refire terminal changed');
  if (first.shotRecord.bindingHash !== second.shotRecord.bindingHash) throw new Error('Refire binding changed');
  const report = {
    preset, comparison,
    opening: { presetId: opened.presetId, goal: opened.goal, rail: opened.world.rules.rail, setup: opened.setup },
    fragile: { outcome: fragile.shotRecord.outcome, terminal: fragile.shotRecord.terminal },
    forgiving: { outcome: forgiving.shotRecord.outcome, terminal: forgiving.shotRecord.terminal, meshes: forgiving.visibleTrailMeshes, sameTrail, movedTrail },
    saveReload: saved,
    refire: { scored: true, terminal: second.shotRecord.terminal, bindingHash: second.shotRecord.bindingHash, presetHash: second.shotRecord.presetHash },
  };
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
