import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import Havok from '@babylonjs/havok';
import { overpassPreset, SPATIAL_REFERENCES, spatialFamily } from './spatial-layout.mjs';
import { spatialHarness } from './spatial-harness.mjs';
const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
function compact(shot, keepSamples = false) {
  const extrema = rows => rows.length ? { samples: rows.length, minY: Math.min(...rows.map(row => row.position[1])), maxY: Math.max(...rows.map(row => row.position[1])) } : null;
  shot.transit = {
    underDeckOutbound: extrema(shot.ticks.filter(row => row.position[2] >= 32 && row.position[2] <= 40 && row.velocity[2] > 0)),
    underDeckInbound: extrema(shot.ticks.filter(row => row.position[2] >= 32 && row.position[2] <= 40 && row.velocity[2] < 0)),
    overWall: extrema(shot.ticks.filter(row => row.position[2] >= 45.07 && row.position[2] <= 46.93)),
    apex: Math.max(...shot.ticks.map(row => row.position[1])),
  };
  delete shot.ticks;
  if (!keepSamples) delete shot.samples;
  return shot;
}
const report={baseline:'0b151c5c94849b78ccda6c41a1755b66471e3fa2',measuredGitSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),authority:'Actual Havok, shared Worldcraft runtime, 120 Hz, NullEngine. No rendered timing or draw-call claim.',presets:{},shots:[],sensitivity:[],controls:[],lifecycle:[]};
const h=spatialHarness(havok,overpassPreset());
report.presets.raised={constructMs:h.constructMs,resources:h.resources()};
for(const [id,setup] of Object.entries(SPATIAL_REFERENCES)){
  const shot=h.shoot(setup,{points:true});shot.id=id;shot.family=spatialFamily(shot);report.shots.push(compact(shot, ['upper-carry','lower-return'].includes(id)));
  if(!['upper-carry','lower-return'].includes(id))continue;
  const rows=[];
  for(const [key,step] of [['yaw',.5],['elevation',.5],['charge',.01],['originX',.5]])for(const sign of [-1,1]){
    const next={...setup,[key]:Math.round((setup[key]+step*sign)*100)/100};
    const result=h.shoot(next);rows.push({key,delta:sign*step,setup:next,family:spatialFamily(result),terminal:result.terminal,contacts:result.contacts});
  }
  report.sensitivity.push({id,rows});
}
for(const control of ['no-deck']){
  const preset=overpassPreset({control});const replaceMs=h.load(preset);report.presets[control]={replaceMs,resources:h.resources()};
  for(const id of ['upper-carry','lower-return']){const shot=h.shoot(SPATIAL_REFERENCES[id],{points:true});shot.id=id;shot.control=control;shot.family=spatialFamily(shot);report.controls.push(compact(shot, true));}
}
for(let cycle=0;cycle<8;cycle++){
  for(const control of ['raised','no-deck']){
    const replaceMs=h.load(overpassPreset({control}));h.shoot(SPATIAL_REFERENCES['upper-carry']);
    const resetMs=h.load(overpassPreset({control}));report.lifecycle.push({cycle,control,replaceMs,resetMs,resources:h.resources(),heapUsed:process.memoryUsage().heapUsed});
  }
}
h.load(overpassPreset());
const repeat=h.shoot(SPATIAL_REFERENCES['upper-carry']),sceneSteps=h.shoot(SPATIAL_REFERENCES['upper-carry'],{sceneSteps:true});
const authority=r=>({terminal:r.terminal,contacts:r.contacts,redirects:r.redirects});
report.exactRepeat=JSON.stringify(authority(repeat))===JSON.stringify(authority(report.shots[0]));
report.sceneStepMatches=JSON.stringify(authority(sceneSteps))===JSON.stringify(authority(report.shots[0]));
report.afterRuntimeDispose=h.disposeRuntime();h.dispose();
const out=process.argv[2]??'docs/experiments/horizons/spatial/evidence.json';await writeFile(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({shots:report.shots.map(({id,family,terminal,contacts})=>({id,family,terminal,contacts})),sensitivity:report.sensitivity.map(({id,rows})=>({id,families:rows.map(r=>r.family)})),presets:report.presets,repeat:report.exactRepeat,sceneStepMatches:report.sceneStepMatches,afterRuntimeDispose:report.afterRuntimeDispose},null,2));
