import test from 'node:test';
import assert from 'node:assert/strict';
import {expandGrid,runAtlas,ATLAS_CONFIGS,landingSvg} from '../scripts/playgrounds/outcome-atlas.mjs';

const grid={railIndex:[2],yaw:[0],elevation:[18],powerPercent:[55],phaseTick:[0]};

test('atlas accepts actual fine-control detents and rejects accidental broad/untrusted grids',()=>{
  assert.equal(expandGrid({...grid,yaw:[-.5,0,.5]}).length,3);
  assert.equal(expandGrid({...grid,yaw:[-.5,0,.5]})[0].setup.charge,.55);
  for(const patch of [{yaw:[.1]},{elevation:[4.5]},{powerPercent:[55.5]},{railIndex:[3]},{phaseTick:[1]},{yaw:[0,0]},{script:'https://example.invalid/code.js'}])assert.throws(()=>expandGrid({...grid,...patch}));
  assert.throws(()=>expandGrid({...grid,yaw:Array.from({length:65},(_,i)=>i/2)}));
  assert.equal(expandGrid({...grid,yaw:Array.from({length:65},(_,i)=>i/2)},{limit:65}).length,65);
  assert.throws(()=>expandGrid(grid,{limit:321}));
  assert.throws(()=>expandGrid(grid,{limit:NaN}));
  assert.equal(expandGrid({...grid,phaseTick:[1439]},{phaseTicks:1440})[0].phaseTick,1439);
  assert.throws(()=>expandGrid({...grid,phaseTick:[1440]},{phaseTicks:1440}));
});

test('atlas records real phase-dependent Havok evidence, replay and absent-gate control',async()=>{
  const phases={...grid,phaseTick:[0,360]};
  const first=await runAtlas(ATLAS_CONFIGS['swing-gate'],phases);
  const replay=await runAtlas(ATLAS_CONFIGS['swing-gate'],phases);
  const absent=await runAtlas(ATLAS_CONFIGS['swing-gate-absent'],phases);
  assert.deepEqual(first.records,replay.records);
  assert.equal(first.records[0].environmentBefore.gateTick,'0');
  assert.equal(first.records[1].environmentBefore.gateTick,'360');
  assert.notDeepEqual(first.records[0].actualPath,first.records[1].actualPath);
  assert.deepEqual(absent.records[0].actualPath,absent.records[1].actualPath);
  for(const result of [first,replay,absent]){
    assert.equal(result.simulation.runtime,'createSpatialSession');
    assert.equal(result.simulation.hz,120);
    assert.deepEqual(result.resources.idle,result.resources.afterReset);
    assert.equal(result.resources.afterDispose.bodies,0);
    assert.equal(result.resources.afterDispose.meshes,0);
    assert.equal(result.resources.afterDispose.shadowCasters,0);
    assert.equal(result.summary.shots,2);
    for(const record of result.records){
      assert.ok(record.contactEvents.length>0);
      assert.equal(record.actualPath[0][0],0);
      assert.equal(record.actualPath.at(-1)[0],record.terminal.tick);
      assert.deepEqual(record.actualPath.at(-1).slice(1),record.terminal.position);
      assert.equal(record.truncation.droppedContactEvents,0);
      assert.equal(record.station.id,'swing-gate-apron');
      assert.equal(record.terminal.reason,'first-ground-contact');
      for(const contact of record.contactEvents){
        assert.equal(contact.step[1]-contact.step[0],1);
        assert.equal(contact.incoming.length,3);assert.equal(contact.outgoing.length,3);
        assert.equal(contact.normal.length,3);assert.equal(contact.point.length,3);
      }
    }
  }
  assert.ok(first.summary.surfaceCoverage.some(s=>s.feature==='swing-gate'&&s.hitShots>0));
  assert.ok(!absent.catalog.some(s=>s.feature==='swing-gate'));
  assert.match(landingSvg(first),/measured terminal positions/);
  assert.match(landingSvg(first),/shot-001/);
});

test('atlas supports an existing static elevated world without inventing environment state',async()=>{
  const result=await runAtlas(ATLAS_CONFIGS['vertical-yard'],{railIndex:[1],yaw:[0],elevation:[28],powerPercent:[65],phaseTick:[0]});
  const record=result.records[0];
  assert.equal(record.station.y,8);
  assert.deepEqual(record.environmentBefore,{});
  assert.deepEqual(record.environmentAtTerminal,{});
  assert.equal(result.resources.idle.animatedBodies,0);
  assert.ok(result.catalog.length>7);
  assert.deepEqual(result.resources.idle,result.resources.afterReset);
  for(const value of Object.values(result.resources.afterDispose))assert.equal(value,0);
});
