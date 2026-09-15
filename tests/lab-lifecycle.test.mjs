import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import ts from 'typescript';
import {getDocumentProvenance,observeBrowserLifecycle} from '../lib/browser-provenance.js';
import {createActionTrace,actionTraceCSV} from '../lib/action-trace.js';
import {createLabSelection,createSelectionWitness} from '../lib/lab-selection.js';
import {LINE_CARDS,selectOpenLineStation} from '../lib/line-lab.js';
import {createLabControl} from '../lib/lab-controls.js';import {maxLatchAfter} from '../lib/shot-tools.js';
import {stationMuzzle} from '../lib/stations.js';
const storage=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
let serial=0;const uuid=()=>`identity-${++serial}`;
function page(sessionStorage=storage(),type='navigate',timeOrigin=1){
 const win=new EventTarget(),doc=new EventTarget(),canvas=new EventTarget();
 Object.assign(win,{sessionStorage,location:{href:'https://example.test/lab/lines#line=fixture',pathname:'/lab/lines',hash:'#line=fixture'},performance:{timeOrigin,getEntriesByType:()=>[{type}]}});
 Object.assign(doc,{visibilityState:'visible',wasDiscarded:false,readyState:'complete'});
 return {win,doc,canvas,identity:getDocumentProvenance(win,doc,uuid)};
}
const state={phase:'ready',card:'open-line',station:'gate',floor:'A'};
const entry=action=>({action,source:'internal/programmatic',before:state,after:state,accepted:true,reason:'observed'});
const event=(name,detail={})=>Object.assign(new Event(name,{cancelable:true}),detail);

test('page identity separates fresh tab, same-tab reload, same-document component/effect mounts, and BFCache restoration',()=>{
 const first=page(),component=uuid(),a=first.identity.mount(component),b=first.identity.mount(component),c=first.identity.mount(uuid());
 assert.notEqual(a.mountId,b.mountId);assert.equal(a.componentId,b.componentId);assert.notEqual(b.componentId,c.componentId);assert.equal(c.mountNumber,3);
 assert.equal(getDocumentProvenance(first.win,first.doc,uuid),first.identity);
 const reload=page(first.win.sessionStorage,'reload',2),other=page();
 assert.equal(reload.identity.tabId(),first.identity.tabId());assert.notEqual(reload.identity.documentId,first.identity.documentId);
 assert.notEqual(other.identity.tabId(),first.identity.tabId());assert.equal(reload.identity.snapshot().navigationType,'reload');
 reload.doc.wasDiscarded=true;assert.equal(reload.identity.snapshot().wasDiscarded,true);
 first.win.performance.getEntriesByType=()=>[{type:'back_forward'}];assert.equal(getDocumentProvenance(first.win,first.doc,uuid).documentId,first.identity.documentId);
 assert.equal(first.identity.snapshot().navigationType,'back_forward');
 assert.equal(first.win.sessionStorage.length,1); // identity only, no card/setup resume
});

test('lifecycle rows carry current URL, navigation, visibility and mount; pagehide persists without requiring React disposal',()=>{
 const p=page(),local=storage(),mount=p.identity.mount(uuid());
 const trace=createActionTrace({storage:local,build:'build',session:'lifecycle',context:()=>({...p.identity.snapshot(),...mount})});
 const stop=observeBrowserLifecycle({...p,record:(name,detail)=>trace.append({...entry(name),category:'lifecycle',detail})});
 p.win.dispatchEvent(event('pageshow',{persisted:true}));
 p.doc.visibilityState='hidden';p.doc.dispatchEvent(event('visibilitychange'));
 for(const name of ['freeze','resume'])p.doc.dispatchEvent(event(name));
 p.win.location.hash='#changed';p.win.location.href='https://example.test/lab/lines#changed';
 p.win.dispatchEvent(event('hashchange',{oldURL:'old',newURL:p.win.location.href}));p.win.dispatchEvent(event('popstate'));
 p.win.dispatchEvent(event('error',{message:'test error',filename:'game.js',lineno:4,colno:8}));
 const rejection=event('unhandledrejection',{reason:Error('test promise')});p.win.dispatchEvent(rejection);assert.equal(rejection.defaultPrevented,false);
 for(const name of ['webglcontextlost','webglcontextrestored']){const e=event(name,{statusMessage:'test context'});p.canvas.dispatchEvent(e);assert.equal(e.defaultPrevented,false);}
 p.win.dispatchEvent(event('pagehide',{persisted:true}));
 const rows=trace.export('mount').entries;assert.ok(rows.every(e=>e.tabId===p.identity.tabId()&&e.documentId===p.identity.documentId&&e.mountId===mount.mountId&&e.session==='lifecycle'&&e.build==='build'));
 assert.equal(rows.find(e=>e.action==='visibilitychange').visibility,'hidden');assert.equal(rows.find(e=>e.action==='hashchange').hash,'#changed');
 assert.equal(rows.find(e=>e.action==='pagehide').detail.persisted,true);assert.ok(!rows.some(e=>e.action==='session-dispose'));
 const reloaded=createActionTrace({storage:local,build:'next',session:'read'});assert.equal(reloaded.export().entries.length,rows.length);
 stop();p.win.dispatchEvent(event('pageshow'));p.canvas.dispatchEvent(event('webglcontextlost'));assert.equal(trace.export().entries.length,rows.length);
});

