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
import {createPlaygroundAudio} from '@/lib/playgrounds-audio';
import styles from './persistence.module.css';
type Actions={fire():void;next():void;undo():void;reset():void;keep():void;restore(entry:GuestEntry,after?:boolean):void;remove(id:string):void;view():void;mute(muted:boolean):void};
export default function GuestStonePage(){
 const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null),setupRef=useRef<SpatialSetup>({...PLAYGROUNDS_GUEST_STONE.defaultSetup});
 const [setup,setSetup]=useState<SpatialSetup>({...PLAYGROUNDS_GUEST_STONE.defaultSetup}),[phase,setPhase]=useState('loading'),[notice,setNotice]=useState(''),[error,setError]=useState(''),[last,setLast]=useState<GuestRecord|null>(null),[kept,setKept]=useState<GuestEntry[]>([]),[saved,setSaved]=useState(false),[survey,setSurvey]=useState(true),[audioOn,setAudioOn]=useState(true);
 const audioEnabled=useRef(true),phaseRef=useRef('loading');
 const update=(patch:Partial<SpatialSetup>)=>{if(phaseRef.current!=='ready')return;setupRef.current={...setupRef.current,...patch};setSetup(setupRef.current);};
 useEffect(()=>{
  let disposed=false,engine:Engine|null=null,scene:Scene|null=null,cleanup=()=>{};const audio=createPlaygroundAudio();
  const change=(p:string)=>{phaseRef.current=p;if(!disposed)setPhase(p);};
  void(async()=>{try{
   const havok=await HavokPhysics();if(disposed)return;if(!Engine.isSupported())throw Error('3D graphics are unavailable in this browser. Open this study in a WebGL-enabled browser.');
   const surface=canvas.current!;engine=new Engine(surface,true,{preserveDrawingBuffer:true,stencil:true});engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));scene=new Scene(engine);const activeEngine=engine,activeScene=scene;
   scene.clearColor=new Color4(.045,.075,.085,1);scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));scene.getPhysicsEngine()!.setTimeStep(1/120);scene.getPhysicsEngine()!.setSubTimeStep(1000/120);
   const camera=new FreeCamera('guest-camera',new Vector3(38,44,-18),scene);camera.inputs.clear();camera.minZ=.1;camera.maxZ=250;camera.fov=.8;let wide=true;
   const aimCamera=()=>{const narrow=activeEngine.getRenderWidth()<700;camera.position.set(...(wide?(narrow?[41,58,-26]:[38,44,-18]):[23,17,-16]) as [number,number,number]);camera.setTarget(new Vector3(0,1,wide?27:24));camera.fov=narrow?1.05:.8;};
   new HemisphericLight('guest-sky',Vector3.Up(),scene).intensity=.95;const sun=new DirectionalLight('guest-sun',new Vector3(-.5,-1,.3),scene);sun.position.set(30,60,-25);sun.intensity=1.2;const shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=12;
   const {world:materials,equipment}=buildSpatialLabMaterials(scene);const stoneMaterial=new StandardMaterial('guest-pale-stone',scene);stoneMaterial.diffuseColor=new Color3(.74,.78,.71);stoneMaterial.specularColor=new Color3(.08,.08,.07);materials.stone=stoneMaterial;
   const root=new TransformNode('guest-world',scene),world=buildGuestStone(scene,root,materials,shadows);
   const launcher=buildRangeLauncher(scene,equipment,shadows);let projectile:ReturnType<typeof buildRangeProjectile>|null=null,trail:LinesMesh|null=null,aimLine:LinesMesh|null=null,alreadyKept=false;
   let storage:Storage|null=null;try{storage=window.localStorage;}catch{}const shelf=createGuestShelf(storage);const publish=()=>{setKept(shelf.entries());setNotice(shelf.warning());};publish();
   const session=createGuestSession(scene,world,event=>{
    if(event.kind==='impact'&&audioEnabled.current)audio.contact({speed:Number(event.speed),ground:Boolean(event.ground)});
    if(event.kind==='ball-ended'){change('settling');if(audioEnabled.current)audio.terminal(event.record!.reason);}
    if(event.kind==='settled'){setLast(event.record!);change('result');setNotice('The stone is resting. Continue from here, or undo this blow.');}
    if(event.kind==='settle-blocked'){change('blocked');setNotice('The stone has not settled safely. Undo this blow or reset the garden.');}
   });
   const clearVisual=()=>{projectile?.dispose();projectile=null;trail?.dispose();trail=null;};
   const takeSetup=(s:SpatialSetup|null)=>{if(s){setupRef.current={...s};setSetup(setupRef.current);}};
   actions.current={
    fire(){if(phaseRef.current!=='ready')return;if(window.matchMedia('(max-width: 760px)').matches)canvas.current?.scrollIntoView({block:'start',behavior:'instant'});if(audioEnabled.current){audio.unlock();audio.launch(setupRef.current.charge);}alreadyKept=false;setSaved(false);setLast(null);setNotice('');clearVisual();if(!session.fire(setupRef.current))return;projectile=buildRangeProjectile(scene!,session.flight!.mesh,equipment,shadows);change('flight');},
    next(){if(phaseRef.current!=='result')return;session.next();clearVisual();setLast(null);change('ready');setNotice('Same garden, new shot. The stone remains where it settled.');},
    undo(){if(!['result','blocked'].includes(phaseRef.current))return;takeSetup(session.undo());clearVisual();setLast(null);change('ready');setNotice('Stone and launch restored to before the last blow. Fire when ready.');},
    reset(){if(['flight','settling'].includes(phaseRef.current))return;session.reset();clearVisual();setLast(null);change('ready');setNotice('The stone is home. Kept lines are unchanged.');},
    keep(){if(phaseRef.current!=='result'||alreadyKept||!session.last)return;const entry=shelf.keep(session.last,BUILD_ID);if(entry){alreadyKept=true;setSaved(true);}publish();},
    restore(entry,after=false){if(!['ready','result','blocked'].includes(phaseRef.current))return;takeSetup(session.restore({setup:entry.record.setup,environment:after?entry.record.settledEnvironment:entry.record.environment}));clearVisual();setLast(null);change('ready');setNotice(`${after?'Settled result':'Original starting state'} restored from build ${entry.build}. Fire manually; no recorded flight is being simulated.`);},
    remove(id){shelf.remove(id);publish();},
    view(){wide=!wide;setSurvey(wide);aimCamera();},mute(muted){audio.setEnabled(!muted);},
   };
   const before=scene.onBeforePhysicsObservable.add(()=>session.beforeStep());const after=scene.onAfterPhysicsObservable.add(()=>session.afterStep());
   const resize=()=>{activeEngine.resize();aimCamera();};window.addEventListener('resize',resize);resize();change('ready');
   let frame=0,drawnPathLength=0;activeEngine.runRenderLoop(()=>{
    if(disposed)return;const launch=spatialLaunch(PLAYGROUNDS_GUEST_STONE,setupRef.current);launcher.launcher.position.set(launch.rail.x,launch.rail.y,launch.rail.z);launcher.yaw.rotation.y=setupRef.current.yaw*Math.PI/180;launcher.loft.rotation.x=-setupRef.current.elevation*Math.PI/180;
    const a=new Vector3(launch.muzzle.x,launch.muzzle.y,launch.muzzle.z),b=a.add(new Vector3(launch.aim.x,launch.aim.y,launch.aim.z).scale(5));aimLine=MeshBuilder.CreateLines('guest-aim',{points:[a,b],instance:aimLine??undefined,updatable:true},activeScene);aimLine.color=new Color3(.2,.85,.83);aimLine.setEnabled(phaseRef.current==='ready');
    const f=session.flight;if(f&&projectile){projectile.select('ball');projectile.sync(f.aggregate.body.getLinearVelocity());}
    if(++frame%6===0&&session.path.length>1&&drawnPathLength!==session.path.length){drawnPathLength=session.path.length;trail?.dispose();trail=MeshBuilder.CreateLines('guest-recorded-flight',{points:session.path.map(p=>new Vector3(p[1],p[2],p[3]))},activeScene);trail.color=new Color3(.2,.8,.8);}
    activeScene.render();
   });
   cleanup=()=>{actions.current=null;window.removeEventListener('resize',resize);activeScene.onBeforePhysicsObservable.remove(before);activeScene.onAfterPhysicsObservable.remove(after);clearVisual();aimLine?.dispose();session.dispose();world.dispose();root.dispose();stoneMaterial.dispose();};
  }catch(e){setError(e instanceof Error?e.message:String(e));change('error');}})();
  return()=>{disposed=true;cleanup();audio.dispose();scene?.dispose();engine?.dispose();};
 },[]);
 const ready=phase==='ready',busy=['flight','settling'].includes(phase),available=!['loading','error'].includes(phase);
 return <main className={styles.shell}>
  <div className={styles.stage}><canvas ref={canvas} aria-label="Guest Stone garden. Actual Havok physics."/>
   <header className={styles.header}><a href="/lab/playgrounds">RAIL GOLF · NEXT PLAYGROUNDS</a><h1>Guest Stone</h1><p>An unfinished delivery</p></header>
   <div className={styles.viewTools}><button disabled={!available} onClick={()=>actions.current?.view()}>{survey?'Closer view':'Survey'}</button><button aria-pressed={audioOn} onClick={()=>{audioEnabled.current=!audioEnabled.current;setAudioOn(audioEnabled.current);actions.current?.mute(!audioEnabled.current);}}>Sound {audioOn?'on':'off'}</button></div>
   {(phase==='loading'||error)&&<p className={styles.overlay} role="status">{error||'Opening the garden…'}</p>}
  </div>
  <aside className={styles.console} aria-label="Guest Stone controls">
   <p className={styles.invitation}>The stone stays where your shot leaves it. Nudge it toward either recess, turn it, or make a new bank.</p>
   <p className={styles.rule}>Pavement ends the ball’s flight. The stone continues moving until it settles, then rests between shots.</p>
   <div className={styles.controls}>
    <label>Launch rail <select value={setup.railIndex} disabled={!ready} onChange={e=>update({railIndex:Number(e.target.value)})}><option value={0}>Left</option><option value={1}>Middle</option><option value={2}>Right</option></select></label>
    <label>Aim {setup.yaw.toFixed(1)}°<input aria-label="Aim" type="range" min={-70} max={70} step={.5} value={setup.yaw} disabled={!ready} onChange={e=>update({yaw:Number(e.target.value)})}/></label>
    <label>Elevation {setup.elevation.toFixed(1)}°<input aria-label="Elevation" type="range" min={5} max={85} step={.5} value={setup.elevation} disabled={!ready} onChange={e=>update({elevation:Number(e.target.value)})}/></label>
    <label>Power {Math.round(setup.charge*100)}%<input aria-label="Power" type="range" min={0} max={100} step={1} value={setup.charge*100} disabled={!ready} onChange={e=>update({charge:Number(e.target.value)/100})}/></label>
   </div>
   {ready&&<button className={styles.fire} onClick={()=>actions.current?.fire()}>Fire</button>}
   {busy&&<p className={styles.status} role="status">{phase==='flight'?'The ball is in flight…':'The ball has ended. Watching the stone settle…'}</p>}
   {phase==='result'&&<div className={styles.actions}><button className={styles.fire} onClick={()=>actions.current?.next()}>Next shot</button><button disabled={saved||kept.length>=4} onClick={()=>actions.current?.keep()}>{saved?'Kept':'Keep this blow'}</button></div>}
   <div className={styles.actions}><button disabled={!['result','blocked'].includes(phase)} onClick={()=>actions.current?.undo()}>Undo last blow</button><button disabled={!available||busy} onClick={()=>actions.current?.reset()}>Reset garden</button></div>
   {notice&&<p className={styles.notice} role="status">{notice}</p>}
   {last&&<p className={styles.result}>Ball: {last.reason.replaceAll('-',' ')} at {last.elapsed.toFixed(2)} s. Stone ready at {last.settleElapsed.toFixed(2)} s.</p>}
   <details className={styles.shelf}><summary>Kept blows · {kept.length}/4</summary><p>Restore before to repeat a blow. Use result to continue from the stone’s settled position. Both require a new manual shot.</p>{kept.map((entry,i)=><div className={styles.entry} key={entry.id}><strong>Blow {i+1}</strong><div className={styles.actions}><button disabled={busy||!available} onClick={()=>actions.current?.restore(entry)}>Restore before</button><button disabled={busy||!available} onClick={()=>actions.current?.restore(entry,true)}>Use result</button><button disabled={busy} onClick={()=>actions.current?.remove(entry.id)}>Remove</button></div></div>)}</details>
   <p className={styles.footer}>One passive convex stone · no required destination · build {BUILD_ID}</p>
  </aside>
 </main>;
}
