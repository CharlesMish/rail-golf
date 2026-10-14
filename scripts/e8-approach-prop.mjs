// Headless certification of the lab hinge. Imports the scene the page mounts.
// Writes only under artifacts/e8. Does not edit the yard, the step, or scoring.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import HavokPhysics from '@babylonjs/havok';
import { Logger } from '@babylonjs/core';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { isLatch } from '../lib/approach-prop.js';
import { runApproachShot, runApproachPair } from '../lib/approach-prop-scene.js';
import { buildIdentity } from '../build/build-identity.js';

Logger.LogLevels = 0;
const CSV = new URL('../tests/fixtures/e8-shot-envelopes.csv', import.meta.url);
const OUT = new URL('../artifacts/e8/', import.meta.url);
const LUMBER = COURTYARD_HOLES[2];
const round = (n, p = 4) => Math.round(n * 10 ** p) / 10 ** p;

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\n/);
  const cols = header.split(',');
  return lines.filter(Boolean).map(line => {
    const cells = line.split(',');
    const row = Object.fromEntries(cols.map((col, index) => [col, cells[index] ?? '']));
    return { ...row, shot: Number(row.shot), origin: Number(row.origin), rail: Number(row.rail), yaw: Number(row.yaw), elev: Number(row.elev), power: Number(row.power) };
  });
}

function isCore(row) {
  return row.origin === 0 && row.yaw >= -18 && row.yaw <= 25 && row.elev >= 18 && row.elev <= 49 && row.power >= 0.4 && row.power <= 0.82;
}

function shotFromRow(row) {
  return { railIndex: row.rail, originX: row.origin, yaw: row.yaw, elevation: row.elev, charge: row.power };
}

function idOf(row, suffix = '') {
  return `${row.rat}-${row.experiment}-${row.station}-${row.shot}${suffix}`;
}

function jitter(row, salt) {
  const hash = createHash('sha256').update(`${row.rat}|${row.experiment}|${row.station}|${row.shot}|${salt}`).digest();
  const unit = index => (hash[index] / 255) * 2 - 1;
  return { ...row, yaw: Math.max(-70, Math.min(70, row.yaw + unit(0) * 2)), elev: Math.max(5, Math.min(85, row.elev + unit(1) * 2)), power: Math.max(0, Math.min(1, row.power + unit(2) * 0.03)), jitterSalt: salt };
}

function classify(result) {
  const hit = Boolean(result.propHit);
  const lean = result.leanEnd;
  return { hit, latched: isLatch(hit, lean), wrong: hit && lean < -20, enables: hit && lean >= 40 && lean <= 70 };
}

function summarize(rows, label) {
  const n = rows.length;
  const classes = rows.map(row => row.class);
  const count = key => classes.filter(item => item[key]).length;
  const frac = key => n ? round(count(key) / n, 4) : null;
  const leans = rows.map(row => row.leanEnd).filter(Number.isFinite);
  return {
    label, n,
    hit: count('hit'), hitFrac: frac('hit'),
    latched: count('latched'), latchedFrac: frac('latched'),
    wrong: count('wrong'), wrongFrac: frac('wrong'),
    enables: count('enables'),
    treadSameShot: rows.filter(row => row.stepA || row.stepB || row.stepC).length,
    latchAndTread: rows.filter(row => row.class.latched && (row.stepA || row.stepB || row.stepC)).length,
    leanEndMin: leans.length ? round(Math.min(...leans), 3) : null,
    leanEndMax: leans.length ? round(Math.max(...leans), 3) : null,
  };
}

