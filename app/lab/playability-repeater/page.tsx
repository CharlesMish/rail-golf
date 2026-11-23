'use client';
import {useEffect,useRef,useState} from 'react';
import {Engine,Scene,Vector3,Color3,Color4,FreeCamera,HemisphericLight,DirectionalLight,ShadowGenerator,TransformNode,HavokPlugin,MeshBuilder,LinesMesh,StandardMaterial} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {RAIL_RULES} from '@/lib/rail-golf-v02';
import {BUILD_ID} from '@/lib/build-identity';
import {buildSpatialLabMaterials} from '@/lib/spatial-lab-materials';
import {buildRangeLauncher,buildRangeProjectile} from '@/lib/mechanism-range-presentation';
import {spatialLaunch,type SpatialSetup} from '@/lib/spatial-lab-session';
import {PLAYGROUNDS_GUEST_STONE,buildGuestStone,createGuestSession,type GuestRecord} from '@/lib/playgrounds-persistence';
import {createGuestShelf,type GuestEntry} from '@/lib/playgrounds-persistence-records';
import {createShotRepeater,type RepeaterState} from '@/lib/playability-repeater';
import {createPlaygroundAudio} from '@/lib/playgrounds-audio';
import styles from './repeater.module.css';
type Actions={fire():void;start(count:number):void;stop():void;undo():void;reset():void;keep(record:GuestRecord):void;restore(record:GuestRecord,after?:boolean):void;remove(id:string):void;view():void;mute(muted:boolean):void;download():void};
const initialState:RepeaterState={status:'idle',busy:false,planned:0,started:0,completed:0,remaining:0,pauseTicks:0,stopReason:'',testedSetup:null};
const sameSetup=(a:SpatialSetup|null,b:SpatialSetup)=>a&&a.railIndex===b.railIndex&&a.yaw===b.yaw&&a.elevation===b.elevation&&a.charge===b.charge;
const displacement=(r:GuestRecord)=>{const a=JSON.parse(r.environment.pose as string),b=JSON.parse(r.settledEnvironment.pose);return Math.hypot(b[0]-a[0],b[2]-a[2]);};
export default function ShotRepeaterPage(){
 const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null),setupRef=useRef<SpatialSetup>({...PLAYGROUNDS_GUEST_STONE.defaultSetup});
 const [setup,setSetup]=useState<SpatialSetup>({...PLAYGROUNDS_GUEST_STONE.defaultSetup}),[phase,setPhase]=useState('loading'),[notice,setNotice]=useState(''),[error,setError]=useState(''),[trial,setTrial]=useState<GuestRecord|null>(null),[attempts,setAttempts]=useState<GuestRecord[]>([]),[kept,setKept]=useState<GuestEntry[]>([]),[survey,setSurvey]=useState(false),[audioOn,setAudioOn]=useState(true),[queue,setQueue]=useState(initialState),[count,setCount]=useState(3);
 const audioEnabled=useRef(true),phaseRef=useRef('loading'),queueRef=useRef(initialState);
 const update=(patch:Partial<SpatialSetup>)=>{if(phaseRef.current!=='ready'||queueRef.current.status!=='idle')return;setupRef.current={...setupRef.current,...patch};setSetup(setupRef.current);};
 useEffect(()=>{
  let disposed=false,engine:Engine|null=null,scene:Scene|null=null,cleanup=()=>{};const audio=createPlaygroundAudio();
  const change=(p:string)=>{phaseRef.current=p;if(!disposed)setPhase(p);};
  void(async()=>{try{
   const havok=await HavokPhysics();if(disposed)return;if(!Engine.isSupported())throw Error('3D graphics are unavailable in this browser. Open this study in a WebGL-enabled browser.');
   engine=new Engine(canvas.current!,true,{preserveDrawingBuffer:true,stencil:true});engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));scene=new Scene(engine);const activeEngine=engine,activeScene=scene;
   scene.clearColor=new Color4(.045,.075,.085,1);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.getPhysicsEngine()!.setTimeStep(1/120);scene.getPhysicsEngine()!.setSubTimeStep(1000/120);
   const camera=new FreeCamera('repeater-camera',new Vector3(23,17,-16),scene);camera.inputs.clear();camera.minZ=.1;camera.maxZ=250;let wide=false;
   const aimCamera=()=>{const narrow=activeEngine.getRenderWidth()<700;camera.position.set(...(wide?(narrow?[41,58,-26]:[38,44,-18]):(narrow?[27,25,-22]:[23,17,-16])) as [number,number,number]);camera.setTarget(new Vector3(0,1,wide?27:24));camera.fov=narrow?1.05:.8;};
   new HemisphericLight('repeater-sky',Vector3.Up(),scene).intensity=.95;const sun=new DirectionalLight('repeater-sun',new Vector3(-.5,-1,.3),scene);sun.position.set(30,60,-25);sun.intensity=1.2;const shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=12;
   const {world:materials,equipment}=buildSpatialLabMaterials(scene);const stoneMaterial=new StandardMaterial('repeater-stone',scene);stoneMaterial.diffuseColor=new Color3(.74,.78,.71);stoneMaterial.specularColor=new Color3(.08,.08,.07);materials.stone=stoneMaterial;
   const root=new TransformNode('repeater-world',scene),world=buildGuestStone(scene,root,materials,shadows),launcher=buildRangeLauncher(scene,equipment,shadows);
   let projectile:ReturnType<typeof buildRangeProjectile>|null=null,trail:LinesMesh|null=null,aimLine:LinesMesh|null=null,drawnPathLength=0;
   // A separate local shelf preserves original Guest Stone bytes and identities.
   let storage:Pick<Storage,'getItem'|'setItem'>|null=null;try{const local=window.localStorage;storage={getItem:()=>local.getItem('rail-golf.playability.repeater.v1'),setItem:(_key,value)=>local.setItem('rail-golf.playability.repeater.v1',value)};}catch{}
   const shelf=createGuestShelf(storage),publish=()=>{setKept(shelf.entries());if(shelf.warning())setNotice(shelf.warning());};publish();
   const session=createGuestSession(scene,world,event=>{
    if(event.kind==='impact'&&audioEnabled.current)audio.contact({speed:Number(event.speed),ground:Boolean(event.ground)});
    if(event.kind==='ball-ended'){change('settling');if(audioEnabled.current)audio.terminal(event.record!.reason);}
   });
   const clearVisual=()=>{projectile?.dispose();projectile=null;trail?.dispose();trail=null;drawnPathLength=0;};
   const repeater=createShotRepeater(session,event=>{
    if(disposed)return;
    if(event.kind==='state'){queueRef.current=event.state!;setQueue(event.state!);if(!event.state!.busy)change(event.state!.status==='blocked'?'blocked':'ready');}
    if(event.kind==='shot-started'){clearVisual();projectile=buildRangeProjectile(activeScene,session.flight!.mesh,equipment,shadows);change('flight');if(audioEnabled.current)audio.launch(setupRef.current.charge);}
    if(event.kind==='shot-complete'){setTrial(repeater.trial);setAttempts(repeater.records);setNotice(event.number?`Attempt ${event.number} settled. Each blow has its own starting and resulting world.`:'Trial settled. Fire again, adjust the launch, or repeat this setup.');}
    if(event.kind==='shot-blocked'){change('blocked');setNotice('The object has not settled safely. The sequence is cancelled. Undo or Reset to recover; this unfinished attempt cannot be kept as a settled line.');}
   });
   const takeSetup=(s:SpatialSetup|null)=>{if(s){setupRef.current={...s};setSetup(setupRef.current);}};
   const prepare=()=>{if(window.matchMedia('(max-width: 760px)').matches)canvas.current?.scrollIntoView({block:'start',behavior:'instant'});audio.setEnabled(audioEnabled.current);if(audioEnabled.current)audio.unlock();};
   actions.current={
    fire(){prepare();if(repeater.manual(setupRef.current)){setTrial(null);setAttempts([]);setNotice('One manual trial. The world will remain where it settles.');}},
    start(n){prepare();if(repeater.start(setupRef.current,n)){setAttempts([]);setNotice(`Starting ${n} new physical shots. The same launch acts on the changing garden.`);}},
    stop(){repeater.stop();setNotice('Remaining launches cancelled. An already committed ball and its stone finish naturally.');},
    undo(){takeSetup(repeater.undo());clearVisual();change('ready');setNotice('Restored before the last blow. Fire a new manual trial before repeating.');},
    reset(){if(repeater.reset()){clearVisual();setTrial(null);setAttempts([]);change('ready');setNotice('Garden reset. Kept lines remain. A new manual trial is required.');}},
    keep(record){shelf.keep(record,BUILD_ID);publish();},
    restore(record,after=false){const s=repeater.restore(record,after);if(s){takeSetup(s);clearVisual();change('ready');setNotice(`${after?'Settled result':'Original starting world'} restored. Fire manually; historical records never restart a sequence.`);}},
    remove(id){shelf.remove(id);publish();},
    view(){wide=!wide;setSurvey(wide);aimCamera();},mute(muted){audio.setEnabled(!muted);},
    download(){const payload={format:'rail-golf-shot-repeater-evidence-v1',build:BUILD_ID,kind:'separate-physical-attempts',sequence:{plan:repeater.plan,state:repeater.state},trial:repeater.trial,attempts:repeater.records,incompleteAttempt:repeater.incomplete};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='rail-golf-repeater-attempts.json';a.click();URL.revokeObjectURL(url);},
   };
   const before=scene.onBeforePhysicsObservable.add(()=>repeater.beforeStep()),after=scene.onAfterPhysicsObservable.add(()=>repeater.afterStep());
   const suspend=()=>{repeater.stop('left-view');audio.setEnabled(false);if(!disposed)setNotice('Repeating and sound stopped because this view lost focus. A new Fire or Start restores your sound setting; firing never resumes automatically.');};
   const visibility=()=>{if(document.hidden)suspend();};window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',suspend);
   const resize=()=>{activeEngine.resize();aimCamera();};window.addEventListener('resize',resize);resize();change('ready');
   let frame=0;activeEngine.runRenderLoop(()=>{
    if(disposed)return;const launch=spatialLaunch(PLAYGROUNDS_GUEST_STONE,setupRef.current);launcher.launcher.position.set(launch.rail.x,launch.rail.y,launch.rail.z);launcher.yaw.rotation.y=setupRef.current.yaw*Math.PI/180;launcher.loft.rotation.x=-setupRef.current.elevation*Math.PI/180;
    const a=new Vector3(launch.muzzle.x,launch.muzzle.y,launch.muzzle.z),b=a.add(new Vector3(launch.aim.x,launch.aim.y,launch.aim.z).scale(5));aimLine=MeshBuilder.CreateLines('repeater-aim',{points:[a,b],instance:aimLine??undefined,updatable:true},activeScene);aimLine.color=new Color3(.2,.85,.83);aimLine.setEnabled(phaseRef.current==='ready'&&queueRef.current.status==='idle');
    const f=session.flight;if(f&&projectile){projectile.select('ball');projectile.sync(f.aggregate.body.getLinearVelocity());}
    if(++frame%6===0&&session.path.length>1&&drawnPathLength!==session.path.length){drawnPathLength=session.path.length;trail?.dispose();trail=MeshBuilder.CreateLines('repeater-recorded-flight',{points:session.path.map(p=>new Vector3(p[1],p[2],p[3]))},activeScene);trail.color=new Color3(.2,.8,.8);}
    activeScene.render();
   });
   cleanup=()=>{actions.current=null;repeater.dispose();window.removeEventListener('blur',suspend);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',suspend);window.removeEventListener('resize',resize);activeScene.onBeforePhysicsObservable.remove(before);activeScene.onAfterPhysicsObservable.remove(after);clearVisual();aimLine?.dispose();session.dispose();world.dispose();root.dispose();stoneMaterial.dispose();};
  }catch(e){setError(e instanceof Error?e.message:String(e));change('error');}})();
  return()=>{disposed=true;cleanup();audio.dispose();scene?.dispose();engine?.dispose();};
 },[]);
 const available=!['loading','error'].includes(phase),busy=queue.busy,running=['running','stopping'].includes(queue.status),ready=phase==='ready'&&!running,canRepeat=ready&&sameSetup(queue.testedSetup,setup);
 const recordButtons=(record:GuestRecord)=><div className={styles.actions}><button disabled={kept.length>=4||!available} onClick={()=>actions.current?.keep(record)}>Keep this blow</button><button disabled={busy||running||!available} onClick={()=>actions.current?.restore(record)}>Restore before</button><button disabled={busy||running||!available} onClick={()=>actions.current?.restore(record,true)}>Use result</button></div>;
 return <main className={styles.shell}>
  <div className={styles.stage}><canvas ref={canvas} aria-label="Shot Repeater. One real Havok projectile at a time in the original Guest Stone garden."/>
   <header className={styles.header}><a href="/lab/playability">RAIL GOLF · PLAYABILITY STUDIES</a><h1>Shot Repeater</h1><p>One launch, a changing world</p></header>
   <div className={styles.viewTools}><button disabled={!available} onClick={()=>actions.current?.view()}>{survey?'Closer view':'Survey'}</button><button aria-pressed={audioOn} onClick={()=>{audioEnabled.current=!audioEnabled.current;setAudioOn(audioEnabled.current);actions.current?.mute(!audioEnabled.current);}}>Sound {audioOn?'on':'off'}</button></div>
   {(phase==='loading'||error)&&<p className={styles.overlay} role="status">{error||'Opening the garden…'}</p>}
   {running&&<div className={styles.sequenceBadge}><p role="status">{queue.status==='stopping'?'Finishing this blow':`Attempt ${queue.started} / ${queue.planned}`} · {phase==='settling'?'stone settling':busy?'ball in flight':'resting before next shot'}</p><button disabled={queue.status==='stopping'} onClick={()=>actions.current?.stop()}>{queue.status==='stopping'?'Remaining shots cancelled':busy?'Stop after this blow':'Cancel remaining shots'}</button></div>}
  </div>
  <aside className={styles.console} aria-label="Shot Repeater controls">
   <p className={styles.invitation}>Make one blow, then let the same launch work on the garden it changes.</p>
   <p className={styles.rule}>These are new physical shots, one at a time. Each waits for the stone to settle. This is not an audio loop.</p>
   <div className={styles.controls}>
    <label>Launch rail <select value={setup.railIndex} disabled={!ready} onChange={e=>update({railIndex:Number(e.target.value)})}><option value={0}>Left</option><option value={1}>Middle</option><option value={2}>Right</option></select></label>
    <label>Aim {setup.yaw.toFixed(1)}°<input aria-label="Aim" type="range" min={-70} max={70} step={.5} value={setup.yaw} disabled={!ready} onChange={e=>update({yaw:Number(e.target.value)})}/></label>
    <label>Elevation {setup.elevation.toFixed(1)}°<input aria-label="Elevation" type="range" min={5} max={85} step={.5} value={setup.elevation} disabled={!ready} onChange={e=>update({elevation:Number(e.target.value)})}/></label>
    <label>Power {Math.round(setup.charge*100)}%<input aria-label="Power" type="range" min={0} max={100} step={1} value={setup.charge*100} disabled={!ready} onChange={e=>update({charge:Number(e.target.value)/100})}/></label>
   </div>
   <button className={styles.fire} disabled={!ready} onClick={()=>actions.current?.fire()}>Fire once</button>
   <div className={styles.repeatControls}><label>Repeated shots <select aria-label="Repeated shots" value={count} disabled={!ready} onChange={e=>setCount(Number(e.target.value))}>{[3,4,5].map(n=><option key={n} value={n}>{n} new shots</option>)}</select></label><button className={styles.fire} disabled={!canRepeat} onClick={()=>actions.current?.start(count)}>Start {count} shots</button></div>
   {!canRepeat&&!busy&&!running&&<p className={styles.rule}>Fire this setup manually first. Start then repeats it from the altered world.</p>}
   {busy&&<p className={styles.status} role="status">{phase==='settling'?'Ball ended. The stone is still settling.':'The committed ball is in flight.'}</p>}
   <div className={styles.actions}><button disabled={busy||running||!available||(!trial&&!attempts.length&&phase!=='blocked')} onClick={()=>actions.current?.undo()}>Undo last blow</button><button disabled={busy||!available} onClick={()=>actions.current?.reset()}>Reset garden</button></div>
   {busy&&<p className={styles.rule}>Reset is available after this committed blow settles. Stop cancels every later launch.</p>}
   {notice&&<p className={styles.notice} role="status">{notice}</p>}
   <details className={styles.shelf} open={attempts.length>0}><summary>Current attempts · {attempts.length} repeated</summary><p>Each row is a separate physical line. This tab retains the latest trial and up to five repeated shots. Keep a blow for later, or download all completed attempts before firing a new trial or starting another sequence.</p>
    {trial&&<div className={styles.entry}><strong>Manual trial</strong><p>Stone moved {displacement(trial).toFixed(2)} m.</p>{recordButtons(trial)}</div>}
    {attempts.map((record,i)=><div className={styles.entry} key={i}><strong>Attempt {i+1} · {record.contacts.some(c=>c.body==='guest-stone')?'stone contacted':'stone missed'}</strong><p>Moved {displacement(record).toFixed(2)} m. Ball {record.reason.replaceAll('-',' ')} at {record.elapsed.toFixed(2)} s; stone ready at {record.settleElapsed.toFixed(2)} s.</p>{recordButtons(record)}</div>)}
    <button disabled={(!trial&&phase!=='blocked')||busy} onClick={()=>actions.current?.download()}>Download separate attempts</button>
   </details>
   <details className={styles.shelf}><summary>Kept blows · {kept.length}/4</summary><p>Kept lines preserve before, ball end and settled result separately. Restore never fires or restarts a sequence.</p>{kept.map((entry,i)=><div className={styles.entry} key={entry.id}><strong>Blow {i+1}</strong><div className={styles.actions}><button disabled={busy||running||!available} onClick={()=>actions.current?.restore(entry.record)}>Restore before</button><button disabled={busy||running||!available} onClick={()=>actions.current?.restore(entry.record,true)}>Use result</button><button disabled={busy} onClick={()=>actions.current?.remove(entry.id)}>Remove</button></div></div>)}</details>
   <p className={styles.footer}>Original Guest Stone physics · finite sequences stop on leaving this view · build {BUILD_ID}</p>
  </aside>
 </main>;
}
