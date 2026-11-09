// SwiftShader check for The Carry. The dev server must already be up.
// Screenshots are the opening and the gallery. A moved ramp is fired and then reset.
//
//   node scripts/foundry/construction-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = resolve(import.meta.dirname, '../../docs/experiments/foundry/lanes/construction/screenshots');
const port = Number(arg('--port') ?? 9223);
await mkdir(out, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-carry-profile',
  url,
], {
  stdio: 'ignore',
  env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' },
});

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(resolveSleep => setTimeout(resolveSleep, ms));
async function target() {
  for (let i = 0; i < 80; i++) {
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
await new Promise(resolveOpen => ws.addEventListener('open', resolveOpen, { once: true }));
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveSend, reject) => {
    pending.set(id, message => {
      pending.delete(id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolveSend(message.result);
    });
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  return result.result.value;
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate(`(() => window.__worldcraftQA ? window.__worldcraftQA.snapshot() : { phase: 'booting' })()`);
    last = snap;
    if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
    if (snap?.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready: ' + JSON.stringify(last));
}
async function png(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
  await sleep(400);
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Foundry'); if (!button) throw new Error('no foundry button'); button.click(); return true; })()`);
  await sleep(500);
  const galleryText = await evaluate(`document.querySelector('[data-foundry-card="the-carry"]')?.innerText ?? ''`);
  if (!galleryText.includes('The Carry') || !galleryText.includes('Launcher fixed') || !galleryText.includes('Workshop')) {
    throw new Error('Gallery card missing: ' + galleryText);
  }
  if (/\d/.test(galleryText.split('\n')[1] ?? '')) throw new Error('Invitation shows a number: ' + galleryText);
  await viewport(1400, 900);
  const desktopGallery = await png('desktop-gallery');
  await viewport(390, 844);
  const phoneGallery = await png('phone-gallery');

  await evaluate(`window.__worldcraftQA.playFoundry('the-carry')`);
  const opened = await waitReady();
  if (opened.foundryId !== 'the-carry' || opened.goal?.r !== 2.5) throw new Error('The Carry did not open: ' + JSON.stringify({ id: opened.foundryId, goal: opened.goal, notice: opened.notice }));
  if (opened.mode !== 'play' || opened.view !== 'survey') throw new Error('Play did not open Survey');
  const aimHidden = await evaluate(`document.querySelector('[aria-label="Power"]') === null && document.querySelector('[aria-label="Yaw"]') === null`);
  if (!aimHidden) throw new Error('Aim controls are visible on the fixed rail');
  await viewport(1400, 900);
  await sleep(600);
  const desktopPlay = await png('desktop-play');
  await viewport(390, 844);
  await sleep(400);
  const phonePlay = await png('phone-play');

  await viewport(1400, 900);
  await evaluate(`window.__worldcraftQA.fire()`);
  let miss = null;
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate(`window.__worldcraftQA.snapshot()`);
    if (snap.phase === 'result') { miss = snap; break; }
    await sleep(200);
  }
  if (!miss?.lastShot || miss.lastShot.terminal?.reason !== 'first-ground-contact') throw new Error('Opening shot did not land');
  const missDistance = Math.hypot(miss.lastShot.terminal.position[0], miss.lastShot.terminal.position[2] - 53);
  if (miss.lastShot.goalResult?.status !== 'miss' || missDistance < 10) throw new Error('Opening was not a clear miss: ' + missDistance);

  await evaluate(`window.__worldcraftQA.setMode('build')`);
  await waitReady();
  await evaluate(`window.__worldcraftQA.placePiece('ramp-yours', { x: 0, z: 32, yaw: 0 })`);
  const placed = await waitReady();
  const placedRamp = placed.world.objects.find(object => object.id === 'ramp-yours');
  if (!placedRamp || placedRamp.z !== 32) throw new Error('Ramp did not move: ' + JSON.stringify(placedRamp));
  await evaluate(`window.__worldcraftQA.setMode('play')`);
  await waitReady();
  await evaluate(`window.__worldcraftQA.fire()`);
  let clear = null;
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate(`window.__worldcraftQA.snapshot()`);
    if (snap.phase === 'result') { clear = snap; break; }
    await sleep(200);
  }
  if (clear?.lastShot?.goalResult?.status !== 'clear') throw new Error('Moved ramp did not clear: ' + JSON.stringify(clear?.notice));

  await evaluate(`window.__worldcraftQA.resetFoundry('the-carry')`);
  const reset = await waitReady();
  const ramp = reset.world.objects.find(object => object.id === 'ramp-yours');
  if (!ramp || ramp.z !== 18 || ramp.yaw !== 0) throw new Error('Reset did not restore the ramp: ' + JSON.stringify(ramp));

  const beforeRemix = await evaluate(`window.__worldcraftQA.snapshot().memory.worldCount`);
  await evaluate(`window.__worldcraftQA.remixFoundry('the-carry')`);
  await sleep(300);
  const after = await evaluate(`(() => { const snap = window.__worldcraftQA.snapshot(); return { foundryId: snap.foundryId, worldCount: snap.memory.worldCount, notice: snap.notice, rampZ: snap.world.objects.find(object => object.id === 'ramp-yours')?.z ?? null }; })()`);
  if (after.foundryId !== 'the-carry') throw new Error('Remix rewrote the foundry id');
  if (after.worldCount !== beforeRemix + 1) throw new Error('Remix did not save a separate world: ' + JSON.stringify(after));
  if (after.rampZ !== 18) throw new Error('Remix moved the foundry ramp');

  const report = {
    desktopGallery, desktopPlay, phoneGallery, phonePlay,
    gallery: galleryText.split('\n').slice(0, 4),
    opening: { status: miss.lastShot.goalResult.status, distance: missDistance, view: 'survey', aimHidden },
    movedClear: clear.lastShot.goalResult.status,
    resetZ: ramp.z,
    remixFoundryId: after.foundryId,
    worldsBefore: beforeRemix,
    worldsAfter: after.worldCount,
    notice: after.notice,
  };
  await writeFile(`${out}/browser-check.json`, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
