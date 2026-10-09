import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {IDBFactory} from 'fake-indexeddb';
import {createLinecraftSession,enterLinecraftOpen,linecraftMeta,createLinecraftShelf,createLinecraftDecisions,exportLinecraftStudy} from '../lib/linecraft-lab.js';
import {captureLabLaunch} from '../lib/lab-controls.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {recordLineReceipt} from '../lib/line-score.js';
import {createSurveyArchive,createSurveyLog,makeSurveyRecord} from '../lib/survey-ledger.js';
import {createActionTrace} from '../lib/action-trace.js';
import {
  LINECRAFT_E1_PROGRESS_KEY,LINECRAFT_E1_LIBRARY_SUFFIX,LINECRAFT_E1_SURVEY_DATABASE,LINECRAFT_E1_SURVEY_VERSION,LINECRAFT_E1_MESSAGE,
  LINECRAFT_E1_SHELF_CONTRACT,LINECRAFT_E1_SHELF_LINKS,linecraftE1HidesShotText,
  parseLinecraftE1Query,linecraftE1DrawsPreviousTrail,linecraftE1Trail,linecraftE1KeptStyle,linecraftE1KeptSegments,linecraftE1Prefix,linecraftE1Storage,linecraftE1LibraryKey,linecraftE1OwnsKey,linecraftE1KeyCollides,
  stampLinecraftE1Export,linecraftE1StudyCSV,
} from '../lib/linecraft-e1.js';

