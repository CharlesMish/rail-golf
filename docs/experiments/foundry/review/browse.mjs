// Headless Chrome screenshots of each candidate on its own commit.
// The dev server for that worktree must already be up.
//
//   node docs/experiments/foundry/review/browse.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1 --id the-other-way --out docs/experiments/foundry/review/screenshots
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const url = arg('--url');
const id = arg('--id');
const out = resolve(arg('--out') ?? 'docs/experiments/foundry/review/screenshots');
const port = Number(arg('--port') ?? 9222);
if (!url || !id) throw new Error('Need --url and --id');
await mkdir(out, { recursive: true });

const SUCCESS = {
  'the-other-way': async () => {
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: 0, yaw: -10.5, elevation: 16, charge: 0.55 })})`);
  },
  'open-contacts': async () => {
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: 0, yaw: 6, elevation: 18, charge: 0.55 })})`);
  },
  'right-angle': async () => {
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: 0, yaw: 38.5, elevation: 14.5, charge: 0.86 })})`);
  },
  'the-carry': async () => {
    await evaluate("window.__worldcraftQA.setMode('build')");
    await sleep(300);
    await evaluate("window.__worldcraftQA.placePiece('ramp-yours', { x: 0, z: 36, yaw: 0 })");
    await sleep(300);
    await evaluate("window.__worldcraftQA.setMode('play')");
  },
  'return-address': async () => {
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: -4, yaw: 4, elevation: 13, charge: 0.68 })})`);
  },
  'bell-loft': async () => {
    await evaluate("window.__worldcraftQA.setMode('build')");
    await sleep(300);
    await evaluate("window.__worldcraftQA.placePiece('door', { x: -4, z: 49, yaw: 0 })");
    await sleep(400);
    await evaluate("window.__worldcraftQA.setMode('play')");
  },
};

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1280,800',
  `--user-data-dir=/tmp/chrome-foundry-${id}`,
  url,
], {
  stdio: 'ignore',
  env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' },
});

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
await new Promise(resolve => ws.addEventListener('open', resolve, { once: true }));
function send(method, params = {}) {
  const messageId = ++seq;
  ws.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(messageId, message => {
      pending.delete(messageId);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    });
  });
}
async function evaluate(expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text} ${result.result?.description ?? ''}`);
  return result.result.value;
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 100; i += 1) {
    const snap = await evaluate(`(() => { const qa = window.__worldcraftQA; return qa?.snapshot ? qa.snapshot() : { phase: 'booting' }; })()`);
    last = snap;
    if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
    if (snap?.phase === 'error') throw new Error(snap.notice || 'worldcraft error');
    await sleep(250);
  }
  throw new Error(`Worldcraft did not become ready: ${JSON.stringify(last)?.slice(0, 400)}`);
}
async function png(name) {
  await sleep(350);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: height > width });
  await sleep(400);
}
async function panelText() {
  return evaluate(`(() => {
    const aside = document.querySelector('aside');
    return {
      panel: aside ? aside.innerText : '',
      badge: document.querySelector('span')?.innerText || '',
      musical: (aside?.innerText || '').includes('Musical Workshop'),
    };
  })()`);
}
async function openFoundry() {
  await evaluate(`window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
  for (let i = 0; i < 40; i += 1) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.foundryId === id && (snap.phase === 'ready' || snap.phase === 'result')) return snap;
    await sleep(200);
  }
  throw new Error(`${id} did not open`);
}
async function showGallery() {
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Foundry'); button?.click(); })()`);
  await sleep(400);
}
async function toAddress() {
  const snap = await evaluate('window.__worldcraftQA.snapshot()');
  if (snap.view === 'survey' && snap.phase === 'ready') await evaluate('window.__worldcraftQA.survey()');
  await sleep(250);
}
async function fire(timeoutMs) {
  await evaluate('window.__worldcraftQA.fire()');
  const steps = Math.ceil(timeoutMs / 250);
  for (let i = 0; i < steps; i += 1) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.phase === 'result') return snap;
    if (snap.phase === 'error') throw new Error(snap.notice || 'shot error');
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}
function brief(snap) {
  const last = snap.lastShot;
  return {
    foundryId: snap.foundryId,
    presetId: snap.presetId,
    mode: snap.mode,
    phase: snap.phase,
    view: snap.view,
    notice: snap.notice,
    setup: snap.setup,
    worldName: snap.world?.name,
    objects: snap.world?.objects?.map(object => ({ id: object.id, x: object.x, z: object.z, yaw: object.yaw })),
    terminal: last?.terminal ?? null,
    reason: last?.reason ?? last?.terminal?.reason ?? null,
  };
}

const report = { id, url, shots: {} };
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  const cards = await evaluate('window.__worldcraftQA.listFoundry()');
  if (!Array.isArray(cards) || !cards.some(card => card.id === id)) throw new Error(`This server does not list ${id}: ${JSON.stringify(cards)}`);
  await setViewport(1280, 800);
  await showGallery();
  report.galleryDesktop = await png(`${id}-desktop-gallery`);
  report.galleryText = await evaluate(`document.querySelector('[data-foundry-card=${JSON.stringify(id)}]')?.innerText || document.body.innerText.slice(0, 1500)`);
  await openFoundry();
  report.openingDesktopSurvey = await png(`${id}-desktop-opening`);
  await toAddress();
  report.panelDesktop = await panelText();
  report.openingDesktopAddress = await png(`${id}-desktop-address`);
  const opening = await fire(id === 'bell-loft' ? 40000 : 20000);
  report.shots.opening = brief(opening);
  report.openingDesktopResult = await png(`${id}-desktop-opening-result`);
  await SUCCESS[id]();
  const placed = await evaluate('window.__worldcraftQA.snapshot()');
  report.shots.beforeSuccess = brief(placed);
  const success = await fire(id === 'bell-loft' ? 90000 : 20000);
  report.shots.success = brief(success);
  report.successDesktop = await png(`${id}-desktop-success`);
  report.panelSuccess = await panelText();
  if (id === 'bell-loft') {
    await evaluate('window.__worldcraftQA.survey()');
    await sleep(500);
    report.successDesktopSurvey = await png(`${id}-desktop-success-survey`);
  }

  await setViewport(390, 844);
  await openFoundry();
  await toAddress();
  report.panelPhone = await panelText();
  report.openingPhone = await png(`${id}-phone-opening`);
  await fire(id === 'bell-loft' ? 40000 : 20000);
  await SUCCESS[id]();
  await fire(id === 'bell-loft' ? 90000 : 20000);
  report.successPhone = await png(`${id}-phone-success`);
  if (id === 'bell-loft') {
    await evaluate('window.__worldcraftQA.survey()');
    await sleep(500);
    report.successPhoneSurvey = await png(`${id}-phone-success-survey`);
  }
  await writeFile(`${out}/${id}-browser.json`, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, id, terminal: report.shots.success.terminal, musicalDesktop: report.panelDesktop.musical, musicalPhone: report.panelPhone.musical })}\n`);
} finally {
  chrome.kill('SIGKILL');
  try { ws.close(); } catch { /* already gone */ }
}
