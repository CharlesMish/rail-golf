// Browser frame, audio, editor, and leak measurement for one capacity column.
// The dev server must already be serving /lab/worldcraft.
//
//   node scripts/capacity/measure-browser.mjs \
//     --column orig-12 --url http://127.0.0.1:5173/lab/worldcraft?qa=1 \
//     --world descending-resonance --switch descending-resonance-flat \
//     --few opening --many four --probe docs/experiments/capacity-24/raw/orig-12-headless-run-1.json \
//     --runs 3 --cycles 50 --out docs/experiments/capacity-24/raw
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromeVersion, gitSha, machineEnv } from './env.mjs';
import { round, roundSummary, slope, summarize } from './stats.mjs';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, mobile: false },
  { name: 'portrait', width: 390, height: 844, mobile: true },
  { name: 'landscape', width: 844, height: 390, mobile: true },
];

function arg(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

const column = arg('--column', 'orig-12');
const url = arg('--url', 'http://127.0.0.1:5173/lab/worldcraft?qa=1');
const worldId = arg('--world', 'descending-resonance');
const switchId = arg('--switch', 'descending-resonance-flat');
const fewId = arg('--few', 'opening');
const manyId = arg('--many', 'four');
const runs = Number(arg('--runs', '3'));
const runNumber = Number(arg('--run', '1'));
const cycles = Number(arg('--cycles', '50'));
const outDir = resolve(arg('--out', 'docs/experiments/capacity-24/raw'));
const shotDir = resolve(arg('--shots', '/opt/cursor/artifacts'));
const probePath = arg('--probe');
const port = Number(arg('--port', '9223'));

function sleep(ms) { return new Promise(resolveSleep => setTimeout(resolveSleep, ms)); }

function detailSummary(samples, phase = null) {
  const rows = (samples ?? []).filter(sample => !phase || sample.phase === phase).slice(1);
  const pick = key => roundSummary(summarize(rows.map(sample => sample[key])));
  return {
    samples: rows.length,
    frameMs: pick('dt'),
    jsMs: pick('jsMs'),
    physicsMs: pick('physicsMs'),
    renderMs: pick('renderMs'),
    draws: pick('draws'),
    activeMeshes: pick('activeMeshes'),
  };
}

async function loadProbe(file) {
  if (!file) return null;
  try {
    const report = JSON.parse(await readFile(file, 'utf8'));
    return report.world?.editorProbe ?? report.editorProbe ?? null;
  } catch { return null; }
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) pending.get(message.id)(message);
  });
  const ready = new Promise((resolveReady, reject) => {
    ws.addEventListener('open', () => resolveReady(), { once: true });
    ws.addEventListener('error', () => reject(new Error('Chrome debugger socket failed')), { once: true });
  });
  function send(method, params = {}) {
    const id = ++seq;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolveSend, reject) => {
      pending.set(id, message => {
        pending.delete(id);
        if (message.error) reject(new Error(JSON.stringify(message.error)));
        else resolveSend(message.result);
      });
    });
  }
  return { ready, send, close: () => ws.close() };
}

async function openChrome(viewport, debugPort) {
  const profile = `/tmp/chrome-capacity-${column}-${viewport.name}-${debugPort}`;
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--enable-precise-memory-info', '--use-gl=angle', '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader', `--remote-debugging-port=${debugPort}`,
    `--window-size=${viewport.width},${viewport.height}`, `--user-data-dir=${profile}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' },
  });
  let page = null;
  for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    } catch { /* chrome is still booting */ }
    if (!page) await sleep(250);
  }
  if (!page) { chrome.kill('SIGKILL'); throw new Error('Chrome did not open a page'); }
  const session = connect(page.webSocketDebuggerUrl);
  await session.ready;
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await applyViewport(session, viewport);
  return { chrome, session };
}

async function applyViewport(session, viewport) {
  try {
    const { windowId } = await session.send('Browser.getWindowForTarget');
    await session.send('Browser.setWindowBounds', {
      windowId,
      bounds: { width: viewport.width, height: viewport.height, windowState: 'normal' },
    });
  } catch { /* headless still honors the device metrics below */ }
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile,
  });
}

async function evaluate(session, expression, awaitPromise = false, userGesture = false) {
  const result = await session.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text + ' ' + (result.result?.description ?? ''));
  }
  return result.result.value;
}

async function gotoLab(session) {
  await session.send('Page.navigate', { url });
  let last = null;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const snap = await evaluate(session, `(() => {
        const qa = window.__worldcraftQA;
        if (qa?.snapshot) return qa.snapshot();
        return { phase: 'booting', href: location.href };
      })()`);
      last = snap;
      if (snap?.phase === 'ready' || snap?.phase === 'result') return snap;
      if (snap?.phase === 'error') throw new Error(snap.notice);
    } catch (error) {
      last = String(error);
    }
    await sleep(250);
  }
  throw new Error('Worldcraft did not become ready: ' + JSON.stringify(last).slice(0, 500));
}

async function loadWorld(session, id) {
  await evaluate(session, `window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
    if (snap.foundryId === id && (snap.phase === 'ready' || snap.phase === 'result')) return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(200);
  }
  throw new Error(`Foundry world ${id} did not load`);
}