const memoryStorage=()=>{const values=new Map();return {get length(){return values.size;},key:index=>[...values.keys()][index]??null,getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
const FOREIGN=[
 'rail-golf-timber-courtyard-v01','rail-golf-mechanism-range-v03','rail-golf-delivery-routes-v1','rail-golf-delivery-routes-v2',
 'rail-golf-shot-library-v1-yard','rail-golf-shot-library-v1-range','rail-golf-shot-library-v1-line-lab-v1','rail-golf-shot-library-v1-linecraft-v1',
 'rail-golf-shot-library-v1-intent-v1','rail-golf-shot-library-v1-timber-receiver-v1','rail-golf-shot-library-v1-courtyard-diverter-v2','rail-golf-shot-library-v1-diverter',
 'rail-golf-line-lab-v1','rail-golf-linecraft-v1','rail-golf-intent-v1','rail-golf-timber-receiver-v1','rail-golf-courtyard-diverter-v2','rail-golf-diverter-lab-v1',
 'rail-golf:linecraft:shelf-v1','rail-golf:linecraft:keep-observations-v1','rail-golf:linecraft:keep-hint-v1','rail-golf:linecraft:shelf-v1-quarantine-old',
 'rail-golf:intent:shelf','rail-golf:timber-receiver:note','rail-golf:line-survey:pending:baseline','rail-golf:line-actions:baseline','rail-golf:line-tab-id:v1',
];
function keptLine(id='e1:1'){
 const session=enterLinecraftOpen(createLinecraftSession(),'cold');
 const setup={railIndex:1,originX:0,yaw:2,elevation:30,charge:.5};
 const launch=captureLabLaunch(selectOpenLineStation('gate'),setup,{floor:'A'},'d385b6da9b');
 const ledger=[{kind:'termination',reason:'ground-contact'}];
 const line={...setup,build:launch.build,holeId:launch.card,stationId:launch.station,windId:launch.windId,projectileId:1,outcome:'miss',receipt:'GROUND CONTACT',
  environment:{floor:'A'},environmentAfter:{floor:'A'},ledger,lineReceipt:recordLineReceipt(ledger),
  points:[{x:0,y:1,z:2},{x:1,y:2,z:8}],contacts:[{id:'c',kind:'first-kiss',point:{x:1,y:0,z:8}}]};
 return {id,line,launch,meta:{...linecraftMeta(session),shelfAvailable:4}};
}

test('arm query accepts a7, k5, k6 and c3 and never describes them',()=>{
 const trail=parseLinecraftE1Query('a7','gate'),refined=parseLinecraftE1Query('k5','gate'),presented=parseLinecraftE1Query('k6','lumber'),quiet=parseLinecraftE1Query('c3','lumber');
 assert.equal(trail.ok,true);assert.equal(refined.ok,true);assert.equal(presented.ok,true);assert.equal(quiet.ok,true);
 assert.equal(trail.mode.arm,'a7');assert.equal(trail.mode.station,'gate');assert.equal(trail.mode.drawPreviousTrail,true);assert.equal(trail.mode.shelfTrailButtons,true);
 assert.equal(refined.mode.arm,'k5');assert.equal(refined.mode.station,'gate');
 assert.deepEqual([refined.mode.drawPreviousTrail,refined.mode.shelfTrailButtons],[trail.mode.drawPreviousTrail,trail.mode.shelfTrailButtons]);
 assert.equal(presented.mode.arm,'k6');assert.equal(presented.mode.station,'lumber');
 assert.deepEqual([presented.mode.drawPreviousTrail,presented.mode.shelfTrailButtons],[refined.mode.drawPreviousTrail,refined.mode.shelfTrailButtons]);
 assert.equal(quiet.mode.arm,'c3');assert.equal(quiet.mode.station,'lumber');assert.equal(quiet.mode.drawPreviousTrail,false);assert.equal(quiet.mode.shelfTrailButtons,false);
 assert.equal(linecraftE1DrawsPreviousTrail('a7'),true);assert.equal(linecraftE1DrawsPreviousTrail('k5'),true);assert.equal(linecraftE1DrawsPreviousTrail('k6'),true);assert.equal(linecraftE1DrawsPreviousTrail('c3'),false);assert.equal(linecraftE1DrawsPreviousTrail('a7 '),false);
 const thick=linecraftE1Trail('a7'),slim=linecraftE1Trail('k5'),ring=linecraftE1Trail('k6');
 assert.equal(linecraftE1Trail('c3'),null);assert.equal(linecraftE1Trail('k5 '),null);assert.equal(linecraftE1Trail('k6 '),null);
 assert.equal(thick.radius,.46);assert.equal(thick.pinHeight,2.4);assert.equal(thick.pinDiameter,.34);assert.equal(thick.pinLift,1.2);
 assert.equal(thick.headDiameter,1.45);assert.equal(thick.headLift,2.35);assert.deepEqual([...thick.emissive],[1,.62,.22]);
 assert.equal(thick.alpha,1);assert.equal(thick.excludeGlow,false);assert.equal(thick.emissiveIntensity,undefined);assert.equal(thick.kiss,undefined);
 assert.equal(slim.radius,.15);assert.ok(slim.radius<thick.radius);
 assert.ok(slim.pinHeight<1.2&&slim.pinHeight<thick.pinHeight);assert.ok(slim.headDiameter<.7&&slim.headDiameter<thick.headDiameter);
 assert.ok(slim.emissive.every((channel,index)=>channel<thick.emissive[index]));
 assert.ok(slim.alpha<=1);assert.equal(typeof slim.excludeGlow,'boolean');assert.equal(slim.kiss,undefined);assert.equal(slim.ringPx,undefined);
 assert.equal(ring.radius,slim.radius);assert.deepEqual([...ring.diffuse],[...slim.diffuse]);assert.deepEqual([...ring.emissive],[...slim.emissive]);
 assert.equal(ring.roughness,slim.roughness);assert.equal(ring.alpha,slim.alpha);assert.equal(ring.emissiveIntensity,slim.emissiveIntensity);assert.equal(ring.excludeGlow,slim.excludeGlow);
 assert.equal(ring.pinHeight,slim.pinHeight);assert.equal(ring.pinDiameter,slim.pinDiameter);assert.equal(ring.pinLift,slim.pinLift);
 assert.equal(ring.headDiameter,slim.headDiameter);assert.equal(ring.headLift,slim.headLift);
 assert.equal(ring.kiss,'screen-ring');assert.equal(ring.ringPx,20);assert.equal(ring.ringBorderPx,2);assert.match(ring.ringColor,/rgba\(186, 112, 36/);
 for(const [arm,station] of [[null,'gate'],[undefined,'lumber'],['','gate'],['trail','gate'],['A7','gate'],['K5','gate'],['K6','gate'],['k5 ','gate'],['k6 ','gate'],['no-trail','lumber'],['a7',null],['a7',undefined],['a7',''],['a7','saw'],['c3','gate '],['a7','GATE'],['k5','lumber ']]){
  const parsed=parseLinecraftE1Query(arm,station);
  assert.equal(parsed.ok,false,`${arm}/${station}`);
  assert.equal(parsed.message,LINECRAFT_E1_MESSAGE);
  assert.equal(/trail|ghost|NO-TRAIL|previous line/i.test(parsed.message),false);
 }
 assert.equal(LINECRAFT_E1_SURVEY_VERSION,1);
});

test('experiment storage stays on its own keys and arms do not read each other',async()=>{
 const raw=memoryStorage();
 for(const key of FOREIGN)raw.setItem(key,'sentinel');
 const before=new Map(FOREIGN.map(key=>[key,raw.getItem(key)]));
 const a7=linecraftE1Storage(raw,'a7'),c3=linecraftE1Storage(raw,'c3'),k5=linecraftE1Storage(raw,'k5'),k6=linecraftE1Storage(raw,'k6');
 const {id,line,launch,meta}=keptLine();
 const shelf=createLinecraftShelf(a7);const entry=shelf.keep(id,line,launch,meta);createLinecraftDecisions(a7).append(entry);
 assert.equal(createLinecraftShelf(c3).entries().length,0);assert.equal(createLinecraftDecisions(c3).export().length,0);
 assert.equal(createLinecraftShelf(k5).entries().length,0);assert.equal(createLinecraftDecisions(k5).export().length,0);
 assert.equal(createLinecraftShelf(k6).entries().length,0);assert.equal(createLinecraftDecisions(k6).export().length,0);
 const opens=[];const factory=new IDBFactory();const open=factory.open.bind(factory);
 factory.open=(name,version)=>{opens.push({name,version});return open(name,version);};
 const archive=createSurveyArchive(factory,undefined,LINECRAFT_E1_SURVEY_DATABASE);
 const log=createSurveyLog({storage:a7,archive,session:'e1-a7'});await log.ready();
 const ticket=log.begin({...launch,...meta,arm:'a7'});log.append(ticket,line.ledger);await log.ready();
 createActionTrace({storage:a7,build:'d385b6da9b',session:'e1-tab',context:()=>({})}).append({action:'boot',source:'test',before:{},after:{},accepted:true,reason:'observed'});
 raw.setItem(LINECRAFT_E1_PROGRESS_KEY,'{"open-line":{}}');
 raw.setItem(`${linecraftE1Prefix('a7')}keep-hint-v1`,'seen');
 raw.setItem(`${linecraftE1Prefix('c3')}keep-hint-v1`,'seen');
 const written=[...Array(raw.length).keys()].map(index=>raw.key(index)).filter(key=>!before.has(key));
 assert.ok(written.length>0);
 for(const key of written){assert.equal(linecraftE1OwnsKey(key),true,key);assert.equal(linecraftE1KeyCollides(key),false,key);}
 for(const [key,value] of before)assert.equal(raw.getItem(key),value,key);
 assert.equal(opens.length,1);assert.deepEqual(opens[0],{name:LINECRAFT_E1_SURVEY_DATABASE,version:LINECRAFT_E1_SURVEY_VERSION});
 assert.equal(LINECRAFT_E1_SURVEY_DATABASE==='rail-golf-linecraft-survey',false);
 assert.equal(linecraftE1LibraryKey(),'rail-golf-shot-library-v1'+LINECRAFT_E1_LIBRARY_SUFFIX);
 assert.equal(linecraftE1KeyCollides(linecraftE1LibraryKey()),false);
 a7.setItem('shelf-v1-quarantine-keep','raw');a7.clear();
 assert.equal(a7.getItem('shelf-v1'),null);assert.equal(a7.getItem('shelf-v1-quarantine-keep'),'raw');
 assert.equal(c3.getItem('keep-hint-v1'),'seen');
 assert.equal(k5.getItem('keep-hint-v1'),null);
 assert.equal(k6.getItem('keep-hint-v1'),null);
 assert.equal(linecraftE1OwnsKey(`${linecraftE1Prefix('k5')}shelf-v1`),true);
 assert.equal(linecraftE1OwnsKey(`${linecraftE1Prefix('k6')}shelf-v1`),true);
 assert.equal(linecraftE1OwnsKey('rail-golf:linecraft-e1:zz:shelf-v1'),false);
 for(const key of FOREIGN)assert.equal(raw.getItem(key),'sentinel');
});

test('study export records the arm and drops the other arm',()=>{
 const open=enterLinecraftOpen(createLinecraftSession(),'cold');
 const base=keptLine();
 const recordFor=(arm,id)=>{
  const ticket={...base.launch,...linecraftMeta(open),arm,id,session:'s',sequence:1,startedAt:'2026-10-08T00:00:00.000Z'};
  return makeSurveyRecord(ticket,base.line.ledger);
 };
 const study=exportLinecraftStudy({records:[recordFor('a7','a'),recordFor('c3','c')],exportedAt:'now'},[],[]);
 const stamped=stampLinecraftE1Export(study,'a7');
 assert.equal(stamped.study,LINECRAFT_E1_PROGRESS_KEY);assert.equal(stamped.arm,'a7');
 assert.deepEqual(stamped.records.map(record=>record.id),['a']);
 assert.equal(stamped.records[0].arm,'a7');
 const csv=linecraftE1StudyCSV(stamped);
 assert.match(csv,/^"arm",/);assert.match(csv,/"a7"/);assert.equal(csv.includes('"c3"'),false);
 assert.equal(study.records.length,2,'stamping does not rewrite the archive packet in place');
});

const source=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('manners-game.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const findAll=predicate=>{const found=[];const visit=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,visit);};visit(ast);return found;};
const expression=name=>{const found=findAll(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)[0];assert.ok(found,name);return found.initializer.getText(ast);};
const compile=(context,name,code)=>{vm.runInContext(ts.transpileModule('globalThis.'+name+' = '+code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);return context[name];};

test('NO-TRAIL never builds the previous-shot ghost; TRAIL still does and stays visible',()=>{
 const ghost=expression('makeGhost');
 const guard=ghost.indexOf('linecraftE1DrawsPreviousTrail'),draw=ghost.indexOf('CreateLineSystem');
 assert.ok(guard>0&&guard<draw,'dispose-only return happens before any previous-shot line is built');
 assert.match(source,/KeyG" && !linecraftE1/);
 class Vec{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}clone(){return new Vec(this.x,this.y,this.z);}}
 const memory={holeId:'open-line',projectileId:4,points:[new Vec(0,1,2),new Vec(3,1,9)],contacts:[{kind:'first-kiss',point:{x:3,z:9}}]};
 const run=(arm)=>{
  const calls=[];
  const context={
   linecraftE1:arm?{arm,drawPreviousTrail:linecraftE1DrawsPreviousTrail(arm),shelfTrailButtons:arm==='a7'||arm==='k5'||arm==='k6'}:null,
   linecraftE1DrawsPreviousTrail,linecraftE1Trail,disposeGhost(){context.disposed=(context.disposed??0)+1;},
   HOLES:[{id:'open-line'}],activeHoleIndex:()=>0,compareRef:{current:true},historyRef:{current:{'open-line':[memory,{...memory,projectileId:3}]}},
   Color4:class{constructor(){}},Color3:class{constructor(){}static White(){return {};}},Vector3:Vec,scene:{},ghostVisibleRef:{current:false},worldRef:{current:{}},
   previousShotMarks:[],previousShotMaterial:null,Mesh:{CAP_ALL:3},makeMaterial:()=>({name:'previous-shot'}),
   glow:{addExcludedMesh(mesh){mesh.glowExcluded=true;}},
  MeshBuilder:{
   CreateLineSystem:(name,options)=>{const mesh={name,kind:'line',options,isVisible:null};calls.push(mesh);return mesh;},
   CreateTube:(name,options)=>{const mesh={name,kind:'tube',options,isVisible:null,isPickable:null,material:null};calls.push(mesh);return mesh;},
   CreateCylinder:(name,options)=>{const mesh={name,kind:'pin',options,isVisible:null,isPickable:null,material:null,position:{set:(x,y,z)=>{mesh.at={x,y,z};}}};calls.push(mesh);return mesh;},
   CreateSphere:(name,options)=>{const mesh={name,kind:'head',options,isVisible:null,isPickable:null,material:null,position:{set:(x,y,z)=>{mesh.at={x,y,z};}}};calls.push(mesh);return mesh;},
  },
 };
 vm.createContext(context);compile(context,'makeGhost',ghost);context.makeGhost(memory);return {calls,context};
 };
 const hidden=run('c3');
 assert.equal(hidden.calls.length,0);assert.equal(hidden.context.disposed,1);assert.equal(hidden.context.worldRef.current.ghostLine,undefined);
 const shown=run('a7');
 assert.equal(shown.calls.some(call=>call.kind==='line'),false,'the address trail is a mesh of the recorded path, not the one-pixel line');
 const tube=shown.calls.find(call=>call.kind==='tube');
 assert.equal(tube.isVisible,true);assert.equal(tube.isPickable,false);
 assert.equal(tube.options.radius,.46);assert.equal(tube.options.path.length,2);assert.equal(tube.glowExcluded,undefined);
 assert.equal(tube.options.path[0].x,0);assert.equal(tube.options.path[0].y,1);assert.equal(tube.options.path[0].z,2);
 assert.equal(tube.options.path[1].x,3);assert.equal(tube.options.path[1].y,1);assert.equal(tube.options.path[1].z,9);
 const pin=shown.calls.find(call=>call.kind==='pin'),head=shown.calls.find(call=>call.kind==='head');
 assert.equal(pin.options.height,2.4);assert.equal(pin.options.diameter,.34);assert.equal(pin.at.x,3);assert.equal(pin.at.y,1.2);assert.equal(pin.at.z,9);
 assert.equal(head.options.diameter,1.45);assert.equal(head.at.x,3);assert.equal(head.at.y,2.35);assert.equal(head.at.z,9);
 assert.equal(shown.context.ghostVisibleRef.current,false,'forced visibility does not depend on the hidden switch');
 const slimSpec=linecraftE1Trail('k5'),slimRun=run('k5'),slimTube=slimRun.calls.find(call=>call.kind==='tube');
 const slimPin=slimRun.calls.find(call=>call.kind==='pin'),slimHead=slimRun.calls.find(call=>call.kind==='head');
 assert.equal(slimTube.options.radius,slimSpec.radius);assert.equal(slimTube.options.path.length,2);
 assert.equal(slimTube.options.path[1].x,3);assert.equal(slimTube.options.path[1].z,9);
 assert.equal(slimPin.options.height,slimSpec.pinHeight);assert.equal(slimPin.options.diameter,slimSpec.pinDiameter);assert.equal(slimPin.at.y,slimSpec.pinLift);
 assert.equal(slimHead.options.diameter,slimSpec.headDiameter);assert.equal(slimHead.at.y,slimSpec.headLift);
 assert.equal(slimTube.glowExcluded,slimSpec.excludeGlow?true:undefined);
 const ringSpec=linecraftE1Trail('k6'),ringRun=run('k6'),ringTube=ringRun.calls.find(call=>call.kind==='tube');
 assert.equal(ringRun.calls.some(call=>call.kind==='pin'||call.kind==='head'),false,'a screen ring is not a larger pin or head');
 assert.equal(ringTube.options.radius,ringSpec.radius);assert.equal(ringTube.options.radius,slimSpec.radius);
 assert.equal(ringTube.options.path[1].x,3);assert.equal(ringTube.options.path[1].z,9);
 assert.equal(ringRun.context.kissMark.x,3);assert.equal(ringRun.context.kissMark.y,0);assert.equal(ringRun.context.kissMark.z,9);
 assert.equal(ringTube.glowExcluded,undefined);
 assert.equal(/getAimDirection|getMuzzle|aimSpine/.test(ghost.slice(ghost.indexOf('linecraftE1Trail'),ghost.indexOf('const attempts'))),false);
 const trailBody=ghost.slice(ghost.indexOf('if (e1)'),ghost.indexOf('const attempts'));
 assert.equal(/getAimDirection|getMuzzle|aimSpine/.test(trailBody),false);
 const production=run(null);
 assert.equal(production.calls.length,1);assert.equal(production.calls[0].kind,'line');assert.equal(production.calls[0].isVisible,false);
});

test('address clears previous-shot text on both arms and the trail flag stays per arm',()=>{
 for(const phase of ['ready','charging'])assert.equal(linecraftE1HidesShotText(phase),true,phase);
 for(const phase of ['flight','theatre','result'])assert.equal(linecraftE1HidesShotText(phase),false,phase);
 assert.equal(linecraftE1DrawsPreviousTrail('a7'),true);
 assert.equal(linecraftE1DrawsPreviousTrail('k5'),true);
 assert.equal(linecraftE1DrawsPreviousTrail('k6'),true);
 assert.equal(linecraftE1DrawsPreviousTrail('c3'),false);
 const gates=[...source.matchAll(/linecraftE1 && linecraftE1HidesShotText\(phase\)/g)];
 assert.equal(gates.length,3,'claim caption, registered banner, and contact captions');
 assert.equal(/linecraftE1HidesShotText\(phase\).*drawPreviousTrail|drawPreviousTrail.*linecraftE1HidesShotText/.test(source),false);
});

test('the experiment route is opt-in and production routes stay untouched',async()=>{
 const page=await readFile(new URL('../app/lab/linecraft-e1/page.tsx',import.meta.url),'utf8');
 const linecraft=await readFile(new URL('../app/lab/linecraft/page.tsx',import.meta.url),'utf8');
 assert.match(page,/parseLinecraftE1Query/);assert.match(page,/MannersGame linecraftE1=/);assert.match(page,/BUILD \{BUILD_ID\}/);
 assert.equal(/NO-TRAIL|TRAIL|ghost off|Previous line/i.test(page),false);
 assert.match(linecraft,/<MannersGame linecraftLab\s*\/>/);assert.doesNotMatch(linecraft,/linecraftE1/);
 for(const path of ['../app/page.tsx','../app/courtyard/page.tsx','../app/practice/page.tsx','../app/lab/lines/page.tsx','../app/lab/intent/page.tsx']){
  const text=await readFile(new URL(path,import.meta.url),'utf8');
  assert.doesNotMatch(text,/linecraftE1|linecraft-e1/);
 }
 assert.match(source,/linecraftE1\?LINECRAFT_E1_SURVEY_DATABASE:linecraftLab\?"rail-golf-linecraft-survey"/);
 assert.match(source,/linecraftLab\?linecraftStorage\(storage\)/);
 assert.match(source,/const saved = linecraftLab\?\{\}:intentLab\?\{\}:loadProgress/);
 assert.match(expression('rememberFlight'),/if\(!intentLab&&!linecraftLab\)try/);
 assert.match(source,/showLessonNav=\{!linecraftE1\}/);
 assert.match(source,/showTrailActions=\{!linecraftE1\|\|linecraftE1\.shelfTrailButtons\}/);
 assert.match(source,/contract=\{linecraftE1\?LINECRAFT_E1_SHELF_CONTRACT:undefined\}/);
 assert.match(source,/setupLinks=\{linecraftE1\?LINECRAFT_E1_SHELF_LINKS:undefined\}/);
 assert.equal(/ghost|replay/i.test(LINECRAFT_E1_SHELF_CONTRACT+LINECRAFT_E1_SHELF_LINKS),false);
 const shelf=await readFile(new URL('../app/linecraft-tools.tsx',import.meta.url),'utf8');
 assert.match(shelf,/Ghost: recorded history, never prediction\. Replay: sampled path/);
 assert.match(shelf,/contain the recorded replay/);
 assert.match(source,/linecraftE1KeptStyle\(linecraftE1\.arm\)/);
 assert.match(source,/new Color3\(\.45,\.82,\.85\)/);
 assert.match(source,/linecraftGhost\.alpha=\.45/);
 assert.match(source,/trail\.kiss === "screen-ring"/);
 assert.match(source,/trail\.ringPx/);
 const recall=[...source.matchAll(/canvas\.dataset\.recallSamples/g)];
 assert.equal(recall.length,2);
 for(const write of recall)assert.match(source.slice(Math.max(0,write.index-160),write.index),/!\(typeof linecraftE1 !== "undefined" && linecraftE1\)/);
 assert.match(source,/!linecraftE1 && <label>/);
 assert.equal(source.includes('aria-label="Open Line station"'),true);
});

test('k6 kept dashes stay on the recorded path and the other arms keep the plain line',()=>{
 assert.equal(linecraftE1KeptStyle('a7'),null);
 assert.equal(linecraftE1KeptStyle('k5'),null);
 assert.equal(linecraftE1KeptStyle('c3'),null);
 const kept=linecraftE1KeptStyle('k6'),tube=linecraftE1Trail('k6');
 assert.ok(kept);assert.ok(kept.radius<tube.radius);assert.ok(kept.radius>=.08);
 assert.ok(kept.alpha>.7&&kept.alpha<1);assert.ok(kept.dash>kept.gap&&kept.gap>0);
 assert.ok(kept.emissive[2]>kept.emissive[0],'kept line stays cool, not amber');
 assert.ok(tube.emissive[0]>tube.emissive[2]);
 const segments=linecraftE1KeptSegments([{x:0,y:0,z:0},{x:10,y:0,z:0}],kept);
 assert.deepEqual(segments[0],[{x:0,y:0,z:0},{x:kept.dash,y:0,z:0}]);
 assert.equal(segments.at(-1).at(-1).x<=10,true);
 assert.ok(segments.every(segment=>segment.length>=2));
 assert.equal(linecraftE1KeptSegments([{x:0,y:1,z:2}],kept).length,0);
 assert.equal(linecraftE1KeptSegments([{x:0,y:0,z:0},{x:1,y:2,z:3}],null).length,0);
 const short=linecraftE1KeptSegments([{x:0,y:1,z:2},{x:0,y:1,z:2.4}],{dash:3.2,gap:2});
 assert.equal(short.length,1);assert.deepEqual(short[0][1],{x:0,y:1,z:2.4});
});

test('built experiment route opens in Open and rejects a missing or unknown arm',async()=>{
 const workerURL=new URL('../dist/server/index.js',import.meta.url);workerURL.searchParams.set('e1',`${process.pid}-${Date.now()}`);
 const {default:worker}=await import(workerURL.href);
 const htmlAt=async path=>{const response=await worker.fetch(new Request('http://localhost'+path,{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,200,path);return (await response.text()).replaceAll('<!-- -->','');};
 const gate=await htmlAt('/lab/linecraft-e1?arm=a7&station=gate');
 const refined=await htmlAt('/lab/linecraft-e1?arm=k5&station=gate');
 const presented=await htmlAt('/lab/linecraft-e1?arm=k6&station=gate');
 const lumber=await htmlAt('/lab/linecraft-e1?arm=c3&station=lumber');
 for(const [html,arm,station] of [[gate,'a7','gate'],[refined,'k5','gate'],[presented,'k6','gate'],[lumber,'c3','lumber']]){
  assert.match(html,/OPEN YARD/);assert.match(html,new RegExp(`data-active-station="${station}"`));assert.match(html,new RegExp(`BUILD [^<]*${arm}`));
  assert.equal(/Previous line|Compare three trails|Restart Lessons|Skip Lessons|Next Lesson|NO-TRAIL|ghost off/i.test(html),false);
  assert.equal(html.includes('aria-label="Open Line station"'),false);assert.equal(html.includes('aria-label="Launcher station"'),false);
  assert.equal(html.includes('data-linecraft-stage="open"'),true);
 }
 const invalid=await htmlAt('/lab/linecraft-e1?arm=trail&station=gate');
 const missing=await htmlAt('/lab/linecraft-e1?station=lumber');
 const bare=await htmlAt('/lab/linecraft-e1');
 for(const html of [invalid,missing,bare]){assert.match(html,new RegExp(LINECRAFT_E1_MESSAGE));assert.match(html,/BUILD /);assert.equal(html.includes('OPEN YARD'),false);assert.equal(html.includes('rail-canvas'),false);}
 const production=await htmlAt('/lab/linecraft');
 assert.match(production,/Skip Lessons/);assert.match(production,/1 \/ 2/);assert.equal(production.includes('linecraft-e1'),false);
});
