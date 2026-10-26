// Headless smoke for Musical Workshop contact markers and the note timeline.
// Desktop 1400×900 and phone 390×844. The dev server must already be serving the lab.
//
//   node scripts/range/music2-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? '/opt/cursor/artifacts/range-music2';
const docs = arg('--docs') ?? 'docs/experiments/range/screenshots/music2';
const port = Number(arg('--port') ?? 9228);
await mkdir(out, { recursive: true });
await mkdir(docs, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  `--remote-debugging-port=${port}`, '--window-size=1400,900',
  '--user-data-dir=/tmp/chrome-music2-profile', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function target() {
  for (let i = 0; i < 80; i += 1) {
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
  for (let i = 0; i < 80; i += 1) {
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
  const bytes = Buffer.from(shot.data, 'base64');
  const artifact = `${out}/${name}.png`;
  const committed = `${docs}/${name}.png`;
  await writeFile(artifact, bytes);
  await writeFile(committed, bytes);
  return { artifact, committed };
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
  for (let i = 0; i < 80; i += 1) {
    const snap = await evaluate('window.__worldcraftQA.snapshot()');
    if (snap.phase === 'result') return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}
function assertTimelines(timelines, where) {
  const current = timelines.find(item => item.kind === 'current');
  const previous = timelines.find(item => item.kind === 'previous');
  if (!current?.text?.includes('D4') || !current.text.includes('E4')) throw new Error(`${where} current timeline: ${JSON.stringify(timelines)}`);
  if (!previous?.text?.includes('D4') || !previous.text.includes('E4')) throw new Error(`${where} previous timeline: ${JSON.stringify(timelines)}`);
  if (!current.text.includes(' s') || !previous.text.includes(' s')) throw new Error(`${where} timeline has no gap: ${JSON.stringify(timelines)}`);
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await waitReady();
  await evaluate("window.__worldcraftQA.enterPreset('musical-workshop')");
  const musical = await waitReady();
  if (musical.presetId !== 'musical-workshop') throw new Error('Musical Workshop did not load');
  await evaluate("window.__worldcraftQA.selectPiece('ramp-yours')");
  await clickButton('Play →');
  await waitReady();
  await shot();
  await clickButton('Ready again');
  const secondReady = await waitReady();
  if (secondReady.phase !== 'ready') throw new Error('Ready again left ' + secondReady.phase);
  const second = await shot();
  if (!second.comparisonMarks?.length) throw new Error('Previous-shot marks missing');
  if (second.contactMarkers?.length !== second.comparisonMarks.length) throw new Error('Marker meshes do not match recorded contacts: ' + JSON.stringify({ marks: second.comparisonMarks, meshes: second.contactMarkers }));
  if (!second.visibleTrailMeshes?.includes('worldcraft-before-line')) throw new Error('Amber trail missing: ' + JSON.stringify(second.visibleTrailMeshes));
  const timelines = await evaluate(`(() => [...document.querySelectorAll('[data-note-timeline]')].map(node => ({ kind: node.getAttribute('data-note-timeline'), text: node.innerText })))()`);
  assertTimelines(timelines, 'desktop');
  await evaluate(`(() => { const tools = document.querySelector('[class*=tools]'); if (tools) tools.scrollTop = 0; return true; })()`);
  await sleep(400);
  const desktopPanel = await png('desktop-timeline');
  await clickButton('Survey');
  const surveyed = await evaluate('window.__worldcraftQA.snapshot()');
  if (surveyed.view !== 'survey') throw new Error('Survey did not open: ' + surveyed.view);
  if (surveyed.phase !== 'result') throw new Error('Survey cleared the round');
  for (let i = 0; i < 3; i += 1) await evaluate("window.__worldcraftQA.camera('in')");
  await evaluate("window.__worldcraftQA.camera('focus')");
  await sleep(500);
  const desktopMarkers = await png('desktop-amber-markers');
  const afterSurvey = await evaluate(`(() => ({
    markers: window.__worldcraftQA.snapshot().contactMarkers,
    timelines: [...document.querySelectorAll('[data-note-timeline]')].map(node => node.getAttribute('data-note-timeline')),
  }))()`);
  if (afterSurvey.markers.length < 2) throw new Error('Markers disappeared in survey');

  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  const phone = await evaluate(`(() => {
    const tools = document.querySelector('[class*=tools]');
    if (tools) tools.scrollTop = 0;
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      timelines: [...document.querySelectorAll('[data-note-timeline]')].map(node => ({ kind: node.getAttribute('data-note-timeline'), text: node.innerText, width: node.getBoundingClientRect().width })),
      markers: window.__worldcraftQA.snapshot().contactMarkers.length,
    };
  })()`);
  if (phone.width > 430) throw new Error('Phone viewport did not apply: ' + phone.width);
  assertTimelines(phone.timelines, 'phone');
  if (phone.timelines.some(item => item.width > 390)) throw new Error('Timeline wider than the phone: ' + JSON.stringify(phone.timelines));
  if (phone.markers < 2) throw new Error('Phone lost the contact markers');
  await sleep(300);
  const phoneView = await png('phone-timeline-markers');

  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("window.__worldcraftQA.enterPreset('open-workshop')");
  const left = await waitReady();
  const disposed = await evaluate(`(() => ({
    markers: window.__worldcraftQA.snapshot().contactMarkers.length,
    timelines: document.querySelectorAll('[data-note-timeline]').length,
    meshes: [...document.querySelectorAll('canvas')].length,
    names: window.__worldcraftQA.snapshot().visibleTrailMeshes,
  }))()`);
  if (disposed.markers !== 0) throw new Error('Contact markers survived leaving Musical Workshop');
  if (disposed.timelines !== 0) throw new Error('Note timeline survived leaving Musical Workshop');
  if (left.presetId !== 'open-workshop') throw new Error('Did not leave Musical Workshop');
  if (left.diagnostics.liveBodies !== 0) throw new Error('A live body remained');
  if (left.voices?.active !== 0) throw new Error('An audio voice remained');

  const report = {
    url,
    desktopPanel,
    desktopMarkers,
    phoneView,
    timelines,
    phone,
    markers: second.contactMarkers,
    comparisonNotes: second.comparisonMarks.map(mark => ({ note: mark.note, time: mark.time, gap: mark.gap })),
    disposed,
    presetAfter: left.presetId,
  };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill('SIGTERM');
  ws.close();
}
