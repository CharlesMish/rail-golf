import {RAIL_RULES,chargeToSpeed} from './rail-golf-v02.js';

// Worldcraft is an isolated authoring format. Neither its documents nor its
// recorded lines are inputs to existing progress, score, or lab save formats.
export const WORLDCRAFT_FORMAT='rail-golf-worldcraft';
export const WORLDCRAFT_VERSION=1;
export const WORLDCRAFT_CATALOG_VERSION='worldcraft-prefabs-v1';
export const WORLDCRAFT_PHYSICS_CONTRACT='rail-golf-v02-worldcraft-v1';
export const WORLDCRAFT_STORAGE_PREFIX='rail-golf:worldcraft:v1:';
export const WORLDCRAFT_LIMITS=Object.freeze({objects:12,worldSlots:4,lineSlots:4,importBytes:32768,lineBytes:262144,points:2048,events:1024,history:100});
export const WORLDCRAFT_BOUNDS=Object.freeze({minX:-30,maxX:30,minZ:10,maxZ:96});
export const WORLDCRAFT_LAUNCHER_CORRIDOR=Object.freeze({minX:-12,maxX:12,minZ:-8,maxZ:10});
export const WORLDCRAFT_GRID=Object.freeze({coarse:1,fine:.5,rotation:15,fineRotation:5,launcher:.5});
// Signed incline of a challenge ramp. Negative raises the far lip before yaw, matching the catalog ramp (−20°).
export const WORLDCRAFT_RAMP_PITCH=Object.freeze({min:-45,max:15,step:5});
const rampRadians=20*Math.PI/180;
export const WORLDCRAFT_CATALOG=Object.freeze({
 bank:Object.freeze({label:'Bank',width:12,height:7,depth:1,centerY:3.5,pitch:0,friction:.18,restitution:.86}),
 ramp:Object.freeze({label:'Ramp',width:10,height:.8,depth:10,centerY:Math.sin(rampRadians)*5+Math.cos(rampRadians)*.4,pitch:-20,friction:.18,restitution:.86}),
 block:Object.freeze({label:'Block',width:6,height:4,depth:5,centerY:2,pitch:0,friction:.8,restitution:.1}),
});
const clone=value=>structuredClone(value);
const textBytes=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).length;
const own=(value,key)=>Object.hasOwn(value,key);
const idPattern=/^[a-z0-9][a-z0-9-]{0,63}$/;
const buildPattern=/^(?:[a-f0-9]{7,40}(?:-dirty)?|unknown)$/;
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function fail(message){throw Error(message);}
function exact(value,keys,label,optional=[]){
 if(!plain(value))fail(`${label}: unsupported or missing fields`);
 const present=Object.keys(value);
 if(!keys.every(key=>own(value,key))||present.some(key=>!keys.includes(key)&&!optional.includes(key)))fail(`${label}: unsupported or missing fields`);
}
function finite(value,min,max,label){if(!Number.isFinite(value)||value<min||value>max)fail(`${label}: expected ${min} to ${max}`);return Object.is(value,-0)?0:value;}
function step(value,unit,label){if(Math.abs(value/unit-Math.round(value/unit))>1e-8)fail(`${label}: use ${unit} increments`);return Object.is(value,-0)?0:value;}
function identifier(value,label){if(typeof value!=='string'||!idPattern.test(value))fail(`${label}: invalid identifier`);return value;}
function name(value){if(typeof value!=='string'||value.length<1||value.length>64||value.trim()!==value||/[\u0000-\u001f\u007f]/.test(value))fail('World name: use 1–64 printable characters');return value;}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function newWorldcraftId(prefix='world'){
 if(!/^[a-z][a-z0-9-]{0,20}$/.test(prefix))fail('Invalid identifier prefix');
 return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

export function worldcraftObjectPitch(object){
 const prefab=WORLDCRAFT_CATALOG[object.kind];
 if(!prefab)fail('Unknown Worldcraft object');
 return object.pitch??prefab.pitch;
}
// Lowest corner on y=0 after an X-axis incline. Yaw is applied afterward and does not change support height.
export function worldcraftPitchedCenterY(prefab,pitchDegrees){
 const theta=pitchDegrees*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
 let min=Infinity;
 for(const y of [-prefab.height/2,prefab.height/2])for(const z of [-prefab.depth/2,prefab.depth/2])min=Math.min(min,y*c-z*s);
 return min===0?0:-min;
}
export function worldcraftObjectCenterY(object){
 const prefab=WORLDCRAFT_CATALOG[object.kind];
 if(!prefab)fail('Unknown Worldcraft object');
 return object.pitch===undefined?prefab.centerY:worldcraftPitchedCenterY(prefab,object.pitch);
}
// Footprint is the projection of the actual pitched box, then its yaw rotation.
// The importer and editor use this same geometry; a ramp is not a flat 10m box.
export function worldcraftFootprint(object){
 const prefab=WORLDCRAFT_CATALOG[object.kind];
 if(!prefab)fail('Unknown Worldcraft object');
 const pitch=worldcraftObjectPitch(object)*Math.PI/180,yaw=object.yaw*Math.PI/180;
 const halfX=prefab.width/2,halfZ=(Math.abs(Math.cos(pitch))*prefab.depth+Math.abs(Math.sin(pitch))*prefab.height)/2;
 const ux={x:Math.cos(yaw),z:-Math.sin(yaw)},uz={x:Math.sin(yaw),z:Math.cos(yaw)};
 return {x:object.x,z:object.z,halfX,halfZ,ux,uz,corners:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:object.x+a*halfX*ux.x+b*halfZ*uz.x,z:object.z+a*halfX*ux.z+b*halfZ*uz.z}))};
}
function intersects(a,b){
 for(const axis of [a.ux,a.uz,b.ux,b.uz]){
  const project=shape=>shape.corners.map(p=>p.x*axis.x+p.z*axis.z);
  const pa=project(a),pb=project(b);
  // Edge touching is permitted; positive-area overlap is not.
  if(Math.max(...pa)<=Math.min(...pb)+1e-8||Math.max(...pb)<=Math.min(...pa)+1e-8)return false;
 }
 return true;
}
const corridor={x:0,z:1,halfX:12,halfZ:9,ux:{x:1,z:0},uz:{x:0,z:1},corners:[{x:-12,z:-8},{x:12,z:-8},{x:12,z:10},{x:-12,z:10}]};
export function validateWorld(value){
 exact(value,['format','version','id','name','environment','objects','launcher','rules'],'World');
 if(value.format!==WORLDCRAFT_FORMAT||value.version!==WORLDCRAFT_VERSION)fail('Unsupported Worldcraft format or version');
 identifier(value.id,'World id');name(value.name);
 exact(value.environment,['preset','seed'],'Environment');
 if(value.environment.preset!=='forest-clearing-v1'||value.environment.seed!==1)fail('Unsupported environment preset or seed');
 exact(value.launcher,['x'],'Launcher');
 const launcherX=step(finite(value.launcher.x,-10,10,'Launcher x'),.5,'Launcher x');
 if(!Array.isArray(value.objects)||value.objects.length>WORLDCRAFT_LIMITS.objects)fail('A world can contain at most 12 pieces');
 const ids=new Set(),footprints=[];
 const objects=value.objects.map((item,index)=>{
  const label=`Piece ${index+1}`;exact(item,['id','kind','x','z','yaw'],label,['pitch']);identifier(item.id,label+' id');
  if(ids.has(item.id))fail('Piece ids must be unique');ids.add(item.id);
  if(typeof item.kind!=='string'||!own(WORLDCRAFT_CATALOG,item.kind))fail(label+': unsupported prefab');
  const object={id:item.id,kind:item.kind,x:step(finite(item.x,-30,30,label+' x'),.5,label+' x'),z:step(finite(item.z,10,96,label+' z'),.5,label+' z'),yaw:step(finite(item.yaw,-180,175,label+' yaw'),5,label+' yaw')};
  if(own(item,'pitch')){
   if(item.kind!=='ramp')fail(label+': only a ramp can set incline');
   object.pitch=step(finite(item.pitch,WORLDCRAFT_RAMP_PITCH.min,WORLDCRAFT_RAMP_PITCH.max,label+' pitch'),WORLDCRAFT_RAMP_PITCH.step,label+' pitch');
  }
  const footprint=worldcraftFootprint(object);
  if(intersects(footprint,corridor))fail(label+': overlaps the protected launcher corridor');
  if(footprint.corners.some(p=>p.x<WORLDCRAFT_BOUNDS.minX-1e-8||p.x>WORLDCRAFT_BOUNDS.maxX+1e-8||p.z<WORLDCRAFT_BOUNDS.minZ-1e-8||p.z>WORLDCRAFT_BOUNDS.maxZ+1e-8))fail(label+': its whole footprint must fit inside the yard');
  if(footprints.some(prior=>intersects(footprint,prior)))fail(label+': overlaps another piece');
  footprints.push(footprint);return object;
 });
 const rules=validateRules(value.rules,objects,launcherX);
 for(const object of objects){
  if(object.pitch!==undefined && !rules?.rampPitch)fail('Incline is fixed on this world');
  if(rules?.rampPitch && object.kind==='ramp' && object.pitch===undefined)fail(`Ramp ${object.id} needs an incline`);
 }
 return {format:WORLDCRAFT_FORMAT,version:1,id:value.id,name:value.name,environment:{preset:'forest-clearing-v1',seed:1},objects,launcher:{x:launcherX},rules};
}
function validateRules(value,objects,originX){
 if(value===null)return null;
 exact(value,['pin','locked','allowance','rail'],'Rules',['rampPitch']);
 exact(value.pin,['x','z','r'],'Pin');
 const r=finite(value.pin.r,.5,5,'Pin radius');
 const pin={x:finite(value.pin.x,-32+r,32-r,'Pin x'),z:finite(value.pin.z,-8+r,108-r,'Pin z'),r};
 if(!Array.isArray(value.locked)||value.locked.length>12||new Set(value.locked).size!==value.locked.length)fail('Locked pieces must be unique existing IDs');
 const locked=value.locked.map(id=>{identifier(id,'Locked piece');if(!objects.some(o=>o.id===id))fail('Locked piece is missing');return id;}).sort();
 if(!plain(value.allowance)||Object.keys(value.allowance).some(k=>!own(WORLDCRAFT_CATALOG,k)))fail('Unsupported piece allowance');
 const allowance={};
 for(const kind of Object.keys(value.allowance).sort()){
  const count=value.allowance[kind];
  if(!Number.isInteger(count)||count<0||count>12)fail('Piece allowance must be 0–12');
  allowance[kind]=count;
 }
 for(const kind of Object.keys(WORLDCRAFT_CATALOG))if(objects.filter(o=>o.kind===kind&&!locked.includes(o.id)).length>(allowance[kind]??0))fail(`Movable ${kind} allowance exceeded`);
 let rail=null;
 if(value.rail!==null){
  exact(value.rail,['yaw','elevation','charge'],'Fixed rail');
  const setup=validateWorldcraftSetup({railIndex:1,originX,...value.rail});
  rail={yaw:setup.yaw,elevation:setup.elevation,charge:setup.charge};
 }
 let rampPitch=false;
 if(own(value,'rampPitch')){
  if(value.rampPitch!==true)fail('Ramp incline control must be true');
  rampPitch=true;
 }
 const rules={pin,locked,allowance,rail};
 if(rampPitch)rules.rampPitch=true;
 return rules;
}
/** An edit cannot rewrite challenge authority. Loading another document is explicit. */
export function validateWorldEdit(current,input){
 const before=validateWorld(current),next=validateWorld(input);
 if(JSON.stringify(before.rules)!==JSON.stringify(next.rules))fail('Open or import a world to change its fixed rules');
 if(before.rules){
  if(before.launcher.x!==next.launcher.x)fail('The challenge launcher origin is fixed');
  for(const id of before.rules.locked){
   if(JSON.stringify(before.objects.find(o=>o.id===id))!==JSON.stringify(next.objects.find(o=>o.id===id)))fail(`Piece ${id} is fixed`);
  }
 }
 return next;
}
export function worldcraftFixedSetup(world){
 return world.rules?.rail?{railIndex:1,originX:world.launcher.x,...world.rules.rail}:null;
}
export function worldcraftSetupForWorld(world,current,{load=false}={}){
 return worldcraftFixedSetup(world)??validateWorldcraftSetup({...current,...(load?{originX:world.launcher.x}:{})});
}
export function validateWorldcraftShot(world,input){
 const setup=validateWorldcraftSetup(input),fixed=worldcraftFixedSetup(world);
 if(fixed&&Object.keys(fixed).some(key=>fixed[key]!==setup[key]))fail('This rail is fixed. Revise the piece, then fire the same shot.');
 return setup;
}
export function worldcraftCanAdd(world,kind){
 return world.objects.length<WORLDCRAFT_LIMITS.objects&&(!world.rules||world.objects.filter(o=>o.kind===kind&&!world.rules.locked.includes(o.id)).length<(world.rules.allowance[kind]??0));
}
/** The terminal is the measured round centre at first ground contact, not its resting place. */
export function worldcraftPinResult(world,terminal){
 if(!world.rules)return null;
 if(terminal?.reason!=='first-ground-contact'||!Array.isArray(terminal.position)||terminal.position.length!==3||!terminal.position.every(Number.isFinite))return {status:'unfinished',distance:null};
 const {x,z,r}=world.rules.pin,distance=Math.hypot(terminal.position[0]-x,terminal.position[2]-z);
 return {status:distance<=r?'clear':'miss',distance};
}
export function createHouseShotWorld(){
 return validateWorld({...createEmptyWorld({id:'house-shot-v1',name:'House Shot'}),objects:[{id:'ramp-yours',kind:'ramp',x:0,z:42,yaw:0}],rules:{pin:{x:-10,z:72.5,r:3},locked:[],allowance:{ramp:1},rail:{yaw:0,elevation:18,charge:.55}}});
}
// Fixed rail, two movable pieces, and a ramp incline the player can revise. The open arrangement is not a near miss.
export function createTwoPiecePitchWorld(){
 // Open layout is a flat ramp and a bank off the line. The fixed rail's first kiss is far from the gold circle.
 return validateWorld({...createEmptyWorld({id:'two-piece-pitch-v1',name:'Two-piece pitch'}),objects:[
  {id:'ramp-yours',kind:'ramp',x:0,z:30,yaw:0,pitch:0},
  {id:'bank-yours',kind:'bank',x:-16,z:52,yaw:0},
 ],rules:{pin:{x:0,z:76,r:1.5},locked:[],allowance:{ramp:1,bank:1},rail:{yaw:0,elevation:18,charge:.55},rampPitch:true}});
}
export function parseWorldJSON(text){
 if(typeof text!=='string'||textBytes(text)>WORLDCRAFT_LIMITS.importBytes)fail('World JSON must be at most 32 KiB');
 let value;try{value=JSON.parse(text);}catch{fail('Invalid JSON. The current world has not changed.');}
 return validateWorld(value);
}
export function exportWorldJSON(world){return JSON.stringify(validateWorld(world),null,2);}
export function createEmptyWorld(options={}){
 return validateWorld({format:WORLDCRAFT_FORMAT,version:1,id:options.id??newWorldcraftId(),name:options.name??'Untitled clearing',environment:{preset:'forest-clearing-v1',seed:1},objects:[],launcher:{x:0},rules:null});
}
export const createBlankWorld=createEmptyWorld;
export function createStarterWorld(options={}){
 const world=createEmptyWorld({id:options.id,name:options.name??'Bank and rise'});
 return validateWorld({...world,objects:[{id:'bank-1',kind:'bank',x:-12,z:36,yaw:25},{id:'ramp-1',kind:'ramp',x:5,z:56,yaw:0},{id:'block-1',kind:'block',x:18,z:78,yaw:0}]});
}
// Exact canonical scene identity, deliberately not a short collision-prone hash.
// Names and document IDs do not change physical compatibility; object IDs do.
export function worldcraftIdentity(world){
 const value=validateWorld(world);
 return JSON.stringify({catalog:WORLDCRAFT_CATALOG_VERSION,physics:WORLDCRAFT_PHYSICS_CONTRACT,environment:value.environment,objects:[...value.objects].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0),launcher:value.launcher,rules:value.rules});
}
export function validateWorldcraftSetup(value){
 exact(value,['railIndex','originX','yaw','elevation','charge'],'Shot setup');
 if(value.railIndex!==1)fail('Worldcraft uses the central launcher rail');
 return {railIndex:1,originX:step(finite(value.originX,-10,10,'Launch origin'),.5,'Launch origin'),yaw:finite(value.yaw,RAIL_RULES.minYaw,RAIL_RULES.maxYaw,'Aim yaw'),elevation:finite(value.elevation,RAIL_RULES.minElevation,RAIL_RULES.maxElevation,'Elevation'),charge:finite(value.charge,0,1,'Charge')};
}
export function captureWorldSnapshot(world,build){
 const value=validateWorld(world);
 if(typeof build!=='string'||!buildPattern.test(build))fail('Invalid build identity');
 return freeze({version:1,world:value,worldIdentity:worldcraftIdentity(value),catalog:WORLDCRAFT_CATALOG_VERSION,physics:WORLDCRAFT_PHYSICS_CONTRACT,build});
}
function validateSnapshot(value){
 exact(value,['version','world','worldIdentity','catalog','physics','build'],'World snapshot');
 if(value.version!==1||value.catalog!==WORLDCRAFT_CATALOG_VERSION||value.physics!==WORLDCRAFT_PHYSICS_CONTRACT)fail('Unsupported recorded world contract');
 const snapshot=captureWorldSnapshot(value.world,value.build);
 if(value.worldIdentity!==snapshot.worldIdentity)fail('Recorded world identity does not match its snapshot');
 return snapshot;
}
export function lineMatchesWorld(line,world){return line.worldSnapshot?.worldIdentity===worldcraftIdentity(world);}
export function createWorldHistory(initial){
 let current=validateWorld(initial),past=[],future=[],revision=0;
 const result=()=>clone(current);
 return {current:result,status:()=>({canUndo:past.length>0,canRedo:future.length>0,revision}),
  commit(next){const valid=validateWorld(next);if(JSON.stringify(valid)===JSON.stringify(current))return result();past=[...past,current].slice(-WORLDCRAFT_LIMITS.history);current=valid;future=[];revision++;return result();},
  undo(){if(!past.length)return result();future=[current,...future];current=past.at(-1);past=past.slice(0,-1);revision++;return result();},
  redo(){if(!future.length)return result();past=[...past,current].slice(-WORLDCRAFT_LIMITS.history);current=future[0];future=future.slice(1);revision++;return result();},
  reset(next){current=validateWorld(next);past=[];future=[];revision++;return result();},
 };
}

