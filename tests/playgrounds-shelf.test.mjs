import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlaygroundShelf,createBrowserPlaygroundShelf,validPlaygroundEntry} from '../lib/playgrounds-shelf.js';

const contract={layout:'playgrounds-test-v1',validateEnvironment:s=>s&&Object.keys(s).join(',')==='layout'&&s.layout==='fixed',station:()=>({id:'test-tee',label:'Test tee',x:0,z:0,y:4,yaw:0})};
const record={setup:{railIndex:1,yaw:0,elevation:20,charge:.5},station:contract.station(),environment:{layout:'fixed'},endEnvironment:{layout:'fixed'},reason:'first-ground-contact',elapsed:1,position:[0,0,10],contacts:[{body:'ground',count:1,first:1,last:1,point:{x:0,y:0,z:10}}],evidence:[]};
const path=[[0,0,6,0],[1,0,0,10]];
function memory(raw=null){let value=raw,writes=0;return {getItem:()=>value,setItem:(key,next)=>{value=next;writes++;},get value(){return value;},get writes(){return writes;}};}

test('ordinary and foreign configs never access browser storage',()=>{
 const host={get localStorage(){throw Error('Storage getter must remain untouched');}};
 assert.equal(createBrowserPlaygroundShelf(undefined,host),null);
 assert.equal(createBrowserPlaygroundShelf({...contract,layout:'historical-world'},host),null);
});
test('four voluntary keeps survive fresh loading without automatic overwrite and are detached copies',()=>{
 const storage=memory(),shelf=createPlaygroundShelf(contract,storage);
 for(let i=0;i<4;i++)assert.ok(shelf.keep(record,path,'4dab6e1'));
 const before=storage.value;
 assert.equal(shelf.keep(record,path,'4dab6e1'),null);assert.equal(storage.value,before);
 const fresh=createPlaygroundShelf(contract,storage),first=fresh.entries()[0];
 assert.deepEqual(first.record,record);assert.deepEqual(first.path,path);
 first.record.setup.charge=0;assert.equal(fresh.get(first.id).record.setup.charge,.5);
 fresh.remove(first.id);assert.equal(createPlaygroundShelf(contract,storage).entries().length,3);
});
test('legitimate dirty local builds keep their exact provenance through save and reload',()=>{
 const storage=memory(),shelf=createPlaygroundShelf(contract,storage),build='b48042a959-dirty';
 const kept=shelf.keep(record,path,build);
 assert.equal(kept.build,build);assert.equal(createPlaygroundShelf(contract,storage).get(kept.id).build,build);
 for(const invalid of ['b48042a959-dirty-dirty','b48042a959-extra','unknown-dirty',42]){
  assert.equal(validPlaygroundEntry({...kept,build:invalid},contract),false);
 }
});
test('foreign state, stations and non-finite or fabricated oversized paths are rejected',()=>{
 const entry=createPlaygroundShelf(contract,null).keep(record,path,'4dab6e1');
 for(const mutate of [e=>e.record.environment.layout='foreign',e=>e.record.endEnvironment.layout='foreign',e=>e.record.station.y=0,e=>e.record.setup.yaw=Infinity,e=>e.record.setup.originX=Infinity,e=>e.record.setup.foreign=true,e=>e.record.evidence=[null],e=>e.record.evidence=[{kind:'redirect',velocity:Infinity}],e=>e.record.contacts[0].last=2,e=>e.path[1][0]=2,e=>e.path[1][1]=500,e=>e.path=[[0,100,100,100]],e=>e.path=Array.from({length:603},()=>[0,0,0,0]),e=>e.layout='playgrounds-foreign-v1']){
  const candidate=structuredClone(entry);mutate(candidate);assert.equal(validPlaygroundEntry(candidate,contract),false);
 }
});
test('malformed saved bytes are never overwritten, including by remove or a new temporary Keep',()=>{
 const storage=memory('{broken'),shelf=createPlaygroundShelf(contract,storage);
 assert.match(shelf.warning(),/preserved/);assert.ok(shelf.keep(record,path,'4dab6e1'));
 shelf.remove(shelf.entries()[0].id);assert.equal(storage.value,'{broken');assert.equal(storage.writes,0);
});
test('blocked storage preserves in-memory chosen evidence with an explicit warning',()=>{
 const shelf=createPlaygroundShelf(contract,{getItem:()=>null,setItem(){throw Error('Quota');}});
 assert.ok(shelf.keep(record,path,'4dab6e1'));assert.equal(shelf.entries().length,1);assert.match(shelf.warning(),/unavailable/);
});