async function fireAndSample(session, shot) {
  await evaluate(session, `window.__worldcraftQA.setMode('play')`);
  await evaluate(session, `window.__worldcraftQA.setShot(${JSON.stringify(shot)})`);
  await evaluate(session, 'window.__worldcraftQA.fire()', false, true);
  const samples = await evaluate(session, 'window.__worldcraftQA.sampleFlight(300)', true);
  const snap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
  return { samples, snap };
}

async function png(session, name) {
  const shot = await session.send('Page.captureScreenshot', { format: 'png' });
  const file = resolve(shotDir, `${name}.png`);
  await writeFile(file, Buffer.from(shot.data, 'base64'));
  return file;
}

async function editorPass(session, probe) {
  await evaluate(session, `window.__worldcraftQA.setMode('build')`);
  await sleep(200);
  const list = await evaluate(session, 'window.__worldcraftQA.pieceList()');
  const ids = await evaluate(session, `window.__worldcraftQA.snapshot().world.objects.map(object => object.id)`);
  const selected = [];
  for (const id of ids) {
    selected.push({ id, ...(await evaluate(session, `window.__worldcraftQA.timeSelect(${JSON.stringify(id)})`)) });
  }
  let nudge = null;
  if (probe?.pieceId && probe.patch) {
    const text = await evaluate(session, 'window.__worldcraftQA.exportText()');
    const preset = JSON.parse(text);
    preset.rules.fixed = (preset.rules.fixed ?? []).filter(id => id !== probe.pieceId);
    preset.rules.allowance = { ...(preset.rules.allowance ?? {}), [probe.kind]: Math.max(1, preset.rules.allowance?.[probe.kind] ?? 0) };
    await evaluate(session, `window.__worldcraftQA.importText(${JSON.stringify(JSON.stringify(preset))})`);
    await sleep(300);
    await evaluate(session, `window.__worldcraftQA.setMode('build')`);
    await evaluate(session, `window.__worldcraftQA.timeSelect(${JSON.stringify(probe.pieceId)})`);
    nudge = await evaluate(session, `window.__worldcraftQA.timeNudge(${JSON.stringify(probe.patch)})`);
  }
  return {
    list,
    select: roundSummary(summarize(selected.map(item => item.ms))),
    selectSamples: selected.map(item => ({ id: item.id, ms: round(item.ms, 4), selected: item.selected })),
    nudge,
  };
}

function leakSeries(rows, key) {
  const values = rows.map(row => row[key]).filter(value => Number.isFinite(value));
  const perCycle = slope(values);
  return {
    key,
    first: values[0] ?? null,
    last: values.at(-1) ?? null,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    perCycle: perCycle === null ? null : round(perCycle, 6),
  };
}

