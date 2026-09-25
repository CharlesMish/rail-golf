import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import {LINECRAFT_LESSONS,createLinecraftSession,recordLinecraftAttempt,continueLinecraftSession,enterLinecraftOpen,linecraftMeta,createLinecraftShelf,createLinecraftDecisions} from '../lib/linecraft-lab.js';
import {captureLabLaunch} from '../lib/lab-controls.js';
import {selectOpenLineStation} from '../lib/line-lab.js';
import {scoreLine,recordLineReceipt} from '../lib/line-score.js';
import {collectLineStepEvents} from '../lib/line-recognition.js';
import {SKY_TOKEN} from '../lib/delivery-routes.js';
import {encodeShareLine,decodeShareLine,restoreShareLine} from '../lib/share-line.js';

// Execute the actual component handlers without a browser/WebGL dependency.
// This verifies state/authority contracts, not rendered layout or camera quality.
const source=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('manners-game.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const findAll=predicate=>{const found=[];const visit=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,visit);};visit(ast);return found;};
const expression=name=>{const found=findAll(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name)[0];assert.ok(found,name+' exists');return found.initializer.getText(ast);};
const actions=findAll(node=>ts.isBinaryExpression(node)&&node.left.getText(ast)==='linecraftActionsRef.current'&&ts.isConditionalExpression(node.right))[0]?.right.getText(ast);
assert.ok(actions,'actual Linecraft action table exists');
const compile=(context,name,code)=>{vm.runInContext(ts.transpileModule('globalThis.'+name+' = '+code,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);return context[name];};
const plain=value=>JSON.parse(JSON.stringify(value));
const storage=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};};
class Vector {constructor(x=0,y=0,z=0){this.set(x,y,z);}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}clone(){return new Vector(this.x,this.y,this.z);}copyFrom(point){return this.set(point.x,point.y,point.z);}}
const terminal=[{kind:'termination',reason:'ground-contact'},{kind:'ruling',targetHit:false,surface:'ground'}];
test('Linecraft hidden Sky Token produces no contact or evidence, while other labs retain it',()=>{
 const card=selectOpenLineStation('gate'),start={x:SKY_TOKEN.x,y:SKY_TOKEN.y,z:SKY_TOKEN.z-12},end={...start,z:SKY_TOKEN.z+12};
 assert.ok(collectLineStepEvents(start,end,card).some(event=>event.kind==='sky'));
 assert.ok(!collectLineStepEvents(start,end,card,[],[],false).some(event=>event.kind==='sky'));
 assert.match(source,/collectLineStepEvents\(previousLike,currentLike,hole,\[\.\.\.flight\.mechanismTags\],\[\.\.\.flight\.deliveryRoutes\],!linecraftLab\)/);
});

