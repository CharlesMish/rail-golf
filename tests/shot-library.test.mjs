import test from 'node:test';
import assert from 'node:assert/strict';
import { COURTYARD_HOLES } from '../lib/courtyard.js';
import { HOLES, RAIL_RULES, chargeToSpeed, speedToCharge, legacyChargeToCurrent, chargeFromHold, clampYaw, clampElevation } from '../lib/rail-golf-v02.js';
import { readDeliveryBook } from '../lib/delivery-routes.js';
import { packLine, collectLine, normalizeShotLibrary, lineFamily } from '../lib/shot-library.js';

const holes = [...HOLES,...COURTYARD_HOLES];
function line(hole, id=1, kinds=['step-a','step-b','step-c'], outcome='double') {
  return { holeId:hole.id, stationId:hole.station?.id ?? 'gate', windId:hole.wind.id,
    railIndex:1, yaw:0, elevation:30, charge:.46, projectileId:id, outcome, receipt:'A recorded shot',
    points:Array.from({length:850},(_,i)=>({x:i/10,y:Math.sin(i/100)*10+12,z:i/5})),
    contacts:[...kinds,'first-kiss'].map((kind,i)=>({id:`${id}-${i}`,kind,point:{x:22,y:8-i,z:122-i*20}})),
  };
}
const reload = (hole,shelf) => normalizeShotLibrary(JSON.parse(JSON.stringify({version:1,holes:{[hole.id]:{
  recent:shelf.recent.map(packLine), wins:shelf.wins.map(packLine),
}}})),holes)[hole.id];

test('every card stores a bounded actual trail, restores station and exact launch speed after reload',()=>{
  for(const hole of holes) {
    const shot=line(hole);
    const saved=reload(hole,collectLine(undefined,shot));
    const restored=saved.wins[0];
    assert.equal(chargeToSpeed(restored.charge),chargeToSpeed(shot.charge));
    assert.equal(restored.stationId,shot.stationId);
    assert.equal(restored.points.length,320);
    assert.deepEqual(restored.points[0],shot.points[0]);
    assert.deepEqual(restored.points.at(-1),shot.points.at(-1));
    assert.deepEqual(restored.contacts.map(c=>c.point),shot.contacts.map(c=>c.point));
    assert.equal(saved.recent[0].projectileId,shot.projectileId);
  }
});

test('a cascade plus bank is a separate winning family; repeated lines replace only their family',()=>{
  const hole=COURTYARD_HOLES[2], cascade=line(hole), bank=line(hole,2,['step-a','step-b','step-c','bank-b']);
  let shelf=collectLine(collectLine(undefined,cascade),bank);
  for(let id=3;id<12;id++) shelf=collectLine(shelf,line(hole,id,[],id%2?'miss':null));
  shelf=reload(hole,shelf);
  assert.deepEqual(shelf.wins.map(s=>s.projectileId),[2,1]);
  assert.deepEqual(shelf.recent.map(s=>s.projectileId),[11,10,9]);
  shelf=collectLine(shelf,{...cascade,projectileId:12});
  assert.deepEqual(shelf.wins.map(s=>s.projectileId),[12,2]);
  assert.notEqual(lineFamily(cascade),lineFamily(bank));
});

test('six distinct winning contact families are retained independently of recent attempts',()=>{
  const hole=COURTYARD_HOLES[0]; let shelf;
  for(const [i,kinds] of [[],['sky'],['mill'],['boost'],['bank-a'],['bank-b'],['mill','sky']].entries()) {
    shelf=collectLine(shelf,line(hole,i+1,kinds,'ace'));
  }
  assert.equal(shelf.wins.length,6); assert.equal(shelf.recent.length,3);
  assert.deepEqual(reload(hole,shelf).wins.map(s=>s.projectileId),[7,6,5,4,3,2]);
});

test('storage cannot restore foreign stations, nonfinite geometry, unsupported versions or invalid inputs',()=>{
  const hole=COURTYARD_HOLES[2], good=packLine(line(hole));
  for(const bad of [{stationId:'gate'},{windId:'other'},{speed:100},{yaw:Infinity},{elevation:90},
    {railIndex:.5},{projectileId:NaN},{points:[{x:null,y:2,z:3}]},{contacts:[{kind:'fake',point:{x:0,y:0,z:0}}]},
    {points:Array(321).fill({x:0,y:0,z:0})}]) {
    const data={version:1,holes:{[hole.id]:{recent:[{...good,...bad}],wins:[{...good,...bad}]}}};
    assert.deepEqual(normalizeShotLibrary(data,holes)[hole.id],{recent:[],wins:[]});
  }
  assert.deepEqual(normalizeShotLibrary({version:2,holes:{}},holes),{});
  assert.deepEqual(normalizeShotLibrary(null,holes),{});
});

test('legacy Delivery saves migrate once, preserving physical speed without changing earned routes',()=>{
  const legacy={direct:{railIndex:1,yaw:0,elevation:42,charge:.89},mill:{railIndex:1,yaw:-14,elevation:65,charge:1}};
  const converted=readDeliveryBook(null,legacy);
  assert.deepEqual(Object.keys(converted),Object.keys(legacy));
  for(const id of Object.keys(legacy)) assert.ok(Math.abs(chargeToSpeed(converted[id].charge)-(22+21*legacy[id].charge))<1e-12);
  assert.deepEqual(readDeliveryBook(JSON.parse(JSON.stringify(converted)),legacy),converted);
  assert.deepEqual(readDeliveryBook({},legacy),{});
  assert.equal(legacy.direct.charge,.89);
});

test('charge starts gently, is continuous and monotonic, and gives long shots a slower top end',()=>{
  assert.equal(chargeToSpeed(0),6); assert.equal(chargeToSpeed(1),43);
  assert.equal(chargeFromHold(0),0); assert.equal(chargeFromHold(2000),.8); assert.equal(chargeFromHold(3000),1);
  assert.ok(Math.abs(chargeFromHold(1999.999)-chargeFromHold(2000.001))<.000001);
  for(let ms=1;ms<=3000;ms++) assert.ok(chargeFromHold(ms)>chargeFromHold(ms-1));
  assert.ok(chargeFromHold(2600)-chargeFromHold(2500) < chargeFromHold(1600)-chargeFromHold(1500));
  const cascade=legacyChargeToCurrent(.05), milliseconds=cascade/.4*1000;
  assert.ok(milliseconds>1000 && milliseconds<1300);
  assert.ok(Math.abs(chargeToSpeed(chargeFromHold(milliseconds))-23.05)<1e-12);
  for(const speed of [6,12,22,23.05,35,43]) assert.ok(Math.abs(chargeToSpeed(speedToCharge(speed))-speed)<1e-12);
  assert.equal(clampYaw(-90),-70); assert.equal(clampYaw(90),70);
  assert.equal(clampElevation(0),5); assert.equal(clampElevation(90),85);
  assert.equal(RAIL_RULES.chargeSeconds,3);
});
