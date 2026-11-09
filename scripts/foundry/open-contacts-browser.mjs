// SwiftShader frames for Open Contacts. The dev server must already be up.
// These are not a phone and not a desktop GPU.
//
//   node scripts/foundry/open-contacts-browser.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const out = arg('--out') ?? 'docs/experiments/foundry/lanes/expressive/screenshots';
const port = Number(arg('--port') ?? 9228);
await mkdir(out, { recursive: true });

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1400,900',
  '--user-data-dir=/tmp/chrome-open-contacts-profile', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function target() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find(item => item.type === 'page' && item.url?.includes('/lab/worldcraft') && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch { /* booting */ }
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
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  return result.result.value;
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 80; i += 1) {
    const snap = await evaluate('(() => { const qa = window.__worldcraftQA; if (!qa?.snapshot) return { phase: "booting" }; const state = qa.snapshot(); return { phase: state.phase, presetId: state.presetId, foundryId: state.foundryId, notice: state.notice, goal: state.goal, view: state.view, mode: state.mode, editLock: state.editLock }; })()');
    last = snap;
    const enabled = await evaluate('Boolean([...document.querySelectorAll("button")].find(item => item.textContent.trim() === "Foundry" && !item.disabled))');
    if ((snap?.phase === 'ready' || snap?.phase === 'result') && enabled) return snap;
    if (snap?.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready: ' + JSON.stringify(last));
}
async function png(name) {
  await sleep(600);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
async function openGallery() {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Foundry' && !item.disabled);
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) {
    const labels = await evaluate('[...document.querySelectorAll("button")].map(item => ({ text: item.textContent.trim(), disabled: item.disabled }))');
    throw new Error('Foundry button was not clicked: ' + JSON.stringify(labels));
  }
  for (let i = 0; i < 20; i += 1) {
    const card = await evaluate('Boolean(document.querySelector("[data-foundry-card=open-contacts]"))');
    if (card) return;
    await sleep(200);
  }
  throw new Error('Open Contacts card did not appear');
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  await openGallery();
  const desktopGallery = await png('desktop-gallery');
  await evaluate('window.__worldcraftQA.playFoundry("open-contacts")');
  const played = await waitReady();
  if (played.presetId !== 'open-contacts') throw new Error('Open Contacts did not load: ' + played.notice);
  if (played.goal?.kind !== 'none') throw new Error('Open Contacts set a goal');
  const desktopPlay = await png('desktop-play');
  const fired = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Fire line' && !item.disabled);
    if (!button) return 'no-fire';
    button.click();
    return 'clicked';
  })()`);
  if (fired !== 'clicked') throw new Error('Fire line was not clicked: ' + fired);
  let shot = null;
  for (let i = 0; i < 80; i += 1) {
    shot = await evaluate(`(() => {
      const state = window.__worldcraftQA.snapshot();
      const impacts = state.lastShot?.resonance?.impacts ?? [];
      return { phase: state.phase, reason: state.lastShot?.terminal?.reason ?? null, order: impacts.map(impact => impact.piece + ':' + impact.note).join('>') };
    })()`);
    if (shot.phase === 'result') break;
    if (shot.phase === 'error') throw new Error('Shot failed');
    await sleep(250);
  }
  if (shot?.phase !== 'result' || shot.order !== 'bank-timber:C4' || shot.reason !== 'first-ground-contact') {
    throw new Error('Opening shot was not the timber bank only: ' + JSON.stringify(shot));
  }
  await evaluate('window.__worldcraftQA.resetFoundry("open-contacts")');
  const reset = await waitReady();
  if (reset.presetId !== 'open-contacts' || reset.foundryId !== 'open-contacts') throw new Error('Reset left Open Contacts: ' + JSON.stringify(reset));
  await evaluate('window.__worldcraftQA.remixFoundry("open-contacts")');
  await sleep(300);
  const copied = await evaluate(`(() => {
    const state = window.__worldcraftQA.snapshot();
    return { notice: state.notice, foundryId: state.foundryId, presetId: state.presetId, worlds: (state.memory?.worlds ?? state.worlds ?? []).length };
  })()`);
  if (!String(copied.notice).includes('Copy of Open Contacts')) throw new Error('Remix notice was unexpected: ' + JSON.stringify(copied));
  await evaluate('window.__worldcraftQA.playFoundry("open-contacts")');
  const restored = await waitReady();
  if (restored.presetId !== 'open-contacts' || restored.goal?.kind !== 'none') throw new Error('Authored preset did not return: ' + JSON.stringify(restored));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.reload', { ignoreCache: true });
  await waitReady();
  await openGallery();
  const phoneGallery = await png('phone-gallery');
  await evaluate('window.__worldcraftQA.playFoundry("open-contacts")');
  const phone = await waitReady();
  if (phone.presetId !== 'open-contacts') throw new Error('Phone play left Open Contacts');
  const phonePlay = await png('phone-play');
  const report = { desktopGallery, desktopPlay, phoneGallery, phonePlay, presetId: phone.presetId, goal: phone.goal, view: phone.view ?? null, openingOrder: shot.order, resetFoundryId: reset.foundryId, remixNotice: copied.notice };
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  ws.close();
  chrome.kill();
}
