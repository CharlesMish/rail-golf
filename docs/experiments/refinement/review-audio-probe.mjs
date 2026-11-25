#!/usr/bin/env node
// Independent cross-world record/presentation boundary probe, using real Havok.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import Havok from '@babylonjs/havok';
const source=resolve(process.argv[2]??process.cwd());
const load=path=>import(pathToFileURL(resolve(source,path)));
const {createRangeHarness}=await load('scripts/range/run.mjs');
const {foundryRecord}=await load('lib/worldcraft-foundry.js');
const {rangeOpeningSetup}=await load('lib/worldcraft-range.js');
const {packWorldcraftLine,captureWorldSnapshot}=await load('lib/worldcraft-model.js');
const {performanceFromResonance,voiceImpact}=await load('lib/worldcraft-resonance.js');
const {validateLoopLine,createLoopPlan}=await load('lib/playability-loops.js');
const {captureCounterlineRecording,validateCounterlineRecording,counterlineRecordedImpacts}=await load('lib/counterline-recording.js');
const {createCounterlinePair,validateCounterlinePair}=await load('lib/counterline.js');
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
const havok=await Havok({wasmBinary:await readFile(resolve(source,'node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'))});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const raw=shot=>({terminal:shot.terminal,contacts:shot.contacts,performance:performanceFromResonance(shot.resonance),pathHash:hash(shot.samples)});
const descending=foundryRecord('descending-resonance'),terraces=foundryRecord('chime-terraces');
const seam={railIndex:1,originX:0,yaw:-4,elevation:12,charge:.8};
const rampSeam={railIndex:1,originX:0,yaw:4,elevation:20,charge:.35};
const stable=descending.manifest.testedShots.find(s=>s.id==='descent').setup;
const construct=before=>{
 const first=before.length?foundryRecord(before[0]):descending,h=createRangeHarness(havok,first.world,sha);h.runtime.setDynamics('normal-speed');
 for(const id of before){const entry=foundryRecord(id);h.shoot(entry.world,rangeOpeningSetup(entry.preset));}
 return h;
};
const construction=[];
for(const before of [[],[],['chime-terraces','chime-fan','chime-garden']]){
 const h=construct(before);try{construction.push({before,seam:raw(h.shoot(descending.world,seam)),rampSeam:raw(h.shoot(descending.world,rampSeam)),stable:raw(h.shoot(descending.world,stable))});}finally{h.dispose();}
}
assert.deepEqual(construction[0],construction[1]);
assert.notDeepEqual(construction[0].seam,construction[2].seam);
assert.notDeepEqual(construction[0].rampSeam,construction[2].rampSeam);
assert.deepEqual(construction[0].stable,construction[2].stable);
const captures=[];
for(const [entry,setup,bankVoice]of [[descending,stable,'tuned-even'],[terraces,terraces.manifest.testedShots.find(s=>s.id!=='opening').setup,null]]){
 const h=createRangeHarness(havok,entry.world,sha);h.runtime.setDynamics('normal-speed');
 try{
  const shot=h.shoot(entry.world,setup),line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(shot.world,sha),setup:shot.setup,launch:shot.launch,points:shot.samples,events:shot.evidence,contacts:shot.contacts,terminal:shot.terminal,performance:performanceFromResonance(shot.resonance)});
  const capture=captureCounterlineRecording(line,shot.resonance,{version:1,dynamics:'normal-speed',bankVoice});
  assert.deepEqual(capture.line,line);assert.deepEqual(validateCounterlineRecording(JSON.parse(JSON.stringify(capture))),capture);assert.deepEqual(validateLoopLine(capture.line),line);
  const recorded=counterlineRecordedImpacts(line,capture.acoustics);
  recorded.forEach((impact,i)=>{const live=bankVoice?voiceImpact(shot.resonance.impacts[i],bankVoice):shot.resonance.impacts[i];for(const key of ['time','note','hz','gain','sound','strike'])assert.equal(impact[key],live[key],`${entry.manifest.id}:${key}`);});
  assert.deepEqual(counterlineRecordedImpacts(line),line.performance.impacts,'Unannotated legacy data must preserve stored gains, pitches and timing');
  captures.push(capture);
 }finally{h.dispose();}
}
const legacy=createCounterlinePair(captures[0].line,captures[1].line),captured=createCounterlinePair(captures[0].line,captures[1].line,undefined,captures.map(c=>c.acoustics));
assert.equal(legacy.version,1);assert.equal(captured.version,2);
assert.deepEqual(validateCounterlinePair(JSON.parse(JSON.stringify(legacy))),legacy);
assert.deepEqual(validateCounterlinePair(JSON.parse(JSON.stringify(captured))),captured);
assert.deepEqual(createLoopPlan(captures.map(c=>c.line)).sources,captures.map(c=>c.line),'Historical Contact Loops still accepts the unchanged physical lines');
const corrupt=structuredClone(captures[0]);corrupt.acoustics.normalSpeeds[0]+=.1;assert.throws(()=>validateCounterlineRecording(corrupt));
const incompatible=structuredClone(captures[0]);incompatible.acoustics.profile.dynamics='total-speed';assert.throws(()=>validateCounterlineRecording(incompatible));
const files=['lib/counterline.js','lib/counterline-recording.js','lib/worldcraft-runtime.js','lib/worldcraft-resonance.js'],sourceHashes={};for(const file of files)sourceHashes[file]=createHash('sha256').update(await readFile(resolve(source,file))).digest('hex');
const report={sourceSha:sha,sourceModified:Boolean(execFileSync('git',['status','--porcelain','--',...files],{cwd:source,encoding:'utf8'}).trim()),sourceHashes,authority:'Independent actual Havok and record/playback-parameter checks. No rendered/live audio or musical enjoyment claim.',constructionSensitivity:{seamSetup:seam,rampSeamSetup:rampSeam,stableSetup:stable,freshRepeatExact:true,seamChangesAfterHistoricalBuildOrder:true,stablePhraseExact:true,runs:construction},recordBoundaries:{worlds:captures.map(c=>c.line.worldSnapshot.world.name),physicalLineBytesPreserved:true,recordRoundtrip:true,voicedLiveAndRecordedParametersExact:true,legacyGainsUnchanged:true,pairV1Roundtrip:true,pairV2Roundtrip:true,contactLoopsAcceptsPhysicalLines:true,mismatchedFaceSpeedRejected:true,incompatibleTotalSpeedTunedProfileRejected:true}};
await writeFile(process.argv[3]??'docs/experiments/refinement/review-audio-evidence.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sourceSha:sha,constructionSensitivity:report.constructionSensitivity.stablePhraseExact,boundaries:report.recordBoundaries}));
