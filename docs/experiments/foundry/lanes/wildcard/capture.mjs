// Browser check for The Other Way. The dev server must already be up.
// Saves gallery, survey, and the opening stop. Does not save a passing aim.
//
//   node docs/experiments/foundry/lanes/wildcard/capture.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? 'docs/experiments/foundry/lanes/wildcard/screenshots';
const port = Number(arg('--port') ?? 9224);
await mkdir(out, { recursive: true });
await rm('/tmp/chrome-other-way-profile', { recursive: true, force: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-other-way-profile',
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
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  return result.result.value;
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 100; i++) {
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
  for (let i = 0; i < 100; i++) {
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
function blockContacts(snap) {
  return (snap.shotRecord?.contacts ?? []).filter(contact => contact.body.startsWith('worldcraft-object-'));
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  const report = {};

  async function galleryShot(name) {
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Foundry');
      if (!button) throw new Error('Foundry button missing');
      button.click();
    })()`);
    await sleep(300);
    const open = await evaluate('window.__worldcraftQA.snapshot()');
    if (!open.foundryOpen) throw new Error('Foundry dialog did not open');
    const card = await evaluate(`(() => {
      const node = document.querySelector('[data-foundry-card="the-other-way"]');
      return node ? node.innerText : '';
    })()`);
    if (!card.includes('The Other Way')) throw new Error('Card missing: ' + card);
    if (/\d/.test(card)) throw new Error('Card shows a number: ' + card);
    if (card.includes('Musical')) throw new Error('Card reads as music: ' + card);
    report[name] = await png(name);
    await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Close');
      button?.click();
    })()`);
    await sleep(200);
  }

  async function playAndStop(prefix) {
    await evaluate("window.__worldcraftQA.playFoundry('the-other-way')");
    const opened = await waitReady();
    if (opened.foundryId !== 'the-other-way' || opened.presetId !== 'the-other-way') throw new Error('Play did not open The Other Way');
    if (opened.goal?.kind !== 'none') throw new Error('Goal was not none');
    if (opened.world.rules?.rail !== null) throw new Error('Launcher was locked');
    if (opened.setup.yaw !== 0 || opened.setup.elevation !== 16 || opened.setup.charge !== 0.55) throw new Error('Opening aim changed: ' + JSON.stringify(opened.setup));
    const panel = await evaluate(`document.querySelector('[aria-label="The Other Way"]')?.innerText ?? ''`);
    if (!panel.includes('meets the middle one and stops')) throw new Error('Play panel lost the invitation: ' + panel);
    if (panel.includes('Musical Workshop')) throw new Error('Play panel still says Musical Workshop');
    await evaluate("window.__worldcraftQA.camera('home')");
    await sleep(400);
    report[`${prefix}-play`] = await png(`${prefix}-play`);
    const opening = await shot();
    const bodies = blockContacts(opening).map(contact => contact.body);
    const z = opening.shotRecord.terminal.position[2];
    if (!bodies.includes('worldcraft-object-middle-stop')) throw new Error('Opening missed the middle block: ' + bodies.join(','));
    if (opening.shotRecord.terminal.reason !== 'first-ground-contact' || z > 34) throw new Error('Opening did not stop short: ' + z);
    await evaluate("window.__worldcraftQA.camera('home')");
    await sleep(400);
    report[`${prefix}-stop`] = await png(`${prefix}-stop`);
    return opening;
  }

  await galleryShot('desktop-gallery');
  const desktopOpening = await playAndStop('desktop');
  await evaluate('window.__worldcraftQA.setShot({ yaw: -10.5, elevation: 16, charge: 0.55, originX: 0 })');
  const left = await shot();
  if (blockContacts(left).length !== 0) throw new Error('Left line touched a block');
  if (left.shotRecord.terminal.position[0] > -3 || left.shotRecord.terminal.position[2] < 39) throw new Error('Left line did not pass: ' + JSON.stringify(left.shotRecord.terminal.position));
  if (!left.visibleTrailMeshes.includes('worldcraft-before-line') || !left.visibleTrailMeshes.includes('worldcraft-actual-line')) {
    throw new Error('The previous line was not kept on screen: ' + left.visibleTrailMeshes.join(','));
  }
  await evaluate('window.__worldcraftQA.setShot({ yaw: 0, elevation: 24, charge: 0.55, originX: 0 })');
  const carry = await shot();
  if (blockContacts(carry).length !== 0) throw new Error('Carry touched a block');
  if (Math.abs(carry.shotRecord.terminal.position[0]) > 1 || carry.shotRecord.terminal.position[2] < 50) throw new Error('Carry did not clear the middle: ' + JSON.stringify(carry.shotRecord.terminal.position));
  await evaluate("window.__worldcraftQA.resetFoundry('the-other-way')");
  const reset = await waitReady();
  if (reset.setup.yaw !== 0 || reset.setup.elevation !== 16 || reset.setup.charge !== 0.55 || reset.foundryId !== 'the-other-way') throw new Error('Reset did not restore the opening: ' + JSON.stringify(reset.setup));
  const remixed = await evaluate(`(() => {
    window.__worldcraftQA.remixFoundry('the-other-way');
    return window.__worldcraftQA.snapshot();
  })()`);
  if ((remixed.memory?.worldCount ?? 0) < 1 || !String(remixed.notice ?? '').includes('Copy of The Other Way')) throw new Error('Remix did not save a copy: ' + JSON.stringify({ memory: remixed.memory, notice: remixed.notice }));
  if (remixed.foundryId !== 'the-other-way') throw new Error('Remix rewrote the foundry world');
  await evaluate("window.__worldcraftQA.setMode('build')");
  const build = await waitReady();
  const locked = build.world.objects.every(object => build.world.rules.locked.includes(object.id));
  if (!locked || build.world.objects.length !== 3) throw new Error('Blocks were not fixed');
  const addBlocked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent === '+ Block');
    return button ? button.disabled : null;
  })()`);
  if (addBlocked !== true) throw new Error('A block could be added: ' + addBlocked);

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await evaluate('location.reload()');
  await sleep(500);
  await waitReady();
  await galleryShot('phone-gallery');
  const phoneOpening = await playAndStop('phone');

  report.checks = {
    desktopOpeningZ: desktopOpening.shotRecord.terminal.position[2],
    phoneOpeningZ: phoneOpening.shotRecord.terminal.position[2],
    left: left.shotRecord.terminal.position,
    carry: carry.shotRecord.terminal.position,
    trails: left.visibleTrailMeshes,
    remix: true,
    blocksFixed: true,
    addBlocked: true,
  };
  await writeFile(`${out}/browser-report.json`, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(`${JSON.stringify(report.checks, null, 2)}\n`);
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
