'use client';
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {Engine,Scene,Vector3,Color3,Color4,Camera,FreeCamera,HemisphericLight,DirectionalLight,ShadowGenerator,TransformNode,MeshBuilder,HavokPlugin,LinesMesh} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {BUILD_ID} from '@/lib/build-identity';
import {RAIL_RULES} from '@/lib/rail-golf-v02';
import {createSpatialSession,createSpatialOriginClock,spatialSetup,spatialControlSetup,spatialLaunch,spatialCameraFrame,type SpatialConfig,type SpatialRecord as RangeRecord,type SpatialSetup as RangeSetup} from '@/lib/spatial-lab-session';
import {advanceFlightCamera,followOffsets,followHeading} from '@/lib/flight-framing';
import {launchCharge,maxLatchAfter} from '@/lib/shot-tools';
import {rangeRail,rangeDrag,createRangeView,rangeViewLabel,transferFeedback} from '@/lib/mechanism-range-controls';
import {buildRangeLauncher,buildRangeProjectile} from '@/lib/mechanism-range-presentation';
import {RANGE_EVENT_HOLD_MS,rangeLineReceipt,createRangeDepartureMarkers} from '@/lib/mechanism-range-legibility';
import {placeRangeCamera,advanceRangeCamera} from '@/lib/mechanism-range-framing';
import {ChevronLeft,ChevronRight,ChevronUp,ChevronDown,Crosshair} from 'lucide-react';
import styles from './mechanism-range/range.module.css';
import refinement from './spatial-lab.module.css';
import {buildSpatialLabMaterials} from '@/lib/spatial-lab-materials';
import {createGateShelf,createBrowserGateShelf,type GateEntry} from '@/lib/horizons-gate-shelf';
import {createBrowserPlaygroundShelf} from '@/lib/playgrounds-shelf';
import {createPlaygroundAudio} from '@/lib/playgrounds-audio';
import {contactStrike} from '@/lib/worldcraft-resonance';
import {YardControls} from './places-architecture/yard-controls';
import yard from './places-architecture/yard-play.module.css';

