// Open the lab, confirm the gallery card, and fire the recorded shots.
//
//   node docs/experiments/chime-amphitheater/browse.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const manifest = JSON.parse(await readFile(resolve(here, '../../../worlds/foundry/chime-tiers/manifest.json'), 'utf8'));
const sleep = ms => new Promise(done => setTimeout(done, ms));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9344', '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-amphitheater-browse', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

let page = null;
for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9344/json')).json();
    page = list.find(item => item.type === 'page' && item.url?.includes('/lab/worldcraft') && item.webSocketDebuggerUrl);
  } catch { /* Chrome is still booting. */ }
  if (!page) await sleep(250);
}
if (!page) { chrome.kill('SIGKILL'); throw new Error('Chrome did not open the lab'); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((done, fail) => { ws.addEventListener('open', done, { once: true }); ws.addEventListener('error', fail, { once: true }); });
let seq = 0;
const pending = new Map();
ws.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { done, fail } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) fail(new Error(message.error.message));
    else done(message.result);
  }
});
const send = (method, params = {}) => new Promise((done, fail) => {
  const id = ++seq;
  pending.set(id, { done, fail });
  ws.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

const report = { url, shots: [] };
try {
  await send('Runtime.enable');
  await send('Page.enable');
  let ready = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    ready = await evaluate('window.__worldcraftQA ? window.__worldcraftQA.snapshot() : null');
    if (ready?.phase === 'ready' || ready?.phase === 'result') break;
    await sleep(250);
  }
  if (!ready?.phase) throw new Error('Worldcraft did not become ready');
  report.build = ready.build;
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Foundry'); button.click(); return true; })()`);
  await sleep(300);
  const gallery = await evaluate(`(() => {
    const sections = [...document.querySelectorAll('[data-foundry-section]')].map(section => ({
      section: section.getAttribute('data-foundry-section'),
      title: section.querySelector('h3')?.textContent ?? '',
      cards: [...section.querySelectorAll('[data-foundry-card]')].map(card => card.getAttribute('data-foundry-card')),
    }));
    const tiers = document.querySelector('[data-foundry-card="chime-tiers"]');
    const terraces = document.querySelector('[data-foundry-card="chime-terraces"]');
    return {
      sections,
      tiersName: tiers?.querySelector('h3')?.textContent ?? null,
      tiersInvitation: tiers?.querySelector('p')?.textContent ?? null,
      terracesName: terraces?.querySelector('h3')?.textContent ?? null,
    };
  })()`);
  report.gallery = gallery;
  if (gallery.tiersName !== 'Two Tiers') throw new Error(`Gallery card was ${gallery.tiersName}`);
  if (!gallery.terracesName) throw new Error('Chime Terraces is missing from the gallery');
  if (gallery.tiersInvitation.includes('yaw') || gallery.tiersInvitation.includes('0.55')) throw new Error('Invitation states an aim');
  await evaluate(`(() => { document.querySelector('[data-foundry-card="chime-tiers"] button.primary, [data-foundry-card="chime-tiers"] button').click(); return true; })()`);
  let opened = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.foundryId === 'chime-tiers' && snap.phase === 'ready') { opened = snap; break; }
    await sleep(200);
  }
  if (!opened) throw new Error('Two Tiers did not open');
  report.opened = { foundryId: opened.foundryId, mode: opened.mode, view: opened.view, objects: opened.world.objects.length };
  for (const shot of manifest.testedShots) {
    await evaluate('window.__worldcraftQA.ready()');
    await evaluate(`window.__worldcraftQA.setMode('play')`);
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify(shot.setup)})`);
    await evaluate('window.__worldcraftQA.fire()');
    let last = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.phase === 'result' && snap.lastShot?.terminal) { last = snap.lastShot; break; }
      await sleep(200);
    }
    if (!last) throw new Error(`${shot.id} did not finish`);
    const terminal = last.terminal.reason === shot.terminal.reason
      && Object.is(last.terminal.elapsed, shot.terminal.elapsed)
      && last.terminal.position.every((value, index) => Object.is(value, shot.terminal.position[index]));
    const notes = (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`);
    report.shots.push({ id: shot.id, terminal, reason: last.terminal.reason, elapsed: last.terminal.elapsed, notes });
    if (!terminal) throw new Error(`${shot.id} terminal did not match`);
  }
  await evaluate(`window.__worldcraftQA.resetFoundry('chime-tiers')`);
  await sleep(400);
  const reset = await evaluate('window.__worldcraftQA.snapshot()');
  report.reset = { foundryId: reset.foundryId, yaw: reset.setup?.yaw, elevation: reset.setup?.elevation, charge: reset.setup?.charge, objects: reset.world.objects.length };
  if (reset.foundryId !== 'chime-tiers' || reset.setup.elevation !== 18 || reset.world.objects.length !== 10) throw new Error('Reset did not restore Two Tiers');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/opt/cursor/artifacts/chime-amphitheater/two-tiers-survey.png', Buffer.from(shot.data, 'base64'));
  report.ok = true;
} finally {
  await writeFile(resolve(here, 'raw/browser.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill('SIGKILL');
}
process.stdout.write(`${JSON.stringify({ ok: report.ok, build: report.build, shots: report.shots, reset: report.reset, gallery: report.gallery }, null, 2)}\n`);
