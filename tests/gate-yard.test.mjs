import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {diverterHarness} from './helpers/diverter-physics.mjs';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {KICKER_PALLET,KICKER_SWITCH} from '../lib/kicker-pallet.js';
import {
  GATE_YARD_PALLET,GATE_YARD_LEVER,GATE_YARD_PROGRESS_KEY,GATE_YARD_LIBRARY_SUFFIX,GATE_YARD_SURVEY_DB,GATE_YARD_PALLET_KEY,
  parseGateYardArm,gateYardCarries,gateYardAddressState,gateYardLoadState,readCarryPallet,writeCarryPallet,
  gateYardContactCaption,gateYardLiveCaptions,gateYardResultDetail,annotateGateYardTicket,gateYardStopRecord,gateYardStudyExport,
  gateYardProgressEnvelope,gateYardProgressSlice,gateYardLibraryEnvelope,gateYardLibrarySlice,gateYardStorage,filterSurveyByArm,
} from '../lib/gate-yard.js';

const source = await readFile(new URL('../app/manners-game.tsx', import.meta.url), 'utf8');
const page = await readFile(new URL('../app/lab/gate-yard/page.tsx', import.meta.url), 'utf8');
const yard = await readFile(new URL('../lib/gate-yard.js', import.meta.url), 'utf8');
const kicker = await readFile(new URL('../lib/kicker-pallet.js', import.meta.url), 'utf8');
const jsx = source.slice(source.indexOf('<main className='));

test('gate yard route accepts only the two codes and stays off the shared pallet constants', () => {
  assert.equal(parseGateYardArm('m4'), 'm4');
  assert.equal(parseGateYardArm('t9'), 't9');
  assert.equal(parseGateYardArm('m4 '), null);
  assert.equal(parseGateYardArm('carry'), null);
  assert.match(page, /parseGateYardArm/);
  assert.match(page, /data-gate-yard="refused"/);
  assert.match(page, /<MannersGame gateYard arm=\{arm\} \/>/);
  assert.doesNotMatch(page, /KICKER_PALLET|KICKER_SWITCH/);
  assert.match(kicker, /x:-32,y:.5,z:39,width:10,height:.8,depth:8/);
  assert.match(kicker, /x:-39,y:2\.2,z:35,width:2\.4,height:3\.4,depth:\.7/);
  assert.deepEqual(KICKER_PALLET, {x:-32,y:.5,z:39,width:10,height:.8,depth:8});
  assert.equal(KICKER_SWITCH.y, 2.2);
  assert.equal(GATE_YARD_PALLET.width, KICKER_PALLET.width);
  assert.equal(GATE_YARD_PALLET.height, KICKER_PALLET.height);
  assert.equal(GATE_YARD_PALLET.depth, KICKER_PALLET.depth);
  assert.equal(GATE_YARD_LEVER.height, KICKER_SWITCH.height);
  assert.equal(GATE_YARD_LEVER.depth, KICKER_SWITCH.depth);
  assert.equal(GATE_YARD_LEVER.width, 5);
  assert.ok(GATE_YARD_LEVER.y - GATE_YARD_LEVER.height / 2 > 1);
  assert.match(yard, /states:KICKER_STATES/);
  assert.match(yard, /switchLabel:'LEVER'/);
  assert.match(yard, /label:'PALLET'/);
  assert.match(yard, /target,/);
});

