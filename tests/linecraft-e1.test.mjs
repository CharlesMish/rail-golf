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
  parseLinecraftE1Query,linecraftE1DrawsPreviousTrail,linecraftE1Prefix,linecraftE1Storage,linecraftE1LibraryKey,linecraftE1OwnsKey,linecraftE1KeyCollides,
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

test('arm query accepts only a7 and c3 and never describes them',()=>{
 const trail=parseLinecraftE1Query('a7','gate'),quiet=parseLinecraftE1Query('c3','lumber');
 assert.equal(trail.ok,true);assert.equal(quiet.ok,true);
 assert.equal(trail.mode.arm,'a7');assert.equal(trail.mode.station,'gate');assert.equal(trail.mode.drawPreviousTrail,true);assert.equal(trail.mode.shelfTrailButtons,true);
 assert.equal(quiet.mode.arm,'c3');assert.equal(quiet.mode.station,'lumber');assert.equal(quiet.mode.drawPreviousTrail,false);assert.equal(quiet.mode.shelfTrailButtons,false);
 assert.equal(linecraftE1DrawsPreviousTrail('a7'),true);assert.equal(linecraftE1DrawsPreviousTrail('c3'),false);assert.equal(linecraftE1DrawsPreviousTrail('a7 '),false);
 for(const [arm,station] of [[null,'gate'],[undefined,'lumber'],['','gate'],['trail','gate'],['A7','gate'],['no-trail','lumber'],['a7',null],['a7',undefined],['a7',''],['a7','saw'],['c3','gate '],['a7','GATE']]){
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
 const a7=linecraftE1Storage(raw,'a7'),c3=linecraftE1Storage(raw,'c3');
 const {id,line,launch,meta}=keptLine();
 const shelf=createLinecraftShelf(a7);const entry=shelf.keep(id,line,launch,meta);createLinecraftDecisions(a7).append(entry);
 assert.equal(createLinecraftShelf(c3).entries().length,0);assert.equal(createLinecraftDecisions(c3).export().length,0);
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
   linecraftE1:arm?{arm,drawPreviousTrail:arm==='a7',shelfTrailButtons:arm==='a7'}:null,
   linecraftE1DrawsPreviousTrail,disposeGhost(){context.disposed=(context.disposed??0)+1;},
   HOLES:[{id:'open-line'}],activeHoleIndex:()=>0,compareRef:{current:true},historyRef:{current:{'open-line':[memory,{...memory,projectileId:3}]}},
   Color4:class{constructor(){}},Color3:{White:()=>({})},Vector3:Vec,scene:{},ghostVisibleRef:{current:false},worldRef:{current:{}},
   MeshBuilder:{CreateLineSystem:(name,options)=>{const mesh={name,options,isVisible:null};calls.push(mesh);return mesh;}},
  };
  vm.createContext(context);compile(context,'makeGhost',ghost);context.makeGhost(memory);return {calls,context};
 };
 const hidden=run('c3');
 assert.equal(hidden.calls.length,0);assert.equal(hidden.context.disposed,1);assert.equal(hidden.context.worldRef.current.ghostLine,undefined);
 const shown=run('a7');
 assert.equal(shown.calls.length,1);assert.equal(shown.calls[0].isVisible,true);assert.equal(shown.context.ghostVisibleRef.current,false,'forced visibility does not depend on the hidden switch');
 const production=run(null);
 assert.equal(production.calls.length,1);assert.equal(production.calls[0].isVisible,false);
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
 assert.match(source,/!linecraftE1 && <label>/);
 assert.equal(source.includes('aria-label="Open Line station"'),true);
});

test('built experiment route opens in Open and rejects a missing or unknown arm',async()=>{
 const workerURL=new URL('../dist/server/index.js',import.meta.url);workerURL.searchParams.set('e1',`${process.pid}-${Date.now()}`);
 const {default:worker}=await import(workerURL.href);
 const htmlAt=async path=>{const response=await worker.fetch(new Request('http://localhost'+path,{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,200,path);return response.text().replaceAll('<!-- -->','');};
 const gate=await htmlAt('/lab/linecraft-e1?arm=a7&station=gate');
 const lumber=await htmlAt('/lab/linecraft-e1?arm=c3&station=lumber');
 for(const [html,arm,station] of [[gate,'a7','gate'],[lumber,'c3','lumber']]){
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
