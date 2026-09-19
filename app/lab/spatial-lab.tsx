'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Engine,Scene,Vector3,Color3,Color4,Camera,FreeCamera,HemisphericLight,DirectionalLight,ShadowGenerator,StandardMaterial,TransformNode,MeshBuilder,HavokPlugin,LinesMesh} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {BUILD_ID} from '@/lib/build-identity';
import {RAIL_RULES} from '@/lib/rail-golf-v02';
import {createSpatialSession,spatialSetup,spatialControlSetup,spatialLaunch,spatialCameraFrame,type SpatialConfig,type SpatialRecord as RangeRecord,type SpatialSetup as RangeSetup} from '@/lib/spatial-lab-session';
import {advanceFlightCamera,followOffsets,followHeading} from '@/lib/flight-framing';
import {launchCharge,maxLatchAfter} from '@/lib/shot-tools';
import {rangeRail,rangeDrag,createRangeView,rangeViewLabel,transferFeedback} from '@/lib/mechanism-range-controls';
import {buildRangeLauncher,buildRangeProjectile,buildRangePresentationMaterials} from '@/lib/mechanism-range-presentation';
import {RANGE_EVENT_HOLD_MS,rangeLineReceipt,createRangeDepartureMarkers} from '@/lib/mechanism-range-legibility';
import {placeRangeCamera,advanceRangeCamera} from '@/lib/mechanism-range-framing';
import {ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Crosshair} from 'lucide-react';
import styles from './mechanism-range/range.module.css';

