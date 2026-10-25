// Headless Chrome stills for Clockwork Gallery.
// The dev server must already be serving /lab/worldcraft.
//
//   node scripts/range/clockwork-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? '/tmp/clockwork-browser';
const port = Number(arg('--port') ?? 9228);
await mkdir(out, { recursive: true });
await mkdir('/opt/cursor/artifacts/clockwork-gallery', { recursive: true });
const appendix = new URL('../../docs/experiments/range/appendix/clockwork-gallery/', import.meta.url);
await mkdir(appendix, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-clockwork-gallery-profile',
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
async function evaluate(expression, { awaitPromise = false, userGesture = false } = {}) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, userGesture, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  return result.result.value;
}
async function snapshot() {
  return evaluate('window.__worldcraftQA.snapshot()');
}
async function waitReady() {
  let last = null;
  for (let i = 0; i < 80; i++) {
    try {
      const snap = await snapshot();
      last = snap;
      if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
      if (snap?.phase === 'error') throw new Error(snap.notice);
    } catch (error) {
      last = String(error);
    }
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready: ' + JSON.stringify(last));
}
async function png(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const bytes = Buffer.from(shot.data, 'base64');
  await writeFile(`${out}/${name}.png`, bytes);
  await writeFile(`/opt/cursor/artifacts/clockwork-gallery/${name}.png`, bytes);
  await writeFile(new URL(`${name}.png`, appendix), bytes);
  return bytes.length;
}

const report = {};
try {
  await send('Page.enable');
  await send('Runtime.enable');
  const house = await waitReady();
  report.house = { phase: house.phase, build: house.build };
  await evaluate("window.__worldcraftQA.enterPreset('clockwork-gallery')");
  const opened = await waitReady();
  if (opened.presetId !== 'clockwork-gallery') throw new Error('Clockwork Gallery did not open: ' + opened.notice);
  report.opened = { presetId: opened.presetId, launchPhase: opened.launchPhase, goal: opened.goal?.kind, notice: opened.notice };
  for (let i = 0; i < 8; i++) await evaluate("window.__worldcraftQA.camera('in')");
  await sleep(400);
  report.releaseBytes = await png('release-phase');
  const quarter = await evaluate('window.__worldcraftQA.setLaunchPhase(2)');
  report.quarterPhase = quarter;
  await sleep(300);
  report.quarterBytes = await png('quarter-turn');
  const restored = await evaluate('window.__worldcraftQA.setLaunchPhase(0)');
  report.openingPhase = restored;

  await evaluate("window.__worldcraftQA.setMode('play')");
  await waitReady();
  await evaluate('window.__worldcraftQA.fire()', { userGesture: true });
  let miss = null;
  for (let i = 0; i < 80; i++) {
    const snap = await snapshot();
    if (snap.phase === 'result') { miss = snap; break; }
    await sleep(100);
  }
  if (!miss) throw new Error('Opening shot did not resolve');
  const missFigure = miss.lastShot?.contacts?.find(contact => contact.body === 'worldcraft-target-figure');
  report.openingShot = {
    status: miss.lastShot?.goalResult?.status ?? null,
    reason: miss.lastShot?.terminal?.reason ?? miss.lastShot?.reason ?? null,
    figure: Boolean(missFigure),
    notice: miss.notice,
    launchPhase: miss.launchPhase,
  };
  if (report.openingShot.status !== 'miss' || report.openingShot.figure) {
    throw new Error('Catalog opening was not a miss: ' + JSON.stringify(report.openingShot));
  }
  report.missBytes = await png('opening-miss');

  const onPath = await readFile(new URL('on-path-preset.json', appendix), 'utf8');
  await evaluate(`window.__worldcraftQA.importText(${JSON.stringify(onPath)})`);
  await waitReady();
  const phase = await evaluate('window.__worldcraftQA.setLaunchPhase(1.775)');
  report.hitPhase = phase;
  await evaluate("window.__worldcraftQA.setMode('play')");
  await waitReady();
  await evaluate('window.__worldcraftQA.fire()', { userGesture: true });
  const frames = [];
  const heartCounts = [];
  let hit = null;
  let firstSeen = -1;
  for (let i = 0; i < 80; i++) {
    const snap = await snapshot();
    const shot = await send('Page.captureScreenshot', { format: 'png' });
    frames.push(Buffer.from(shot.data, 'base64'));
    const hearts = snap.comicHearts ?? 0;
    heartCounts.push(hearts);
    if (hearts > 0 && firstSeen === -1) firstSeen = i;
    if (snap.phase === 'result' && !hit) hit = snap;
    if (hit && firstSeen !== -1 && hearts === 0 && i > firstSeen + 6) break;
    if (hit && i > 70) break;
    await sleep(30);
  }
  if (!hit) throw new Error('On-path shot did not resolve');
  const figure = hit.lastShot?.contacts?.find(contact => contact.body === 'worldcraft-target-figure');
  report.hitShot = {
    status: hit.lastShot?.goalResult?.status ?? null,
    body: hit.lastShot?.goalResult?.body ?? null,
    reason: hit.lastShot?.terminal?.reason ?? null,
    contactTime: figure?.first ?? null,
    point: figure?.point ?? null,
    launchPhase: hit.launchPhase,
    notice: hit.notice,
    comicHearts: hit.comicHearts,
    bindingHash: hit.shotRecord?.bindingHash ?? null,
  };
  if (report.hitShot.status !== 'hit') throw new Error('On-path shot missed: ' + JSON.stringify(report.hitShot));
  const frameDir = `${out}/frames`;
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });
  for (let i = 0; i < frames.length; i++) await writeFile(`${frameDir}/f${String(i).padStart(2, '0')}.png`, frames[i]);
  const clip = `${out}/hit.mp4`;
  await execFileAsync('ffmpeg', ['-y', '-framerate', '8', '-i', `${frameDir}/f%02d.png`, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', clip]);
  const clipBytes = await readFile(clip);
  await writeFile('/opt/cursor/artifacts/clockwork-gallery/hit.mp4', clipBytes);
  await writeFile(new URL('hit.mp4', appendix), clipBytes);
  const firstHearts = heartCounts.findIndex(count => count > 0);
  const pick = firstHearts === -1 ? frames.length - 1 : Math.min(frames.length - 1, firstHearts + 2);
  const heartFrame = frames[pick];
  await writeFile(`${out}/hit.png`, heartFrame);
  await writeFile('/opt/cursor/artifacts/clockwork-gallery/hit.png', heartFrame);
  await writeFile(new URL('hit.png', appendix), heartFrame);
  report.frames = frames.length;
  report.heartCounts = heartCounts;
  report.heartFrame = pick;
  report.maxHearts = Math.max(0, ...heartCounts);
  report.clipBytes = clipBytes.length;
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await writeFile('/opt/cursor/artifacts/clockwork-gallery/browser-report.json', JSON.stringify(report, null, 2));
  await writeFile(new URL('browser-report.json', appendix), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  ws.close();
  chrome.kill();
}
