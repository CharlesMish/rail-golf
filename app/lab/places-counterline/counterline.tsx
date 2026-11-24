'use client';
import {useEffect,useRef,useState} from 'react';
import {Camera,Color3,Color4,DirectionalLight,Engine,FreeCamera,HavokPlugin,HemisphericLight,LinesMesh,MeshBuilder,Scene,ShadowGenerator,Vector3} from '@babylonjs/core';
import Havok from '@babylonjs/havok';
import {BUILD_ID} from '@/lib/build-identity';
import {RAIL_RULES,clamp} from '@/lib/rail-golf-v02';
import {rangeSetup} from '@/lib/mechanism-range-controls';
import {buildRangeLauncher,buildRangeProjectile} from '@/lib/mechanism-range-presentation';
import {advanceFlightCamera,followHeading,followOffsets} from '@/lib/flight-framing';
import {createWorldcraftRuntime,type WorldcraftRuntime} from '@/lib/worldcraft-runtime';
import {createWorldcraftPresentation} from '@/lib/worldcraft-presentation';
import {createWorldcraftStore,captureWorldSnapshot,packWorldcraftLine,type WorldcraftLine,type WorldcraftSetup,type WorldcraftDocument} from '@/lib/worldcraft-model';
import {adaptRangePreset,createMusicalWorkshopPreset} from '@/lib/worldcraft-range';
import {performanceFromResonance,type ResonanceImpact} from '@/lib/worldcraft-resonance';
import {validateLoopLine,importLoopLines,readLocalLoopLines} from '@/lib/playability-loops';
import {COUNTERLINE_PAIR_KEY,COUNTERLINE_SHELF_PREFIX,counterlineSettings,createCounterlineAudio,createCounterlinePair,validateCounterlinePair,loadCounterlinePair,counterlineStepBudget,measureCounterlineAudio,measureCounterlineClock,assertCounterlineSourceIds,type CounterlinePair,type CounterlineSettings} from '@/lib/counterline';
import examples from '@/public/playability/loops-examples.json';
import styles from './counterline.module.css';
const BUNDLED=examples.lines.map(validateLoopLine);
const WORLDS=[{id:'early-plate',label:'Musical Workshop · early plate study',world:BUNDLED[0].worldSnapshot.world},{id:'workshop',label:'Musical Workshop · original arrangement',world:adaptRangePreset(createMusicalWorkshopPreset()).world}];
const OPENING:WorldcraftSetup={railIndex:1,originX:0,yaw:0,elevation:18,charge:.55};
const notes=(line:WorldcraftLine|null)=>line?.performance?.impacts.map(n=>n.note).join(' → ')||'No resonant notes';
type Phase='loading'|'ready'|'starting'|'flight'|'result'|'error';
type Source={line:WorldcraftLine;label:string};
type State={phase:Phase;setup:WorldcraftSetup;world:WorldcraftDocument;worldId:string;view:'launch'|'overview';notice:string;audio:string;last:WorldcraftLine|null;kept:boolean;live:ResonanceImpact[];own:WorldcraftLine[];sources:Source[];companion:WorldcraftLine|null;liveMuted:boolean;companionMuted:boolean;pair:CounterlinePair|null;savedPair:CounterlinePair|null;pairWritable:boolean;warning:string;qa:unknown;qaEnabled:boolean;pairChanged:boolean};
type Actions={fire():void;stop():void;retry():void;setup(patch:Partial<WorldcraftSetup>):void;world(id:string):void;view():void;keep():void;restore(line:WorldcraftLine):void;remove(id:string):void;select(id:string):void;mute(layer:0|1,value:boolean):void;savePair():void;download():void;import(text:string):void};
function initial():State{return {phase:'loading',setup:OPENING,world:WORLDS[0].world,worldId:WORLDS[0].id,view:'launch',notice:'Preparing the physical workshop…',audio:'Silent until Fire.',last:null,kept:false,live:[],own:[],sources:BUNDLED.map((line,i)=>({line,label:`Recorded example ${i+1} · ${notes(line)}`})),companion:null,liveMuted:false,companionMuted:false,pair:null,savedPair:null,pairWritable:true,warning:'',qa:null,qaEnabled:false,pairChanged:false};}
export default function Counterline(){
 const probe=useRef<AbortController|null>(null),fileEpoch=useRef({value:0});
 const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null),upload=useRef<HTMLInputElement>(null);
 const [ui,setUI]=useState<State>(initial),ref=useRef(ui);
 const publish=(patch:Partial<State>)=>{ref.current={...ref.current,...patch};setUI(ref.current);};
 useEffect(()=>{
  const epoch=fileEpoch.current;
  let disposed=false,engine:Engine|null=null,scene:Scene|null=null,runtime:WorldcraftRuntime|null=null,cleanup=()=>{},ticks=0,launchGeneration=0,settling=false,inStep=false,pendingInterruption:string|null=null;
  let projectile:ReturnType<typeof buildRangeProjectile>|null=null,trail:LinesMesh|null=null;
  let sourceAtFire:WorldcraftLine|null=null,settingsAtFire:CounterlineSettings|null=null,mixChanged=false;
  const update=(patch:Partial<State>)=>{if(!disposed)publish(patch);};
  let storage:Storage|null=null;try{storage=window.localStorage;}catch{}
  const shelf=createWorldcraftStore({getItem:key=>storage?.getItem(COUNTERLINE_SHELF_PREFIX+key)??null,setItem:(key,value)=>{if(!storage)throw Error('Local storage unavailable');storage.setItem(COUNTERLINE_SHELF_PREFIX+key,value);}});
  const legacy=readLocalLoopLines(storage),saved=loadCounterlinePair(storage);
  let imported:Source[]=[];
  const sourceList=()=>{const all=[...shelf.lines().filter(l=>l.performance?.impacts.length).map(line=>({line,label:`Your line · ${notes(line)}`})),...legacy.lines.map(line=>({line,label:`Worldcraft Keep · ${notes(line)}`})),...imported,...BUNDLED.map((line,i)=>({line,label:`Recorded example ${i+1} · ${notes(line)}`}))];return all.filter((s,i)=>all.findIndex(x=>x.line.id===s.line.id)===i);};
  const memory=()=>({own:shelf.lines(),sources:sourceList(),warning:[shelf.status().warning,saved.warning].filter(Boolean).join(' ')});
  update({...memory(),savedPair:saved.pair,pairWritable:saved.writable,qaEnabled:new URLSearchParams(location.search).get('qa')==='1'});
  const audio=createCounterlineAudio({onState:state=>update({audio:state.detail||state.status}),onInterrupt:detail=>{
   launchGeneration++;
   if(inStep){pendingInterruption=detail;return;}
   if(runtime?.flight&&!runtime.flight.ended){runtime.clearShot();projectile?.dispose();projectile=null;}
   if(!disposed&&ref.current.phase!=='error')update({phase:ref.current.last?'result':'ready',notice:detail});
  }});
  const stop=(message='Stopped. Retry is ready; nothing resumes automatically.')=>{
   launchGeneration++;epoch.value++;audio.stop();settling=false;probe.current?.abort();
   if(runtime?.flight&&!runtime.flight.ended)runtime.clearShot();
   projectile?.dispose();projectile=null;
   if(ref.current.phase!=='error'&&ref.current.phase!=='loading')update({phase:ref.current.last?'result':'ready',notice:message});
  };
  const retry=()=>{stop();runtime?.clearShot();trail?.dispose();trail=null;update({phase:runtime?'ready':ref.current.phase,view:'launch',notice:'Adjust the launch, then Fire when ready.'});};
  const restoreWorld=(world:WorldcraftDocument,setup:WorldcraftSetup,worldId:string)=>{
   if(!runtime)return;retry();runtime.setMode('build');const result=runtime.replaceWorld(world,{intent:'load'});runtime.setMode('play');
   if(!result.ok){update({notice:result.error||'Could not load world.'});return;}
   update({world,worldId,setup:{...setup},phase:'ready',last:null,live:[],pair:null,pairChanged:false,kept:false,view:'launch',notice:'World and setup ready. Fire is always manual.'});
  };
  const download=(value:unknown,name:string)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  actions.current={
   async fire(){
    if(!runtime||!['ready','result'].includes(ref.current.phase))return;
    stop();runtime.clearShot();trail?.dispose();trail=null;
    const token=++launchGeneration,setup={...ref.current.setup};sourceAtFire=ref.current.companion?structuredClone(ref.current.companion):null;
    settingsAtFire=counterlineSettings({liveMuted:ref.current.liveMuted,companionMuted:ref.current.companionMuted});mixChanged=false;
    update({phase:'starting',notice:'Preparing synchronized audio…',pair:null,pairChanged:false,live:[],last:null,kept:false});
    const ready=await audio.prepare(settingsAtFire);
    if(disposed||token!==launchGeneration)return;
    if(!ready){update({phase:'ready',notice:'Audio could not start. Fire again when ready.'});return;}
    runtime.setDynamics('normal-speed');
    if(!runtime.launch(setup)){audio.stop();update({phase:'ready',notice:runtime.error});return;}
    if(!audio.commit(sourceAtFire)){runtime.clearShot();update({phase:'ready',notice:'Pairing could not start; no active shot remains.'});return;}
    ticks=0;settling=true;projectile?.dispose();projectile=null;
    update({phase:'flight',view:'launch',notice:sourceAtFire?'A new physical line, beside your remembered phrase.':'Solo physical line. Keep a phrase that interests you.'});
   },
   stop(){stop();},retry,
   setup(patch){if(!runtime||!['ready','result'].includes(ref.current.phase))return;if(ref.current.phase==='result')retry();const setup={...rangeSetup(ref.current.setup,patch),originX:Math.round(clamp(patch.originX??ref.current.setup.originX,-10,10)*2)/2,railIndex:1} as WorldcraftSetup;update({setup});},
   world(id){const chosen=WORLDS.find(w=>w.id===id);if(chosen)restoreWorld(chosen.world,OPENING,id);},
   view(){update({view:ref.current.view==='overview'?'launch':'overview'});},
   keep(){if(!ref.current.last||ref.current.last.terminal.reason==='interrupted'||ref.current.kept)return;try{const result=shelf.keepLine(ref.current.last);update({...memory(),kept:true,notice:result.persisted?'Physical line kept. Choose it as a companion whenever you like.':'Kept in memory only. Download before leaving.'});}catch(error){update({warning:String(error)});}},
   restore(line){restoreWorld(line.worldSnapshot.world,line.setup,'restored');},
   remove(id){shelf.removeLine(id);if(ref.current.companion?.id===id){stop();update({companion:null});}update(memory());},
   select(id){stop('Companion changed silently. Fire when ready.');const companion=ref.current.sources.find(s=>s.line.id===id)?.line??null;update({companion:companion?structuredClone(companion):null,pair:null});},
   mute(layer,value){audio.setMuted(layer,value);if(settling||audio.state().active){mixChanged=true;update({pair:null,pairChanged:true});}update(layer===0?{companionMuted:value}:{liveMuted:value});},
   savePair(){if(!ref.current.pair||!ref.current.pairWritable)return;try{storage?.setItem(COUNTERLINE_PAIR_KEY,JSON.stringify(ref.current.pair));if(!storage)throw Error('Storage unavailable');update({savedPair:ref.current.pair,notice:'Pairing saved with two separate physical lines and its playback settings.'});}catch(error){update({warning:String(error)});}},
   download(){download(ref.current.pair??{format:'rail-golf-worldcraft-local-export',version:1,worlds:[],lines:shelf.lines()},ref.current.pair?'counterline-pair.json':'counterline-lines.json');},
   import(text){try{if(text.length>2200000)throw Error('Choose a file smaller than 2.2 MB.');const parsed=JSON.parse(text);if(parsed?.format==='rail-golf-counterline-pair'){const pair=validateCounterlinePair(parsed);assertCounterlineSourceIds([...sourceList().map(s=>s.line),...pair.sources]);imported=pair.sources.map((line,i)=>({line,label:`Imported pairing ${i+1} · ${notes(line)}`}));stop();update({savedPair:pair,companion:pair.sources[0],liveMuted:pair.settings.liveMuted,companionMuted:pair.settings.companionMuted,...memory(),notice:'Pairing imported silently. Its two source lines remain independent.'});}else{const result=importLoopLines(text);assertCounterlineSourceIds([...sourceList().map(s=>s.line),...result.lines]);imported=result.lines.map(line=>({line,label:`Imported line · ${notes(line)}`}));stop();update({...memory(),notice:'Recorded sources imported. Choose one as a companion.'});}}catch(error){update({warning:String(error)});}},
  };
  const blur=()=>stop('Stopped after focus loss. Retry or Fire explicitly when ready.');
  const hidden=()=>{if(document.hidden)blur();};window.addEventListener('blur',blur);window.addEventListener('pagehide',blur);document.addEventListener('visibilitychange',hidden);
  const boot=async()=>{try{
   const havok=await Havok();if(disposed)return;
   engine=new Engine(canvas.current!,true,{preserveDrawingBuffer:true,stencil:true});engine.setHardwareScalingLevel(Math.max(1,devicePixelRatio/1.5));
   scene=new Scene(engine);const activeScene=scene,activeEngine=engine;scene.clearColor=new Color4(.045,.075,.085,1);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
   const physics=scene.getPhysicsEngine()!;physics.setTimeStep(1/120);physics.setSubTimeStep(1000/120);
   // Rendering must not advance Havok a second time. This route drives the same
   // beforeStep/_step/afterStep contract as the established headless harness.
   scene.physicsEnabled=false;
   const camera=new FreeCamera('counterline-camera',new Vector3(0,7.8,-15),scene);camera.inputs.clear();camera.minZ=.1;camera.maxZ=320;
   const look=new Vector3(0,3.6,34),sky=new HemisphericLight('counterline-sky',new Vector3(0,1,0),scene);sky.intensity=.92;
   const sun=new DirectionalLight('counterline-sun',new Vector3(-.45,-1,.35),scene);sun.position.set(35,70,-35);sun.intensity=1.3;
   const shadows=new ShadowGenerator(1024,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=ShadowGenerator.QUALITY_LOW;shadows.bias=.001;shadows.normalBias=.03;
   const presentation=createWorldcraftPresentation(scene);let previous:Vector3|null=null,heading={x:0,y:0,z:1};
   runtime=createWorldcraftRuntime(scene,{world:ref.current.world,materials:presentation.materials,shadows,build:BUILD_ID,onEvent(event){
    if(event.kind==='resonance'&&event.impact){const impact=event.impact as ResonanceImpact;audio.live(impact);update({live:[...ref.current.live,impact]});}
    if(event.kind==='end'&&event.last){const last=event.last;settling=false;
     if(last.reason==='interrupted')audio.stop();else audio.finish(last.elapsed);
     let line:WorldcraftLine;try{line=packWorldcraftLine({worldSnapshot:captureWorldSnapshot(last.world,BUILD_ID),setup:last.setup,launch:last.launch,points:last.samples,events:last.evidence,contacts:last.contacts,terminal:last.terminal,performance:performanceFromResonance(last.resonance)});}catch(error){update({phase:'result',last:null,pair:null,notice:`Physical line finished, but its record exceeded the supported Keep format: ${String(error)}`});return;}
     let pair:CounterlinePair|null=null;if(sourceAtFire&&settingsAtFire&&!mixChanged&&last.reason!=='interrupted'&&line.performance?.impacts.length)pair=createCounterlinePair(sourceAtFire,line,settingsAtFire);
     trail?.dispose();trail=null;if(last.samples.length>1){trail=MeshBuilder.CreateLines('counterline-actual-trail',{points:last.samples.map(p=>new Vector3(p.x,p.y,p.z))},activeScene);trail.color=new Color3(.5,.9,.8);trail.isPickable=false;}
     update({last:line,pair,pairChanged:mixChanged,phase:'result',notice:last.reason==='interrupted'?'Physical shot interrupted. Retry when ready.':`Physical line ended: ${last.reason.replaceAll('-',' ')}. ${sourceAtFire?'The remembered phrase may finish naturally.':'Keep it or change the launch.'}`});
    }
   }});runtime.setMode('play');runtime.setDynamics('normal-speed');
   const {launcher,yaw,loft}=buildRangeLauncher(scene,presentation.materials,shadows);
   let spine:LinesMesh|null=null;
   const resize=new ResizeObserver(()=>activeEngine.resize());resize.observe(canvas.current!);
   const key=(event:KeyboardEvent)=>{if(event.target!==canvas.current)return;if(event.code==='Space'){event.preventDefault();actions.current?.fire();}if(event.code==='Escape')actions.current?.stop();if(event.code==='ArrowLeft'){event.preventDefault();actions.current?.setup({yaw:ref.current.setup.yaw-.5});}if(event.code==='ArrowRight'){event.preventDefault();actions.current?.setup({yaw:ref.current.setup.yaw+.5});}if(event.code==='ArrowUp'){event.preventDefault();actions.current?.setup({elevation:ref.current.setup.elevation+.5});}if(event.code==='ArrowDown'){event.preventDefault();actions.current?.setup({elevation:ref.current.setup.elevation-.5});}};canvas.current!.addEventListener('keydown',key);
   activeEngine.runRenderLoop(()=>{
    if(disposed||!runtime)return;
    const state=ref.current,dt=Math.min(.05,activeEngine.getDeltaTime()/1000),radians=state.setup.yaw*Math.PI/180,elevation=state.setup.elevation*Math.PI/180;
    launcher.position.x=state.setup.originX;yaw.rotation.y=radians;loft.rotation.x=-elevation;
    const aim=new Vector3(Math.sin(radians)*Math.cos(elevation),Math.sin(elevation),Math.cos(radians)*Math.cos(elevation));const muzzle=new Vector3(state.setup.originX,1.55,0).add(aim.scale(RAIL_RULES.muzzleLength));
    spine=MeshBuilder.CreateLines('counterline-muzzle',{points:[muzzle,muzzle.add(aim.scale(4))],instance:spine??undefined,updatable:true},activeScene);spine.color=new Color3(.15,.85,.85);spine.setEnabled(state.phase==='ready'||state.phase==='result');
    const elapsed=audio.elapsed();if(state.phase==='flight'&&runtime.flight&&!runtime.flight.ended&&elapsed!==null){
     try{const steps=counterlineStepBudget(elapsed,ticks);for(let i=0;i<steps&&runtime.flight&&!runtime.flight.ended;i++){inStep=true;try{runtime.beforeStep();physics._step(1/120);ticks++;runtime.afterStep();}finally{inStep=false;}if(pendingInterruption){const detail=pendingInterruption;pendingInterruption=null;stop(detail);break;}}}
     catch(error){audio.interrupt(String(error));}
    }
    const horizontal=activeEngine.getRenderWidth()<activeEngine.getRenderHeight();camera.fovMode=horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;
    if(state.phase==='flight'&&runtime.flight){
     if(!projectile){projectile=buildRangeProjectile(activeScene,runtime.flight.mesh,presentation.materials,shadows);previous=null;heading={x:Math.sin(radians),y:0,z:Math.cos(radians)};}
     const p=runtime.flight.mesh.position,v=runtime.flight.aggregate.body.getLinearVelocity();projectile.sync(v);
     if(state.view==='launch'){heading=followHeading(heading,v,dt);const frame=advanceFlightCamera({position:camera.position,target:look,fov:camera.fov},p,previous,followOffsets(p,v,heading),dt,activeEngine.getAspectRatio(camera),horizontal,horizontal?.96:.69);camera.position.set(frame.position.x,frame.position.y,frame.position.z);look.set(frame.target.x,frame.target.y,frame.target.z);camera.fov=frame.fov;previous=p.clone();}
    }
    if(state.view==='overview'){camera.position.set(48,75,-25);look.set(0,1,40);camera.fov=horizontal?1.02:.82;}
    else if(['ready','starting','loading'].includes(state.phase)){camera.position.set(state.setup.originX-Math.sin(radians)*15,7.8,-Math.cos(radians)*15);look.set(state.setup.originX+Math.sin(radians)*34,3.6,Math.cos(radians)*34);camera.fov=horizontal?.96:.69;}
    camera.setTarget(look);activeScene.render();
   });
   cleanup=()=>{resize.disconnect();canvas.current?.removeEventListener('keydown',key);projectile?.dispose();trail?.dispose();spine?.dispose();runtime?.dispose();presentation.dispose();};
   update({phase:'ready',notice:'Discover a phrase. Keep it, then choose it as your companion.'});
  }catch(error){update({phase:'error',notice:`The 3D workshop could not start (WebGL/Havok): ${String(error)}. Audio measurements and stored sources remain available.`});}};
  void boot();return()=>{disposed=true;launchGeneration++;epoch.value++;probe.current?.abort();audio.dispose();window.removeEventListener('blur',blur);window.removeEventListener('pagehide',blur);document.removeEventListener('visibilitychange',hidden);cleanup();scene?.dispose();engine?.dispose();actions.current=null;};
 },[]);
 const busy=['loading','starting','flight','error'].includes(ui.phase);
 const control=(label:string,key:'originX'|'yaw'|'elevation'|'charge',min:number,max:number,step:number,multiplier=1)=><label className={styles.control}><span>{label}</span><input aria-label={label} type="range" min={min} max={max} step={step} value={Math.round(ui.setup[key]*multiplier*100)/100} disabled={busy} onChange={e=>actions.current?.setup({[key]:Number(e.target.value)/multiplier})}/><input aria-label={`${label} value`} type="number" min={min} max={max} step={step} value={Math.round(ui.setup[key]*multiplier*100)/100} disabled={busy} onChange={e=>{if(e.target.value!=='')actions.current?.setup({[key]:Number(e.target.value)/multiplier});}}/></label>;
 const timeline=(line:WorldcraftLine|null,history=false)=><div className={styles.timeline} data-history={history}>{line?.performance?.impacts.map((n,i)=><span key={`${i}-${n.time}`}>{n.note} · {n.time.toFixed(2)} s</span>)}</div>;
 return <main className={styles.page}><header className={styles.header}><span className={styles.eyebrow}>Places &amp; Counterlines · musical play</span><h1>Play beside a line.</h1><p>Find a physical phrase, Keep it, and let it accompany your next shot. One remembered performance; one new ball. No score, no required melody.</p></header><div className={styles.layout}><section className={styles.stage} aria-label="Physical workshop"><canvas ref={canvas} className={styles.canvas} tabIndex={0} aria-label="Physical workshop. Space fires. Arrow keys adjust aim by half a degree. Escape stops."/>{ui.phase==='error'&&<p className={styles.error}>{ui.notice}</p>}<div className={styles.stageBar}><button className={styles.primary} disabled={busy} onClick={()=>actions.current?.fire()}>Fire line</button><button disabled={ui.phase==='loading'||ui.phase==='error'} onClick={()=>actions.current?.stop()}>Stop</button><button disabled={ui.phase==='loading'||ui.phase==='error'} onClick={()=>actions.current?.view()}>{ui.view==='overview'?'Follow / launch':'Overview'}</button><p role="status">{ui.notice}</p></div></section><aside className={styles.panel}>
 <section className={styles.section}><h2>Your next shot</h2><label>Workshop arrangement<select value={ui.worldId} disabled={ui.phase==='loading'||ui.phase==='error'} onChange={e=>actions.current?.world(e.target.value)}>{WORLDS.map(w=><option key={w.id} value={w.id}>{w.label}</option>)}{ui.worldId==='restored'&&<option value="restored">Restored physical world</option>}</select></label>{control('Origin (m)','originX',-10,10,.5)}{control('Yaw (°)','yaw',-70,70,.5)}{control('Elevation (°)','elevation',5,85,.5)}{control('Power (%)','charge',0,100,1,100)}<div className={styles.buttons}><button className={styles.primary} disabled={busy} onClick={()=>actions.current?.fire()}>{ui.companion?'Fire with companion':'Fire solo'}</button><button disabled={ui.phase==='loading'||ui.phase==='error'} onClick={()=>actions.current?.retry()}>Retry / adjust</button></div></section>
 <section className={styles.section}><h2>Musical companion</h2><select aria-label="Companion" value={ui.companion?.id??''} onChange={e=>actions.current?.select(e.target.value)}><option value="">None · Solo play</option>{ui.sources.map(s=><option key={s.line.id} value={s.line.id}>{s.label}</option>)}</select>{ui.companion?<><p className={styles.companion}>{notes(ui.companion)}</p>{timeline(ui.companion,true)}<details><summary>Recorded source and sound</summary><p>Historical contacts only. Original pitches and timings; original timber / metal voices at 45% gain. Older Keeps do not store the live bank-voice selection, so this does not promise the original timbre.</p><p>Source: {ui.companion.id}<br/>Build: {ui.companion.worldSnapshot.build}<br/>{ui.companion.worldSnapshot.world.name}. Selecting a phrase does not change the physical world.</p></details></>:<p>Keep a phrase you like, then select it here. A recorded example is also available if you want a quick comparison.</p>}<div className={styles.checks}><label><input type="checkbox" checked={ui.companionMuted} onChange={e=>actions.current?.mute(0,e.target.checked)}/>Mute companion</label><label><input type="checkbox" checked={ui.liveMuted} onChange={e=>actions.current?.mute(1,e.target.checked)}/>Mute live notes</label></div><p role="status">{ui.audio}</p><details><summary>Timing</summary><p>Both parts use one audio clock, with a common 100 ms sound delay so a newly detected collision can be scheduled at its original physical time. The ball remains live. A long frame stall or focus loss stops the pairing instead of drifting.</p></details></section>
 <section className={styles.section}><h2>This physical line</h2><p className={styles.notes}>{ui.live.length?ui.live.map(n=>n.note).join(' → '):'Listen for the first contact.'}</p>{timeline(ui.last)}<div className={styles.buttons}><button disabled={!ui.last||ui.kept||ui.own.length>=4||ui.last.terminal.reason==='interrupted'} onClick={()=>actions.current?.keep()}>{ui.kept?'Kept ✓':'Keep line'}</button><button disabled={!ui.pair||!ui.pairWritable} onClick={()=>actions.current?.savePair()}>Save pairing</button></div>{ui.pairChanged&&<p>Mix changed during this performance. Keep the individual line; use a fixed mix on the next shot to save a pairing.</p>}<p>Only this new shot enters the physical record. The companion remains a separate historical source.</p></section>
 <section className={styles.section}><h2>Your lines · {ui.own.length}/4</h2>{ui.own.length>=4&&<p>All four slots are full. Download or remove a line before keeping another.</p>}{!ui.own.length&&<p>Your first Keep will appear here. A short phrase is welcome.</p>}{ui.own.map((line,i)=><div className={styles.slot} key={line.id}><strong>Line {i+1} · {notes(line)}</strong><small>{line.worldSnapshot.world.name}</small><div className={styles.buttons}><button disabled={!line.performance?.impacts.length} onClick={()=>actions.current?.select(line.id)}>Use as companion</button><button disabled={ui.phase==='loading'||ui.phase==='error'} onClick={()=>actions.current?.restore(line)}>Restore setup</button><button onClick={()=>actions.current?.remove(line.id)}>Remove</button></div></div>)}{ui.savedPair&&<details><summary>Saved pairing</summary><p>Companion: {notes(ui.savedPair.sources[0])}<br/>New physical line: {notes(ui.savedPair.sources[1])}</p><button onClick={()=>{const pair=ui.savedPair!;actions.current?.import(JSON.stringify(pair));}}>Choose saved companion</button><p>Loading stays silent. Restore or select a setup, then Fire manually.</p></details>}<div className={styles.buttons}><button onClick={()=>actions.current?.download()}>{ui.pair?'Download pairing':'Download kept lines'}</button><button onClick={()=>upload.current?.click()}>Import recorded lines / pair</button></div><input hidden ref={upload} type="file" accept="application/json,.json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(file){if(file.size>2200000){publish({warning:'Choose a file smaller than 2.2 MB.'});return;}actions.current?.stop();const token=fileEpoch.current.value;const text=await file.text();if(token===fileEpoch.current.value)actions.current?.import(text);}}}/>{ui.warning&&<p className={styles.warning}>{ui.warning}</p>}</section>
 {ui.qaEnabled&&<section className={styles.section}><h2>Audio evidence</h2><p>This explicit offline measurement uses two recorded Havok histories. It can run without WebGL; it does not certify live shot synchronization.</p><button onClick={async()=>{try{publish({qa:await measureCounterlineAudio(createCounterlinePair(BUNDLED[0],BUNDLED[1]))});}catch(error){publish({qa:String(error)});}}}>Measure recorded audio offline</button><button onClick={async()=>{probe.current?.abort();const controller=new AbortController();probe.current=controller;publish({qa:{status:'Measuring recorded audio clock; this plays once.'}});try{const result=await measureCounterlineClock(createCounterlinePair(BUNDLED[0],BUNDLED[1]),{signal:controller.signal});if(!controller.signal.aborted)publish({qa:result});}catch(error){if(!controller.signal.aborted)publish({qa:String(error)});}}}>Measure recorded timing (plays once)</button><button onClick={()=>probe.current?.abort()}>Stop timing probe</button>{ui.qa!==null&&<pre className={styles.code} data-audio-measurement>{JSON.stringify(ui.qa,null,2)}</pre>}</section>}
 </aside></div><footer className={styles.footer}><a href="/lab/places">Places &amp; Counterlines</a> · <a href="/lab/playability-loops">Contact Loops</a> · <a href="/lab/worldcraft">Original Worldcraft / solo editor</a><p>Build {BUILD_ID}. Experimental musical activity; historical worlds, solo editing and Contact Loops remain available.</p></footer></main>;
}
