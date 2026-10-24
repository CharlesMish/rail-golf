// Headless Chrome check for Back Pocket: the unsolved preset, then an appendix import fired.
// The dev server must already be serving /lab/worldcraft.
//
//   node scripts/range/back-pocket-browser.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1 --appendix docs/experiments/range/appendix/back-pocket/family-1.json --out docs/experiments/range/runs/back-pocket/browser
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const out = arg('--out') ?? 'docs/experiments/range/runs/back-pocket/browser';
const appendix = arg('--appendix') ?? 'docs/experiments/range/appendix/back-pocket/family-1.json';
const port = Number(arg('--port') ?? 9333);
await mkdir(out, { recursive: true });
const presetText = await readFile(appendix, 'utf8');

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1400,900',
  '--user-data-dir=/tmp/chrome-back-pocket-profile',
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
      return { phase: 'booting', href: location.href };
    })()`);
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

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await waitReady();
  await evaluate("window.__worldcraftQA.enterPreset('back-pocket')");
  const entered = await waitReady();
  if (entered.presetId !== 'back-pocket' || entered.goal?.kind !== 'first-ground-zone') throw new Error('Back Pocket did not load: ' + entered.notice);
  await sleep(600);
  const entry = await png('back-pocket-entry');
  await evaluate('window.__worldcraftQA.setMode("play")');
  await sleep(400);
  const play = await png('back-pocket-play');
  const importedText = JSON.stringify(presetText);
  await evaluate(`window.__worldcraftQA.importText(${importedText})`);
  const imported = await waitReady();
  if (imported.presetId !== 'back-pocket') throw new Error('Appendix import did not stay on Back Pocket');
  await evaluate('window.__worldcraftQA.setMode("play")');
  await evaluate('window.__worldcraftQA.fire()');
  let solved = null;
  for (let i = 0; i < 80; i++) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.phase === 'result' && snap.shotRecord?.outcome) { solved = snap; break; }
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  if (!solved?.shotRecord?.outcome?.scored) throw new Error('Appendix shot did not clear: ' + JSON.stringify(solved?.shotRecord?.outcome ?? solved?.notice));
  await evaluate('window.__worldcraftQA.survey()');
  await sleep(500);
  const solvedFile = await png('back-pocket-solved');
  const report = {
    entry, play, solved: solvedFile,
    entered: { presetId: entered.presetId, goal: entered.goal, setup: entered.setup, objects: entered.world.objects.map(object => ({ id: object.id, x: object.x, z: object.z, yaw: object.yaw })) },
    outcome: solved.shotRecord.outcome,
    setup: solved.setup,
    notice: solved.notice,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