test('trace scopes isolate active mount, document and tab; legacy rows remain available without being falsely attributed',()=>{
 const local=storage(),p=page();
 const make=(page,component)=>{const mount=page.identity.mount(component),trace=createActionTrace({storage:local,build:'new',context:()=>({...page.identity.snapshot(),...mount})});trace.append(entry('authority-mount'));return trace;};
 const legacy=createActionTrace({storage:local,build:'old',session:'legacy'});legacy.append(entry('session-entry'));
 const a=make(p,uuid()),b=make(p,uuid()),reloaded=page(p.win.sessionStorage,'reload',2),c=make(reloaded,uuid()),other=make(page(),uuid());
 assert.equal(b.export('mount').entries.length,1);assert.equal(b.export('document').entries.length,2);
 assert.equal(c.export('document').entries.length,1);assert.equal(c.export('tab').entries.length,3);assert.equal(c.export('all').entries.length,5);
 assert.equal(other.export('tab').entries.length,1);assert.equal(c.export('all').legacyWithoutIdentity,1);
 assert.equal(c.export('all').sessions.length,5);assert.equal(c.export('mount').active.mountId,c.summary().mountId);
 assert.match(actionTraceCSV(c.export('all')),/"tabId","documentId","componentId","mountId"/);
 assert.match(actionTraceCSV(c.export('mount')),/"reload"/);assert.throws(()=>a.export('nonsense'),/Unknown/);
});

test('cloned sessionStorage in simultaneous lab tabs rotates the newer tab explicitly; pagehide prevents false reload collision',()=>{
 const channels=new Set();
 class Channel{constructor(){channels.add(this);}postMessage(data){for(const c of [...channels])if(c!==this)c.onmessage?.({data});}close(){channels.delete(this);}}
 const a=page(),rowsA=[];a.win.BroadcastChannel=Channel;
 const stopA=observeBrowserLifecycle({...a,record:(...e)=>rowsA.push(e)});
 const cloned=storage();for(let i=0;i<a.win.sessionStorage.length;i++){const k=a.win.sessionStorage.key(i);cloned.setItem(k,a.win.sessionStorage.getItem(k));}
 const b=page(cloned,'navigate',2),rowsB=[];b.win.BroadcastChannel=Channel;
 assert.equal(a.identity.tabId(),b.identity.tabId());const stopB=observeBrowserLifecycle({...b,record:(...e)=>rowsB.push(e)});
 assert.notEqual(a.identity.tabId(),b.identity.tabId());assert.equal(rowsB.filter(e=>e[0]==='tab-identity-collision').length,1);
 a.win.dispatchEvent(event('pagehide',{persisted:true}));const reload=page(a.win.sessionStorage,'reload',3);reload.win.BroadcastChannel=Channel;
 const stopReload=observeBrowserLifecycle({...reload,record:()=>{}});assert.equal(reload.identity.tabId(),a.identity.tabId());
 stopA();stopB();stopReload();assert.equal(channels.size,0);
});

test('Card 04 / Gate / Walk use one renderer/control snapshot; 500 MAX and Survey/tool toggles cannot publish selection or mount authority',()=>{
 const selection=createLabSelection(LINE_CARDS),p=page(),mount=p.identity.mount(uuid());let rendered=selection.getSnapshot(),max=false,survey=false,tools=false,publishes=0;
 const unsubscribe=selection.subscribe(()=>{rendered=selection.getSnapshot();publishes++;});
 const read=()=>{const s=selection.getSnapshot();return {...state,card:s.hole.id,station:s.hole.station.id};};
 const handlers={selectHole:i=>selection.select(i),selectStation:id=>selection.replaceOpenLine(selectOpenLineStation(id)),toggleMax:()=>{max=maxLatchAfter(max,'toggle');},toggleSurvey:()=>{survey=!survey;}};
 const c=createLabControl({read,handlers:()=>handlers,record:()=>{}});
 c.run('selectHole',[3],'pointer');assert.equal(rendered.hole.id,'open-line');assert.equal(read().card,'open-line');
 const gateMuzzle=stationMuzzle(rendered.hole.defaultShot,rendered.hole.station);
 for(const id of ['lumber','gate','lumber']){c.run('selectStation',[id],'pointer');assert.equal(rendered.hole.station.id,id);assert.equal(read().station,id);}
 assert.notDeepEqual(gateMuzzle,stationMuzzle(rendered.hole.defaultShot,rendered.hole.station));
 const snapshot=selection.getSnapshot(),published=publishes;
 for(let i=0;i<500;i++){c.run('toggleMax',[],'pointer');c.run('toggleSurvey',[],'keyboard');tools=!tools;assert.equal(selection.getSnapshot(),snapshot);assert.equal(rendered,snapshot);}
 assert.equal(publishes,published);assert.equal(max,false);assert.equal(survey,false);assert.equal(tools,false);assert.equal(p.identity.mount(uuid()).mountNumber,mount.mountNumber+1);
 unsubscribe();selection.select(0);assert.equal(publishes,published);
});