type Phase='loading'|'ready'|'charging'|'flight'|'result'|'error';
type Actions={begin():void;release():void;cancel():void;retry():void;reset():void;recall():void};
export default function SpatialLab({config}:{config:SpatialConfig}){
  const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null);
  const [phase,setPhase]=useState<Phase>('loading'),phaseRef=useRef<Phase>('loading');
  const [setup,setSetup]=useState<RangeSetup>({...config.defaultSetup}),setupRef=useRef<RangeSetup>({...config.defaultSetup});
  const [max,setMax]=useState(false),maxRef=useRef(false);
  const [view]=useState(createRangeView),viewMode=useSyncExternalStore(view.subscribe,view.getSnapshot,view.getServerSnapshot);
  const [powerMode,setPowerMode]=useState<'hold'|'set'>('hold'),powerModeRef=useRef<'hold'|'set'>('hold');
  const [visualMode,setVisualMode]=useState<'round'|'ball'>('round'),visualModeRef=useRef<'round'|'ball'>('round');
  const [environment,setEnvironment]=useState<Record<string,string>>({});
  const environmentAction=useRef<((id:string,value:string)=>void)|null>(null);
  const chargePointer=useRef<{element:HTMLButtonElement;id:number}|null>(null);
  const [recoveryNotice,setRecoveryNotice]=useState('');
  const [discovered,setDiscovered]=useState(false);
  const [floor,setFloor]=useState('A'),[power,setPower]=useState(0),[caption,setCaption]=useState(''),[error,setError]=useState('');
  const [last,setLast]=useState<RangeRecord|null>(null);
  const update=(patch:Partial<RangeSetup>)=>{const next=spatialControlSetup(config,setupRef.current,patch,phaseRef.current);setupRef.current=next;setSetup(next);};
  const toggleMax=()=>{if(!['ready','result'].includes(phaseRef.current))return;maxRef.current=maxLatchAfter(maxRef.current,'toggle');setMax(maxRef.current);};
  const toggleSurvey=()=>{view.toggle(phaseRef.current);};
  const moveRail=(direction:number)=>{if(config.originControl?phaseRef.current!=='ready':!['ready','charging'].includes(phaseRef.current))return;const next=config.originControl?.shift(setupRef.current,direction)??rangeRail(setupRef.current,direction);setupRef.current=next;setSetup(next);};
  useEffect(()=>{
    let disposed=false,engine:Engine|null=null,scene:Scene|null=null,cleanup=()=>{};
    const phaseTo=(next:Phase)=>{phaseRef.current=next;if(!disposed)setPhase(next);};
    const boot=async()=>{
      try{
        const havok=await HavokPhysics();if(disposed)return;
        if(!Engine.isSupported())throw Error('3D graphics are unavailable in this browser. Open this sketch in a WebGL-enabled browser.');
        const surface=canvas.current!;
        engine=new Engine(surface,true,{preserveDrawingBuffer:true,stencil:true});
        engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));
        scene=new Scene(engine);const activeScene=scene,activeEngine=engine;
        scene.clearColor=new Color4(.055,.09,.105,1);
        scene.enablePhysics(new Vector3(0,-RAIL_RULES.gravity,0),new HavokPlugin(true,havok));
        scene.getPhysicsEngine()!.setTimeStep(1/120);scene.getPhysicsEngine()!.setSubTimeStep(1000/120);
        const camera=new FreeCamera('mr-camera',new Vector3(0,7.8,-15),scene);
        camera.inputs.clear();camera.minZ=.1;camera.maxZ=650;camera.fov=.69;
        const target=new Vector3(0,3.6,34);let previous:Vector3|null=null,heading={x:0,y:0,z:1};camera.setTarget(target);
        const sky=new HemisphericLight('mr-sky',new Vector3(0,1,0),scene);sky.intensity=.95;sky.groundColor=new Color3(.18,.13,.09);
        const sun=new DirectionalLight('mr-sun',new Vector3(-.5,-1,.4),scene);sun.position.set(35,70,-35);sun.intensity=1.5;sun.diffuse=new Color3(1,.85,.66);
        const shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=12;
        const palette:Record<string,number[]>={sand:[.32,.29,.22],timber:[.63,.40,.23],bark:[.25,.13,.07],machine:[.10,.16,.17],steel:[.35,.43,.43],cyan:[.06,.8,.86],amber:[1,.42,.08],violet:[.67,.25,.94]};
        const materials:Record<string,StandardMaterial>={};
        for(const [name,rgb] of Object.entries(palette)){
          const m=new StandardMaterial('mr-'+name,scene);m.diffuseColor=Color3.FromArray(rgb);m.specularColor=new Color3(.08,.08,.08);
          if(['cyan','amber','violet'].includes(name))m.emissiveColor=m.diffuseColor.scale(.32);materials[name]=m;
        }
        const root=new TransformNode('mr-world',scene),world=config.buildWorld(scene,root,materials,shadows);
        setEnvironment(world.environment?.snapshot()??{});
        environmentAction.current=(id,value)=>{if(phaseRef.current!=='ready')return;world.environment?.restore({...world.environment.snapshot(),[id]:value});setEnvironment(world.environment?.snapshot()??{});};
        let captionUntil=0,chargeStart=0,lastCharge=-1;
        let drag:{id:number;x:number;y:number}|null=null,keyboardCharge=false;
        const cameraFrame=(mode=view.getSnapshot())=>spatialCameraFrame(config,setupRef.current,activeEngine.getRenderWidth(),activeEngine.getRenderHeight(),mode);
        const releaseInputs=()=>{
          if(drag&&surface.hasPointerCapture(drag.id))surface.releasePointerCapture(drag.id);drag=null;keyboardCharge=false;chargeStart=0;lastCharge=-1;
          const pointer=chargePointer.current;chargePointer.current=null;
          if(pointer?.element.hasPointerCapture(pointer.id))pointer.element.releasePointerCapture(pointer.id);
        };
        const departureMarkers=createRangeDepartureMarkers(scene);
        const session=createSpatialSession(scene,world,config,event=>{
          if(disposed)return;
          if(event.kind==='state'){setEnvironment(world.environment?.snapshot()??{});if(typeof event.state==='string')setFloor(event.state);else if(event.state?.floor)setFloor(event.state.floor);}
          if(event.kind==='switch')setDiscovered(true);
          if(event.kind==='redirect'||event.kind==='switch'){
            setCaption(event.kind==='switch'?transferFeedback(true,event.state==='B'?'B':'A')!:event.label??'REBOUND');captionUntil=performance.now()+RANGE_EVENT_HOLD_MS;
            departureMarkers.add(event,performance.now());
          }
          if(event.kind==='end'){setLast(event.last!);view.set('impact');phaseTo('result');setCaption('');captionUntil=0;}
        });
        scene.onBeforePhysicsObservable.add(()=>session.beforeStep());scene.onAfterPhysicsObservable.add(()=>session.afterStep());
        const presentationMaterials=buildRangePresentationMaterials(scene);
        const {launcher,yaw,loft}=buildRangeLauncher(scene,presentationMaterials,shadows);
        let projectile:ReturnType<typeof buildRangeProjectile>|null=null;
        let trail:LinesMesh|null=null,spine:LinesMesh|null=null,points:Vector3[]=[],trailFrame=0;
        const shoot=(charge:number)=>{
          if(!['ready','charging'].includes(phaseRef.current))return;
          if(session.fire({...setupRef.current,charge})){
            phaseTo('flight');setPower(charge);setCaption('');setRecoveryNotice('');departureMarkers.clear();view.set('flight');
            const direction=spatialLaunch(config,setupRef.current).aim;heading={x:direction.x,y:0,z:direction.z};previous=null;
            projectile?.dispose();projectile=buildRangeProjectile(activeScene,session.flight!.mesh,presentationMaterials,shadows,visualModeRef.current);projectile.sync(session.flight!.aggregate.body.getLinearVelocity());trail?.dispose();trail=null;points=[];
          }
        };
        let recovering=false;
        const cancel=()=>{if(!recovering&&phaseRef.current==='charging'){phaseTo('ready');setPower(0);}};
        const restore=(action:'retry'|'reset'|'recall')=>{
          if(recovering||phaseRef.current==='loading'||phaseRef.current==='error'||action==='recall'&&!session.last)return;
          recovering=true;try{releaseInputs();const saved=session.action(action);
          const next=spatialSetup(config,action==='reset'?{...config.defaultSetup,charge:setupRef.current.charge}:saved??setupRef.current);
          departureMarkers.clear();projectile?.dispose();projectile=null;previous=null;captionUntil=0;setCaption('');setPower(0);
          setupRef.current=next;setSetup(next);if(action==='recall'){powerModeRef.current='set';setPowerMode('set');}
          maxRef.current=maxLatchAfter(maxRef.current,action==='reset'?'retry':action);setMax(maxRef.current);
          view.set('launch');placeRangeCamera(camera,target,cameraFrame('launch'));phaseTo('ready');
          setRecoveryNotice(action==='reset'?'Ready · experiment reset.':action==='recall'?'Ready · last line restored.':'Ready · take another shot.');}finally{recovering=false;}
        };
        actions.current={
          begin(){if(phaseRef.current!=='ready')return;if(maxRef.current){shoot(1);return;}chargeStart=performance.now();phaseTo('charging');},
          release(){if(phaseRef.current==='charging')shoot(launchCharge(powerModeRef.current,setupRef.current.charge,performance.now()-chargeStart,maxRef.current));},cancel,
          retry(){restore('retry');},reset(){restore('reset');},recall(){restore('recall');},
        };
        const down=(e:PointerEvent)=>{if(!['ready','charging'].includes(phaseRef.current)||view.getSnapshot()==='survey'||drag||(e.pointerType==='mouse'&&e.button!==0))return;e.preventDefault();drag={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);};
        const move=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId||!['ready','charging'].includes(phaseRef.current))return;e.preventDefault();
          const next=spatialSetup(config,rangeDrag(setupRef.current,e.clientX-drag.x,e.clientY-drag.y,e.pointerType));
          setupRef.current=next;setSetup(next);drag={...drag,x:e.clientX,y:e.clientY};};
        const up=()=>{drag=null;};
        const keydown=(e:KeyboardEvent)=>{
          if(e.metaKey||e.ctrlKey||e.altKey||e.target instanceof Element&&e.target.closest('input,select,textarea,[contenteditable]')||(e.target instanceof Element&&e.target.closest('button,summary,a')&&!['KeyR','KeyV'].includes(e.code)))return;
          if(e.repeat&&!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS'].includes(e.code))return;
          if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR','KeyX','KeyQ','KeyE','KeyL','KeyV'].includes(e.code))e.preventDefault();
          if(e.code==='Space'){keyboardCharge=true;actions.current?.begin();}
          if(e.code==='KeyR')actions.current?.retry();
          if(e.code==='KeyL'&&phaseRef.current==='ready')actions.current?.recall();
          if(e.code==='KeyV')view.toggle(phaseRef.current);
          if(e.code==='KeyX'&&['ready','result'].includes(phaseRef.current)){maxRef.current=maxLatchAfter(maxRef.current,'toggle');setMax(maxRef.current);}
          if(!['ready','charging'].includes(phaseRef.current))return;
          let next=setupRef.current;
          if(e.code==='ArrowLeft'||e.code==='KeyA')next=spatialSetup(config,next,{yaw:next.yaw-.7});
          if(e.code==='ArrowRight'||e.code==='KeyD')next=spatialSetup(config,next,{yaw:next.yaw+.7});
          if(e.code==='ArrowUp'||e.code==='KeyW')next=spatialSetup(config,next,{elevation:next.elevation+.7});
          if(e.code==='ArrowDown'||e.code==='KeyS')next=spatialSetup(config,next,{elevation:next.elevation-.7});
          if(e.code==='KeyQ'&&(!config.originControl||phaseRef.current==='ready'))next=config.originControl?.shift(next,-1)??rangeRail(next,-1);if(e.code==='KeyE'&&(!config.originControl||phaseRef.current==='ready'))next=config.originControl?.shift(next,1)??rangeRail(next,1);
          setupRef.current=next;setSetup(next);
        };
        const keyup=(e:KeyboardEvent)=>{if(e.code==='Space'&&keyboardCharge){keyboardCharge=false;e.preventDefault();actions.current?.release();}};
        const blur=()=>{releaseInputs();cancel();};
        surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);
        window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
        const resize=()=>{activeEngine.resize();const frame=cameraFrame();camera.fovMode=frame.horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.fov=frame.fov;};resize();placeRangeCamera(camera,target,cameraFrame('launch'));window.addEventListener('resize',resize);
        cleanup=()=>{actions.current=null;environmentAction.current=null;window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);surface.removeEventListener('pointercancel',up);projectile?.dispose();departureMarkers.dispose();session.dispose();world.dispose();};
        phaseTo('ready');
        activeEngine.runRenderLoop(()=>{
          if(disposed)return;
          const dt=Math.min(.05,activeEngine.getDeltaTime()/1000),s=setupRef.current,{rail,muzzle,aim,station}=spatialLaunch(config,s);world.updatePresentation?.(s);
          launcher.position.set(rail.x,rail.y,rail.z);yaw.rotation.y=(s.yaw+station.yaw)*Math.PI/180;loft.rotation.x=-s.elevation*Math.PI/180;
          const a=new Vector3(muzzle.x,muzzle.y,muzzle.z),b=a.add(new Vector3(aim.x,aim.y,aim.z).scale(5));
          spine=MeshBuilder.CreateLines('mr-aim',{points:[a,b],instance:spine??undefined,updatable:true},activeScene);spine.color=new Color3(.1,.85,.9);spine.setEnabled(['ready','charging'].includes(phaseRef.current)&&view.getSnapshot()==='launch');
          if(phaseRef.current==='charging'){const c=launchCharge(powerModeRef.current,s.charge,performance.now()-chargeStart,maxRef.current);if(Math.abs(c-lastCharge)>.005){lastCharge=c;setPower(c);}}
          if(captionUntil&&performance.now()>captionUntil){setCaption('');captionUntil=0;}
          departureMarkers.update(performance.now());
          const f=session.flight;
          if(f&&projectile){projectile.select(visualModeRef.current);projectile.sync(f.aggregate.body.getLinearVelocity());}
          if(f&&view.getSnapshot()==='flight'){
            const p=f.mesh.position,v=f.aggregate.body.getLinearVelocity();heading=followHeading(heading,v,dt);
            const horizontal=camera.fovMode===Camera.FOVMODE_HORIZONTAL_FIXED;
            const desired=followOffsets(p,v,heading),frame=advanceFlightCamera({position:camera.position,target,fov:camera.fov},p,previous,desired,dt,activeEngine.getAspectRatio(camera),horizontal,horizontal?.92:.69);
            camera.position.copyFromFloats(frame.position.x,frame.position.y,frame.position.z);target.copyFromFloats(frame.target.x,frame.target.y,frame.target.z);camera.fov=frame.fov;previous=p.clone();
            if(++trailFrame%3===0){points.push(p.clone());if(points.length>900)points.shift();if(points.length>1){trail?.dispose();trail=MeshBuilder.CreateLines('mr-trail',{points},activeScene);trail.color=new Color3(.1,.8,.85);}}
          }else if(view.getSnapshot()==='launch'||view.getSnapshot()==='survey'){advanceRangeCamera(camera,target,cameraFrame(),dt);}
          camera.setTarget(target);activeScene.render();
        });
      }catch(e){if(disposed)return;setError(e instanceof Error?e.message:String(e));phaseTo('error');}
    };
    void boot();return()=>{disposed=true;cleanup();scene?.dispose();engine?.dispose();};
  },[view,config]);
  const ready=phase==='ready',canAim=ready||phase==='charging',live=phase==='flight',available=!['loading','error'].includes(phase);
  const shownPower=ready?(max?1:powerMode==='set'?setup.charge:power):power;
  const feedback=transferFeedback(discovered,floor);
  const receipt=rangeLineReceipt(last);
  return <main className={styles.shell} data-camera-mode={viewMode}>
    <canvas ref={canvas} className={styles.canvas} aria-label={`${config.title}. Drag to aim; survey to inspect the space.`} />
    <header className={styles.header}><div><span>RAIL GOLF / SPATIAL LAB</span><h1>{config.title}</h1><p>{config.subtitle??config.station(setup).label}</p></div><div className={styles.identity}>SPATIAL STUDY<br/>BUILD {BUILD_ID}</div></header>
    <aside className={styles.brief}><p>{config.brief}</p><div className={styles.actions}><button disabled={!['ready','result'].includes(phase)} onClick={toggleSurvey} aria-pressed={viewMode==='survey'}>{rangeViewLabel(viewMode)}</button><a href="/lab/lines">Timber Courtyard ↗</a></div></aside>
    {feedback&&<div className={styles.machine} data-state={floor} role="status">{feedback}</div>}
    {caption&&<div className={styles.caption} role="status">{caption}</div>}
    {phase==='result'&&<section className={`${styles.caption} ${styles.receipt}`} aria-label="Line result" role="status">
      <div className={styles.resultActions} aria-label="Continue playing">
        <button type="button" onClick={e=>{e.stopPropagation();actions.current?.retry();}}>Retry Shot <kbd>R</kbd></button>
        <button type="button" onClick={e=>{e.stopPropagation();actions.current?.reset();}}>Reset Card</button>
      </div>
      {receipt.events.length>0&&<ol aria-label="Qualified line events">{receipt.events.map((event,index)=><li key={index}>{event.label}</li>)}</ol>}
      <p>{receipt.terminal}</p>
    </section>}
    {phase==='loading'&&<div className={styles.message}>Opening the spatial lab…</div>}
    {phase==='error'&&<div className={styles.message} role="alert">{error}</div>}
    <section className={styles.console} aria-label="Rail shot controls">
      {recoveryNotice&&ready&&<p className={styles.recoveryNotice} role="status">{recoveryNotice}</p>}
      {config.originControl&&<div className={styles.options} style={{flexWrap:'wrap',marginBottom:8}} aria-label="Launch origin">
        <label>Origin <select aria-label="Origin mode" disabled={!ready} value={setup.carriageMode} onChange={e=>update({carriageMode:e.target.value})}>{config.originControl.modes.map(mode=><option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
        {config.originControl.stops(setup.carriageMode??'rails')?.map((x,index)=><button key={x} disabled={!ready} aria-pressed={setup.originX===x} onClick={()=>update(setup.carriageMode==='rails'?{railIndex:index}:{originX:x})}>{x>0?'+':''}{x} m</button>)}
        {setup.carriageMode==='continuous'&&<label>Position {setup.originX?.toFixed(1)} m <input aria-label="Carriage position" type="range" min={config.originControl.min} max={config.originControl.max} step={config.originControl.step} disabled={!ready} value={setup.originX} onChange={e=>update({originX:Number(e.target.value)})}/></label>}
      </div>}
      <div className={styles.options}>
        <button disabled={!ready&&phase!=='result'} aria-pressed={max} onClick={toggleMax}>MAX · 100% <kbd>X</kbd></button>
        <button disabled={!available} onClick={()=>actions.current?.retry()}>{live?'Retry Shot':'Retry'} <kbd>R</kbd></button>
        <button disabled={!available} onClick={()=>actions.current?.reset()}>Reset Card</button>
      </div>
      <details className={styles.tools}><summary>Shot tools & saved line · {powerMode==='hold'?'timed charge':`set power ${Math.round(setup.charge*1000)/10}%`}</summary>
        <div className={styles.exact}>
          <label>Power control <select aria-label="Power control" disabled={!ready} value={powerMode} onChange={e=>{const mode=e.target.value as 'hold'|'set';powerModeRef.current=mode;setPowerMode(mode);maxRef.current=maxLatchAfter(maxRef.current,'set');setMax(maxRef.current);}}><option value="hold">Timed hold</option><option value="set">Set power</option></select></label>
          {powerMode==='set'&&<label>Power {Math.round(setup.charge*1000)/10}% <input aria-label="Set launch power" type="range" min="0" max="100" step="0.5" disabled={!ready} value={setup.charge*100} onChange={e=>{maxRef.current=maxLatchAfter(maxRef.current,'set');setMax(maxRef.current);update({charge:Number(e.target.value)/100});}}/></label>}
          <label>Yaw <input aria-label="Exact yaw" type="number" step="0.1" min={RAIL_RULES.minYaw} max={RAIL_RULES.maxYaw} disabled={!canAim} value={Number(setup.yaw.toFixed(1))} onChange={e=>update({yaw:Number(e.target.value)})}/></label>
          <label>Elevation <input aria-label="Exact elevation" type="number" step="0.1" min={RAIL_RULES.minElevation} max={RAIL_RULES.maxElevation} disabled={!canAim} value={Number(setup.elevation.toFixed(1))} onChange={e=>update({elevation:Number(e.target.value)})}/></label>
          <button disabled={!['ready','result'].includes(phase)||!last} onClick={()=>actions.current?.recall()}>Recall last line</button>
          <span>FAMILIAR framing</span>
          {config.controls?.map(control=><label key={control.id}>{control.label} <select aria-label={control.label} disabled={!ready} value={environment[control.id]??control.options[0]} onChange={e=>environmentAction.current?.(control.id,e.target.value)}>{control.options.map(option=><option key={option}>{option}</option>)}</select></label>)}
          <label>Projectile visual <select aria-label="Projectile visual" value={visualMode} onChange={e=>{const mode=e.target.value as 'round'|'ball';visualModeRef.current=mode;setVisualMode(mode);}}><option value="round">RAIL ROUND</option><option value="ball">BALL</option></select></label>
        </div>
        <p>Gentle start · 80% in 2 seconds · full power in 3. Aim ±70°; loft 5–85°. Q/E {config.originControl?'origins':'rails'} · arrows/WASD aim · Space fire · X MAX · R Retry · L Recall · V Survey.</p>
        <p>Recall selects the last exact power for the orange fire control. This sketch keeps only the last attempt in memory. Origin and environment are saved with it.</p>
        {discovered&&<p>Retry keeps the transfer state. Reset restores the authored default. Recall restores the recorded starting state.</p>}
        {last&&<><p>{last.reason} · {last.elapsed.toFixed(2)} s · {JSON.stringify(last.environment)}</p><details><summary>Physical evidence</summary><pre>{JSON.stringify({setup:last.setup,station:last.station,environment:last.environment,qualified:last.evidence.filter(e=>e.kind==='redirect'),diagnostics:last.evidence.filter(e=>e.kind!=='redirect'),rawContacts:last.contacts},null,2)}</pre></details></>}
      </details>
      <div className={styles.metrics}>
        <div><span>YAW</span><strong>{setup.yaw>=0?'+':''}{setup.yaw.toFixed(1)}°</strong></div>
        <div><span>ELEV</span><strong>{setup.elevation.toFixed(1)}°</strong></div>
        <div><span>{config.originControl?'ORIGIN':'RAIL'}</span><strong>{config.originControl?`${setup.originX?.toFixed(1)} m`:`${setup.railIndex+1} / ${RAIL_RULES.railPositions.length}`}</strong></div>
        <div><span>POWER</span><strong>{Math.round(shownPower*100)}%</strong></div>
      </div>
      <div className={styles.powerTrack} role="progressbar" aria-label="Launch power" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shownPower*100)}><div style={{width:`${shownPower*100}%`}}/>{last&&<i style={{left:`${last.setup.charge*100}%`}} title="Last shot power"/>}</div>
      <div className={styles.controlGrid}>
        <div className={styles.rails} aria-label="Launcher rail">
          <button disabled={(config.originControl?!ready:!canAim)||(!config.originControl&&setup.railIndex===0)} aria-label="Move launcher left" onClick={()=>moveRail(-1)}><ChevronLeft/></button><span>{config.originControl?'ORIGIN':'RAIL'}</span>
          <button disabled={(config.originControl?!ready:!canAim)||(!config.originControl&&setup.railIndex===RAIL_RULES.railPositions.length-1)} aria-label="Move launcher right" onClick={()=>moveRail(1)}><ChevronRight/></button>
        </div>
        <button className={styles.fire} disabled={!canAim}
          onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);chargePointer.current={element:e.currentTarget,id:e.pointerId};actions.current?.begin();}}
          onPointerUp={()=>{chargePointer.current=null;actions.current?.release();}} onPointerCancel={()=>actions.current?.cancel()} onLostPointerCapture={()=>actions.current?.cancel()} onBlur={()=>actions.current?.cancel()}
          onKeyDown={e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();actions.current?.begin();}}}
          onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();actions.current?.release();}}}>
          <Crosshair/><span>{max?'FIRE MAX · 100%':powerMode==='set'?(phase==='charging'?'RELEASE TO FIRE':`FIRE AT ${Math.round(setup.charge*1000)/10}%`):phase==='charging'?'RELEASE ROUND':'HOLD TO CHARGE'}</span>
        </button>
        <div className={styles.nudges} aria-label="Fine aim controls">
          <button disabled={!canAim} aria-label="Raise elevation" onClick={()=>update({elevation:setupRef.current.elevation+.5})}><ChevronUp/></button>
          <button disabled={!canAim} aria-label="Aim left" onClick={()=>update({yaw:setupRef.current.yaw-.5})}><ChevronLeft/></button>
          <button disabled={!canAim} aria-label="Aim right" onClick={()=>update({yaw:setupRef.current.yaw+.5})}><ChevronRight/></button>
          <button disabled={!canAim} aria-label="Lower elevation" onClick={()=>update({elevation:setupRef.current.elevation-.5})}><ChevronDown/></button>
        </div>
      </div>
      <p className={styles.hint}>Drag to aim · {max?'tap orange for MAX':powerMode==='hold'?'hold orange to charge':'release orange to fire'} · no landing prediction</p>
    </section>
  </main>;
}