let HAVOK = null;
async function havok() {
  if (!HAVOK) {
    HAVOK = await HavokPhysics({ wasmBinary: readFileSync(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
  }
  return HAVOK;
}

function say(message) {
  console.log(`${new Date().toISOString()} ${message}`);
}

function writeJson(name, value) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(new URL(name, OUT), JSON.stringify(value, null, 2));
}

async function runRows(rows, file, options = {}) {
  const hk = await havok();
  mkdirSync(OUT, { recursive: true });
  const path = new URL(file, OUT);
  writeFileSync(path, '');
  const results = [];
  for (const row of rows) {
    const started = Date.now();
    const sim = runApproachShot(hk, LUMBER, shotFromRow(row), options);
    const item = {
      id: idOf(row, row.jitterSalt ? `-j${row.jitterSalt}` : ''),
      yaw: round(row.yaw, 4), elev: round(row.elev, 4), power: round(row.power, 4),
      leanEnd: round(sim.leanEnd, 4), leanTail: sim.leanTail == null ? null : round(sim.leanTail, 4),
      propHit: sim.propHit, stepA: sim.stepA, stepB: sim.stepB, stepC: sim.stepC,
      terminal: { x: round(sim.terminal.x, 3), z: round(sim.terminal.z, 3) },
      contacts: sim.contacts, class: classify(sim), ms: Date.now() - started,
    };
    results.push(item);
    appendFileSync(path, JSON.stringify(item) + '\n');
    if (results.length % 20 === 0 || results.length === rows.length) say(`${file} ${results.length}/${rows.length} ${item.id} lean ${item.leanEnd} ${item.ms}ms`);
  }
  return results;
}

async function core() {
  const rows = parseCsv(readFileSync(CSV, 'utf8')).filter(row => row.station === 'lumber' && isCore(row));
  const results = await runRows(rows, 'core.jsonl');
  const summary = summarize(results, 'lumber-core-hinge');
  summary.pass = summary.latchedFrac >= 0.5;
  summary.belowStanding = results.filter(row => row.leanEnd < -14.2).map(row => ({ id: row.id, lean: row.leanEnd }));
  summary.flat = results.filter(row => row.leanEnd < -40);
  writeJson('core-summary.json', summary);
  say(`core latch ${summary.latched}/${summary.n} (${summary.latchedFrac}) pass ${summary.pass}`);
}

async function jitterPhase() {
  const coreRows = parseCsv(readFileSync(CSV, 'utf8')).filter(row => row.station === 'lumber' && isCore(row));
  const salts = ['ref6-0', 'ref6-1', 'ref6-2', 'ref6-3', 'ref6-4', 'ref6-5', 'ref6-6'];
  const rows = salts.flatMap(salt => coreRows.map(row => jitter(row, salt)));
  const results = await runRows(rows, 'jitter.jsonl');
  const summary = summarize(results, 'lumber-core-jitter-588');
  summary.pass = summary.latchedFrac >= 0.5;
  summary.flat = results.filter(row => row.leanEnd < -40).length;
  writeJson('jitter-summary.json', summary);
  say(`jitter latch ${summary.latched}/${summary.n} (${summary.latchedFrac}) pass ${summary.pass}`);
}

async function wrong() {
  const want = [
    ['K3', 'E6', 3], ['P2', 'E7', 4], ['P3', 'E7', 6], ['P3', 'E7', 8], ['P6', 'E7', 4], ['P8', 'E7', 4], ['P8', 'E7', 5],
  ];
  const rows = parseCsv(readFileSync(CSV, 'utf8')).filter(row => row.station === 'lumber' && want.some(([rat, experiment, shot]) => row.rat === rat && row.experiment === experiment && row.shot === shot));
  const results = await runRows(rows, 'wrong-way.jsonl', { tailSteps: 720 });
  const summary = {
    n: results.length,
    rows: results.map(row => ({ id: row.id, lean: row.leanEnd, tail: row.leanTail, hit: row.propHit, z: row.terminal.z, climbed: row.leanTail > 30, flat: row.leanEnd < -40 })),
  };
  summary.pass = summary.rows.every(row => !row.flat && !row.climbed);
  writeJson('wrong-way-summary.json', summary);
  say(`wrong-way pass ${summary.pass} ${JSON.stringify(summary.rows)}`);
}

function tread(result) {
  return { stepA: result.stepA, stepB: result.stepB, both: result.stepA && result.stepB, z: round(result.terminal.z, 3), lean: result.leanEnd == null ? null : round(result.leanEnd, 3), hit: result.propHit };
}

async function follow() {
  const hk = await havok();
  const named = { railIndex: 1, originX: 0, yaw: 0, elevation: 22, charge: 0.55 };
  const median = { railIndex: 1, originX: 0, yaw: 0, elevation: 30, charge: 0.6 };
  const measured = runApproachShot(hk, LUMBER, { railIndex: 1, originX: 0, yaw: 0, elevation: 30, charge: 0.5 });
  const rest = measured.leanEnd;
  const cases = {};
  for (const [label, shot] of [['named', named], ['median', median]]) {
    cases[`${label}-bare`] = tread(runApproachShot(hk, LUMBER, shot, { prop: 'none' }));
    cases[`${label}-standing`] = tread(runApproachShot(hk, LUMBER, shot));
    cases[`${label}-rest`] = tread(runApproachShot(hk, LUMBER, shot, { prop: 'static', lean: rest, hold: false }));
  }
  const pair = runApproachPair(hk, LUMBER, { railIndex: 1, originX: 0, yaw: 0, elevation: 30, charge: 0.5 }, named);
  cases.liveSecond = tread(pair.follow);
  const elevs = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 42, 48];
  const powers = [0.4, 0.45, 0.48, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.82];
  const yaws = [-12, -8, -6, -5, -4, -2, 0, 2, 4, 5, 6, 8, 12];
  const grid = [];
  const push = (pose, shot, result) => grid.push({ pose, yaw: shot.yaw, elev: shot.elevation, power: shot.charge, ...tread(result) });
  let n = 0;
  for (const elev of elevs) {
    for (const power of powers) {
      const shot = { railIndex: 1, originX: 0, yaw: 0, elevation: elev, charge: power };
      push('bare', shot, runApproachShot(hk, LUMBER, shot, { prop: 'none' }));
      push('standing', shot, runApproachShot(hk, LUMBER, shot));
      push('rest', shot, runApproachShot(hk, LUMBER, shot, { prop: 'static', lean: rest, hold: false }));
      n += 3;
      if (n % 30 === 0) say(`window ${n}`);
    }
  }
  for (const yaw of yaws) {
    const shot = { railIndex: 1, originX: 0, yaw, elevation: 22, charge: 0.55 };
    push('bare', shot, runApproachShot(hk, LUMBER, shot, { prop: 'none' }));
    push('standing', shot, runApproachShot(hk, LUMBER, shot));
    push('rest', shot, runApproachShot(hk, LUMBER, shot, { prop: 'static', lean: rest, hold: false }));
  }
  const cells = elevs.flatMap(elev => powers.map(power => ({ elev, power })));
  const at = (pose, elev, power, yaw = 0) => grid.find(item => item.pose === pose && item.elev === elev && item.power === power && item.yaw === yaw);
  const anyNew = cells.filter(cell => {
    const restCell = at('rest', cell.elev, cell.power);
    const standing = at('standing', cell.elev, cell.power);
    const bare = at('bare', cell.elev, cell.power);
    const restTop = restCell.stepA || restCell.stepB;
    const other = (standing.stepA || standing.stepB) || (bare.stepA || bare.stepB);
    return restTop && !other;
  });
  const bothNew = cells.filter(cell => {
    const restCell = at('rest', cell.elev, cell.power);
    const standing = at('standing', cell.elev, cell.power);
    const bare = at('bare', cell.elev, cell.power);
    return restCell.both && !standing.both && !bare.both && !(standing.stepA || standing.stepB) && !(bare.stepA || bare.stepB);
  });
  const powerSweep = [];
  for (let power = 0.4; power <= 0.7 + 1e-9; power = round(power + 0.01, 2)) {
    const shot = { railIndex: 1, originX: 0, yaw: 0, elevation: 22, charge: power };
    powerSweep.push({
      power,
      rest: tread(runApproachShot(hk, LUMBER, shot, { prop: 'static', lean: rest, hold: false })),
      standing: tread(runApproachShot(hk, LUMBER, shot)),
      bare: tread(runApproachShot(hk, LUMBER, shot, { prop: 'none' })),
    });
  }
  const bothPowers = powerSweep.filter(item => item.rest.both && !item.standing.stepA && !item.standing.stepB && !item.bare.stepA && !item.bare.stepB).map(item => item.power);
  const yawSweep = yaws.map(yaw => {
    const restCell = grid.find(item => item.pose === 'rest' && item.yaw === yaw && item.elev === 22 && item.power === 0.55);
    const standing = grid.find(item => item.pose === 'standing' && item.yaw === yaw && item.elev === 22 && item.power === 0.55);
    const bare = grid.find(item => item.pose === 'bare' && item.yaw === yaw && item.elev === 22 && item.power === 0.55);
    return { yaw, restBoth: restCell.both, restA: restCell.stepA, standingTop: standing.stepA || standing.stepB, bareTop: bare.stepA || bare.stepB };
  });
  const report = {
    restLean: round(rest, 4),
    cases,
    anyNewTread: anyNew.length,
    anyNewCells: anyNew,
    bothTreadsNew: bothNew.length,
    bothTreadsCells: bothNew,
    bothPowersAtElev22: bothPowers,
    yawAtNamed: yawSweep,
    passNamed: cases['named-rest'].both && !cases['named-standing'].stepA && !cases['named-standing'].stepB && cases.liveSecond.both,
  };
  writeJson('follow.json', report);
  say(`follow rest ${report.restLean} named pass ${report.passNamed} anyNew ${anyNew.length} bothNew ${bothNew.length} powers ${bothPowers.join(',')}`);
}

function same(a, b) {
  return a.propHit === b.propHit && a.stepA === b.stepA && a.stepB === b.stepB && Math.abs(a.leanEnd - b.leanEnd) < 0.5 && Math.abs(a.terminal.x - b.terminal.x) < 0.05 && Math.abs(a.terminal.z - b.terminal.z) < 0.05 && a.contacts.join('|') === b.contacts.join('|');
}

async function determinism() {
  const hk = await havok();
  const rows = parseCsv(readFileSync(CSV, 'utf8'));
  const pick = (rat, experiment, shot) => rows.find(row => row.rat === rat && row.experiment === experiment && row.station === 'lumber' && row.shot === shot);
  const sets = [
    ['J1-lumber-1', shotFromRow(pick('J1', 'E4', 1))],
    ['J8-lumber-7', shotFromRow(pick('J8', 'E4', 7) ?? pick('J8', 'E6', 7) ?? pick('J8', 'E7', 7))],
    ['K6-lumber-4', shotFromRow(pick('K6', 'E6', 4) ?? pick('K6', 'E4', 4))],
    ['P4-lumber-10', shotFromRow(pick('P4', 'E7', 10) ?? pick('P4', 'E6', 10))],
    ['P7-lumber-14', shotFromRow(pick('P7', 'E7', 14))],
    ['K6-lumber-2', shotFromRow(pick('K6', 'E6', 2))],
    ['P6-lumber-4', shotFromRow(pick('P6', 'E7', 4))],
    ['J1-lumber-4', shotFromRow(pick('J1', 'E4', 4))],
  ];
  const repeats = Number(process.argv.find(arg => arg.startsWith('--repeats='))?.slice(10) ?? 20);
  const tag = process.argv.find(arg => arg.startsWith('--tag='))?.slice(6) ?? 'a';
  const report = [];
  for (const [id, shot] of sets) {
    if (!shot || !Number.isFinite(shot.yaw)) { report.push({ id, missing: true }); continue; }
    const runs = [];
    for (let i = 0; i < repeats; i++) runs.push(runApproachShot(hk, LUMBER, shot));
    const first = runs[0];
    report.push({
      id, repeats, lean: round(first.leanEnd, 4), z: round(first.terminal.z, 3), hit: first.propHit,
      contacts: first.contacts, spread: runs.every(run => same(first, run)) ? 0 : runs.length,
    });
    say(`det ${tag} ${id} lean ${round(first.leanEnd, 4)} match ${report.at(-1).spread === 0}`);
  }
  const named = { railIndex: 1, originX: 0, yaw: 0, elevation: 22, charge: 0.55 };
  const rest = runApproachShot(hk, LUMBER, { railIndex: 1, originX: 0, yaw: 0, elevation: 30, charge: 0.5 }).leanEnd;
  const rested = Array.from({ length: repeats }, () => runApproachShot(hk, LUMBER, named, { prop: 'static', lean: rest, hold: false }));
  const standing = Array.from({ length: repeats }, () => runApproachShot(hk, LUMBER, named));
  report.push({ id: 'named-rest', repeats, both: rested[0].stepA && rested[0].stepB, z: round(rested[0].terminal.z, 3), spread: rested.every(run => same(rested[0], run)) ? 0 : 1 });
  report.push({ id: 'named-standing', repeats, lean: round(standing[0].leanEnd, 4), z: round(standing[0].terminal.z, 3), tread: standing[0].stepA || standing[0].stepB, spread: standing.every(run => same(standing[0], run)) ? 0 : 1 });
  const summary = { tag, build: buildIdentity(), repeats, pass: report.every(item => item.spread === 0 && !item.missing), report };
  writeJson(`determinism-${tag}.json`, summary);
  say(`det ${tag} pass ${summary.pass}`);
}

const phase = process.argv[2] ?? 'core';
const phases = { core, jitter: jitterPhase, wrong, follow, det: determinism };
if (!phases[phase]) {
  console.error(`unknown phase ${phase}`);
  process.exit(1);
}
await phases[phase]();
