'use client';
import {useEffect,useRef,useState} from 'react';
import {Engine,Scene,Vector3,Color3,Color4,Camera,FreeCamera,HemisphericLight,DirectionalLight,ShadowGenerator,StandardMaterial,TransformNode,MeshBuilder,HavokPlugin,LinesMesh} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {BUILD_ID} from '@/lib/build-identity';
import {RAIL_RULES,chargeFromHold} from '@/lib/rail-golf-v02';
import {stationAim,stationMuzzle,stationRailPosition} from '@/lib/stations';
import {RANGE_DEFAULT,RANGE_CAMERA,RANGE_STATION} from '@/lib/mechanism-range';
import {buildMechanismRange} from '@/lib/mechanism-range-scene';
import {createMechanismSession,type RangeRecord,type RangeSetup} from '@/lib/mechanism-range-session';
import {advanceFlightCamera,followOffsets,followHeading} from '@/lib/flight-framing';
import styles from './range.module.css';

type Phase='loading'|'ready'|'charging'|'flight'|'result'|'error';
type Actions={begin():void;release():void;cancel():void;setPowerFire():void;retry():void;reset():void;recall():void};
export default function MechanismRange(){
  const canvas=useRef<HTMLCanvasElement>(null),actions=useRef<Actions|null>(null);
  const [phase,setPhase]=useState<Phase>('loading'),phaseRef=useRef<Phase>('loading');
  const [setup,setSetup]=useState<RangeSetup>({...RANGE_DEFAULT}),setupRef=useRef<RangeSetup>({...RANGE_DEFAULT});
  const [max,setMax]=useState(false),maxRef=useRef(false);
  const [survey,setSurvey]=useState(false),surveyRef=useRef(false);
  const [floor,setFloor]=useState('A'),[power,setPower]=useState(0),[caption,setCaption]=useState(''),[error,setError]=useState('');
  const [last,setLast]=useState<RangeRecord|null>(null);
  const update=(patch:Partial<RangeSetup>)=>{const next={...setupRef.current,...patch};setupRef.current=next;setSetup(next);};
  const toggleMax=()=>{maxRef.current=!maxRef.current;setMax(maxRef.current);};
  const toggleSurvey=()=>{surveyRef.current=!surveyRef.current;setSurvey(surveyRef.current);};
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
        const camera=new FreeCamera('mr-camera',Vector3.FromArray(RANGE_CAMERA.address),scene);
        camera.inputs.clear();camera.minZ=.1;camera.maxZ=450;camera.fov=RANGE_CAMERA.fov;
        let target=Vector3.FromArray(RANGE_CAMERA.look),previous:Vector3|null=null,heading={x:0,y:0,z:1};camera.setTarget(target);
        const sky=new HemisphericLight('mr-sky',new Vector3(0,1,0),scene);sky.intensity=.95;sky.groundColor=new Color3(.18,.13,.09);
        const sun=new DirectionalLight('mr-sun',new Vector3(-.5,-1,.4),scene);sun.position.set(35,70,-35);sun.intensity=1.5;sun.diffuse=new Color3(1,.85,.66);
        const shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=12;
        const palette:Record<string,number[]>={sand:[.32,.29,.22],timber:[.63,.40,.23],bark:[.25,.13,.07],machine:[.10,.16,.17],steel:[.35,.43,.43],cyan:[.06,.8,.86],amber:[1,.42,.08],violet:[.67,.25,.94]};
        const materials:Record<string,StandardMaterial>={};
        for(const [name,rgb] of Object.entries(palette)){
          const m=new StandardMaterial('mr-'+name,scene);m.diffuseColor=Color3.FromArray(rgb);m.specularColor=new Color3(.08,.08,.08);
          if(['cyan','amber','violet'].includes(name))m.emissiveColor=m.diffuseColor.scale(.32);materials[name]=m;
        }
        const root=new TransformNode('mr-world',scene),world=buildMechanismRange(scene,root,materials,shadows);
        let captionUntil=0,chargeStart=0,lastCharge=-1;
        const session=createMechanismSession(scene,world,event=>{
          if(disposed)return;
          if(event.kind==='state')setFloor(event.state!);
          if(event.kind==='redirect'||event.kind==='switch'){
            setCaption(event.kind==='switch'?'TRANSFER · '+event.state:event.label??'REBOUND');captionUntil=performance.now()+2200;
          }
          if(event.kind==='end'){setLast(event.last!);phaseTo('result');setCaption((event.reason??'line ended').replaceAll('-',' ').toUpperCase());captionUntil=0;}
        });
        scene.onBeforePhysicsObservable.add(()=>session.beforeStep());scene.onAfterPhysicsObservable.add(()=>session.afterStep());
        const launcher=new TransformNode('mr-launcher',scene),yaw=new TransformNode('mr-yaw',scene),loft=new TransformNode('mr-loft',scene);
        yaw.parent=launcher;yaw.position.y=1.55;loft.parent=yaw;
        const base=MeshBuilder.CreateBox('mr-launcher-base',{width:2.7,height:1,depth:2.5},scene);base.parent=launcher;base.position.y=1;base.material=materials.machine;
        const barrel=MeshBuilder.CreateBox('mr-barrel',{width:.7,height:.6,depth:5.7},scene);barrel.parent=loft;barrel.position.z=2.45;barrel.material=materials.steel;
        const ring=MeshBuilder.CreateTorus('mr-muzzle',{diameter:1.08,thickness:.12,tessellation:24},scene);ring.parent=loft;ring.position.z=RAIL_RULES.muzzleLength;ring.rotation.x=Math.PI/2;ring.material=materials.cyan;
        let trail:LinesMesh|null=null,spine:LinesMesh|null=null,points:Vector3[]=[],trailFrame=0;
        const shoot=(charge:number)=>{
          if(!['ready','charging'].includes(phaseRef.current))return;
          if(session.fire({...setupRef.current,charge})){
            phaseTo('flight');setPower(charge);setCaption('');surveyRef.current=false;setSurvey(false);
            const direction=stationAim(setupRef.current,RANGE_STATION);heading={x:direction.x,y:0,z:direction.z};previous=null;
            session.flight!.mesh.material=materials.cyan;trail?.dispose();trail=null;points=[];
          }
        };
        const cancel=()=>{if(phaseRef.current==='charging'){phaseTo('ready');setPower(0);}};
        const restore=(action:'retry'|'reset'|'recall')=>{
          if(phaseRef.current==='loading'||phaseRef.current==='error')return;
          const restored=session.action(action);phaseTo('ready');setPower(0);setCaption('');previous=null;
          surveyRef.current=false;setSurvey(false);
          if(action==='recall'&&restored){setupRef.current=restored;setSetup(restored);maxRef.current=false;setMax(false);}
          // Retry preserves both aim and MAX. Reset only restores the machine; no aim surprise.
        };
        actions.current={
          begin(){if(phaseRef.current!=='ready')return;if(maxRef.current){shoot(1);return;}chargeStart=performance.now();phaseTo('charging');},
          release(){if(phaseRef.current==='charging')shoot(chargeFromHold(performance.now()-chargeStart));},cancel,
          setPowerFire(){shoot(setupRef.current.charge);},retry(){restore('retry');},reset(){restore('reset');},recall(){restore('recall');},
        };
        let drag:{id:number;x:number;y:number}|null=null;
        const down=(e:PointerEvent)=>{if(phaseRef.current!=='ready'||surveyRef.current)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};surface.setPointerCapture(e.pointerId);};
        const move=(e:PointerEvent)=>{if(!drag||drag.id!==e.pointerId||phaseRef.current!=='ready')return;const s=setupRef.current;
          const next={...s,yaw:Math.max(-70,Math.min(70,s.yaw+(e.clientX-drag.x)*.12)),elevation:Math.max(5,Math.min(85,s.elevation-(e.clientY-drag.y)*.12))};
          setupRef.current=next;setSetup(next);drag={...drag,x:e.clientX,y:e.clientY};};
        const up=()=>{drag=null;};
        const keydown=(e:KeyboardEvent)=>{
          if(e.target instanceof Element&&e.target.closest('button,input,select,summary,a'))return;
          if(e.repeat)return;
          if(e.code==='Space'){e.preventDefault();actions.current?.begin();}
          if(e.code==='KeyR')actions.current?.retry();
          if(e.code==='KeyX'&&phaseRef.current==='ready'){maxRef.current=!maxRef.current;setMax(maxRef.current);}
        };
        const keyup=(e:KeyboardEvent)=>{if(e.code==='Space'){e.preventDefault();actions.current?.release();}};
        const blur=()=>{up();cancel();};
        surface.addEventListener('pointerdown',down);surface.addEventListener('pointermove',move);surface.addEventListener('pointerup',up);surface.addEventListener('pointercancel',up);
        window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
        const resize=()=>{activeEngine.resize();camera.fovMode=activeEngine.getAspectRatio(camera)<1.3?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.fov=camera.fovMode===Camera.FOVMODE_HORIZONTAL_FIXED?1.25:RANGE_CAMERA.fov;};resize();window.addEventListener('resize',resize);
        cleanup=()=>{actions.current=null;window.removeEventListener('resize',resize);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);surface.removeEventListener('pointerdown',down);surface.removeEventListener('pointermove',move);surface.removeEventListener('pointerup',up);surface.removeEventListener('pointercancel',up);session.dispose();world.dispose();};
        phaseTo('ready');
        activeEngine.runRenderLoop(()=>{
          if(disposed)return;
          const dt=Math.min(.05,activeEngine.getDeltaTime()/1000),s=setupRef.current,rail=stationRailPosition(s.railIndex,RANGE_STATION);
          launcher.position.set(rail.x,0,rail.z);yaw.rotation.y=s.yaw*Math.PI/180;loft.rotation.x=-s.elevation*Math.PI/180;
          const muzzle=stationMuzzle(s,RANGE_STATION),aim=stationAim(s,RANGE_STATION);
          const a=new Vector3(muzzle.x,muzzle.y,muzzle.z),b=a.add(new Vector3(aim.x,aim.y,aim.z).scale(5));
          spine=MeshBuilder.CreateLines('mr-aim',{points:[a,b],instance:spine??undefined,updatable:true},activeScene);spine.color=new Color3(.1,.85,.9);spine.setEnabled(phaseRef.current==='ready'&&!surveyRef.current);
          if(phaseRef.current==='charging'){const c=chargeFromHold(performance.now()-chargeStart);if(Math.abs(c-lastCharge)>.005){lastCharge=c;setPower(c);}}
          if(captionUntil&&performance.now()>captionUntil){setCaption('');captionUntil=0;}
          const f=session.flight;
          if(f&&phaseRef.current==='flight'){
            const p=f.mesh.position,v=f.aggregate.body.getLinearVelocity();heading=followHeading(heading,v,dt);
            const horizontal=camera.fovMode===Camera.FOVMODE_HORIZONTAL_FIXED;
            const desired=followOffsets(p,v,heading),frame=advanceFlightCamera({position:camera.position,target,fov:camera.fov},p,previous,desired,dt,activeEngine.getAspectRatio(camera),horizontal,horizontal?1.25:.80);
            camera.position.copyFromFloats(frame.position.x,frame.position.y,frame.position.z);target.copyFromFloats(frame.target.x,frame.target.y,frame.target.z);camera.fov=frame.fov;previous=p.clone();
            if(++trailFrame%3===0){points.push(p.clone());if(points.length>900)points.shift();if(points.length>1){trail?.dispose();trail=MeshBuilder.CreateLines('mr-trail',{points},activeScene);trail.color=new Color3(.1,.8,.85);}}
          }else if(phaseRef.current!=='result'||surveyRef.current){
            const to=Vector3.FromArray(surveyRef.current?RANGE_CAMERA.survey:RANGE_CAMERA.address);if(!surveyRef.current)to.x+=rail.x*.4;
            const look=Vector3.FromArray(surveyRef.current?RANGE_CAMERA.surveyLook:RANGE_CAMERA.look);
            camera.position=Vector3.Lerp(camera.position,to,1-Math.exp(-dt*4));target=Vector3.Lerp(target,look,1-Math.exp(-dt*4));camera.fov+=((camera.fovMode===Camera.FOVMODE_HORIZONTAL_FIXED?1.25:RANGE_CAMERA.fov)-camera.fov)*(1-Math.exp(-dt*3));
          }
          camera.setTarget(target);activeScene.render();
        });
      }catch(e){if(disposed)return;setError(e instanceof Error?e.message:String(e));phaseTo('error');}
    };
    void boot();return()=>{disposed=true;cleanup();scene?.dispose();engine?.dispose();};
  },[]);
  const ready=phase==='ready',live=phase==='flight',available=!['loading','error'].includes(phase);
  return <main className={styles.shell}>
    <canvas ref={canvas} className={styles.canvas} aria-label="Mechanism Range. Drag to aim; survey to inspect the transfer yard." />
    <header className={styles.header}><div><span>RAIL GOLF / SPATIAL LAB</span><h1>Mechanism Range</h1><p>Transfer Apron · three rails · one shared machine</p></div><div className={styles.identity}>BLOCKOUT V0<br/>BUILD {BUILD_ID}</div></header>
    <aside className={styles.brief}><p>Explore the benches, transfer table and high rack. Shoot the control to change the table.</p><p className={styles.quiet}>No target or score. First ground contact ends the line.</p><div className={styles.actions}><button disabled={!available||phase==='charging'} onClick={toggleSurvey}>{survey?'Return to launch view':'Survey the space'}</button><a href="/lab/lines">Timber Courtyard ↗</a></div></aside>
    <div className={styles.machine} data-state={floor} role="status">TRANSFER {floor} <span>{floor==='A'?'LEVEL':'RAISED'}</span></div>
    {caption&&<div className={styles.caption} role="status">{caption}</div>}
    {phase==='loading'&&<div className={styles.message}>Opening the transfer yard…</div>}
    {phase==='error'&&<div className={styles.message} role="alert">{error}</div>}
    <section className={styles.console} aria-label="Mechanism Range controls">
      <div className={styles.setup}>
        <label>RAIL<select aria-label="Launcher rail" disabled={!ready} value={setup.railIndex} onChange={e=>update({railIndex:Number(e.target.value)})}><option value={0}>1 / 3</option><option value={1}>2 / 3</option><option value={2}>3 / 3</option></select></label>
        <label>YAW<input aria-label="Yaw" type="number" step="0.1" min="-70" max="70" disabled={!ready} value={Number(setup.yaw.toFixed(1))} onChange={e=>update({yaw:Math.max(-70,Math.min(70,Number(e.target.value)))})}/></label>
        <label>ELEVATION<input aria-label="Elevation" type="number" step="0.1" min="5" max="85" disabled={!ready} value={Number(setup.elevation.toFixed(1))} onChange={e=>update({elevation:Math.max(5,Math.min(85,Number(e.target.value)))})}/></label>
        <button disabled={!ready} aria-pressed={max} onClick={toggleMax}>MAX · 100% <kbd>X</kbd></button>
      </div>
      <progress max={1} value={power} aria-label="Launch power" />
      <div className={styles.fireRow}>
        <button className={styles.fire} disabled={!ready&&phase!=='charging'}
          onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);actions.current?.begin();}}
          onPointerUp={()=>actions.current?.release()} onPointerCancel={()=>actions.current?.cancel()}
          onKeyDown={e=>{if((e.code==='Space'||e.code==='Enter')&&!e.repeat){e.preventDefault();actions.current?.begin();}}}
          onKeyUp={e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();actions.current?.release();}}}>
          {phase==='charging'?`RELEASE · ${Math.round(power*100)}%`:max?'FIRE · MAX 100%':'HOLD TO CHARGE'}
        </button>
        <button disabled={!available} onClick={()=>actions.current?.retry()}>{live?'Interrupt / Retry':'Retry'} <kbd>R</kbd></button>
        <button disabled={!available} onClick={()=>actions.current?.reset()}>Reset · A</button>
      </div>
      <details className={styles.tools}><summary>Shot tools & physical evidence</summary>
        <div className={styles.exact}><label>Set power % <input aria-label="Exact power percent" type="number" min="0" max="100" step="0.1" disabled={!ready} value={Math.round(setup.charge*1000)/10} onChange={e=>update({charge:Math.max(0,Math.min(1,Number(e.target.value)/100))})}/></label><button disabled={!ready} onClick={()=>actions.current?.setPowerFire()}>Fire set power</button><button disabled={!available||!last} onClick={()=>actions.current?.recall()}>Recall last setup + state</button></div>
        <p>Retry keeps the machine state. Reset restores A. Recall restores the previous launch state and clears MAX; use Fire set power to repeat it exactly. This sketch keeps only the last attempt in memory.</p>
        {last&&<><p>{last.reason} · {last.elapsed.toFixed(2)} s · TRANSFER {last.environment.floor} → {last.endEnvironment.floor}</p><pre>{JSON.stringify({qualified:last.evidence.filter(e=>e.kind==='redirect'),diagnostics:last.evidence.filter(e=>e.kind!=='redirect'),rawContacts:last.contacts},null,2)}</pre></>}
      </details>
    </section>
  </main>;
}
