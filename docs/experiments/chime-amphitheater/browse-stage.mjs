// Centre Stage in the lab: drawn station, persistence, a real shot, and the follow camera.
//
//   node docs/experiments/chime-amphitheater/browse-stage.mjs --url http://127.0.0.1:5173/lab/worldcraft?qa=1
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = name => { const index = process.argv.indexOf(name); return index === -1 ? null : process.argv[index + 1]; };
const url = arg('--url') ?? 'http://127.0.0.1:5173/lab/worldcraft?qa=1';
const sleep = ms => new Promise(done => setTimeout(done, ms));
const centreManifest = JSON.parse(await readFile(resolve(here, '../../../worlds/foundry/chime-bowl-centre/manifest.json'), 'utf8'));
const shallowText = await readFile(resolve(here, 'variants/chime-bowl-shallow.json'), 'utf8');
const artifactDir = '/opt/cursor/artifacts/chime-amphitheater';
await mkdir(artifactDir, { recursive: true });

const chrome = spawn('/usr/bin/google-chrome-stable', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=9346', '--window-size=1280,800',
  '--user-data-dir=/tmp/chrome-stage-browse', url,
], { stdio: 'ignore', env: { ...process.env, HOME: '/home/ubuntu', TMPDIR: '/tmp', XDG_CONFIG_HOME: '/home/ubuntu/.config' } });

