import test from 'node:test';
import assert from 'node:assert/strict';
import {worldcraftTrailDashes} from '../lib/worldcraft-trails.js';
const point=(x,z=0)=>({x,y:0,z});
test('dense actual samples retain dash coverage across the entire before trail without mutating history',()=>{
 const points=Array.from({length:101},(_,i)=>Object.freeze(point(i/10)));
 const copy=structuredClone(points),lines=worldcraftTrailDashes(Object.freeze(points),1,1);
 assert.deepEqual(points,copy);
 const length=lines.reduce((sum,[a,b])=>sum+Math.hypot(b.x-a.x,b.z-a.z),0);
 assert.ok(Math.abs(length-5)<1e-8);
 for(let interval=0;interval<10;interval+=2)assert.ok(lines.some(([a,b])=>a.x>=interval-1e-8&&b.x<=interval+1+1e-8));
 assert.ok(lines.at(-1)[1].x>8.9);
});
test('dash phase follows corners and duplicate samples instead of inventing a shortcut',()=>{
 const lines=worldcraftTrailDashes([point(0),point(0),point(0,2),point(2,2)],1,1);
 assert.deepEqual(lines,[[point(0),point(0,1)],[point(0,2),point(1,2)]]);
 assert.deepEqual(worldcraftTrailDashes([]),[]);
 assert.throws(()=>worldcraftTrailDashes([point(0),point(NaN)]),/point/);
 assert.throws(()=>worldcraftTrailDashes([],0,1),/length/);
});