async function oneViewport(viewport, run, probe, few, many) {
  const debugPort = port + run * 10 + VIEWPORTS.findIndex(item => item.name === viewport.name);
  const { chrome, session } = await openChrome(viewport, debugPort);
  try {
    const booting = performance.now();
    await gotoLab(session);
    await applyViewport(session, viewport);
    await evaluate(session, 'window.dispatchEvent(new Event("resize"))');
    await sleep(400);
    const coldLoadMs = performance.now() - booting;
    const loadedAt = performance.now();
    const loaded = await loadWorld(session, worldId);
    const worldLoadMs = performance.now() - loadedAt;
    const gl = await evaluate(session, 'window.__worldcraftQA.gl()');
    const coldFrames = await evaluate(session, 'window.__worldcraftQA.sampleDetail(24)', true);
    await evaluate(session, 'window.__worldcraftQA.sampleDetail(20)', true);
    const survey = await evaluate(session, 'window.__worldcraftQA.sampleDetail(120)', true);
    const surveyShot = viewport.name === 'desktop' && run === 1 ? await png(session, `${column}-${worldId}-survey-${viewport.name}`) : null;
    await evaluate(session, 'window.__worldcraftQA.survey()');
    await sleep(250);
    const address = await evaluate(session, 'window.__worldcraftQA.sampleDetail(90)', true);
    const fewResult = await fireAndSample(session, few);
    if (!fewResult.samples?.some(sample => sample.phase === 'flight')) throw new Error('few shot never entered flight');
    await evaluate(session, 'window.__worldcraftQA.ready()');
    await sleep(150);
    const manyResult = await fireAndSample(session, many);
    const voices = {
      afterMany: fewResult ? manyResult.snap.voices : null,
      audio: manyResult.snap.audio,
    };
    const released = await evaluate(session, 'window.__worldcraftQA.releaseVoices()');
    let mix = null;
    if (viewport.name === 'desktop') {
      const twelve = await evaluate(session, 'window.__worldcraftQA.renderMix(12)', true);
      const twentyFour = await evaluate(session, 'window.__worldcraftQA.renderMix(24)', true);
      const liveTwelve = await evaluate(session, 'window.__worldcraftQA.stressVoices(12)', false, true);
      await sleep(350);
      const liveTwelveNow = await evaluate(session, 'window.__worldcraftQA.snapshot().voices');
      const liveRelease = await evaluate(session, 'window.__worldcraftQA.releaseVoices()');
      mix = { twelve, twentyFour, liveTwelve, liveTwelveNow, liveRelease };
    }
    await loadWorld(session, worldId);
    const editor = await editorPass(session, probe);
    const memory = await evaluate(session, 'window.__worldcraftQA.memory()');
    const diagnostics = await evaluate(session, 'window.__worldcraftQA.snapshot()').then(snap => snap.diagnostics);
    return {
      viewport,
      coldLoadMs: round(coldLoadMs, 1),
      worldLoadMs: round(worldLoadMs, 1),
      gl,
      objectCount: loaded.world?.objects?.length ?? loaded.diagnostics?.objectCount ?? null,
      diagnostics: loaded.diagnostics,
      memoryAtLoad: loaded.memory ?? null,
      coldFrames: detailSummary(coldFrames),
      survey: detailSummary(survey),
      address: detailSummary(address),
      few: {
        id: fewId,
        contacts: (fewResult.snap.lastShot?.contacts ?? []).filter(row => row.body !== 'worldcraft-ground').map(row => row.body),
        terminal: fewResult.snap.lastShot?.terminal ?? null,
        flight: detailSummary(fewResult.samples, 'flight'),
        voices: fewResult.snap.voices,
      },
      many: {
        id: manyId,
        contacts: (manyResult.snap.lastShot?.contacts ?? []).filter(row => row.body !== 'worldcraft-ground').map(row => row.body),
        terminal: manyResult.snap.lastShot?.terminal ?? null,
        flight: detailSummary(manyResult.samples, 'flight'),
        voices: voices.afterMany,
        audio: voices.audio,
        released,
      },
      mix,
      editor,
      memory,
      diagnosticsAfterEditor: diagnostics,
      surveyShot,
    };
  } finally {
    session.close();
    chrome.kill('SIGKILL');
    await sleep(300);
  }
}