let page = null;
for (let attempt = 0; attempt < 80 && !page; attempt += 1) {
  try {
    const list = await (await fetch('http://127.0.0.1:9346/json')).json();
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
function near(actual, expected, tolerance, label) {
  if (Math.abs(actual - expected) > tolerance) throw new Error(`${label}: ${actual} is not within ${tolerance} of ${expected}`);
}
function screenOf(camera, ball, aspect) {
  const fx = camera.tx - camera.x;
  const fy = camera.ty - camera.y;
  const fz = camera.tz - camera.z;
  const fl = Math.hypot(fx, fy, fz) || 1;
  const forward = { x: fx / fl, y: fy / fl, z: fz / fl };
  const rl = Math.hypot(forward.z, forward.x) || 1;
  const right = { x: forward.z / rl, y: 0, z: -forward.x / rl };
  const up = {
    x: forward.y * right.z - forward.z * right.y,
    y: forward.z * right.x - forward.x * right.z,
    z: forward.x * right.y - forward.y * right.x,
  };
  const dx = ball.x - camera.x;
  const dy = ball.y - camera.y;
  const dz = ball.z - camera.z;
  const depth = dx * forward.x + dy * forward.y + dz * forward.z;
  const tan = Math.tan(camera.fov / 2);
  const tx = tan;
  const ty = tan / aspect;
  return {
    x: (dx * right.x + dy * right.y + dz * right.z) / (depth * tx),
    y: (dx * up.x + dy * up.y + dz * up.z) / (depth * ty),
    depth,
  };
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
  report.gl = await evaluate('window.__worldcraftQA.gl()');
  const aspect = report.gl.width / report.gl.height;

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Foundry'); button.click(); return true; })()`);
  await sleep(400);
  const gallery = await evaluate(`(() => {
    const card = id => document.querySelector('[data-foundry-card="' + id + '"]');
    const read = id => {
      const node = card(id);
      return { name: node?.querySelector('h3')?.textContent ?? null, invitation: node?.querySelector('p')?.textContent ?? null };
    };
    return {
      cards: [...document.querySelectorAll('[data-foundry-section="amphitheater"] [data-foundry-card]')].map(node => node.getAttribute('data-foundry-card')),
      centre: read('chime-bowl-centre'),
      aisle: read('chime-bowl-aisle'),
      stage: read('chime-bowl-stage'),
    };
  })()`);
  report.gallery = gallery;
  if (!gallery.cards.includes('chime-bowl-centre')) throw new Error(`Centre Stage is missing from ${gallery.cards.join(',')}`);
  if (gallery.centre.name !== 'Centre Stage') throw new Error(`Centre card was ${gallery.centre.name}`);
  if ([gallery.centre.invitation, gallery.aisle.invitation, gallery.stage.invitation].some(text => !text || text.includes('yaw') || text.includes('0.55') || text.includes('://'))) {
    throw new Error('An invitation states an aim');
  }

  async function openWorld(id) {
    await evaluate(`window.__worldcraftQA.playFoundry(${JSON.stringify(id)})`);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.foundryId === id && snap.phase === 'ready' && snap.view === 'survey') return snap;
      await sleep(200);
    }
    throw new Error(`${id} did not open on the survey`);
  }
  function behindAim(snap) {
    const pose = snap.stationPose;
    const dx = snap.camera.x - pose.rail.x;
    const dz = snap.camera.z - pose.rail.z;
    const len = Math.hypot(dx, dz) || 1;
    const aimLen = Math.hypot(pose.aim.x, pose.aim.z) || 1;
    return -((dx / len) * (pose.aim.x / aimLen) + (dz / len) * (pose.aim.z / aimLen));
  }
  async function settleAddress() {
    await evaluate('window.__worldcraftQA.survey()');
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      const pose = snap.stationPose.address.position;
      if (snap.view === 'address' && Math.hypot(snap.camera.x - pose.x, snap.camera.y - pose.y, snap.camera.z - pose.z) < 0.4) return snap;
      await sleep(100);
    }
    throw new Error('Address camera did not reach the station');
  }

  function assertStation(snap, id, cameraToo = true) {
    const pose = snap.stationPose;
    const mesh = snap.launcherMesh;
    near(mesh.x, pose.launcher.x, 1e-3, `${id} launcher x`);
    near(mesh.y, pose.launcher.y, 1e-3, `${id} launcher y`);
    near(mesh.z, pose.launcher.z, 1e-3, `${id} launcher z`);
    near(mesh.yaw, pose.yawRadians, 1e-4, `${id} launcher yaw`);
    if (cameraToo) {
      near(snap.camera.x, pose.address.position.x, 0.5, `${id} address camera x`);
      near(snap.camera.z, pose.address.position.z, 0.5, `${id} address camera z`);
    }
    const aimYaw = Math.atan2(pose.aim.x, pose.aim.z);
    near(aimYaw, mesh.yaw, 1e-3, `${id} aim versus drawn yaw`);
  }

  async function frameOf(snap) {
    const frames = await evaluate('window.__worldcraftQA.sampleFrames(24)');
    const detail = await evaluate('window.__worldcraftQA.sampleDetail(12)');
    return {
      medianDtMs: Number(median(frames).toFixed(2)),
      maxDtMs: Number(Math.max(...frames).toFixed(2)),
      medianDraws: median(detail.map(row => row.draws)),
      staticBodies: snap.diagnostics.staticBodies,
      meshes: snap.diagnostics.meshes,
      rebuildMs: snap.diagnostics.rebuildMs,
    };
  }

  const centre = await openWorld('chime-bowl-centre');
  assertStation(centre, 'centre', false);
  if (Math.abs(centre.camera.tz - 32) > 1) throw new Error(`Centre survey looks at z ${centre.camera.tz}`);
  if (behindAim(centre) < 0.99) throw new Error(`Centre survey is not behind the aim (${behindAim(centre)})`);
  if (centre.stationPose.station.z !== 32 || centre.stationPose.station.yaw !== -120) {
    throw new Error(`Centre station was ${JSON.stringify(centre.stationPose.station)}`);
  }
  if (Math.abs(centre.launcherMesh.z) < 1) throw new Error('Centre launcher is still on the apron');
  const aisleDot = centre.stationPose.aim.z / Math.hypot(centre.stationPose.aim.x, centre.stationPose.aim.z);
  const fromAisle = Math.acos(Math.min(1, Math.max(-1, -aisleDot))) * 180 / Math.PI;
  if (fromAisle < 30) throw new Error(`Centre aim is ${fromAisle.toFixed(1)}° from the aisle`);
  const yawRange = await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find(item => item.textContent.startsWith('Yaw'));
    const input = label?.querySelector('input');
    return input ? { min: Number(input.min), max: Number(input.max) } : null;
  })()`);
  if (!yawRange || yawRange.min !== -70 || yawRange.max !== 70) throw new Error(`Yaw stops were ${JSON.stringify(yawRange)}`);
  await evaluate('window.__worldcraftQA.setShot({ yaw: 24 })');
  const turned = await evaluate('window.__worldcraftQA.snapshot()');
  assertStation(turned, 'centre yaw 24', false);
  if (Math.abs(turned.launcherMesh.yaw - (24 * Math.PI / 180)) < 0.2) throw new Error('Drawn yaw ignored the station facing');
  await evaluate('window.__worldcraftQA.setShot({ yaw: 0 })');
  const exported = JSON.parse(await evaluate('window.__worldcraftQA.exportText()'));
  if (exported.launcher?.z !== 32 || exported.launcher?.yaw !== -120) throw new Error(`Export dropped the station: ${JSON.stringify(exported.launcher)}`);
  report.centre = {
    station: centre.stationPose.station,
    launcherMesh: centre.launcherMesh,
    fromAisleDegrees: Number(fromAisle.toFixed(1)),
    yawRange,
    exportLauncher: exported.launcher,
    frame: await frameOf(centre),
  };
  const surveyShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifactDir}/centre-survey.png`, Buffer.from(surveyShot.data, 'base64'));
  const addressed = await settleAddress();
  assertStation(addressed, 'centre address');
  const addressShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifactDir}/centre-address.png`, Buffer.from(addressShot.data, 'base64'));

  await evaluate('window.__worldcraftQA.survey()');
  await evaluate('window.__worldcraftQA.camera("home")');
  await sleep(400);
  const survey = await evaluate('window.__worldcraftQA.snapshot()');
  if (Math.abs(survey.camera.tz - 32) > 1) throw new Error(`Survey look is at z ${survey.camera.tz}, not the stage`);
  await evaluate('window.__worldcraftQA.survey()');
  await sleep(500);

  async function fire(shot) {
    await evaluate('window.__worldcraftQA.ready()');
    await evaluate('window.__worldcraftQA.setMode("play")');
    await evaluate(`window.__worldcraftQA.setShot(${JSON.stringify(shot.setup)})`);
    await sleep(200);
    await evaluate('window.__worldcraftQA.fire()');
    const samples = [];
    let last = null;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const snap = await evaluate('window.__worldcraftQA.snapshot()');
      if (snap.phase === 'flight' && snap.ball && snap.camera) samples.push({ camera: snap.camera, ball: snap.ball });
      if (snap.phase === 'result' && snap.lastShot?.terminal) { last = snap.lastShot; break; }
      await sleep(40);
    }
    if (!last) throw new Error(`${shot.id} did not finish`);
    const terminal = last.terminal.reason === shot.terminal.reason
      && Object.is(last.terminal.elapsed, shot.terminal.elapsed)
      && last.terminal.position.every((value, index) => Object.is(value, shot.terminal.position[index]));
    if (!terminal) throw new Error(`${shot.id} terminal did not match ${last.terminal.reason} ${last.terminal.elapsed}`);
    const screens = samples.map(sample => screenOf(sample.camera, sample.ball, aspect));
    const inFrame = screens.filter(sample => sample.depth > 0.3 && Math.abs(sample.x) <= 1 && Math.abs(sample.y) <= 1);
    return {
      id: shot.id,
      samples: screens.length,
      inFrame: inFrame.length,
      share: screens.length ? Number((inFrame.length / screens.length).toFixed(3)) : null,
      maxAbs: screens.length ? Number(Math.max(...screens.map(sample => Math.max(Math.abs(sample.x), Math.abs(sample.y)))).toFixed(3)) : null,
      minDepth: screens.length ? Number(Math.min(...screens.map(sample => sample.depth)).toFixed(2)) : null,
      notes: (last.resonance?.impacts ?? []).filter(impact => impact.gain > 0).map(impact => `${impact.piece}:${impact.note}@${impact.time}`),
    };
  }

  const oneLip = centreManifest.testedShots.find(shot => shot.id === 'one-lip');
  const opening = centreManifest.testedShots.find(shot => shot.id === 'opening');
  report.shots.push(await fire(oneLip));
  const resultShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifactDir}/centre-result.png`, Buffer.from(resultShot.data, 'base64'));
  report.shots.push(await fire(opening));

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Keep line'); if (!button || button.disabled) throw new Error('Keep line is not available'); button.click(); return true; })()`);
  await sleep(300);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Worlds & lines'); button.click(); return true; })()`);
  await sleep(300);
  const kept = await evaluate(`(() => {
    const text = document.querySelector('[role="dialog"]')?.innerText ?? '';
    return { hasStation: text.includes('Station 32 m downrange, facing -120°.'), text: text.slice(0, 500) };
  })()`);
  if (!kept.hasStation) throw new Error(`Kept line dropped the station: ${kept.text}`);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Restore world & line'); button.click(); return true; })()`);
  await sleep(500);
  const restored = await evaluate('window.__worldcraftQA.snapshot()');
  if (restored.world.launcher.z !== 32 || restored.world.launcher.yaw !== -120) throw new Error(`Restore dropped the station: ${JSON.stringify(restored.world.launcher)}`);

  await evaluate('window.__worldcraftQA.playFoundry("chime-bowl-centre")');
  await sleep(600);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Worlds & lines'); button.click(); return true; })()`);
  await sleep(200);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Save new world copy'); button.click(); return true; })()`);
  await sleep(300);
  await evaluate(`(() => {
    const slot = [...document.querySelectorAll('[role="dialog"] .slot, [role="dialog"] div')].find(node => node.querySelector('strong')?.textContent === 'Centre Stage');
    const button = [...(slot?.querySelectorAll('button') ?? [])].find(item => item.textContent === 'Open world');
    if (!button) throw new Error('Saved Centre Stage copy was not listed');
    button.click();
    return true;
  })()`);
  await sleep(700);
  const saved = await evaluate('window.__worldcraftQA.snapshot()');
  if (saved.world.launcher.z !== 32 || saved.world.launcher.yaw !== -120) throw new Error(`Save dropped the station: ${JSON.stringify(saved.world.launcher)}`);
  report.savedLauncher = saved.world.launcher;

  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Foundry'); button.click(); return true; })()`);
  await sleep(300);
  await evaluate(`(() => {
    const card = document.querySelector('[data-foundry-card="chime-bowl-centre"]');
    const button = [...card.querySelectorAll('button')].find(item => item.textContent === 'Make a copy');
    button.click();
    return true;
  })()`);
  await sleep(300);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Close'); button.click(); return true; })()`);
  await sleep(200);
  await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent === 'Worlds & lines'); button.click(); return true; })()`);
  await sleep(200);
  await evaluate(`(() => {
    const slot = [...document.querySelectorAll('[role="dialog"] section div')].find(node => node.querySelector('strong')?.textContent === 'Copy of Centre Stage');
    const button = [...(slot?.querySelectorAll('button') ?? [])].find(item => item.textContent === 'Open world');
    if (!button) throw new Error('Make a Copy did not list Copy of Centre Stage');
    button.click();
    return true;
  })()`);
  await sleep(700);
  const copy = await evaluate('window.__worldcraftQA.snapshot()');
  if (copy.world.launcher.z !== 32 || copy.world.launcher.yaw !== -120) throw new Error(`Copy dropped the station: ${JSON.stringify(copy.world.launcher)}`);
  report.copyLauncher = copy.world.launcher;

  const aisle = await openWorld('chime-bowl-aisle');
  assertStation(aisle, 'aisle', false);
  if (aisle.stationPose.station.z !== 0 || aisle.stationPose.station.yaw !== 0) throw new Error('Down the Aisle station moved');
  if (Math.abs(aisle.launcherMesh.z) > 0.05) throw new Error('Down the Aisle launcher left the apron');
  report.aisle = { station: aisle.stationPose.station, launcherMesh: aisle.launcherMesh, frame: await frameOf(aisle) };
  const aisleShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifactDir}/aisle-address.png`, Buffer.from(aisleShot.data, 'base64'));

  const stage = await openWorld('chime-bowl-stage');
  assertStation(stage, 'stage', false);
  if (Math.abs(stage.camera.tz - 32) > 1) throw new Error(`From the Stage survey looks at z ${stage.camera.tz}`);
  if (behindAim(stage) < 0.99) throw new Error(`From the Stage survey is not behind its aim (${behindAim(stage)})`);
  if (stage.stationPose.station.z !== 32 || stage.stationPose.station.yaw !== -180) throw new Error('From the Stage station changed');
  if (Math.abs(stage.launcherMesh.z - 32) > 0.05) throw new Error('From the Stage launcher is not on the stage');
  report.stage = { station: stage.stationPose.station, launcherMesh: stage.launcherMesh, frame: await frameOf(stage) };
  const stageShot = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${artifactDir}/stage-address.png`, Buffer.from(stageShot.data, 'base64'));

  const imported = await evaluate(`window.__worldcraftQA.importText(${JSON.stringify(shallowText)})`);
  if (imported === false) throw new Error('Shallow preset import was rejected');
  await sleep(800);
  const shallow = await evaluate('window.__worldcraftQA.snapshot()');
  if (shallow.world.launcher.z !== 32 || shallow.world.launcher.yaw !== -120) throw new Error(`Shallow station was ${JSON.stringify(shallow.world.launcher)}`);
  if (shallow.world.objects[0].riser !== 0.25) throw new Error('Shallow riser did not load');
  report.shallow = { launcher: shallow.world.launcher, riser: shallow.world.objects.map(object => object.riser), frame: await frameOf(shallow) };

  report.ok = true;
} finally {
  if (report.ok) await writeFile(resolve(here, 'raw/browser-stage.json'), `${JSON.stringify(report, null, 2)}\n`);
  ws.close();
  chrome.kill('SIGKILL');
}
if (!report.ok) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  ok: true,
  centre: report.centre,
  shots: report.shots,
  saved: report.savedLauncher,
  copy: report.copyLauncher,
  aisle: report.aisle.launcherMesh,
  stage: report.stage.launcherMesh,
  shallow: report.shallow.frame,
}, null, 2));