test('Linecraft console reserves exactly three explicit action areas and a preceding full-width origin control',async()=>{
 const layout=await readFile(new URL('../app/linecraft-lab.module.css',import.meta.url),'utf8');
 assert.match(layout,/grid-template-areas:"origin fire aim"/);
 assert.match(layout,/\.originControl\{display:grid;grid-template-columns:auto minmax\(0,1fr\) auto/);
 assert.ok(source.indexOf('className={linecraftOriginControlClassName}')<source.indexOf('className="manners-control-grid"'));
});
function savedLine(id='study:1',session=createLinecraftSession()){
 const card=selectOpenLineStation('lumber'),setup={railIndex:2,yaw:3,elevation:33,charge:.98};
 const launch=captureLabLaunch(card,setup,{floor:'B'},'8eb7ef65e6');
 return {...setup,holeId:'open-line',stationId:'lumber',windId:card.wind.id,build:'8eb7ef65e6',projectileId:1,outcome:'miss',receipt:'GROUND CONTACT',environment:{floor:'B'},environmentAfter:{floor:'A'},
  points:[new Vector(1,2,3),new Vector(2,5,7),new Vector(5,0,9)],contacts:[],ledger:terminal,lineReceipt:recordLineReceipt(terminal),linecraftAttemptId:id,linecraftLaunch:launch,linecraftMeta:linecraftMeta(session)};
}
function context(){
 const state={transitions:[],station:'gate',floor:'B',resets:0,scoreCalls:0,fireCalls:0};
 const local=storage(),shelf=createLinecraftShelf(local),journal=createLinecraftDecisions(local);
 const c={state,linecraftLab:true,LINECRAFT_LESSONS,createLinecraftSession,continueLinecraftSession,enterLinecraftOpen,
  linecraftSessionRef:{current:createLinecraftSession()},linecraftReplayingRef:{current:false},phaseRef:{current:'ready'},inputSourceRef:{current:'pointer'},
  linecraftShelfRef:{current:shelf},linecraftDecisionsRef:{current:journal},linecraftAttemptRef:{current:'old:1'},linecraftRelationRef:{current:{action:'retry'}},linecraftGhostIdRef:{current:'old:1'},
  HOLES:[{id:'open-line',station:{id:'gate'}}],activeHoleIndex:()=>0,memoriesRef:{current:{old:1}},historyRef:{current:{old:1}},libraryRef:{current:{old:1}},recordsRef:{current:{old:1}},
  compareRef:{current:true},powerModeRef:{current:'set'},selectedPowerRef:{current:.7},floorStateRef:{current:'B'},surveyRef:{current:false},lineLedgerRef:{current:terminal},
  setLinecraftSession:value=>state.session=value,setRecords:value=>state.records=value,setLastShot:value=>state.last=value,setHistory:value=>state.history=value,setWinningLines:value=>state.wins=value,
  setLineLedger:value=>state.ledger=value,setLiveLineTotal:value=>state.total=value,setSessionBest:value=>state.best=value,setClaimCaption:value=>state.caption=value,
  setLinecraftAttempt:value=>state.attempt=value,setLinecraftGhostId:value=>state.ghost=value,setCompare:value=>state.compare=value,clearMax:()=>state.max=false,
  setPowerMode:value=>state.powerMode=value,setSelectedPower:value=>state.power=value,setRetryNotice:value=>state.retryNotice=value,setLinecraftNotice:value=>state.notice=value,
  setLinecraftKept:value=>state.kept=value,setFloorState:value=>state.floor=value,setSurvey:value=>state.survey=value,setLinecraftReplaying:value=>state.replaying=value,
  showLinecraftShelf:value=>state.shelfOpen=value,scoreLine:ledger=>{state.scoreCalls++;return scoreLine(ledger);},
  chooseOpenStation:id=>{state.station=id;c.HOLES[0].station.id=id;},returnLab:mode=>{assert.ok(['reset','adjust'].includes(mode));state.floor='A';c.phaseRef.current='ready';state.resets++;},
  mountControl:{transition:(action,change)=>{state.transitions.push(action);change();}},memoryFor:()=>c.memory,
  restoreLinecraft:()=>{},playLinecraftReplay:()=>{},stopLinecraftReplay:()=>{},
 };
 vm.createContext(c);compile(c,'linecraftBlock',expression('linecraftBlock'));compile(c,'runtime',actions);return c;
}

test('Linecraft is opt-in, separately namespaced and keeps the physics initializer mount-only',async()=>{
 const route=await readFile(new URL('../app/lab/linecraft/page.tsx',import.meta.url),'utf8');assert.match(route,/<MannersGame linecraftLab\s*\/>/);assert.doesNotMatch(route,/key=/);
 for(const path of ['../app/page.tsx','../app/courtyard/page.tsx','../app/practice/page.tsx','../app/lab/lines/page.tsx','../app/lab/intent/page.tsx'])assert.doesNotMatch(await readFile(new URL(path,import.meta.url),'utf8'),/linecraftLab/);
 const initializers=findAll(node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('const initialize = async'));
 assert.equal(initializers.length,1);assert.equal(initializers[0].arguments[1].getText(ast),'[]');
 const c={linecraftLab:true,intentLab:true,timberReceiver:true,lineLab:true,courtyardDiverter:true,diverterLab:true,courtyard:true};vm.createContext(c);
 assert.equal(compile(c,'key',expression('STORAGE_KEY')),'rail-golf-linecraft-v1');
 assert.match(source,/linecraftLab\?linecraftStorage\(storage\)/);assert.match(source,/linecraftLab\?"rail-golf-linecraft-survey"/);
 assert.match(source,/const saved = linecraftLab\?\{\}:intentLab\?\{\}:loadProgress/);
 assert.match(expression('rememberFlight'),/if\(!intentLab&&!linecraftLab\)try/);
});

test('actual stage reset clears stale attempt/progress/HUD/setup while preserving Shelf and refusing flight/replay transitions',()=>{
 const c=context(),line=savedLine();c.linecraftShelfRef.current.keep('s:kept',line,line.linecraftLaunch,line.linecraftMeta);
 const before=JSON.stringify(c.linecraftShelfRef.current.entries());
 c.linecraftBlock({...createLinecraftSession(),lessonIndex:1});
 assert.equal(c.state.station,'lumber');assert.equal(c.state.floor,'A');assert.equal(c.state.total,0);assert.equal(c.state.last,null);assert.equal(c.state.caption,null);assert.equal(c.state.max,false);assert.equal(c.state.powerMode,'hold');assert.equal(c.state.power,.5);
 for(const ref of ['memoriesRef','historyRef','libraryRef','recordsRef'])assert.equal(Object.keys(c[ref].current).length,0);
 assert.equal(c.linecraftAttemptRef.current,null);assert.equal(c.linecraftRelationRef.current,null);assert.equal(c.linecraftGhostIdRef.current,null);assert.equal(JSON.stringify(c.linecraftShelfRef.current.entries()),before);
 c.phaseRef.current='flight';c.linecraftBlock(createLinecraftSession());assert.equal(c.state.transitions.length,1);
 c.phaseRef.current='ready';c.linecraftReplayingRef.current=true;c.linecraftBlock(createLinecraftSession());assert.equal(c.state.transitions.length,1);
});

test('actual Continue needs a resolved attempt; incomplete attempts remain incomplete and cold Open is explicit',()=>{
 const c=context();c.runtime.next();assert.equal(c.state.transitions.length,0);
 c.linecraftSessionRef.current=recordLinecraftAttempt(c.linecraftSessionRef.current,'s:1',terminal);
 c.runtime.next();assert.equal(c.linecraftSessionRef.current.lessonIndex,1);assert.equal(c.linecraftSessionRef.current.progress.banks.attempted,1);assert.equal(c.linecraftSessionRef.current.progress.banks.completed,false);
 c.runtime.next();assert.equal(c.state.transitions.length,1,'previous lesson attempt cannot skip a fresh lesson');
 c.runtime.open();assert.equal(c.linecraftSessionRef.current.stage,'open');assert.equal(c.linecraftSessionRef.current.openEntry,'cold');
 c.runtime.restart();assert.equal(c.linecraftSessionRef.current.stage,'learn');assert.equal(c.linecraftSessionRef.current.lessonIndex,0);assert.equal(c.linecraftSessionRef.current.progress.banks.attempted,0);
});

test('actual universal Keep accepts unrecognized Learn and Open shots and preserves fire-time metadata after score toggle',()=>{
 const c=context();c.phaseRef.current='result';
 for(const [index,session] of [createLinecraftSession(),enterLinecraftOpen(createLinecraftSession(),'cold')].entries()){
  const id='s:'+(index+1),line=savedLine(id,session);c.memory=line;c.linecraftAttemptRef.current=id;c.linecraftSessionRef.current=session;
  if(session.stage==='open')c.runtime.score(true);
  c.runtime.keep();assert.equal(c.linecraftShelfRef.current.entries().length,index+1);assert.equal(c.linecraftDecisionsRef.current.export().length,index+1);
 }
 const kept=c.linecraftShelfRef.current.entries(),decisions=c.linecraftDecisionsRef.current.export();
 assert.equal(kept[0].meta.linecraft.stage,'learn');assert.equal(kept[1].meta.linecraft.stage,'open');assert.equal(decisions[1].linecraft.scoreVisible,false,'toggle after shot cannot rewrite exposure at launch');assert.equal(decisions[1].scoreTotal,scoreLine(terminal).total);
 assert.deepEqual(kept[1].launchContext,c.memory.linecraftLaunch);assert.deepEqual(kept[1].line.environment,{floor:'B'});assert.deepEqual(kept[1].line.points,plain(c.memory.points));
 c.linecraftAttemptRef.current='different-ticket';c.runtime.keep();assert.equal(c.linecraftShelfRef.current.entries().length,2);
 c.linecraftAttemptRef.current='s:2';c.phaseRef.current='ready';c.runtime.keep();assert.equal(c.linecraftShelfRef.current.entries().length,2);
 c.phaseRef.current='result';c.runtime.remove('s:1');assert.equal(c.linecraftShelfRef.current.entries().length,1);assert.equal(c.linecraftDecisionsRef.current.export().length,2,'removing viewing slot preserves voluntary Keep');
});

test('score visibility handler changes presentation only and cannot operate in Learn, flight or replay',()=>{
 const c=context();c.runtime.score(true);assert.equal(c.state.scoreCalls,0);
 c.linecraftSessionRef.current=enterLinecraftOpen(c.linecraftSessionRef.current,'cold');const before=plain(c.linecraftSessionRef.current);
 for(const value of [true,false]){c.runtime.score(value);assert.equal(c.linecraftSessionRef.current.scoreVisible,value);assert.equal(c.state.total,scoreLine(terminal).total);}
 assert.deepEqual(plain(c.linecraftSessionRef.current),before);assert.equal(c.state.transitions.length,0);assert.equal(c.state.resets,0);
 c.phaseRef.current='flight';c.runtime.score(true);c.phaseRef.current='ready';c.linecraftReplayingRef.current=true;c.runtime.score(true);assert.equal(c.state.scoreCalls,2);
});

test('actual Restore enters an explicit Open revisit, restores exact starting setup/environment and never fires or credits Learn',()=>{
 const c=context(),line=savedLine();c.linecraftShelfRef.current.keep('s:1',line,line.linecraftLaunch,line.linecraftMeta);
 Object.assign(c,{Vector3:Vector,BUILD_ID:'new-build',loadHole:(index,restore)=>{assert.equal(index,3);assert.equal(restore,true);c.phaseRef.current='ready';},exactPower:value=>c.state.exactPower=value});
 compile(c,'restore',expression('restoreLinecraft'));assert.equal(c.restore('s:1'),true);
 assert.equal(c.linecraftSessionRef.current.stage,'open');assert.equal(c.linecraftSessionRef.current.openEntry,'revisit');assert.equal(c.linecraftSessionRef.current.progress.banks.attempted,0);
 assert.equal(c.linecraftAttemptRef.current,null);assert.equal(c.state.station,'lumber');assert.equal(c.floorStateRef.current,'B');assert.equal(c.state.exactPower,.98);assert.equal(c.phaseRef.current,'ready');
 assert.deepEqual(plain(c.linecraftRelationRef.current),{action:'restore-kept',attemptId:'s:1'});assert.match(c.state.notice,/new shot may differ/);
 assert.doesNotMatch(expression('restoreLinecraft'),/\bfire\s*\(|applyImpulse|setLinearVelocity|surveyLogRef/);
});

test('actual Replay creates only recorded visual meshes and Stop disposes them and restores viewing state',()=>{
 const c=context(),line=savedLine();c.linecraftShelfRef.current.keep('s:1',line,line.linecraftLaunch,line.linecraftMeta);
 const meshes=[];const mesh=()=>{const value={position:new Vector(),dispose(){this.disposed=true;}};meshes.push(value);return value;};
 Object.assign(c,{Vector3:Vector,Color3:class{},scene:{},materials:{amber:{}},performance:{now:()=>100},camera:{position:new Vector(4,5,6),fov:.7,setTarget:()=>{}},cameraTarget:new Vector(7,8,9),
  replayMarker:null,replayTrail:null,replayPoints:[],replayView:null,replayStarted:0,MeshBuilder:{CreateLines:(_id,options)=>{c.state.replayPoints=options.points;return mesh();},CreateSphere:()=>mesh()},disposeGhost:()=>{},restoreLinecraft:()=>true});
 compile(c,'play',expression('playLinecraftReplay'));compile(c,'stop',expression('stopLinecraftReplay'));
 c.play('s:1');assert.equal(c.linecraftReplayingRef.current,true);assert.equal(c.surveyRef.current,true);assert.equal(meshes.length,2);assert.ok(meshes.every(value=>value.isPickable===false));assert.deepEqual(plain(c.state.replayPoints),plain(line.points));
 c.play('s:1');assert.equal(meshes.length,2,'repeated replay activation cannot spawn more markers');c.stop();assert.equal(c.linecraftReplayingRef.current,false);assert.ok(meshes.every(value=>value.disposed));assert.equal(c.surveyRef.current,false);assert.equal(c.replayPoints.length,0);
 const replayNode=findAll(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)==='playLinecraftReplay')[0];const calls=[];const scan=node=>{if(ts.isCallExpression(node)||ts.isNewExpression(node))calls.push(node.expression.getText(ast));ts.forEachChild(node,scan);};scan(replayNode);
 assert.ok(!calls.some(name=>/PhysicsAggregate|fire|applyImpulse|scoreLine|surveyLog|captureLabLaunch/.test(name)));
 const start=source.indexOf('if(linecraftGhostVersion!=='),end=source.indexOf('const deltaSeconds = Math.min',start),render=source.slice(start,end);
 assert.match(render,/entry\.line\.points\.map/);assert.match(render,/linecraftGhost\.isPickable=false/);assert.match(render,/sampleRecordedPath\(replayPoints,progress\)/);assert.doesNotMatch(render,/yawRef|elevationRef|chargeRef|applyImpulse|setLinearVelocity|scoreLine/);
});

test('fire-time study ticket and resolved memory retain one authority; setup links explicitly restore without firing',()=>{
 assert.match(expression('fire'),/const linecraftFireMeta=linecraftLab\?/);assert.match(expression('fire'),/linecraftMeta:linecraftFireMeta/);assert.match(expression('fire'),/surveyLogRef\.current\?\.begin\([\s\S]*linecraftFireMeta/);
 assert.match(expression('rememberFlight'),/linecraftAttemptId:current\.surveyTicket\?\.id,linecraftLaunch:current\.launchContext,linecraftMeta:current\.linecraftMeta/);
 assert.match(expression('rememberFlight'),/recordLinecraftAttempt\(linecraftSessionRef\.current,current\.surveyTicket\.id,current\.ledger,current\.linecraftMeta\)/);
 const payload={v:1,build:'8eb7ef65e6',world:'timber-courtyard',route:'/lab/linecraft',card:'open-line',station:'lumber',rail:2,yaw:3,elevation:33,speed:42,environment:{floor:'B'}};
 const restored=restoreShareLine(decodeShareLine(encodeShareLine(payload)),payload.build);assert.equal(restored.autoFire,false);assert.equal(restored.route,'/lab/linecraft');assert.equal(restored.station,'lumber');assert.deepEqual(restored.environment,{floor:'B'});
 const importStart=source.indexOf("const encoded=new URLSearchParams(window.location.hash.slice(1)).get('line')"),importEnd=source.indexOf('const labMode =',importStart),importCode=source.slice(importStart,importEnd);
 assert.match(importCode,/enterLinecraftOpen\(linecraftSessionRef\.current,'revisit'\)/);assert.doesNotMatch(importCode,/\bfire\s*\(|\.release\s*\(|applyImpulse|setLinearVelocity/);
});

test('built Linecraft route serves Learn first while production and Intent keep their own UI',async()=>{
 const workerURL=new URL('../dist/server/index.js',import.meta.url);workerURL.searchParams.set('linecraft-test',`${process.pid}-${Date.now()}`);
 const {default:worker}=await import(workerURL.href);
 const htmlAt=async path=>{const response=await worker.fetch(new Request('http://localhost'+path,{headers:{accept:'text/html'}}),{ASSETS:{fetch:async()=>new Response('Not found',{status:404})}},{waitUntil(){},passThroughOnException(){}});assert.equal(response.status,200,path);return response.text();};
 const html=await htmlAt('/lab/linecraft'),plainHTML=html.replaceAll('<!-- -->','');assert.match(plainHTML,/1 \/ 2/);assert.match(html,/BANK A/);assert.match(html,/BANK B/);assert.match(html,/SHELF/);assert.match(html,/Skip Lessons/);assert.match(html,/data-active-card="open-line" data-active-station="gate"/);
 assert.equal(/Winning lines|NON-CANONICAL PLACEHOLDERS · line score/.test(html),false,'Learn boot must not advertise winning lines or a numeric score tooltip');
 const production=await htmlAt('/');assert.doesNotMatch(production,/LINECRAFT LAB|LINE SHELF|SKIP TO OPEN/);
 const intent=await htmlAt('/lab/intent');assert.match(intent,/INTENT LAB/);assert.doesNotMatch(intent,/LINECRAFT LAB|LINE SHELF|SKIP TO OPEN/);
});
