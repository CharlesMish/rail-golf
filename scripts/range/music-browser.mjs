// Headless smoke for Musical Workshop, the impact line, Back Pocket's spare bank,
// and a phone-sized viewport. The dev server must already be serving the lab.
//
//   node scripts/range/music-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? '/opt/cursor/artifacts/range-music';
const port = Number(arg('--port') ?? 9226);
await mkdir(out, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1400,900',
  '--user-data-dir=/tmp/chrome-music-profile', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

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
    const snap = await evaluate(`(() => { const qa = window.__worldcraftQA; return qa?.snapshot ? qa.snapshot() : { phase: 'booting' }; })()`);
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
async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === ${JSON.stringify(label)} && !item.disabled);
    if (!button) return null;
    button.click();
    return button.textContent.trim();
  })()`);
  if (clicked !== label) throw new Error(`Button not clicked: ${label}`);
}
async function shot() {
  await clickButton('Fire line');
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.phase === 'result') return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await waitReady();
  const options = await evaluate(`(() => [...document.querySelectorAll('select[aria-label="Experimental preset"] option')].map(option => option.textContent))()`);
  const selector = await png('desktop-selector');
  await evaluate("window.__worldcraftQA.enterPreset('musical-workshop')");
  const musical = await waitReady();
  if (musical.presetId !== 'musical-workshop') throw new Error('Musical Workshop did not load: ' + musical.notice);
  if (musical.world?.rules?.rail !== null) throw new Error('Musical Workshop locked the rail');
  await sleep(400);
  const musicalBuild = await png('desktop-musical-workshop');
  await clickButton('Play →');
  await waitReady();
  const fired = await shot();
  const sequence = await evaluate(`(() => {
    const node = document.querySelector('[data-impact-sequence]');
    return node ? { headline: node.getAttribute('data-impact-sequence'), text: node.innerText } : null;
  })()`);
  if (!sequence?.headline?.includes('Ramp D4')) throw new Error('Impact sequence missing: ' + JSON.stringify(sequence));
  const flow = await evaluate(`(() => [...document.querySelectorAll('button')].map(item => item.textContent.trim()).filter(Boolean))()`);
  if (!flow.includes('Ready again') || !flow.includes('Back to Build')) throw new Error('Recovery buttons missing: ' + flow.join(' | '));
  await sleep(300);
  const impact = await png('desktop-impact-sequence');
  await clickButton('Ready again');
  const ready = await waitReady();
  if (ready.phase !== 'ready') throw new Error('Ready again left phase ' + ready.phase);
  await clickButton('Build');
  const built = await waitReady();
  if (built.mode !== 'build') throw new Error('Build left mode ' + built.mode);
  await clickButton('Play →');
  await waitReady();
  await shot();
  await clickButton('Back to Build');
  const fromResult = await waitReady();
  if (fromResult.mode !== 'build') throw new Error('Back to Build left mode ' + fromResult.mode);

  await evaluate("window.__worldcraftQA.enterPreset('back-pocket')");
  await waitReady();
  const pieces = await evaluate(`(() => [...document.querySelectorAll('[data-movable]')].map(node => ({ text: node.innerText, movable: node.getAttribute('data-movable'), fixed: node.getAttribute('data-fixed') })))()`);
  const spare = pieces.find(piece => piece.text.toLowerCase().includes('bank'));
  const screen = pieces.filter(piece => piece.fixed === 'true');
  if (!spare || spare.movable !== 'true') throw new Error('Spare bank was not marked movable: ' + JSON.stringify(pieces));
  if (screen.length < 3) throw new Error('Fixed screen pieces missing: ' + JSON.stringify(pieces));
  const yawNote = await evaluate(`(() => document.body.innerText.includes('0.081'))()`);
  if (!yawNote) throw new Error('Back Pocket yaw tolerance sentence missing');
  await sleep(400);
  const pocketShot = await png('desktop-back-pocket');

  const presets = ['open-workshop', 'musical-workshop', 'back-pocket', 'soft-landing', 'resonant-run-free', 'resonant-run-phrase', 'travelling-bell'];
  const bodies = [];
  for (const id of presets) {
    await evaluate(`window.__worldcraftQA.enterPreset(${JSON.stringify(id)})`);
    const snap = await waitReady();
    bodies.push({ id, staticBodies: snap.diagnostics.staticBodies, physicsBodies: snap.diagnostics.physicsBodies, meshes: snap.diagnostics.meshes, liveBodies: snap.diagnostics.liveBodies, voices: snap.voices });
    if (snap.voices.active !== 0) throw new Error(`${id} left ${snap.voices.active} audio voices active`);
    if (snap.diagnostics.liveBodies !== 0) throw new Error(`${id} left a live body`);
  }
  const again = [];
  for (const id of presets) {
    await evaluate(`window.__worldcraftQA.enterPreset(${JSON.stringify(id)})`);
    const snap = await waitReady();
    again.push({ id, staticBodies: snap.diagnostics.staticBodies, physicsBodies: snap.diagnostics.physicsBodies, meshes: snap.diagnostics.meshes });
  }
  for (let i = 0; i < presets.length; i++) {
    if (JSON.stringify(bodies[i].staticBodies) !== JSON.stringify(again[i].staticBodies) || bodies[i].physicsBodies !== again[i].physicsBodies || bodies[i].meshes !== again[i].meshes) {
      throw new Error('Body count drifted: ' + JSON.stringify({ first: bodies[i], second: again[i] }));
    }
  }

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await evaluate("window.__worldcraftQA.enterPreset('musical-workshop')");
  await waitReady();
  await sleep(500);
  const phoneBuild = await png('phone-musical-workshop');
  await clickButton('Play →');
  await waitReady();
  await shot();
  const phoneSequence = await evaluate(`(() => document.querySelector('[data-impact-sequence]')?.getAttribute('data-impact-sequence') ?? null)()`);
  if (!phoneSequence) throw new Error('Phone impact sequence missing');
  await sleep(400);
  const phoneImpact = await png('phone-impact-sequence');

  const report = {
    url, options, selector, musicalBuild, impact, pocketShot, phoneBuild, phoneImpact,
    sequence, phoneSequence,
    flow: { ready: ready.phase, built: built.mode },
    pieces, bodies,
    musical: { presetId: musical.presetId, notice: musical.notice, staticBodies: musical.diagnostics.staticBodies },
    fired: { headline: sequence.headline, bindingHash: fired.shotRecord?.bindingHash ?? null, scored: fired.shotRecord?.outcome?.scored ?? null },
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
