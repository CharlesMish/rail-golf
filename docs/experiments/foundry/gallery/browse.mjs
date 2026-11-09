// Headless screenshots of the unified Foundry gallery.
// The dev server must already be up.
//
//   node docs/experiments/foundry/gallery/browse.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const url = arg('--url');
const only = arg('--only');
const out = resolve(arg('--out') ?? 'docs/experiments/foundry/gallery/screenshots');
const port = Number(arg('--port') ?? 9222);
if (!url) throw new Error('Need --url');
await mkdir(out, { recursive: true });

const VIEWPORTS = [
  ['desktop', 1280, 800],
  ['portrait', 390, 844],
  ['landscape', 844, 390],
];

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-foundry-gallery',
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
  for (let i = 0; i < 120; i += 1) {
    const snap = await evaluate(`(() => { const qa = window.__worldcraftQA; return qa?.snapshot ? qa.snapshot() : { phase: 'booting' }; })()`);
    last = snap;
    if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
    if (snap?.phase === 'error') throw new Error(snap.notice || 'worldcraft error');
    await sleep(250);
  }
  throw new Error(`Worldcraft did not become ready: ${JSON.stringify(last)?.slice(0, 500)}`);
}
async function revealPresentation() {
  await evaluate(`(() => {
    const node = document.querySelector('[data-resting], [data-carriage], [data-return], [data-note-timelines], [data-sound-ab]');
    node?.scrollIntoView({ block: 'center' });
  })()`);
  await sleep(200);
}
async function png(name) {
  await sleep(400);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
async function setViewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: height > width });
  await sleep(450);
}
async function openFoundry(id) {
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
  let settling = false;
  await evaluate('window.__worldcraftQA.fire()');
  const steps = Math.ceil(timeoutMs / 250);
  for (let i = 0; i < steps; i += 1) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.notice === 'Still settling. The line has not ended.') settling = true;
    if (snap.phase === 'result') return { snap, settling };
    if (snap.phase === 'error') throw new Error(snap.notice || 'shot error');
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}
function panel() {
  return evaluate(`(() => {
    const card = document.querySelector('[data-foundry-play]');
    const invite = document.querySelector('[data-foundry-invite]');
    const style = invite ? getComputedStyle(invite).display : null;
    return {
      heading: card?.querySelector('strong')?.textContent ?? '',
      invitation: card?.querySelector('p')?.textContent ?? '',
      rules: card?.querySelector('[data-foundry-rules]')?.textContent ?? '',
      inviteDisplay: style,
      inviteText: invite?.textContent ?? '',
      bankSound: Boolean(document.querySelector('[data-sound-ab]')),
      timeline: Boolean(document.querySelector('[data-note-timelines]')),
      musicalHeading: card?.querySelector('strong')?.textContent === 'Musical Workshop',
      resting: document.querySelector('[data-resting]')?.textContent ?? '',
      carriage: document.querySelector('[data-carriage]')?.textContent ?? '',
      returned: document.querySelector('[data-return]')?.textContent ?? '',
      notice: document.querySelector('aside [role="status"]')?.textContent ?? '',
    };
  })()`);
}

const report = { url, gallery: {}, worlds: {} };
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  const cards = await evaluate('window.__worldcraftQA.listFoundry()');
  report.cards = cards.map(card => ({ id: card.id, section: card.section, name: card.name }));
  if (!only) {
    for (const [label, width, height] of VIEWPORTS) {
      await setViewport(width, height);
      await showGallery();
      report.gallery[label] = await png(`gallery-${label}-${width}x${height}`);
    }
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Close'); button?.click(); })()`);
  }

  const featured = ['bell-loft', 'return-address', 'right-angle', 'open-contacts'].filter(id => !only || id === only);
  for (const id of featured) {
    report.worlds[id] = { viewports: {} };
    for (const [label, width, height] of VIEWPORTS) {
      await setViewport(width, height);
      await openFoundry(id);
      const opening = await png(`${id}-opening-${label}-${width}x${height}`);
      const openingPanel = await panel();
      await toAddress();
      let successPanel = null;
      let success = null;
      let settling = false;
      if (id === 'bell-loft') {
        await evaluate("window.__worldcraftQA.setMode('build')");
        await sleep(250);
        await evaluate("window.__worldcraftQA.placePiece('door', { x: -4, z: 49, yaw: 0 })");
        await sleep(300);
        await evaluate("window.__worldcraftQA.setMode('play')");
        await sleep(200);
        const fired = await fire(90000);
        settling = fired.settling;
        success = fired.snap;
      } else if (id === 'return-address') {
        await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: -4, yaw: 4, elevation: 13, charge: 0.68 })})`);
        const fired = await fire(20000);
        success = fired.snap;
      } else if (id === 'right-angle') {
        await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: 0, yaw: 38.5, elevation: 14.5, charge: 0.86 })})`);
        const fired = await fire(20000);
        success = fired.snap;
      } else if (id === 'open-contacts') {
        await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify({ originX: 0, yaw: 6, elevation: 18, charge: 0.55 })})`);
        const fired = await fire(20000);
        success = fired.snap;
      }
      successPanel = await panel();
      await revealPresentation();
      const successFile = await png(`${id}-success-${label}-${width}x${height}`);
      report.worlds[id].viewports[label] = {
        opening,
        success: successFile,
        openingPanel,
        successPanel,
        view: success?.view ?? null,
        reason: success?.lastShot?.terminal?.reason ?? null,
        settling,
      };
    }
  }

  for (const id of ['the-carry', 'the-other-way', 'soft-landing'].filter(id => !only)) {
    await setViewport(1280, 800);
    await openFoundry(id);
    const openingPanel = await panel();
    let successPanel = null;
    if (id === 'the-carry') {
      await evaluate("window.__worldcraftQA.setMode('build')");
      await sleep(250);
      await evaluate("window.__worldcraftQA.placePiece('ramp-yours', { x: 0, z: 36, yaw: 0 })");
      await sleep(250);
      await evaluate("window.__worldcraftQA.setMode('play')");
      await fire(20000);
      successPanel = await panel();
    } else if (id === 'the-other-way') {
      await toAddress();
      await fire(20000);
      successPanel = await panel();
    }
    report.worlds[id] = { openingPanel, successPanel, opening: await png(`${id}-desktop-1280x800`) };
  }

  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    cards: report.cards,
    files: Object.values(report.gallery),
    worlds: Object.fromEntries(Object.entries(report.worlds).map(([id, entry]) => [id, entry.viewports
      ? Object.fromEntries(Object.entries(entry.viewports).map(([label, shot]) => [label, {
        heading: shot.successPanel.heading,
        rules: shot.successPanel.rules,
        resting: shot.successPanel.resting,
        carriage: shot.successPanel.carriage,
        returned: shot.successPanel.returned,
        bankSound: shot.successPanel.bankSound,
        timeline: shot.successPanel.timeline,
        musicalHeading: shot.successPanel.musicalHeading,
        inviteDisplay: shot.openingPanel.inviteDisplay,
        view: shot.view,
        reason: shot.reason,
        settling: shot.settling,
        notice: shot.successPanel.notice.slice(0, 180),
      }]))
      : { rules: entry.openingPanel.rules, notice: entry.successPanel?.notice?.slice(0, 180) ?? null }])),
  }, null, 2));
} finally {
  ws.close();
  chrome.kill();
}
