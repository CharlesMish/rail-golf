import test from 'node:test';
import assert from 'node:assert/strict';
import {saddleGeometry,SADDLE_PROOF} from '../lib/playgrounds-saddle.js';
import {saddleHarness} from '../scripts/playgrounds/saddle-harness.mjs';
const shot={railIndex:1,yaw:5,elevation:16,charge:.3};
test('saddle solid is closed and agrees with the authored top extents',()=>{
 const data=saddleGeometry();const edges=new Map();for(let i=0;i<data.indices.length;i+=3){const t=data.indices.slice(i,i+3);for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3],key=`${Math.min(a,b)},${Math.max(a,b)}`,edge=edges.get(key)??{count:0,orientation:0};edge.count++;edge.orientation+=a<b?1:-1;edges.set(key,edge);}}assert.ok([...edges.values()].every(e=>e.count===2&&e.orientation===0));assert.ok(data.positions.every(Number.isFinite));assert.equal(Math.max(...data.positions.filter((_,i)=>i%3===0)),SADDLE_PROOF.maxX);assert.throws(()=>saddleGeometry('custom'));assert.throws(()=>saddleGeometry('ridge',.123));
});
test('unchanged projectile can travel near ridge, while high arrival remains bouncing',()=>{
 const h=saddleHarness();try{const carry=h.shoot(shot),bounce=h.shoot({...shot,elevation:30,charge:.55});assert.equal(carry.record.reason,'first-ground-contact');assert.ok(carry.metrics.maxNearFaceStreakSeconds>3);assert.ok(carry.impacts.some(c=>c.body==='vs-carrying-face'&&c.normal&&Math.abs(c.normal[1])>.9));assert.ok(bounce.metrics.maxNearFaceStreakSeconds<.2);assert.ok(bounce.record.elapsed<10);}finally{assert.ok(Object.values(h.dispose()).every(x=>x===0));}
});
test('ridge changes side from the same left-rail setup compared with flat BOX',()=>{
 const ridge=saddleHarness(),flat=saddleHarness({control:'box'});try{const a=ridge.shoot({...shot,railIndex:0}),b=flat.shoot({...shot,railIndex:0});assert.ok(a.record.position[0]<-3);assert.ok(b.record.position[0]>1);assert.ok(a.metrics.maxNearFaceStreakSeconds>2);assert.ok(b.metrics.maxNearFaceStreakSeconds>2);}finally{ridge.dispose();flat.dispose();}
});
test('same geometry and setup reproduces exact actual history in a fresh scene',()=>{
 const a=saddleHarness(),b=saddleHarness();try{assert.deepEqual(a.shoot(shot),b.shoot(shot));}finally{a.dispose();b.dispose();}
});