test('arms share one DOM except the BUILD suffix', () => {
  assert.equal((jsx.match(/\barm\b/g) ?? []).length, 1);
  assert.match(jsx, /BUILD \{BUILD_ID\}\{gateYard \? ` \$\{arm\}` : ''\}/);
  assert.match(jsx, /data-gate-yard=\{gateYard\?"true":undefined\}/);
  assert.doesNotMatch(jsx, /data-arm|arm===/);
  assert.match(jsx, /gateYard\?'LEVER':<>SHOOT SWITCH/);
  assert.match(jsx, /gateYard\?'PALLET':<>FLOOR/);
  assert.match(jsx, /PALLET \$\{floorState\}/);
  assert.match(jsx, /!gateYard&&<Button type="button" className="line-result-retry"/);
  assert.match(jsx, /\{gateYard\?'Reset Card':'Reset Card · restore FLOOR A'\}/);
  assert.match(jsx, /\{!gateYard&&<small>FLOOR/);
  assert.match(source, /linecraftLab\s*\? collectLinecraftStepEvents\(previousLike,currentLike,hole,\[\.\.\.flight\.mechanismTags\],\[\.\.\.flight\.deliveryRoutes\]\)/);
  assert.match(source, /linecraftLab\?linecraftStorage\(storage\)/);
  assert.match(source, /linecraftLab\?"rail-golf-linecraft-survey"/);
  assert.match(source, /const saved = linecraftLab\?\{\}:intentLab\?\{\}:loadProgress/);
  assert.match(source, /if\(!intentLab&&!linecraftLab\)try/);
  assert.match(source, /hideSkyToken:linecraftLab\|\|gateYardRef\.current/);
  assert.match(source, /linecraftLab\|\|gateYardRef\.current \? \[\] : RANGE_TARGETS/);
  assert.match(source, /intentLab \? 3 : gateYardRef\.current \? 3 : timberReceiver \? 3 : resolveSessionStartHoleIndex/);
  assert.match(source, /contactKind === 'first-kiss' && !gateYardRef\.current/);
  assert.match(source, /rail-golf:gate-yard:\$\{gateArmRef\.current\}:tab-id/);
});

test('contact names do not depend on pallet state', () => {
  assert.equal(gateYardContactCaption('floor-a'), 'PALLET');
  assert.equal(gateYardContactCaption('floor-b'), 'PALLET');
  assert.equal(gateYardContactCaption('switch-a'), 'LEVER');
  assert.equal(gateYardContactCaption('switch-b'), 'LEVER');
  assert.equal(gateYardContactCaption('bank-a'), null);
  assert.equal(gateYardResultDetail([], true), 'GROUND');
  assert.equal(gateYardResultDetail(['BANK A'], true), 'BANK A → GROUND');
  assert.equal(gateYardResultDetail(['PALLET'], true), 'PALLET → GROUND');
  assert.equal(gateYardResultDetail(['LEVER', 'PALLET'], true), 'LEVER → PALLET → GROUND');
  assert.equal(gateYardResultDetail(['PALLET A', 'FLOOR A BOUNCE'], true), 'PALLET → GROUND');
  assert.doesNotMatch(gateYardResultDetail(['LEVER', 'PALLET A'], true), /PALLET [AB]/);
  const captions = gateYardLiveCaptions([
    {kind:'switch-use', label:'PALLET B'},
    {kind:'redirect', feature:'gate-yard-pallet', label:'PALLET'},
    {kind:'pad-activation'},
  ]);
  assert.deepEqual(captions.map(item => item.label), ['LEVER', 'PALLET', 'SKIP']);
});

test('lifecycle is carry for m4 and address A for t9, including reload', () => {
  for (const action of ['adjust', 'retry', 'recall', 'reset']) {
    assert.equal(gateYardAddressState('m4', 'B', action), action === 'reset' ? 'A' : 'B');
    assert.equal(gateYardAddressState('m4', 'A', action), 'A');
    assert.equal(gateYardAddressState('t9', 'B', action), 'A');
    assert.equal(gateYardAddressState('t9', 'A', action), 'A');
  }
  let reads = 0;
  const session = {getItem(){reads += 1; return 'B';}, setItem(){}};
  assert.equal(gateYardLoadState('t9', session), 'A');
  assert.equal(reads, 0);
  assert.equal(gateYardLoadState('m4', session), 'B');
  assert.equal(reads, 1);
  assert.equal(gateYardCarries('m4'), true);
  assert.equal(gateYardCarries('t9'), false);
  const values = new Map();
  const memory = {getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value)};
  writeCarryPallet(memory, 'B');
  assert.equal(values.get(GATE_YARD_PALLET_KEY), 'B');
  assert.equal(readCarryPallet(memory), 'B');
  assert.match(source, /gateYardAddressState\(gateArmRef\.current,floorStateRef\.current/);
  assert.match(source, /gateYardCarries\(gateArmRef\.current\)/);
  assert.match(source, /gateYardLoadState\(gateArmRef\.current,window\.sessionStorage\)/);
});

test('storage, export and stop records stay in the gate-yard namespace and count per arm', async () => {
  assert.equal(GATE_YARD_PROGRESS_KEY, 'rail-golf-gate-yard-v1');
  assert.equal(GATE_YARD_LIBRARY_SUFFIX, '-gate-yard-v1');
  assert.equal(GATE_YARD_SURVEY_DB, 'rail-golf-gate-yard-survey');
  const stored = gateYardProgressEnvelope(null, 'm4', {'open-line':{attempts:2}});
  const withT9 = gateYardProgressEnvelope(stored, 't9', {'open-line':{attempts:1}});
  assert.equal(gateYardProgressSlice(withT9, 'm4')['open-line'].attempts, 2);
  assert.equal(gateYardProgressSlice(withT9, 't9')['open-line'].attempts, 1);
  const library = gateYardLibraryEnvelope(null, 'm4', {'open-line':{recent:[], wins:[]}});
  assert.equal(gateYardLibrarySlice(library, 't9'), null);
  assert.equal(gateYardLibrarySlice(library, 'm4').version, 1);
  const backing = new Map();
  const storage = {get length(){return backing.size;}, key:index=>[...backing.keys()][index]??null, getItem:key=>backing.get(key)??null, setItem:(key,value)=>backing.set(key,value), removeItem:key=>backing.delete(key)};
  const wrapped = gateYardStorage(storage, 'm4');
  wrapped.setItem('rail-golf:line-actions:session', '[]');
  assert.equal([...backing.keys()][0], 'rail-golf:gate-yard:m4:rail-golf:line-actions:session');
  const records = [];
  const archive = {async append(record){records.push(record); return {count:records.length, bytes:1, evicted:0};}, async read(){return {records, evicted:0};}, async clear(){records.length = 0;}};
  const filtered = filterSurveyByArm(archive, 'm4');
  await filtered.append({id:'1', arm:'m4'});
  await filtered.append({id:'2', arm:'t9'});
  const saved = await filtered.read();
  assert.equal(saved.records.length, 1);
  assert.equal(saved.records[0].arm, 'm4');
  const ticket = annotateGateYardTicket({environment:{floor:'A'}}, 'm4', 'adjust', 'B', [{kind:'switch-b'}], [{kind:'switch-use'}]);
  assert.equal(ticket.arm, 'm4');
  assert.equal(ticket.setupRelation, 'adjust');
  assert.deepEqual(ticket.environmentAfter, {floor:'B'});
  assert.equal(ticket.leverContact, true);
  assert.equal(ticket.palletContact, false);
  const stop = gateYardStopRecord('t9', 4);
  assert.equal(stop.kind, 'stop');
  assert.equal(stop.arm, 't9');
  const exported = gateYardStudyExport('m4', {records:[ticket, {arm:'t9'}]}, [stop]);
  assert.equal(exported.study, 'rail-golf-gate-yard-v1');
  assert.equal(exported.attempts.length, 1);
  assert.equal(exported.attempts[0].startingPallet, 'A');
  assert.equal(exported.attempts[0].endingPallet, 'B');
  assert.equal(exported.attempts[0].setupRelation, 'adjust');
  assert.equal(exported.stops.length, 1);
  assert.match(source, /rail-golf:gate-yard:\$\{arm\}:session-stop/);
  assert.match(source, /gateYard \? record\.attempts/);
  assert.match(source, /gateYardResultDetail/);
});

const hv = await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))});
const hole = selectOpenLineStation('gate');
const REFERENCE = {railIndex:1, originX:0, yaw:-20, elevation:15, charge:0.3};