type Phase='loading'|'ready'|'charging'|'flight'|'result'|'error';
type Actions={begin():void;release():void;cancel():void;retry():void;stop():void;changeView():void;selectView(mode:'launch'|'survey'|'flight'):void;reset():void;recall():void;keep():void;restoreKept(id:string):void;removeKept(id:string):void;downloadKept(id:string):void;selectStation(id:string):void};
export default function SpatialLab({config,playPresentation,yardVersion}:{config:SpatialConfig;playPresentation?:'yard';yardVersion?:ReactNode}){
  const hasShelf=Boolean(config.shelf||config.playground),shelfLimit=config.shelf?.limit??4;
  const aimStep=config.playground ? 0.5 : 0.7;
  const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null);
  const [phase,setPhase]=useState<Phase>('loading'),phaseRef=useRef<Phase>('loading');
  const [setup,setSetup]=useState<RangeSetup>({...config.defaultSetup}),setupRef=useRef<RangeSetup>({...config.defaultSetup});
  const [max,setMax]=useState(false),maxRef=useRef(false);
  const [view]=useState(createRangeView),viewMode=useSyncExternalStore(view.subscribe,view.getSnapshot,view.getServerSnapshot);
  const [powerMode,setPowerMode]=useState<'hold'|'set'>(config.defaultPowerMode??'hold'),powerModeRef=useRef<'hold'|'set'>(config.defaultPowerMode??'hold');
  const [visualMode,setVisualMode]=useState<'round'|'ball'>('round'),visualModeRef=useRef<'round'|'ball'>('round');
  const [environment,setEnvironment]=useState<Record<string,string>>({});
  const [diagnostics,setDiagnostics]=useState<Record<string,unknown>>({});
  const originClock=useRef<ReturnType<typeof createSpatialOriginClock>|null>(null);
  const environmentAction=useRef<((id:string,value:string)=>void)|null>(null);
  const chargePointer=useRef<{element:HTMLButtonElement;id:number}|null>(null);
  const [recoveryNotice,setRecoveryNotice]=useState('');
  const [soundEnabled,setSoundEnabled]=useState(true),soundEnabledRef=useRef(true),soundControl=useRef<((enabled:boolean)=>void)|null>(null);
  const [discovered,setDiscovered]=useState(false);
  const [floor,setFloor]=useState('A'),[power,setPower]=useState(0),[caption,setCaption]=useState(''),[error,setError]=useState('');
  const [last,setLast]=useState<RangeRecord|null>(null);
  const [kept,setKept]=useState<GateEntry[]>([]),[shelfWarning,setShelfWarning]=useState(''),[keptLast,setKeptLast]=useState(false);
  const update=(patch:Partial<RangeSetup>)=>{originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);const next=spatialControlSetup(config,setupRef.current,patch,phaseRef.current);setupRef.current=next;setSetup(next);originClock.current?.reset(performance.now());};
  const toggleMax=()=>{if(!['ready','result'].includes(phaseRef.current))return;maxRef.current=maxLatchAfter(maxRef.current,'toggle');setMax(maxRef.current);};
  const toggleFlightView=()=>actions.current?.changeView();
  const toggleSurvey=()=>{if(config.flightPresentation){actions.current?.changeView();return;}originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);view.toggle(phaseRef.current);originClock.current?.reset(performance.now());};
  const moveRail=(direction:number)=>{if(config.originControl?phaseRef.current!=='ready':!['ready','charging'].includes(phaseRef.current))return;originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);const next=config.originControl?.shift(setupRef.current,direction)??rangeRail(setupRef.current,direction);setupRef.current=next;setSetup(next);};
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
        const {world:materials,equipment:presentationMaterials}=buildSpatialLabMaterials(scene);
        const root=new TransformNode('mr-world',scene),world=config.buildWorld(scene,root,materials,shadows);
        const shelf:ReturnType<typeof createGateShelf>|null=createBrowserGateShelf(config.shelf?.id)??createBrowserPlaygroundShelf(config.playground?{...config.playground,station:config.station}:undefined);
        const sound=config.playground?createPlaygroundAudio():null;
        sound?.setEnabled(soundEnabledRef.current);
        soundControl.current=sound?(enabled=>{sound.setEnabled(enabled);if(enabled)sound.unlock();}):null;
        if(shelf){setKept(shelf.entries());setShelfWarning(shelf.warning());}
        let actualPath:number[][]=[],savedPath:number[][]=[],physicsSamples=0,alreadyKept=false;
        const publishShelf=()=>{if(shelf){setKept(shelf.entries());setShelfWarning(shelf.warning());}};
        setEnvironment(world.environment?.snapshot()??{});
        environmentAction.current=(id,value)=>{if(phaseRef.current!=='ready')return;if(world.environment?.setControl)world.environment.setControl(id,value);else world.environment?.restore({...world.environment.snapshot(),[id]:value});setEnvironment(world.environment?.snapshot()??{});setDiagnostics(world.diagnostics?.()??{});};
        let captionUntil=0,chargeStart=0,lastCharge=-1;
        let drag:{id:number;x:number;y:number}|null=null,keyboardCharge=false;
        const cameraFrame=(mode=view.getSnapshot())=>spatialCameraFrame(config,setupRef.current,activeEngine.getRenderWidth(),activeEngine.getRenderHeight(),mode);
        const showReadyView=()=>{if(config.openInSurvey){view.set('survey');placeRangeCamera(camera,target,cameraFrame('survey'));}else{view.set('launch');placeRangeCamera(camera,target,cameraFrame('launch'));}};
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
          if(event.kind==='end'){if(event.last?.reason!=='interrupted')sound?.terminal(event.last!.reason);if(shelf){savedPath=[...actualPath,[event.last!.elapsed,...event.last!.position]];}setLast(event.last!);view.set('impact');phaseTo('result');setCaption('');captionUntil=0;}
        });
        let acousticIncoming:Vector3|null=null;
        scene.onBeforePhysicsObservable.add(()=>{const f=session.flight;acousticIncoming=sound&&f&&!f.ended?f.aggregate.body.getLinearVelocity().clone():null;session.beforeStep();});scene.onAfterPhysicsObservable.add(()=>session.afterStep());
        if(shelf)scene.onAfterPhysicsObservable.add(()=>{const f=session.flight;if(f&&!f.ended&&++physicsSamples%12===0)actualPath.push([f.elapsed,...f.mesh.position.asArray()]);});
        const {launcher,yaw,loft}=buildRangeLauncher(scene,presentationMaterials,shadows);
        let projectile:ReturnType<typeof buildRangeProjectile>|null=null;
        let trail:LinesMesh|null=null,spine:LinesMesh|null=null,points:Vector3[]=[],trailFrame=0;
        let originPublished=0,diagnosticsPublished=0;
        originClock.current=createSpatialOriginClock(config,()=>setupRef.current,next=>{setupRef.current=next;if(performance.now()-originPublished>=80){originPublished=performance.now();setSetup({...next});}});originClock.current.reset(performance.now());
        const shoot=(charge:number)=>{
          if(!['ready','charging'].includes(phaseRef.current))return;
          originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);
          const launchSetup={...setupRef.current,charge};
          if(session.fire(launchSetup)){
            sound?.chargeStop();sound?.launch(charge);
            if(sound)session.flight!.aggregate.body.getCollisionObservable().add(event=>{const f=session.flight;if(!f||f.ended)return;const body=f.aggregate.body,other=event.collider===body?event.collidedAgainst:event.collider;const strike=contactStrike(event,acousticIncoming);sound.contact({speed:strike.normalSpeed??0,ground:Boolean(other.transformNode.metadata?.rangeGround)});});
            if(shelf){actualPath=[[0,...session.flight!.mesh.position.asArray()]];savedPath=[];physicsSamples=0;alreadyKept=false;setKeptLast(false);}
            setupRef.current=launchSetup;setSetup(launchSetup);setEnvironment(world.environment?.snapshot()??{});setDiagnostics(world.diagnostics?.()??{});
            phaseTo('flight');setPower(charge);setCaption('');setRecoveryNotice('');departureMarkers.clear();view.set('flight');
            const direction=spatialLaunch(config,setupRef.current).aim;heading={x:direction.x,y:0,z:direction.z};previous=null;
            projectile?.dispose();projectile=buildRangeProjectile(activeScene,session.flight!.mesh,presentationMaterials,shadows,visualModeRef.current);projectile.sync(session.flight!.aggregate.body.getLinearVelocity());trail?.dispose();trail=null;points=[];
          }
        };
        let recovering=false;
        const cancel=()=>{sound?.chargeStop();if(!recovering&&phaseRef.current==='charging'){phaseTo('ready');setPower(0);}};
        const restore=(action:'retry'|'reset'|'recall')=>{
          if(recovering||phaseRef.current==='loading'||phaseRef.current==='error'||action==='recall'&&!session.last)return;
          recovering=true;try{sound?.chargeStop();releaseInputs();const saved=session.action(action);
          let next=spatialSetup(config,action==='reset'?{...config.defaultSetup,charge:setupRef.current.charge}:saved??setupRef.current);next=config.originControl?.recover?.(next,action)??next;originClock.current?.reset(performance.now());setDiagnostics(world.diagnostics?.()??{});
          departureMarkers.clear();projectile?.dispose();projectile=null;previous=null;captionUntil=0;setCaption('');setPower(0);
          setupRef.current=next;setSetup(next);if(action==='recall'){powerModeRef.current='set';setPowerMode('set');}
          maxRef.current=maxLatchAfter(maxRef.current,action==='reset'?'retry':action);setMax(maxRef.current);
          showReadyView();phaseTo('ready');
          setRecoveryNotice(action==='reset'?'Ready · experiment reset.':action==='recall'?'Ready · last line restored.':'Ready · take another shot.');}finally{recovering=false;}
        };
        const selectView=(mode:'launch'|'survey'|'flight')=>{
          if(!config.flightPresentation||!['ready','result','flight'].includes(phaseRef.current))return;
          if(mode==='flight'&&phaseRef.current!=='flight'||mode==='launch'&&phaseRef.current==='flight')return;
          previous=null;view.set(mode);
          if(mode==='flight'){const f=session.flight;if(f){const p=f.mesh.position,v=f.aggregate.body.getLinearVelocity(),desired=config.flightPresentation.desired?.(p,v,heading,setupRef.current)??followOffsets(p,v,heading),frame=config.flightPresentation.constrain({...desired,fov:camera.fov},p);camera.position.copyFromFloats(frame.position.x,frame.position.y,frame.position.z);target.copyFromFloats(frame.target.x,frame.target.y,frame.target.z);}}
          else placeRangeCamera(camera,target,cameraFrame(mode));
        };
        actions.current={
          begin(){if(phaseRef.current!=='ready')return;void sound?.unlock();if(maxRef.current){shoot(1);return;}chargeStart=performance.now();sound?.chargeStart();phaseTo('charging');},
          release(){if(phaseRef.current==='charging')shoot(launchCharge(powerModeRef.current,setupRef.current.charge,performance.now()-chargeStart,maxRef.current));},cancel,
          selectView,changeView(){selectView(view.getSnapshot()==='survey'?(phaseRef.current==='flight'?'flight':'launch'):'survey');},
          retry(){restore('retry');},stop(){if(!config.flightPresentation||phaseRef.current!=='flight')return;sound?.chargeStop();releaseInputs();session.action('stop');projectile?.dispose();projectile=null;previous=null;},reset(){restore('reset');},recall(){restore('recall');},
          keep(){if(!shelf||phaseRef.current!=='result'||!session.last||alreadyKept)return;try{const entry=shelf.keep(session.last,savedPath,BUILD_ID);if(entry){alreadyKept=true;setKeptLast(true);}publishShelf();}catch(e){setShelfWarning(String(e));}},
          restoreKept(id){if(!shelf||!['ready','result'].includes(phaseRef.current))return;const entry=shelf.get(id);if(!entry)return;restore('retry');trail?.dispose();trail=null;points=[];world.environment!.restore(entry.record.environment);const next={...entry.record.setup};setupRef.current=next;setSetup(next);powerModeRef.current='set';setPowerMode('set');maxRef.current=false;setMax(false);setEnvironment(world.environment!.snapshot());setDiagnostics(world.diagnostics?.()??{});showReadyView();setRecoveryNotice(`${config.playground?'Kept starting setup restored':'Kept setup and release phase restored'} · fire when ready. Recorded build ${entry.build}${entry.build===BUILD_ID?'':'; current build differs'}.`);},
          selectStation(id){if(!config.stationChoices?.some(choice=>choice.id===id)||!['ready','result'].includes(phaseRef.current))return;const current={...setupRef.current};restore('retry');const next=spatialSetup(config,current,{carriageMode:id});setupRef.current=next;setSetup(next);trail?.dispose();trail=null;points=[];setLast(null);showReadyView();setRecoveryNotice(`${config.station(next).label} · ready. Kept lines retain their original station.`);},
          removeKept(id){shelf?.remove(id);publishShelf();},
          downloadKept(id){const entry=shelf?.get(id);if(!entry)return;const url=URL.createObjectURL(new Blob([JSON.stringify(entry,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${config.playground?config.id:'swing-gate'}-${entry.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
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
          if(e.code==='KeyV'&&config.flightPresentation){actions.current?.changeView();return;}
          if(e.code==='KeyV'){originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);view.toggle(phaseRef.current);originClock.current?.reset(performance.now());}
          if(e.code==='KeyX'&&['ready','result'].includes(phaseRef.current)){maxRef.current=maxLatchAfter(maxRef.current,'toggle');setMax(maxRef.current);}
          if(!['ready','charging'].includes(phaseRef.current))return;
          originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);let next=setupRef.current;
          if(e.code==='ArrowLeft'||e.code==='KeyA')next=spatialSetup(config,next,{yaw:next.yaw-aimStep});
          if(e.code==='ArrowRight'||e.code==='KeyD')next=spatialSetup(config,next,{yaw:next.yaw+aimStep});
          if(e.code==='ArrowUp'||e.code==='KeyW')next=spatialSetup(config,next,{elevation:next.elevation+aimStep});
          if(e.code==='ArrowDown'||e.code==='KeyS')next=spatialSetup(config,next,{elevation:next.elevation-aimStep});
          if(e.code==='KeyQ'&&(!config.originControl||phaseRef.current==='ready'))next=config.originControl?.shift(next,-1)??rangeRail(next,-1);if(e.code==='KeyE'&&(!config.originControl||phaseRef.current==='ready'))next=config.originControl?.shift(next,1)??rangeRail(next,1);
          setupRef.current=next;setSetup(next);
        };
        const keyup=(e:KeyboardEvent)=>{if(e.code==='Space'&&keyboardCharge){keyboardCharge=false;e.preventDefault();actions.current?.release();}};
        const blur=()=>{originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);if(setupRef.current.carriageMode==='tour'){setupRef.current={...setupRef.current,tourRunning:false};setSetup(setupRef.current);}originClock.current?.reset(performance.now());releaseInputs();cancel();};
        surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);
        window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
        const visibility=()=>{if(document.hidden)blur();else originClock.current?.reset(performance.now());};document.addEventListener('visibilitychange',visibility);
        const resize=()=>{activeEngine.resize();const frame=cameraFrame();camera.fovMode=frame.horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.fov=frame.fov;};resize();placeRangeCamera(camera,target,cameraFrame('launch'));window.addEventListener('resize',resize);
        const resizeObserver=playPresentation==='yard'?new ResizeObserver(resize):null;resizeObserver?.observe(surface);
        cleanup=()=>{resizeObserver?.disconnect();soundControl.current=null;actions.current=null;environmentAction.current=null;originClock.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);surface.removeEventListener('pointercancel',up);sound?.dispose();projectile?.dispose();departureMarkers.dispose();session.dispose();world.dispose();};
        if(config.openInSurvey)showReadyView();
        phaseTo('ready');
        activeEngine.runRenderLoop(()=>{
          if(disposed)return;
          if(world.diagnostics&&performance.now()-diagnosticsPublished>=500){diagnosticsPublished=performance.now();setEnvironment(world.environment?.snapshot()??{});setDiagnostics(world.diagnostics());}
          originClock.current?.sync(performance.now(),phaseRef.current,view.getSnapshot()==='survey'||document.hidden);
          const dt=Math.min(.05,activeEngine.getDeltaTime()/1000),s=setupRef.current,{rail,muzzle,aim,station}=spatialLaunch(config,s);world.updatePresentation?.(s,dt);
          launcher.position.set(rail.x,rail.y,rail.z);yaw.rotation.y=(s.yaw+station.yaw)*Math.PI/180;loft.rotation.x=-s.elevation*Math.PI/180;
          const a=new Vector3(muzzle.x,muzzle.y,muzzle.z),b=a.add(new Vector3(aim.x,aim.y,aim.z).scale(5));
          spine=MeshBuilder.CreateLines('mr-aim',{points:[a,b],instance:spine??undefined,updatable:true},activeScene);spine.color=new Color3(.1,.85,.9);spine.setEnabled(['ready','charging'].includes(phaseRef.current)&&view.getSnapshot()==='launch');
          if(phaseRef.current==='charging'){const c=launchCharge(powerModeRef.current,s.charge,performance.now()-chargeStart,maxRef.current);if(Math.abs(c-lastCharge)>.005){lastCharge=c;setPower(c);sound?.chargeUpdate(c);}}
          if(captionUntil&&performance.now()>captionUntil){setCaption('');captionUntil=0;}
          departureMarkers.update(performance.now());
          const f=session.flight;
          if(f&&projectile){projectile.select(visualModeRef.current);projectile.sync(f.aggregate.body.getLinearVelocity());}
          if(f&&view.getSnapshot()==='flight'&&!config.overviewFlight){
            const p=f.mesh.position,v=f.aggregate.body.getLinearVelocity();heading=followHeading(heading,v,dt);
            const horizontal=camera.fovMode===Camera.FOVMODE_HORIZONTAL_FIXED;
            const desired=config.flightPresentation?.desired?.(p,v,heading,s)??followOffsets(p,v,heading),ordinaryFrame=advanceFlightCamera({position:camera.position,target,fov:camera.fov},p,previous,desired,dt,activeEngine.getAspectRatio(camera),horizontal,horizontal?.92:.69);
            const frame=config.flightPresentation?.constrain(ordinaryFrame,p)??ordinaryFrame;
            camera.position.copyFromFloats(frame.position.x,frame.position.y,frame.position.z);target.copyFromFloats(frame.target.x,frame.target.y,frame.target.z);camera.fov=frame.fov;previous=p.clone();
          }else if(view.getSnapshot()==='launch'||view.getSnapshot()==='survey'||config.overviewFlight&&view.getSnapshot()==='flight'){advanceRangeCamera(camera,target,cameraFrame(config.overviewFlight&&view.getSnapshot()==='flight'?'survey':view.getSnapshot()),dt);}
          if(f&&(view.getSnapshot()==='flight'||config.flightPresentation&&phaseRef.current==='flight')&&++trailFrame%3===0){points.push(f.mesh.position.clone());if(points.length>900)points.shift();if(points.length>1){trail?.dispose();trail=MeshBuilder.CreateLines('mr-trail',{points},activeScene);trail.color=new Color3(.1,.8,.85);}}
          camera.setTarget(target);activeScene.render();
        });
      }catch(e){if(disposed)return;setError(e instanceof Error?e.message:String(e));phaseTo('error');}
    };
    void boot();return()=>{disposed=true;cleanup();scene?.dispose();engine?.dispose();};
  },[view,config,aimStep,playPresentation]);
  const ready=phase==='ready',canAim=ready||phase==='charging',live=phase==='flight',available=!['loading','error'].includes(phase);
  const shownPower=ready||playPresentation==='yard'&&['loading','error'].includes(phase)?(max?1:powerMode==='set'?setup.charge:power):power;
  const feedback=transferFeedback(discovered,floor);
  const receipt=rangeLineReceipt(last);
  const returnOrigin=()=>{if(phaseRef.current!=='ready'||!last||!config.originControl?.returnTo)return;const next=config.originControl.returnTo(setupRef.current,last.setup);setupRef.current=next;setSetup(next);originClock.current?.reset(performance.now());};
  if(playPresentation==='yard')return <main className={yard.shell} data-camera-mode={viewMode} data-phase={phase}>
    <section className={yard.stage} aria-label="Exchange Yard scene">
      <canvas ref={canvas} className={yard.canvas} aria-label={`${config.title}. Drag to aim; Survey to inspect the space.`}/>
      <header className={yard.header}><div><h1>{config.title}</h1><p>{config.subtitle??config.station(setup).label}</p></div><span>BUILD {BUILD_ID}</span></header>
      {caption&&<div className={yard.caption} role="status">{caption}</div>}
      {phase==='loading'&&<div className={yard.message}>Opening Exchange Yard…</div>}
      {phase==='error'&&<div className={yard.message} role="alert">{error}</div>}
    </section>
    <YardControls phase={phase} setup={setup} stations={config.stationChoices??[]} view={viewMode} powerMode={powerMode} shownPower={shownPower} max={max} notice={recoveryNotice}
      onSetup={update} onStation={id=>actions.current?.selectStation(id)} onView={mode=>actions.current?.selectView(mode)}
      onPowerMode={mode=>{powerModeRef.current=mode;setPowerMode(mode);maxRef.current=false;setMax(false);}}
      onPower={charge=>{maxRef.current=false;setMax(false);update({charge});}} onMax={toggleMax}
      onRetry={()=>actions.current?.retry()} onStop={()=>actions.current?.stop()}
      fireProps={{type:'button',
        onPointerDown:e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);chargePointer.current={element:e.currentTarget,id:e.pointerId};actions.current?.begin();},
        onPointerUp:()=>{chargePointer.current=null;actions.current?.release();},onPointerCancel:()=>actions.current?.cancel(),onLostPointerCapture:()=>actions.current?.cancel(),onBlur:()=>actions.current?.cancel(),
        onKeyDown:e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();actions.current?.begin();}},
        onKeyUp:e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();e.stopPropagation();actions.current?.release();}},
      }}
      result={phase==='result'&&<section className={yard.result} aria-label="Line result"><p role="status">{config.flightPresentation?.terminalLabel(last)??receipt.terminal}</p><button disabled={keptLast||kept.length>=shelfLimit||last?.reason==='interrupted'} onClick={()=>actions.current?.keep()}>{keptLast?'Kept':'Keep this line'}</button>{kept.length>=shelfLimit&&!keptLast&&<p>The shelf is full. Remove a kept line below to make room.</p>}{receipt.events.length>0&&<details><summary>Rebounds · {receipt.events.length}</summary><ol aria-label="Qualified line events">{receipt.events.map((event,index)=><li key={index}>{event.label}</li>)}</ol></details>}</section>}
    >
      <details><summary>Kept lines · {kept.length}/{shelfLimit}</summary><p>Restore returns the recorded station, setup and starting world. Fire remains your choice.</p>{shelfWarning&&<p role="status">{shelfWarning}</p>}{kept.map((entry,index)=><div key={entry.id} className={yard.entry}><strong>Line {index+1} · {entry.record.station.label}</strong><p>{entry.record.elapsed.toFixed(2)} s · {entry.record.reason.replaceAll('-',' ')}</p><div className={yard.actions}><button disabled={!['ready','result'].includes(phase)} onClick={()=>actions.current?.restoreKept(entry.id)}>Restore line {index+1}</button><button onClick={()=>actions.current?.downloadKept(entry.id)}>Download</button><button onClick={()=>actions.current?.removeKept(entry.id)}>Remove line {index+1}</button></div></div>)}</details>
      <details><summary>About the yard &amp; controls</summary><p>{config.brief}</p><p>Glowing rings mark qualified physical redirects. They are feedback, with no scoring or collection requirement.</p><p>Arrows or WASD aim · Q/E move along the launch rail · Space fires · R retries · L recalls · V changes view. Timed hold reaches 80% in two seconds and full power in three.</p><p>Drag the scene to aim. The short muzzle line shows direction; it does not predict the landing.</p>{yardVersion}</details>
      <details><summary>Precision &amp; physical evidence</summary><label>Exact yaw <input className={yard.numberInput} aria-label="Exact yaw" type="number" min={RAIL_RULES.minYaw} max={RAIL_RULES.maxYaw} step={.5} disabled={!canAim} value={Number(setup.yaw.toFixed(1))} onChange={e=>update({yaw:Number(e.target.value)})}/></label><label>Exact elevation <input className={yard.numberInput} aria-label="Exact elevation" type="number" min={RAIL_RULES.minElevation} max={RAIL_RULES.maxElevation} step={.5} disabled={!canAim} value={Number(setup.elevation.toFixed(1))} onChange={e=>update({elevation:Number(e.target.value)})}/></label><div className={yard.actions}><button disabled={!['ready','result'].includes(phase)||!last} onClick={()=>actions.current?.recall()}>Recall last line</button><button disabled={!available} onClick={()=>actions.current?.reset()}>Reset yard</button></div><label>Projectile <select aria-label="Projectile visual" value={visualMode} onChange={e=>{const mode=e.target.value as 'round'|'ball';visualModeRef.current=mode;setVisualMode(mode);}}><option value="round">Rail round</option><option value="ball">Ball</option></select></label>{last&&<details><summary>Physical record</summary><pre>{JSON.stringify({setup:last.setup,station:last.station,environment:last.environment,qualified:last.evidence.filter(e=>e.kind==='redirect'),diagnostics:last.evidence.filter(e=>e.kind!=='redirect'),rawContacts:last.contacts},null,2)}</pre></details>}</details>
      <footer><button aria-pressed={soundEnabled} onClick={()=>{const enabled=!soundEnabledRef.current;soundEnabledRef.current=enabled;setSoundEnabled(enabled);soundControl.current?.(enabled);}}>{soundEnabled?'Sound on':'Sound off'}</button><a href="/lab/refinement">Other experiments</a><a href="https://a44866f1-rail-golf.charlesmish.workers.dev/lab/places-architecture">Original preview</a><span>Build {BUILD_ID}</span></footer>
    </YardControls>
  </main>;
  return <main className={`${styles.shell} ${config.flightPresentation?refinement.inhabited:''}`} data-camera-mode={viewMode} data-phase={phase}>
    <canvas ref={canvas} className={styles.canvas} aria-label={`${config.title}. Drag to aim; survey to inspect the space.`} />
    <header className={styles.header}><div><span>RAIL GOLF / SPATIAL LAB</span><h1>{config.title}</h1><p>{config.subtitle??config.station(setup).label}</p></div><div className={styles.identity}>SPATIAL STUDY<br/>BUILD {BUILD_ID}</div></header>
    <aside className={`${styles.brief} ${config.flightPresentation&&live?refinement.quietBrief:''}`}><p>{config.brief}</p><div className={styles.actions}><button disabled={!['ready','result'].includes(phase)} onClick={toggleSurvey} aria-pressed={viewMode==='survey'}>{rangeViewLabel(viewMode)}</button>{config.playground&&<button type="button" aria-pressed={soundEnabled} onClick={()=>{const enabled=!soundEnabledRef.current;soundEnabledRef.current=enabled;setSoundEnabled(enabled);soundControl.current?.(enabled);}}>{soundEnabled?'Sound on':'Sound off'}</button>}{config.flightPresentation?<a href={config.flightPresentation.indexHref??"/lab/playgrounds"}>Playability studies</a>:config.playground?<a href="/lab/playgrounds">Next Playgrounds</a>:config.shelf ? <a href="/lab/horizons">Horizons experiments</a> : <a href="/lab/lines">Timber Courtyard ↗</a>}</div></aside>
    {feedback&&<div className={styles.machine} data-state={floor} role="status">{feedback}</div>}
    {caption&&<div className={styles.caption} role="status">{caption}</div>}
    {phase==='result'&&<section className={`${styles.caption} ${styles.receipt}`} aria-label="Line result" role="status">
      <div className={styles.resultActions} aria-label="Continue playing">
        <button type="button" onClick={e=>{e.stopPropagation();actions.current?.retry();}}>Retry Shot <kbd>R</kbd></button>
        <button type="button" onClick={e=>{e.stopPropagation();actions.current?.reset();}}>Reset Card</button>
        {hasShelf&&<button type="button" disabled={keptLast||kept.length>=shelfLimit||last?.reason==='interrupted'} onClick={e=>{e.stopPropagation();actions.current?.keep();}}>{keptLast?'Kept':'Keep this line'}</button>}
      </div>
      {receipt.events.length>0&&<ol aria-label="Qualified line events">{receipt.events.map((event,index)=><li key={index}>{event.label}</li>)}</ol>}
      <p>{config.flightPresentation?config.flightPresentation.terminalLabel(last):receipt.terminal}</p>
    </section>}
    {phase==='loading'&&<div className={styles.message}>Opening the spatial lab…</div>}
    {phase==='error'&&<div className={styles.message} role="alert">{error}</div>}
    <section className={`${styles.console} ${refinement.console} ${config.flightPresentation&&live?refinement.inFlight:''}`} aria-label="Rail shot controls">
      {config.flightPresentation&&live&&<div className={refinement.watchBar} aria-label="Watch this shot"><span>{viewMode==='survey'?'Overview':'Following the ball'}</span><button type="button" onClick={toggleFlightView}>{viewMode==='survey'?'Follow ball':'Overview'} <kbd>V</kbd></button><button type="button" onClick={()=>actions.current?.stop()}>Stop shot</button></div>}
      <div className={refinement.scroll}>
      {config.stationChoices&&<div className={styles.options} style={{flexWrap:'wrap',marginBottom:8}} aria-label="Launch stations"><label>Launch station <select aria-label="Launch station" value={setup.carriageMode} disabled={!['ready','result'].includes(phase)} onChange={e=>actions.current?.selectStation(e.target.value)}>{config.stationChoices.map(choice=><option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label><span>Freely selectable · same physical yard</span></div>}
      {recoveryNotice&&ready&&<p className={styles.recoveryNotice} role="status">{recoveryNotice}</p>}
      {config.controls?.some(c=>c.placement==='primary')&&<><div className={refinement.primary} aria-label="Mechanism controls">{config.controls.filter(c=>c.placement==='primary').map(control=><fieldset key={control.id}><legend>{control.label}</legend>{control.options.map(option=><button type="button" key={option} disabled={!ready} aria-pressed={environment[control.id]===option} onClick={()=>environmentAction.current?.(control.id,option)}>{option}</button>)}<strong className={refinement.state}>{control.label.toUpperCase()} {environment[control.id]??'…'}</strong></fieldset>)}</div>{config.controlHint&&<p className={refinement.hint}>{config.controlHint}</p>}{Boolean(diagnostics.recallHeld)&&<p className={refinement.state}>{config.shelf?'PHASE HELD':'RECALLED PHASE HELD'} · choose LIVE to resume motion</p>}</>}
      {hasShelf&&<details className={styles.tools}><summary>Kept lines · {kept.length}/{shelfLimit}</summary><p>{config.playground?'Restore places the launcher and restores the recorded starting environment.':'Restore places the launcher and holds the recorded release phase.'} Fire manually to run Havok again. Download includes sampled actual history; it is not a predicted trajectory.</p>{shelfWarning&&<p role="status">{shelfWarning}</p>}{kept.map((entry,index)=><div key={entry.id} className={styles.options} style={{flexWrap:'wrap'}}><span>Line {index+1} · {entry.record.elapsed.toFixed(2)} s · {entry.record.reason.replaceAll('-',' ')}</span><button disabled={!['ready','result'].includes(phase)} onClick={()=>actions.current?.restoreKept(entry.id)}>Restore</button><button onClick={()=>actions.current?.downloadKept(entry.id)}>Download</button><button onClick={()=>actions.current?.removeKept(entry.id)}>Remove</button></div>)}</details>}
      {config.originControl&&<div className={styles.options} style={{flexWrap:'wrap',marginBottom:8}} aria-label="Launch origin">
        <label>Origin <select aria-label="Origin mode" disabled={!ready} value={setup.carriageMode} onChange={e=>update({carriageMode:e.target.value})}>{config.originControl.modes.map(mode=><option key={mode.id} value={mode.id}>{mode.label}</option>)}</select></label>
        {config.originControl.stops(setup.carriageMode??'rails')?.map((x,index)=><button key={x} disabled={!ready} aria-pressed={setup.originX===x} onClick={()=>update(setup.carriageMode==='rails'?{railIndex:index}:{originX:x})}>{x>0?'+':''}{x} m</button>)}
        {(setup.carriageMode==='continuous'||setup.carriageMode==='tour')&&<label>Position {setup.originX?.toFixed(1)} m <input aria-label="Carriage position" type="range" min={config.originControl.min} max={config.originControl.max} step={config.originControl.step} disabled={!ready} value={setup.originX} onChange={e=>update({originX:Number(e.target.value)})}/></label>}
      </div>}
      {config.originControl&&<div className={refinement.origin}><span className={refinement.originText}>{setup.originX!>=0?'+':''}{setup.originX?.toFixed(2)} m{setup.carriageMode==='tour'&&` · TOUR ${viewMode==='survey'?'SURVEY HOLD':!canAim?'SHOT HOLD':setup.tourRunning?(setup.tourDirection===-1?'←':'→'):'PAUSED'}`}</span><div className={styles.options}>{setup.carriageMode==='tour'&&<button disabled={!ready} onClick={()=>update({tourRunning:!setupRef.current.tourRunning})}>{setup.tourRunning?'Pause TOUR':'Resume TOUR'}</button>}<button disabled={!ready||!last} onClick={returnOrigin}>Last origin</button></div><div className={refinement.meter} aria-label="Track position">{last?.setup.originX!==undefined&&<i className={refinement.previous} style={{left:`${(last.setup.originX-config.originControl.min)/(config.originControl.max-config.originControl.min)*100}%`}} title="Last launch origin"/>}<i className={refinement.needle} style={{left:`${(setup.originX!-config.originControl.min)/(config.originControl.max-config.originControl.min)*100}%`}}/><span className={refinement.end}>−20 m</span><span className={refinement.end}>+20 m</span></div></div>}
      <details className={styles.tools}><summary>Shot tools & saved line · {powerMode==='hold'?'timed charge':`set power ${Math.round(setup.charge*1000)/10}%`}</summary>
        <div className={styles.exact}>
          <label>Power control <select aria-label="Power control" disabled={!ready} value={powerMode} onChange={e=>{const mode=e.target.value as 'hold'|'set';powerModeRef.current=mode;setPowerMode(mode);maxRef.current=maxLatchAfter(maxRef.current,'set');setMax(maxRef.current);}}><option value="hold">Timed hold</option><option value="set">Set power</option></select></label>
          {powerMode==='set'&&<label>Power {Math.round(setup.charge*1000)/10}% <input aria-label="Set launch power" type="range" min="0" max="100" step={config.playground?1:0.5} disabled={!ready} value={setup.charge*100} onChange={e=>{maxRef.current=maxLatchAfter(maxRef.current,'set');setMax(maxRef.current);update({charge:Number(e.target.value)/100});}}/></label>}
          <label>Yaw <input aria-label="Exact yaw" type="number" step={config.playground?0.5:0.1} min={RAIL_RULES.minYaw} max={RAIL_RULES.maxYaw} disabled={!canAim} value={Number(setup.yaw.toFixed(1))} onChange={e=>update({yaw:Number(e.target.value)})}/></label>
          <label>Elevation <input aria-label="Exact elevation" type="number" step={config.playground?0.5:0.1} min={RAIL_RULES.minElevation} max={RAIL_RULES.maxElevation} disabled={!canAim} value={Number(setup.elevation.toFixed(1))} onChange={e=>update({elevation:Number(e.target.value)})}/></label>
          <button disabled={!['ready','result'].includes(phase)||!last} onClick={()=>actions.current?.recall()}>Recall last line</button>
          <span>FAMILIAR framing</span>
          {config.controls?.filter(c=>c.placement!=='primary').map(control=><label key={control.id}>{control.label} <select aria-label={control.label} disabled={!ready} value={environment[control.id]??control.options[0]} onChange={e=>environmentAction.current?.(control.id,e.target.value)}>{control.options.map(option=><option key={option}>{option}</option>)}</select></label>)}
          <label>Projectile visual <select aria-label="Projectile visual" value={visualMode} onChange={e=>{const mode=e.target.value as 'round'|'ball';visualModeRef.current=mode;setVisualMode(mode);}}><option value="round">RAIL ROUND</option><option value="ball">BALL</option></select></label>
        </div>
        <p>Gentle start · 80% in 2 seconds · full power in 3. Aim ±70°; loft 5–85°. Q/E {config.originControl?'origins':'rails'} · arrows/WASD aim · Space fire · X MAX · R Retry · L Recall · V Survey.</p>
        <p>Recall selects the last exact power for the orange fire control. {hasShelf?'Keep saves up to four chosen lines on this device.':'This sketch keeps only the last attempt in memory.'} Origin and environment are saved with it.</p>
        {discovered&&<p>Retry keeps the transfer state. Reset restores the authored default. Recall restores the recorded starting state.</p>}
        {config.controls&&<p>Current environment: {JSON.stringify(environment)} · {JSON.stringify(diagnostics)}</p>}
        {config.originControl&&<p>TOUR moves at 2 m/s before release, pauses during flight, and transfers no velocity. Retry/Recall hold the exact origin; Resume TOUR starts moving again. Survey and window blur pause travel.</p>}
        {last&&<><p>{last.reason} · {last.elapsed.toFixed(2)} s · {JSON.stringify(last.environment)}</p><details><summary>Physical evidence</summary><pre>{JSON.stringify({setup:last.setup,station:last.station,environment:last.environment,qualified:last.evidence.filter(e=>e.kind==='redirect'),diagnostics:last.evidence.filter(e=>e.kind!=='redirect'),rawContacts:last.contacts},null,2)}</pre></details></>}
      </details>
      </div>
      <div className={refinement.core}>
      <div className={styles.options}>
        <button disabled={!ready&&phase!=='result'} aria-pressed={max} onClick={toggleMax}>MAX · 100% <kbd>X</kbd></button>
        <button disabled={!available} onClick={()=>actions.current?.retry()}>{live?'Retry Shot':'Retry'} <kbd>R</kbd></button>
        <button disabled={!available} onClick={()=>actions.current?.reset()}>Reset Card</button>
      </div>
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
      </div>
    </section>
  </main>;
}
