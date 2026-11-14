// Frame cost for the five comparison worlds, one Chrome session per run.
// PR #71 method: headless Chrome, SwiftShader, 1280x800, fixed survey camera,
// then the busiest resting starter shot. Median of three runs.
//
//   node docs/experiments/chime-terraces/frames.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromeVersion, machineEnv } from '../../../scripts/capacity/env.mjs';
import { compare, percentile, round, roundSummary, runSpread, summarize } from '../../../scripts/capacity/stats.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const summary = JSON.parse(await readFile(resolve(here, 'raw/summary.json'), 'utf8'));
const ORDER = ['descending-resonance', 'ricochet-garden-loop', 'chime-terraces', 'chime-fan', 'chime-garden'];
const sleep = ms => new Promise(done => setTimeout(done, ms));

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

async function evaluate(session, expression, awaitPromise = false, userGesture = false) {
  const result = await session.send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, userGesture });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'evaluate failed');
  return result.result.value;
}

async function openChrome(debugPort) {
  const chrome = spawn('/usr/bin/google-chrome-stable', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--enable-precise-memory-info',
    '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
    `--remote-debugging-port=${debugPort}`, '--window-size=1280,800',
    `--user-data-dir=/tmp/chrome-chime-frames-${debugPort}`, 'about:blank',
  ], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });
  let page = null;
  for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      page = list.find(item => item.type === 'page' && item.webSocketDebuggerUrl);
    } catch { /* Chrome is still booting. */ }
    if (!page) await sleep(250);
  }
  if (!page) { chrome.kill('SIGKILL'); throw new Error('Chrome did not open a page'); }
  const session = connect(page.webSocketDebuggerUrl);
  await session.ready;
  await session.send('Page.enable');
  await session.send('Runtime.enable');
  await session.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  return { chrome, session };
}

function detail(samples, phase = null) {
  const rows = (samples ?? []).filter(sample => !phase || sample.phase === phase).slice(1);
  const pick = key => roundSummary(summarize(rows.map(sample => sample[key])), 3);
  return { samples: rows.length, frameMs: pick('dt'), jsMs: pick('jsMs'), physicsMs: pick('physicsMs'), renderMs: pick('renderMs'), draws: pick('draws'), activeMeshes: pick('activeMeshes') };
}

async function loadWorld(session, id) {
  await evaluate(session, `window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const snap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
    if (snap.foundryId === id && snap.phase === 'ready') return snap;
    if (snap.phase === 'error') throw new Error(snap.notice);
    await sleep(200);
  }
  throw new Error(`${id} did not load`);
}

async function oneWorld(session, id) {
  const shot = summary.worlds[id].busiestStarter;
  let snap = await loadWorld(session, id);
  if (snap.view !== 'survey') {
    await evaluate(session, 'window.__worldcraftQA.survey()');
    await sleep(200);
    snap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
  }
  await evaluate(session, 'window.__worldcraftQA.sampleDetail(24)', true);
  await evaluate(session, 'window.__worldcraftQA.sampleDetail(20)', true);
  const surveySamples = await evaluate(session, 'window.__worldcraftQA.sampleDetail(120)', true);
  const surveySnap = await evaluate(session, 'window.__worldcraftQA.snapshot()');
  await evaluate(session, `window.__worldcraftQA.setShot(${JSON.stringify(shot.setup)})`);
  await evaluate(session, 'window.__worldcraftQA.fire()', false, true);
  const flightSamples = await evaluate(session, 'window.__worldcraftQA.sampleFlight(400)', true);
  const after = await evaluate(session, 'window.__worldcraftQA.snapshot()');
  await evaluate(session, 'window.__worldcraftQA.ready()');
  return {
    id,
    view: surveySnap.view,
    pieces: surveySnap.diagnostics?.objectCount ?? null,
    survey: detail(surveySamples),
    flight: detail(flightSamples, 'flight'),
    diagnostics: {
      staticBodies: surveySnap.diagnostics?.staticBodies ?? null,
      physicsBodies: surveySnap.diagnostics?.physicsBodies ?? null,
      meshes: surveySnap.diagnostics?.meshes ?? null,
      materials: surveySnap.diagnostics?.materials ?? null,
      textures: surveySnap.diagnostics?.textures ?? null,
      shadowCasters: surveySnap.diagnostics?.shadowCasters ?? null,
    },
    voices: after.voices ?? null,
    audio: after.audio ?? null,
    shot: {
      id: shot.id,
      contacts: (after.lastShot?.contacts ?? []).filter(row => row.body !== 'worldcraft-ground').map(row => row.body),
      notes: (after.lastShot?.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}`).join('>'),
      terminal: after.lastShot?.terminal ?? null,
    },
  };
}