function gateHarness(initial='A'){
  return diverterHarness(hv, initial, true, hole, {scoreLab:true, linecraft:true, gateYard:true});
}

test('reference shot flips the pallet both ways and the yard draws no roost', () => {
  const h = gateHarness('A');
  try {
    const names = h.scene.meshes.map(mesh => mesh.name);
    assert.equal(names.some(name => name === 'gallery-roost' || name === 'lumber-receiving' || name === 'mill-bell' || name.includes('sky-token') || name.includes('target-rim')), false);
    assert.equal(names.some(name => name.includes('delivery-pad')), true);
    assert.equal(names.some(name => name.includes('gate-yard-switch')), true);
    assert.equal(names.some(name => name.includes('gate-yard-bounce-floor')), true);
    h.world.setState('A');
    const fromA = h.shoot(REFERENCE);
    assert.equal(fromA.tags.some(tag => tag.startsWith('switch-')), true);
    assert.equal(fromA.end, 'B');
    h.world.setState('B');
    const fromB = h.shoot(REFERENCE);
    assert.equal(fromB.tags.some(tag => tag.startsWith('switch-')), true);
    assert.equal(fromB.end, 'A');
  } finally { h.dispose(); }
});

test('coarse Gate grid: yaw ±30 strikes the lever often enough, and the pallet still changes the line', () => {
  const shots = [];
  for (let yaw = -50; yaw <= 50; yaw += 5) for (let elevation = 10; elevation <= 60; elevation += 5) for (let power = 30; power <= 100; power += 10)
    shots.push({railIndex:1, originX:0, yaw, elevation, charge:power / 100});
  assert.equal(shots.length, 1848);
  const h = gateHarness('A');
  let leverHits = 0, bandHits = 0, bandShots = 0, changed = 0, bandChanged = 0, skipA = 0, skipB = 0;
  const strikers = [];
  const rows = [];
  try {
    for (const shot of shots) {
      h.world.setState('A');
      const a = h.shoot(shot);
      h.world.setState('B');
      const b = h.shoot(shot);
      const strikeA = a.tags.some(tag => tag.startsWith('switch-'));
      const strikeB = b.tags.some(tag => tag.startsWith('switch-'));
      const inBand = Math.abs(shot.yaw) <= 30;
      if (strikeA) leverHits += 1;
      if (inBand) bandShots += 1;
      if (inBand && strikeA) bandHits += 1;
      if (a.tags.includes('boost')) skipA += 1;
      if (b.tags.includes('boost')) skipB += 1;
      const setA = [...new Set(a.tags)].sort().join('|');
      const setB = [...new Set(b.tags)].sort().join('|');
      const dist = a.point && b.point ? Math.hypot(a.point[0] - b.point[0], a.point[1] - b.point[1], a.point[2] - b.point[2]) : Infinity;
      const didChange = dist > 2 || setA !== setB;
      if (didChange) changed += 1;
      if (inBand && didChange) bandChanged += 1;
      if (strikeA || strikeB) strikers.push(shot);
      rows.push({...shot, didChange});
    }
  } finally { h.dispose(); }
  const neighbourhood = rows.filter(row => strikers.some(setup => Math.abs(row.yaw - setup.yaw) <= 10 && Math.abs(row.elevation - setup.elevation) <= 10 && Math.abs(row.charge - setup.charge) <= 0.2));
  const neighbourhoodChanged = neighbourhood.filter(row => row.didChange).length;
  const bandRate = bandHits / bandShots;
  assert.equal(bandShots, 1144);
  assert.ok(bandRate >= 0.2, `yaw ±30 lever ${bandHits}/${bandShots}`);
  assert.ok(skipA > 0 && skipB > 0, `skip ${skipA}/${skipB}`);
  assert.ok(changed > 0, `outcome change ${changed}/1848`);
  console.log(JSON.stringify({
    fullStrike: `${leverHits}/${shots.length}`,
    yawBandStrike: `${bandHits}/${bandShots}`,
    fullChanged: `${changed}/${shots.length}`,
    yawBandChanged: `${bandChanged}/${bandShots}`,
    neighbourhoodChanged: `${neighbourhoodChanged}/${neighbourhood.length}`,
    skip: `${skipA}/${skipB}`,
  }));
});
