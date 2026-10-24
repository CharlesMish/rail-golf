// Headless Chrome check for Resonant Run.
// Audio stays uncreated until the first Fire click. Later shots reuse that
// context. Voice nodes are counted after repeated shots. A resized window
// is not a phone, so this script does not report mobile performance.
//
//   node scripts/range/resonant-browser.mjs --url http://127.0.0.1:5174/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createResonantRunPhrasePreset, exportRangePreset, validateRangePreset } from '../../lib/worldcraft-range.js';
import { readFile } from 'node:fs/promises';

const url = arg('--url') ?? 'http://127.0.0.1:5174/lab/worldcraft?qa=1';
const out = arg('--out') ?? '/tmp/resonant-browser';
const port = Number(arg('--port') ?? 9226);
await mkdir(out, { recursive: true });
await mkdir('/opt/cursor/artifacts/resonant-run', { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader', `--remote-debugging-port=${port}`,
  '--window-size=1400,900', '--user-data-dir=/tmp/chrome-resonant-run-profile',
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
async function waitResult() {
  for (let i = 0; i < 80; i++) {
    const snap = await snapshot();
    if (snap.phase === 'result' && snap.shotRecord?.bindingHash) return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(250);
  }
  throw new Error('Shot did not resolve');
}
async function png(name) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const file = `${out}/${name}.png`;
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  await writeFile(`/opt/cursor/artifacts/resonant-run/${name}.png`, Buffer.from(shot.data, 'base64'));
  await writeFile(new URL(`../../docs/experiments/range/screenshots/${name}.png`, import.meta.url), Buffer.from(shot.data, 'base64'));
  return file;
}
async function clickButton(label) {
  const box = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find(node => (node.textContent || '').trim() === ${JSON.stringify(label)});
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, disabled: button.disabled };
  })()`);
  if (!box || box.disabled) throw new Error(`Cannot click ${label}: ${JSON.stringify(box)}`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  return box;
}

const report = { mobilePerformance: 'not verified' };
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await mkdir(new URL('../../docs/experiments/range/screenshots/', import.meta.url), { recursive: true });
  const house = await waitReady();
  report.audioBeforeGesture = house.audio;
  if (house.audio !== 'uncreated') throw new Error(`Audio context existed before a gesture: ${house.audio}`);

  await evaluate("window.__worldcraftQA.enterPreset('resonant-run-free')");
  const free = await waitReady();
  if (free.presetId !== 'resonant-run-free' || free.goal?.kind !== 'none' || free.mode !== 'build') {
    throw new Error('Free preset did not open: ' + JSON.stringify({ presetId: free.presetId, goal: free.goal, mode: free.mode, notice: free.notice }));
  }
  if (free.audio !== 'uncreated') throw new Error(`Entering Free created audio: ${free.audio}`);
  report.freeBuild = { presetId: free.presetId, goal: free.goal, audio: free.audio, staticBodies: free.diagnostics.staticBodies };
  await png('resonant-free-build');

  await evaluate("window.__worldcraftQA.setMode('play')");
  const addressed = await waitReady();
  if (addressed.audio !== 'uncreated') throw new Error(`Switching to play created audio: ${addressed.audio}`);
  const click = await clickButton('Fire line');
  const first = await waitResult();
  report.firstGesture = { click, audio: first.audio, voices: first.voices, heard: first.lastShot?.goalResult ?? null, sounds: first.lastShot?.resonance?.sounds ?? null, staticBodies: first.diagnostics.staticBodies, physicsBodies: first.diagnostics.physicsBodies };
  if (first.audio !== 'running') throw new Error(`First Fire click left audio ${first.audio}`);
  if (!(first.voices.started > 0)) throw new Error('First shot started no voices');

  const stress = [];
  for (let i = 0; i < 12; i += 1) {
    await evaluate('window.__worldcraftQA.ready()');
    await waitReady();
    await evaluate('window.__worldcraftQA.fire()', { userGesture: true });
    const snap = await waitResult();
    stress.push({
      staticBodies: snap.diagnostics.staticBodies,
      physicsBodies: snap.diagnostics.physicsBodies,
      meshes: snap.diagnostics.meshes,
      materials: snap.diagnostics.materials,
      textures: snap.diagnostics.textures,
      liveBodies: snap.diagnostics.liveBodies,
      voices: snap.voices,
      audio: snap.audio,
    });
  }
  const distinct = key => new Set(stress.map(row => row[key]));
  for (const key of ['staticBodies', 'physicsBodies', 'liveBodies', 'meshes', 'materials', 'textures']) {
    if (distinct(key).size !== 1) throw new Error(`${key} moved: ${JSON.stringify(stress.map(row => row[key]))}`);
  }
  const unstable = stress.filter(row => row.audio !== 'running');
  if (unstable.length) throw new Error(`Audio left running: ${JSON.stringify(unstable.map(row => row.audio))}`);
  let settled = stress.at(-1).voices;
  for (let i = 0; i < 20 && settled.active !== 0; i += 1) {
    await sleep(200);
    settled = (await snapshot()).voices;
  }
  if (settled.active !== 0) throw new Error(`Voices still active after repeated shots: ${JSON.stringify(settled)}`);
  if (settled.finished !== settled.started) throw new Error(`Voice ledger did not finish every node: ${JSON.stringify(settled)}`);
  report.repeatedShots = { count: stress.length, staticBodies: stress[0].staticBodies, physicsBodies: stress[0].physicsBodies, voices: settled };

  await evaluate("window.__worldcraftQA.enterPreset('resonant-run-phrase')");
  const phrase = await waitReady();
  if (phrase.presetId !== 'resonant-run-phrase' || phrase.goal?.kind !== 'contact-phrase' || phrase.mode !== 'build') {
    throw new Error('Phrase preset did not open: ' + phrase.notice);
  }
  const phraseText = await evaluate(`document.querySelector('[aria-label="Contact phrase"]')?.innerText ?? ''`);
  if (!phraseText.includes('C4') || !phraseText.includes('D4') || !phraseText.includes('E4')) throw new Error('Phrase panel did not show the notes: ' + phraseText);
  report.phrasePanel = phraseText;
  await png('resonant-phrase-panel');

  await evaluate("window.__worldcraftQA.setMode('play')");
  await waitReady();
  await evaluate('window.__worldcraftQA.fire()', { userGesture: true });
  const missed = await waitResult();
  if (missed.lastShot?.goalResult?.status !== 'miss' || missed.lastShot.goalResult.standIn?.status !== 'miss') {
    throw new Error('Opening phrase shot was not a miss: ' + JSON.stringify(missed.lastShot?.goalResult));
  }
  if (JSON.stringify(missed.lastShot.goalResult.heard) !== JSON.stringify([1, 2])) {
    throw new Error('Opening heard order changed: ' + JSON.stringify(missed.lastShot.goalResult.heard));
  }
  report.openingMiss = { status: missed.lastShot.goalResult.status, heard: missed.lastShot.goalResult.heard, standIn: missed.lastShot.goalResult.standIn.status, scored: missed.lastShot.goalResult.scored, bindingHash: missed.shotRecord.bindingHash };
  await png('resonant-phrase-miss');

  const beforeReset = (await snapshot()).voices;
  await evaluate('window.__worldcraftQA.ready()');
  await waitReady();
  await evaluate("window.__worldcraftQA.setMode('build')");
  await waitReady();
  await evaluate('window.__worldcraftQA.resetPreset()');
  const reset = await waitReady();
  if (reset.presetId !== 'resonant-run-phrase') throw new Error('Reset left the phrase preset');
  const bank = reset.world.objects.find(object => object.id === 'bank-yours');
  if (bank.x !== 14 || bank.z !== 28) throw new Error('Reset did not restore the opening bank: ' + JSON.stringify(bank));
  if (reset.voices.active !== 0) throw new Error(`Reset left active voices: ${JSON.stringify(reset.voices)}`);
  report.reset = { voicesBefore: beforeReset, voicesAfter: reset.voices, bank: { x: bank.x, z: bank.z, yaw: bank.yaw } };

  const exemplars = JSON.parse(await readFile(new URL('../../docs/experiments/range/audio/exemplars.json', import.meta.url), 'utf8'));
  const prescribed = exemplars.find(item => item.role === 'prescribed');
  const solution = exportRangePreset(validateRangePreset({ ...createResonantRunPhrasePreset(), objects: prescribed.objects }));
  await evaluate('window.__worldcraftQA.ready()');
  await waitReady();
  await evaluate(`window.__worldcraftQA.importText(${JSON.stringify(solution)})`);
  const imported = await waitReady();
  if (imported.mode !== 'build') throw new Error('Solution import did not return to build');
  await evaluate("window.__worldcraftQA.setMode('play')");
  await waitReady();
  await evaluate('window.__worldcraftQA.fire()', { userGesture: true });
  const matched = await waitResult();
  const goal = matched.lastShot?.goalResult;
  if (goal?.status !== 'match' || goal.standIn?.status !== 'hit' || goal.scored !== false) {
    throw new Error('Imported solution was not a match: ' + JSON.stringify(goal));
  }
  if (JSON.stringify(goal.heard) !== JSON.stringify([0, 1, 2])) throw new Error('Match heard order changed: ' + JSON.stringify(goal.heard));
  report.solutionMatch = { status: goal.status, heard: goal.heard, standIn: goal.standIn.status, scored: goal.scored, bindingHash: matched.shotRecord.bindingHash, sounds: matched.lastShot.resonance.sounds, resonantCallbacks: matched.lastShot.resonance.resonantCallbacks };
  await png('resonant-phrase-match');

  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
  await writeFile('/opt/cursor/artifacts/resonant-run/browser-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  ws.close();
  if (chrome.exitCode === null && !chrome.killed) chrome.kill('SIGKILL');
  await new Promise(resolve => {
    if (chrome.exitCode !== null || chrome.signalCode) resolve();
    else chrome.once('exit', resolve);
  });
}