async function oneRun(run) {
  const debugPort = 9400 + run;
  const { chrome, session } = await openChrome(debugPort);
  try {
    await session.send('Page.navigate', { url });
    let booted = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        const snap = await evaluate(session, 'window.__worldcraftQA ? window.__worldcraftQA.snapshot() : null');
        if (snap?.phase === 'ready' || snap?.phase === 'result') { booted = snap; break; }
      } catch { /* page is still loading */ }
      await sleep(250);
    }
    if (!booted) throw new Error('Worldcraft did not become ready');
    const gl = await evaluate(session, 'window.__worldcraftQA.gl()');
    const order = ORDER.map((_, index) => ORDER[(index + run - 1) % ORDER.length]);
    const worlds = [];
    for (const id of order) worlds.push(await oneWorld(session, id));
    return { run, gl, order, worlds };
  } finally {
    session.close();
    chrome.kill('SIGKILL');
    await sleep(400);
  }
}

const runs = [];
for (let run = 1; run <= 3; run += 1) {
  process.stdout.write(`run ${run}\n`);
  runs.push(await oneRun(run));
}

function metric(runWorlds, id, read) {
  return runWorlds.map(run => read(run.worlds.find(world => world.id === id)));
}
const noiseOf = values => round(runSpread(values).relative, 4);
const worlds = {};
for (const id of ORDER) {
  const surveyMedians = metric(runs, id, world => world.survey.frameMs?.median);
  const surveyP95 = metric(runs, id, world => world.survey.frameMs?.p95);
  const flightMedians = metric(runs, id, world => world.flight.frameMs?.median);
  const flightP95 = metric(runs, id, world => world.flight.frameMs?.p95);
  const draws = metric(runs, id, world => world.survey.draws?.median);
  const flightDraws = metric(runs, id, world => world.flight.draws?.median);
  const renderMs = metric(runs, id, world => world.survey.renderMs?.median);
  const physicsMs = metric(runs, id, world => world.flight.physicsMs?.median);
  const sample = runs[0].worlds.find(world => world.id === id);
  worlds[id] = {
    pieces: sample.pieces,
    diagnostics: sample.diagnostics,
    voicesAfterBusiest: sample.voices,
    busiestShot: sample.shot,
    survey: {
      frameMedian: { values: surveyMedians, median: round(percentile(surveyMedians, 0.5), 3), spread: noiseOf(surveyMedians) },
      frameP95: { values: surveyP95, median: round(percentile(surveyP95, 0.5), 3), spread: noiseOf(surveyP95) },
      drawsMedian: { values: draws, median: round(percentile(draws, 0.5), 3) },
      renderMedianMs: { values: renderMs, median: round(percentile(renderMs, 0.5), 3) },
    },
    flight: {
      frameMedian: { values: flightMedians, median: round(percentile(flightMedians, 0.5), 3), spread: noiseOf(flightMedians) },
      frameP95: { values: flightP95, median: round(percentile(flightP95, 0.5), 3), spread: noiseOf(flightP95) },
      drawsMedian: { values: flightDraws, median: round(percentile(flightDraws, 0.5), 3) },
      physicsMedianMs: { values: physicsMs, median: round(percentile(physicsMs, 0.5), 4) },
      shotId: summary.worlds[id].busiestStarter.id,
    },
  };
}
const baseline = worlds['descending-resonance'];
const noise = Math.max(baseline.survey.frameMedian.spread, ...ORDER.map(id => worlds[id].survey.frameMedian.spread));
const flightNoise = Math.max(baseline.flight.frameMedian.spread, ...ORDER.map(id => worlds[id].flight.frameMedian.spread));
for (const id of ORDER) {
  worlds[id].versusDescending = {
    surveyMedian: compare(baseline.survey.frameMedian.median, worlds[id].survey.frameMedian.median, noise),
    flightMedian: compare(baseline.flight.frameMedian.median, worlds[id].flight.frameMedian.median, flightNoise),
  };
}
const report = {
  method: 'Headless Chrome, SwiftShader, 1280x800. Fixed survey camera, sampleDetail(120) after a 44-frame warmup. Then the busiest resting starter, flight frames only. Three runs, worlds rotated. Median of the three run medians. Noise is the widest relative run spread.',
  chrome: chromeVersion(),
  env: machineEnv(),
  gl: runs[0].gl,
  noise: { survey: noise, flight: flightNoise },
  worlds,
  runs: runs.map(run => ({
    run: run.run,
    order: run.order,
    gl: run.gl,
    worlds: run.worlds.map(world => ({
      id: world.id,
      view: world.view,
      surveyMedian: world.survey.frameMs?.median,
      surveyP95: world.survey.frameMs?.p95,
      surveyDraws: world.survey.draws?.median,
      surveyRender: world.survey.renderMs?.median,
      flightMedian: world.flight.frameMs?.median,
      flightP95: world.flight.frameMs?.p95,
      flightDraws: world.flight.draws?.median,
      flightSamples: world.flight.samples,
      shadowCasters: world.diagnostics.shadowCasters,
      meshes: world.diagnostics.meshes,
      materials: world.diagnostics.materials,
      notes: world.shot.notes,
    })),
  })),
};
await writeFile(resolve(here, 'raw/frames.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const id of ORDER) {
  const world = worlds[id];
  process.stdout.write(`${id} survey ${world.survey.frameMedian.median} p95 ${world.survey.frameP95.median} draws ${world.survey.drawsMedian.median} casters ${world.diagnostics.shadowCasters} flight ${world.flight.frameMedian.median} ${world.versusDescending.surveyMedian.verdict}\n`);
}