function point(value,label){
 if(!plain(value)||!['x','y','z'].every(key=>own(value,key))||Object.keys(value).some(key=>!['x','y','z','t'].includes(key)))fail(label+': invalid point');
 const result={x:finite(value.x,-10000,10000,label+' x'),y:finite(value.y,-10000,10000,label+' y'),z:finite(value.z,-10000,10000,label+' z')};
 if(own(value,'t'))result.t=finite(value.t,0,120,label+' time');return result;
}
// Event payloads originate in the local physical session, never world import.
// Preserve its real evidence without allowing functions, exotic prototypes,
// unbounded nesting, nonfinite values, or prototype keys into saved records.
function evidenceValue(value,depth=0){
 if(depth>8)fail('Recorded evidence is too deeply nested');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='string'){if(value.length>1024)fail('Recorded evidence string is too long');return value;}
 if(typeof value==='number'){if(!Number.isFinite(value)||Math.abs(value)>1e12)fail('Invalid recorded evidence number');return value;}
 if(Array.isArray(value)){if(value.length>1024)fail('Recorded evidence array is too long');return value.map(item=>evidenceValue(item,depth+1));}
 if(!plain(value)||Object.keys(value).length>32)fail('Invalid recorded evidence object');
 const result={};for(const [key,item]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(key)||key.length>64)fail('Invalid recorded evidence field');if(item!==undefined)result[key]=evidenceValue(item,depth+1);}return result;
}
function launchRecord(value,setup){
 exact(value,['station','muzzle','rail','aim','direction','speed','mass','radius'],'Recorded launch');
 exact(value.station,['id','label','x','z','yaw'],'Recorded station');
 if(value.station.id!=='worldcraft'||typeof value.station.label!=='string'||value.station.label.length>128||value.station.x!==setup.originX||value.station.z!==0||value.station.yaw!==0)fail('Recorded station does not match the stopped launch origin');
 if(value.speed!==chargeToSpeed(setup.charge)||value.mass!==RAIL_RULES.projectileMass||value.radius!==RAIL_RULES.projectileRadius)fail('Recorded launch does not match the shot setup or physics contract');
 const result={station:{...value.station},speed:value.speed,mass:value.mass,radius:value.radius};
 for(const key of ['muzzle','rail','aim','direction']){exact(value[key],['x','y','z'],'Recorded '+key);result[key]=point(value[key],'Recorded '+key);}
 if(['x','y','z'].some(key=>result.aim[key]!==result.direction[key]))fail('Recorded launch direction does not match its aim');
 if(Math.abs(Math.hypot(result.direction.x,result.direction.y,result.direction.z)-1)>1e-8)fail('Recorded launch direction must be a unit vector');
 return result;
}
function contactRecord(value){
 exact(value,['body','point','count','first','last'],'Recorded contact');
 if(typeof value.body!=='string'||!value.body||value.body.length>256||!Number.isSafeInteger(value.count)||value.count<1||value.count>1000000)fail('Invalid recorded contact');
 const first=finite(value.first,0,120,'First contact time'),last=finite(value.last,first,120,'Last contact time');
 exact(value.point,['x','y','z'],'Contact point');return {body:value.body,point:point(value.point,'Contact point'),count:value.count,first,last};
}
export function packWorldcraftLine(input){
 const worldSnapshot=validateSnapshot(input.worldSnapshot),setup=validateWorldcraftShot(worldSnapshot.world,input.setup);
 const id=identifier(input.id??newWorldcraftId('line'),'Line id');
 const createdAt=input.createdAt??new Date().toISOString();
 if(typeof createdAt!=='string'||!Number.isFinite(Date.parse(createdAt))||createdAt.length>40)fail('Invalid line timestamp');
 if(!Array.isArray(input.points)||!input.points.length||input.points.length>WORLDCRAFT_LIMITS.points)fail('Recorded path must contain 1–2048 actual samples');
 if(!Array.isArray(input.events)||input.events.length>WORLDCRAFT_LIMITS.events)fail('Recorded event count exceeds the local limit');
 if(!Array.isArray(input.contacts)||input.contacts.length>500)fail('Recorded contact count exceeds the local limit');
 const terminal=evidenceValue(input.terminal);
 if(!plain(terminal)||typeof terminal.reason!=='string'||!terminal.reason)fail('A kept line needs its recorded termination');
 const line={version:1,id,createdAt,worldSnapshot,setup,launch:launchRecord(input.launch,setup),points:input.points.map((item,index)=>point(item,'Sample '+index)),events:input.events.map(item=>evidenceValue(item)),contacts:input.contacts.map(contactRecord),terminal};
 if(textBytes(line)>WORLDCRAFT_LIMITS.lineBytes)fail('Recorded line exceeds the 256 KiB local limit');
 return freeze(line);
}
function validateLine(value){
 exact(value,['version','id','createdAt','worldSnapshot','setup','launch','points','events','contacts','terminal'],'Recorded line');
 if(value.version!==1)fail('Unsupported recorded line version');return packWorldcraftLine(value);
}
function validateWorldEntry(value){
 exact(value,['id','savedAt','world'],'Saved world');identifier(value.id,'Saved slot id');
 if(typeof value.savedAt!=='string'||value.savedAt.length>40||!Number.isFinite(Date.parse(value.savedAt)))fail('Invalid saved-world timestamp');
 return {id:value.id,savedAt:value.savedAt,world:validateWorld(value.world)};
}

