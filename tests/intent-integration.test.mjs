import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import vm from 'node:vm';import ts from 'typescript';
import {SENTENCES} from '../lib/intent-lab.js';
// Source/handler tests are a fallback authority for the available non-WebGL browser.
// They do not establish rendered layout, input targeting, or browser camera quality.
const source=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('manners-game.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const findAll=predicate=>{const found=[];const walk=node=>{if(predicate(node))found.push(node);ts.forEachChild(node,walk);};walk(ast);return found;};
const declaration=name=>findAll(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)[0];
const body=name=>{const node=declaration(name);assert.ok(node,name+' declaration');return node.initializer.getText(ast);};
const between=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,start);return source.slice(a,b);};

test('Intent is an opt-in wrapper; accepted routes do not select it, and initializer remains mount-only',async()=>{
 const route=await readFile(new URL('../app/lab/intent/page.tsx',import.meta.url),'utf8');assert.match(route,/<MannersGame intentLab\s*\/>/);
 for(const path of ['../app/lab/lines/page.tsx','../app/courtyard/page.tsx'])assert.doesNotMatch(await readFile(new URL(path,import.meta.url),'utf8'),/intentLab/);
 assert.match(source,/intentLab = false/);assert.match(source,/lineLab = lineLab \|\| timberReceiver \|\| intentLab/);
 const initializers=findAll(n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('const initialize = async'));
 assert.equal(initializers.length,1);assert.equal(initializers[0].arguments[1].getText(ast),'[]');
 assert.match(source,/intentLab\?"rail-golf-intent-survey"/);assert.match(source,/intentLab\?intentStorage\(storage\)/);
});

