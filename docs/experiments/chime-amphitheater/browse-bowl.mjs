// Open both bowl cards, fire the recorded shots, and sample frames.
//
//   node docs/experiments/chime-amphitheater/browse-bowl.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const sleep = ms => new Promise(done => setTimeout(done, ms));
const aisleManifest = JSON.parse(await readFile(resolve(here, '../../../worlds/foundry/chime-bowl-aisle/manifest.json'), 'utf8'));
const stageManifest = JSON.parse(await readFile(resolve(here, '../../../worlds/foundry/chime-bowl-stage/manifest.json'), 'utf8'));

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9345', '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-bowl-browse', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

let page = null;
for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9345/json')).json();
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
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
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
  await sleep(400);
  const gallery = await evaluate(`(() => {
    const card = id => document.querySelector('[data-foundry-card="' + id + '"]');
    const read = id => {
      const node = card(id);
      return { name: node?.querySelector('h3')?.textContent ?? null, invitation: node?.querySelector('p')?.textContent ?? null };
    };
    return {
      section: document.querySelector('[data-foundry-section="amphitheater"] h3')?.textContent ?? null,
      cards: [...document.querySelectorAll('[data-foundry-section="amphitheater"] [data-foundry-card]')].map(node => node.getAttribute('data-foundry-card')),
      tiers: read('chime-tiers'),
      terraces: read('chime-terraces'),
      aisle: read('chime-bowl-aisle'),
      stage: read('chime-bowl-stage'),
    };
  })()`);
  report.gallery = gallery;
  if (gallery.tiers.name !== 'Two Tiers') throw new Error(`Two Tiers card was ${gallery.tiers.name}`);
  if (!gallery.terraces.name) throw new Error('Chime Terraces is missing');
  if (gallery.aisle.name !== 'Down the Aisle' || gallery.stage.name !== 'From the Stage') throw new Error(`Bowl cards were ${gallery.aisle.name} / ${gallery.stage.name}`);
  if ([gallery.aisle.invitation, gallery.stage.invitation].some(text => !text || text.includes('yaw') || text.includes('0.55') || text.includes('://'))) throw new Error('Invitation states an aim');

  async function play(id, shots) {
    await evaluate(`window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
    let opened = null;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.foundryId === id && snap.phase === 'ready') { opened = snap; break; }
      await sleep(200);
    }
    if (!opened) throw new Error(`${id} did not open`);
    const frames = await evaluate('window.__worldcraftQA.sampleFrames(24)');
    const detail = await evaluate('window.__worldcraftQA.sampleDetail(12)');
    const frame = {
      samples: frames.length,
      medianDtMs: Number(median(frames).toFixed(2)),
      maxDtMs: Number(Math.max(...frames).toFixed(2)),
      medianDraws: median(detail.map(row => row.draws)),
      staticBodies: opened.diagnostics.staticBodies,
      meshes: opened.diagnostics.meshes,
      rebuildMs: opened.diagnostics.rebuildMs,
    };
    const fired = [];
    for (const shot of shots) {
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
      if (!last) throw new Error(`${id} ${shot.id} did not finish`);
      const terminal = last.terminal.reason === shot.terminal.reason
        && Object.is(last.terminal.elapsed, shot.terminal.elapsed)
        && last.terminal.position.every((value, index) => Object.is(value, shot.terminal.position[index]));
      const notes = (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`);
      fired.push({ id: shot.id, terminal, reason: last.terminal.reason, notes, view: last ? (await evaluate('window.__worldcraftQA.snapshot()')).view : null });
      if (!terminal) throw new Error(`${id} ${shot.id} terminal did not match`);
    }
    return { objects: opened.world.objects.length, launcher: opened.world.launcher, frame, shots: fired };
  }

  report.aisle = await play('chime-bowl-aisle', aisleManifest.testedShots.filter(shot => shot.id !== 'opening'));
  const aisleShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/opt/cursor/artifacts/chime-amphitheater/bowl-aisle-result.png', Buffer.from(aisleShot.data, 'base64'));
  report.stage = await play('chime-bowl-stage', stageManifest.testedShots.filter(shot => shot.id !== 'opening'));
  const stageShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile('/opt/cursor/artifacts/chime-amphitheater/bowl-stage-result.png', Buffer.from(stageShot.data, 'base64'));
  await evaluate(`window.__worldcraftQA.resetFoundry('chime-tiers')`);
  await sleep(400);
  const reset = await evaluate('window.__worldcraftQA.snapshot()');
  report.reset = { foundryId: reset.foundryId, objects: reset.world.objects.length, elevation: reset.setup?.elevation };
  if (reset.foundryId !== 'chime-tiers' || reset.world.objects.length !== 10) throw new Error('Reset did not restore Two Tiers');
  report.ok = true;
} finally {
  await writeFile(resolve(here, 'raw/browser-bowl.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill('SIGKILL');
}
process.stdout.write(`${JSON.stringify({ ok: report.ok, build: report.build, gallery: report.gallery, aisle: report.aisle, stage: report.stage, reset: report.reset }, null, 2)}\n`);