// New collections only. Invalid raw bytes are never overwritten. A failed write
// leaves the new choice in memory and reports it; no slot is evicted to make room.
// Before each write the loaded raw value is compared again to avoid knowingly
// replacing another tab's newer collection. Concurrent tab saves are not merged.
export function createWorldcraftStore(storage){
 const collections={};
 function load(kind,limit,decode){
  const key=WORLDCRAFT_STORAGE_PREFIX+kind;let raw=null,entries=[],warning='',writable=true;
  try{
   raw=storage.getItem(key);
   if(raw!==null){
    if(typeof raw!=='string'||textBytes(raw)>2*1024*1024)fail('Collection exceeds the local byte limit');
    const value=JSON.parse(raw);exact(value,['version','entries'],'Local '+kind);
    if(value.version!==1||!Array.isArray(value.entries)||value.entries.length>limit)fail('Unsupported local '+kind+' collection');
    const ids=new Set();entries=value.entries.map(entry=>{const valid=decode(entry);if(ids.has(valid.id))fail('Repeated local slot id');ids.add(valid.id);return valid;});
   }
  }catch(error){entries=[];writable=false;warning=`Local ${kind} could not be loaded. Original data kept; new choices stay in memory. ${String(error)}`;}
  return {key,raw,entries,warning,writable,limit,decode};
 }
 collections.worlds=load('worlds',WORLDCRAFT_LIMITS.worldSlots,validateWorldEntry);
 collections.lines=load('lines',WORLDCRAFT_LIMITS.lineSlots,validateLine);
 const status=()=>({warning:Object.values(collections).map(item=>item.warning).filter(Boolean).join(' '),memoryOnly:Object.values(collections).some(item=>!item.writable),worldCount:collections.worlds.entries.length,lineCount:collections.lines.entries.length});
 function persist(collection){
  if(!collection.writable)return false;
  try{
   if(storage.getItem(collection.key)!==collection.raw)fail('Another tab changed this collection. Reload or export before saving again.');
   const raw=JSON.stringify({version:1,entries:collection.entries});storage.setItem(collection.key,raw);collection.raw=raw;collection.warning='';return true;
  }catch(error){collection.writable=false;collection.warning=`Saved only in memory. Export before leaving. ${String(error)}`;return false;}
 }
 function put(kind,entry,replaceId){
  const collection=collections[kind],existing=replaceId?collection.entries.findIndex(item=>item.id===replaceId):-1;
  if(replaceId&&existing<0)fail('The selected saved slot no longer exists');
  if(existing<0&&collection.entries.length>=collection.limit)fail(`All ${collection.limit} ${kind==='worlds'?'world':'line'} slots are occupied. Remove one explicitly first.`);
  collection.entries=existing<0?[...collection.entries,entry]:collection.entries.map((item,index)=>index===existing?entry:item);
  const persisted=persist(collection);return {entry:clone(entry),persisted,status:status()};
 }
 function remove(kind,id){const collection=collections[kind];if(!collection.entries.some(item=>item.id===id))return false;collection.entries=collection.entries.filter(item=>item.id!==id);persist(collection);return true;}
 return {worlds:()=>clone(collections.worlds.entries),lines:()=>clone(collections.lines.entries),status,
  saveWorld(world,options={}){const value=validateWorld(world),id=options.replaceId??newWorldcraftId('slot');identifier(id,'Saved slot id');return put('worlds',{id,savedAt:new Date().toISOString(),world:value},options.replaceId);},
  keepLine(line){const value=validateLine(line),prior=collections.lines.entries.find(item=>item.id===value.id);if(prior){if(JSON.stringify(prior)!==JSON.stringify(value))fail('A kept shot is immutable');return {entry:clone(prior),persisted:collections.lines.writable,status:status()};}return put('lines',value);},
  removeWorld:id=>remove('worlds',id),removeLine:id=>remove('lines',id),
  exportLocal:()=>JSON.stringify({format:'rail-golf-worldcraft-local-export',version:1,worlds:clone(collections.worlds.entries),lines:clone(collections.lines.entries)},null,2),
 };
}