async function leakPass(run, few) {
  const viewport = VIEWPORTS[0];
  const debugPort = port + 80 + run;
  const { chrome, session } = await openChrome(viewport, debugPort);
  const rows = [];
  try {
    await gotoLab(session);
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const id = cycle % 2 === 0 ? worldId : switchId;
      const started = performance.now();
      await loadWorld(session, id);
      const loadMs = performance.now() - started;
      await evaluate(session, `window.__worldcraftQA.setMode('play')`);
      await evaluate(session, `window.__worldcraftQA.setShot(${JSON.stringify(few)})`);
      await evaluate(session, 'window.__worldcraftQA.fire()', false, true);
      await evaluate(session, 'window.__worldcraftQA.sampleFlight(300)', true);
      await evaluate(session, 'window.__worldcraftQA.ready()');
      try { await session.send('HeapProfiler.collectGarbage'); } catch { /* optional */ }
      const snap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
      const memory = await evaluate(session, 'window.__worldcraftQA.memory()');
      rows.push({
        cycle,
        worldId: id,
        loadMs: round(loadMs, 1),
        objectCount: snap.diagnostics?.objectCount ?? null,
        staticBodies: snap.diagnostics?.staticBodies ?? null,
        physicsBodies: snap.diagnostics?.physicsBodies ?? null,
        meshes: snap.diagnostics?.meshes ?? null,
        materials: snap.diagnostics?.materials ?? null,
        textures: snap.diagnostics?.textures ?? null,
        shadowCasters: snap.diagnostics?.shadowCasters ?? null,
        voicesActive: snap.voices?.active ?? null,
        voicesStarted: snap.voices?.started ?? null,
        heapUsed: memory?.usedJSHeapSize ?? null,
      });
    }
    return rows;
  } finally {
    session.close();
    chrome.kill('SIGKILL');
  }
}

if (runs > 1) {
  const forwarded = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    if (process.argv[index] === '--runs' || process.argv[index] === '--run') { index += 1; continue; }
    forwarded.push(process.argv[index]);
  }
  for (let index = 1; index <= runs; index += 1) {
    execFileSync(process.execPath, [process.argv[1], ...forwarded, '--runs', '1', '--run', String(index)], { stdio: 'inherit' });
  }
  process.exit(0);
}
const run = runNumber;

const probe = await loadProbe(probePath);
const record = JSON.parse(await readFile(new URL(`../../worlds/foundry/${worldId}/manifest.json`, import.meta.url), 'utf8'));
const few = record.testedShots.find(shot => shot.id === fewId)?.setup;
const many = record.testedShots.find(shot => shot.id === manyId)?.setup;
if (!few || !many) throw new Error(`Manifest ${worldId} is missing ${fewId} or ${manyId}`);

await mkdir(outDir, { recursive: true });
await mkdir(shotDir, { recursive: true });
const written = [];
{
  const started = performance.now();
  const viewports = [];
  for (const viewport of VIEWPORTS) viewports.push(await oneViewport(viewport, run, probe, few, many));
  const leakRows = await leakPass(run, few);
  const keys = ['loadMs', 'staticBodies', 'physicsBodies', 'meshes', 'materials', 'textures', 'shadowCasters', 'voicesActive', 'heapUsed'];
  const worldsInLeak = [...new Set(leakRows.map(row => row.worldId))];
  const report = {
    kind: 'browser',
    rendererNote: 'Headless Chrome with SwiftShader/software WebGL. Not a phone GPU measurement.',
    column,
    run,
    gitSha: gitSha(),
    env: { ...machineEnv(), chrome: chromeVersion() },
    capturedAt: new Date().toISOString(),
    url,
    wallMs: round(performance.now() - started, 1),
    viewports,
    leak: {
      cycles: leakRows.length,
      series: worldsInLeak.map(id => ({
        worldId: id,
        metrics: keys.map(key => leakSeries(leakRows.filter(row => row.worldId === id), key)),
      })),
      rows: leakRows,
    },
  };
  const file = resolve(outDir, `${column}-browser-run-${run}.json`);
  await writeFile(file, JSON.stringify(report));
  written.push(file);
  const desktop = viewports.find(item => item.viewport.name === 'desktop');
  console.error(`${column} browser run ${run}: desktop survey median ${desktop?.survey?.frameMs?.median} ms, flight many ${desktop?.many?.flight?.frameMs?.median} ms, renderer ${desktop?.gl?.renderer}`);
}
console.log(written.join('\n'));