test('a committed visible mismatch emits explicit divergence once, preserves evidence on alignment, and never repairs state',()=>{
 const rows=[],witness=createSelectionWitness(e=>rows.push(e));
 const rendered={card:'open-line',station:'gate'},authority={card:'mill-delivery',station:'gate'};
 assert.equal(witness.check(rendered,authority,'react-commit'),false);assert.equal(witness.check(rendered,authority,'before-toggleMax'),false);assert.equal(rows.length,1);
 assert.equal(rows[0].kind,'state-divergence');assert.deepEqual(rows[0].rendered,rendered);assert.deepEqual(rows[0].authority,authority);
 assert.equal(authority.card,'mill-delivery');assert.equal(rendered.card,'open-line');
 assert.equal(witness.check(rendered,rendered,'react-commit'),true);assert.ok(rows.some(e=>e.kind==='state-aligned'));assert.equal(rows.at(-1).kind,'visible-selection');
});

test('actual MAX handler has no selection/navigation/mount call; initialization effect is mount-only and route has no reactive key',async()=>{
 const source=await readFile(new URL('../app/manners-game.tsx',import.meta.url),'utf8');
 const tree=ts.createSourceFile('game.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let maxHandler,initEffect;const visit=node=>{
  if(ts.isPropertyAssignment(node)&&node.name.getText(tree)==='toggleMax')maxHandler=node.initializer;
  if(ts.isCallExpression(node)&&node.expression.getText(tree)==='useEffect'&&node.arguments[0]?.getText(tree).includes('const initialize = async'))initEffect=node;
  ts.forEachChild(node,visit);
 };visit(tree);assert.ok(maxHandler);assert.ok(initEffect);
 const calls=[];const scan=node=>{if(ts.isCallExpression(node))calls.push(node.expression.getText(tree));ts.forEachChild(node,scan);};scan(maxHandler);
 assert.deepEqual(calls,['maxLatchAfter','setMaxPower']);
 assert.equal(initEffect.arguments[1].getText(tree),'[]');
 assert.doesNotMatch(source,/window\.location\.(?:reload|assign|replace)\s*\(|router\.(?:push|replace|refresh)\s*\(/);
 const route=await readFile(new URL('../app/lab/lines/page.tsx',import.meta.url),'utf8');assert.match(route,/<MannersGame lineLab\s*\/>/);assert.doesNotMatch(route,/key=/);
});

test('blocked sessionStorage is explicitly memory-only and document identity survives effect restarts',()=>{
 const blocked={getItem(){throw Error('blocked');}},p=page(blocked);assert.match(p.identity.snapshot().storageWarning,/memory-only/);
 assert.equal(getDocumentProvenance(p.win,p.doc,uuid),p.identity);assert.equal(p.identity.mount('a').mountNumber,1);assert.equal(p.identity.mount('a').mountNumber,2);
});

test('a new opener-cloned tab receives its own session identity before the first trace row',()=>{
 const parent=page(),cloned=storage();for(let i=0;i<parent.win.sessionStorage.length;i++){const k=parent.win.sessionStorage.key(i);cloned.setItem(k,parent.win.sessionStorage.getItem(k));}
 const win={...parent.win,sessionStorage:cloned,opener:parent.win,location:parent.win.location,performance:parent.win.performance},doc={visibilityState:'visible',readyState:'complete'};
 const child=getDocumentProvenance(win,doc,uuid);assert.notEqual(child.tabId(),parent.identity.tabId());assert.equal(child.snapshot().tabIdentitySource,'cloned-opener-separated');
 const reload=getDocumentProvenance(win,{...doc},uuid);assert.equal(child.tabId(),reload.tabId());
});
