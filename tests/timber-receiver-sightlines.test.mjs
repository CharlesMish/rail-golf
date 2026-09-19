import test from 'node:test';
import assert from 'node:assert/strict';
import {Logger} from '@babylonjs/core';
import {TIMBER_RECEIVER} from '../lib/timber-receiver.js';
import {receiverProjection} from './helpers/receiver-sightlines.mjs';
Logger.LogLevels=0;
const v0={x:43,y:7,z:148,width:1.2,height:14,depth:26,yaw:-25};
const viewports=[[1440,900],[844,390],[390,844]];

test('receiver-directed FAMILIAR views keep the shortened wall bounded across stations, rails and aspect ratios',()=>{
 for(const station of ['gate','lumber'])for(const[width,height]of viewports){
  let worst=0,oldWorst=0;
  for(const railIndex of [0,1,2])for(const yaw of station==='gate'?[10,15,20,25,30]:[-40,-45,-50,-55,-60,-65,-70]){
   const options={station,railIndex,yaw,width,height},before=receiverProjection(v0,options),after=receiverProjection(TIMBER_RECEIVER,options);
   worst=Math.max(worst,after.area);oldWorst=Math.max(oldWorst,before.area);
   assert.ok(after.area>0,'receiver still has a visible projected surface');
   assert.ok(after.area<(station==='gate'?.008:.09),`${station} ${width}×${height} rail${railIndex+1} yaw${yaw}: ${after.area}`);
   assert.ok(after.span.height<(station==='gate'?.10:.43),'the wall does not occupy the full aiming-view height');
  }
  assert.ok(worst<oldWorst*(station==='gate'?.65:.26),'smaller silhouette with unchanged camera');
 }
});

test('Walk can aim at the receiver while keeping existing lumber and tread context beside it',()=>{
 const frame=receiverProjection(TIMBER_RECEIVER,{station:'lumber',railIndex:1,yaw:-45,width:1440,height:900});
 for(const name of ['farLumber','middleTread','highTreadEdge']){
  assert.equal(frame.context[name].inFrame,true,name);
  assert.equal(frame.context[name].occludedByReceiver,false,name);
 }
 assert.ok(frame.area<.06);
});

test('the known v0 large-yaw receiver family has materially more geometric context in the identical FAMILIAR camera',()=>{
 const options={station:'lumber',railIndex:1,yaw:-65,width:1440,height:900};
 const before=receiverProjection(v0,options),after=receiverProjection(TIMBER_RECEIVER,options);
 assert.ok(before.area>.29&&before.span.height>.74);
 assert.ok(after.area<.067&&after.span.height<.375);
 assert.equal(after.context.farLumber.inFrame,true);
 assert.equal(after.context.farLumber.occludedByReceiver,false);
});