test('actual condition transition handler resets artifacts/setup without clearing kept repertoire or remounting',()=>{
 const state={phase:'ready',station:'gate',floor:'B',resets:0,transitions:0};
 const context={intentLab:true,SENTENCES,phaseRef:{current:'ready'},intentSentenceRef:{current:'banks'},intentConditionRef:{current:'keep'},HOLES:[{station:{id:'gate'}}],activeHoleIndex:()=>0,
  memoriesRef:{current:{old:1}},historyRef:{current:{old:1}},libraryRef:{current:{old:1}},intentAttemptRef:{current:'old:1'},intentRelationRef:{current:{action:'retry'}},compareRef:{current:true},powerModeRef:{current:'set'},selectedPowerRef:{current:.7},inputSourceRef:{current:'pointer'},
  intentKeptRef:{current:[{attemptId:'kept:1'}]},setIntentCondition:v=>state.condition=v,setIntentSentence:v=>state.sentence=v,
  setLastShot:v=>state.last=v,setHistory:v=>state.history=v,setWinningLines:v=>state.wins=v,setLineLedger:v=>state.ledger=v,setLiveLineTotal:v=>state.total=v,setClaimCaption:v=>state.caption=v,setIntentAttempt:v=>state.attempt=v,
  setCompare:()=>{},clearMax:()=>state.max=false,setPowerMode:v=>state.powerMode=v,setSelectedPower:v=>state.power=v,
  chooseOpenStation:id=>{state.station=id;context.HOLES[0].station.id=id;},returnLab:mode=>{assert.equal(mode,'reset');state.floor='A';state.resets++;},setRetryNotice:()=>{},
  mountControl:{transition:(_action,change)=>{state.transitions++;change();}},
 };
 vm.createContext(context);vm.runInContext(ts.transpileModule('globalThis.applyBlock = '+body('intentBlock'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 for(const condition of ['sentence','score','keep']){
  context.applyBlock(condition);assert.equal(state.condition,condition);assert.equal(state.floor,'A');assert.equal(state.total,0);assert.equal(state.last,null);assert.equal(state.caption,null);assert.equal(state.max,false);assert.equal(state.powerMode,'hold');
  assert.equal(Object.keys(context.memoriesRef.current).length,0);assert.equal(Object.keys(context.historyRef.current).length,0);assert.equal(context.intentKeptRef.current.length,1);assert.equal(context.intentRelationRef.current,null);
 }
 assert.equal(state.resets,3);assert.equal(state.transitions,3);
 context.phaseRef.current='flight';context.applyBlock('score');assert.equal(state.transitions,3,'mid-flight condition change rejected');
});

test('SCORE calls incumbent scoreLine and non-score exits before numeric caption/HUD/receipt paths',()=>{
 assert.match(source,/import \{[^\n]*scoreLine[^\n]*\} from '@\/lib\/line-score'/);
 const captions=body('captionClaims');const nonScore=captions.indexOf("intentConditionRef.current!=='score'");const receipt=captions.indexOf('const receipt=scoreLine(flight.ledger)');assert.ok(nonScore>=0&&receipt>nonScore);assert.match(captions.slice(nonScore,receipt),/return;/);
 assert.match(source,/const intentScored=!intentLab\|\|intentCondition==='score'/);
 assert.match(source,/lineLab && intentScored && phase==='ready'[^\n]*<LineReceipt/);
 assert.match(source,/intentScored&&<LineReceipt ledger=\{lineLedger\}/);
 assert.match(source,/if\(!intentLab\|\|intentConditionRef\.current==='score'\)setSessionBest/);
 assert.match(source,/intentLab&&!intentScored\?'CONDITION'/);
});

test('kept ghosts render only recorded points in KEEP Survey, never current aim; retained Recall restores exact authority',()=>{
 const ghosts=between('if(keptGhostVersion!==intentKeptRef.current)','const deltaSeconds = Math.min');
 assert.match(ghosts,/intentKeptRef\.current\.map\(k=>k\.line\.points/);assert.match(ghosts,/keptGhost\.isPickable=false/);
 assert.match(ghosts,/intentConditionRef\.current==='keep'&&surveyRef\.current&&intentGhostsRef\.current/);
 assert.doesNotMatch(ghosts,/yawRef|elevationRef|chargeRef|stationAim|applyImpulse|setLinearVelocity/);
 const recall=between('recallKeep:id=>{','actionsRef.current = {');
 assert.match(recall,/chooseOpenStation\(memory.stationId\)/);assert.match(recall,/floorStateRef.current=memory.environment!\.floor/);assert.match(recall,/exactPower\(memory.charge\)/);assert.match(recall,/intentRelationRef.current=\{action:'recall-kept',attemptId:id\}/);
});

test('fire captures condition/setup ticket once, resolved memory retains ticket ID and interruption records before disposal',()=>{
 const fire=body('fire');assert.match(fire,/surveyLogRef.current\?\.begin\(\{\.\.\.launchContext,\.\.\.\(intentLab\?intentMeta\(intentConditionRef.current,intentSentenceRef.current,intentRelationRef.current\)/);
 assert.match(body('rememberFlight'),/intentAttemptId:current.surveyTicket\?\.id/);assert.match(body('rememberFlight'),/surveyLogRef.current\?\.append\(current.surveyTicket,current.ledger\)/);
 const recovery=body('returnLab');assert.match(recovery,/rememberFlight\('Interrupted · no landing ruling'\)/);assert.match(recovery,/returnLabToSetup\(mode/);
 const relationPos=recovery.indexOf('intentRelationRef.current=');const interruptPos=recovery.indexOf("rememberFlight('Interrupted");
 // Either capture the already-created fire ticket, or assign the relation after the
 // interruption has published intentAttemptRef. A null pre-interrupt ref loses lineage.
 assert.ok(/attemptId:[^\n]*flight\?\.surveyTicket\?\.id/.test(recovery)||relationPos>interruptPos,'interrupted retry keeps current attempt identity');
 assert.match(source,/intentRelationRef.current=\{action:'recall',attemptId:memory.intentAttemptId/);
});
