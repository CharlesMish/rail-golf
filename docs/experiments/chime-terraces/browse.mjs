// Play every resting starter in the lab and compare it with the headless summary.
// Screenshots: desktop 1280x800 and portrait 390x844, survey view, one per world.
//
//   node docs/experiments/chime-terraces/browse.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const shots = '/opt/cursor/artifacts/chime-compare';
const summary = JSON.parse(await readFile(resolve(here, 'raw/summary.json'), 'utf8'));
const WORLDS = ['chime-terraces', 'chime-fan', 'chime-garden', 'descending-resonance', 'ricochet-garden-loop'];
const sleep = ms => new Promise(done => setTimeout(done, ms));
await mkdir(shots, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9342', '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-chime-browse', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

let page = null;
for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9342/json')).json();
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
async function evaluate(expression, userGesture = false) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}
await send('Runtime.enable');
await send('Page.enable');

async function untilReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const snap = await evaluate('window.__worldcraftQA ? window.__worldcraftQA.snapshot() : null');
    if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready');
}
async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
  await evaluate('window.dispatchEvent(new Event("resize"))');
  await sleep(500);
}
async function png(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(shots, `${name}.png`);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}
function sameTerminal(actual, expected) {
  return actual?.reason === expected.reason
    && Object.is(actual?.elapsed, expected.elapsed)
    && Array.isArray(actual?.position)
    && actual.position.length === expected.position.length
    && actual.position.every((value, index) => Object.is(value, expected.position[index]));
}

await untilReady();
const report = { url, worlds: {} };
try {
  for (const id of WORLDS) {
    await evaluate(`window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
    let opened = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.foundryId === id && snap.phase === 'ready') { opened = snap; break; }
      await sleep(200);
    }
    if (!opened) throw new Error(`${id} did not open`);
    if (opened.view !== 'survey') await evaluate('window.__worldcraftQA.survey()');
    await viewport(1280, 800);
    const desktop = await png(`${id}-desktop-1280x800`);
    await viewport(390, 844);
    const portrait = await png(`${id}-portrait-390x844`);
    await viewport(1280, 800);
    const list = await evaluate(`(() => { const root = document.querySelector('[aria-label="Pieces"]'); return root ? { clientHeight: root.clientHeight, scrollHeight: root.scrollHeight, buttons: root.querySelectorAll('button').length } : null; })()`);
    const manifest = JSON.parse(await readFile(resolve(here, `../../../worlds/foundry/${id}/manifest.json`), 'utf8'));
    const played = [];
    for (const starter of summary.worlds[id].starters) {
      if (starter.layout) {
        played.push({ id: starter.id, skipped: 'layout shot, checked headless with its layout applied' });
        continue;
      }
      const expected = manifest.testedShots.find(shot => shot.id === starter.id);
      await evaluate('window.__worldcraftQA.ready()');
      await evaluate(`window.__worldcraftQA.setMode('play')`);
      await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify(starter.setup)})`);
      await evaluate('window.__worldcraftQA.fire()', true);
      let last = null;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const snap = await evaluate('window.__worldcraftQA.snapshot()');
        if (snap.phase === 'result' && snap.lastShot) { last = snap.lastShot; break; }
        await sleep(200);
      }
      if (!last) throw new Error(`${id} ${starter.id} did not finish`);
      const notes = (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`).join('>');
      const contacts = (last.contacts ?? []).filter(row => row.body !== 'worldcraft-ground').map(row => row.body);
      played.push({
        id: starter.id,
        terminalMatch: sameTerminal(last.terminal, expected.terminal),
        notesMatch: notes === starter.sequence,
        contactsMatch: contacts.length === expected.contacts.length && contacts.every((body, index) => body === expected.contacts[index]),
        notes,
        contacts,
      });
    }
    report.worlds[id] = { desktop, portrait, list, view: opened.view, played };
    const bad = played.filter(row => !row.skipped && (!row.notesMatch || !row.contactsMatch || !row.terminalMatch));
    process.stdout.write(`${id} shots ${played.length} mismatches ${bad.length}\n`);
  }
} finally {
  ws.close();
  chrome.kill('SIGKILL');
}

await writeFile(resolve(here, 'raw/browser.json'), `${JSON.stringify(report, null, 2)}\n`);
