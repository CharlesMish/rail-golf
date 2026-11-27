'use client';
import {useEffect,useRef,useState} from 'react';
import {Engine,Scene,FreeCamera,Camera,Vector3,HemisphericLight,DirectionalLight,ShadowGenerator,TransformNode,HavokPlugin,Color3,Color4,Mesh} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import {buildExchangeYard,EXCHANGE_SOLIDS} from '@/lib/places-architecture';
import {applyRoofDiagnostic,EXCHANGE_ROOF_VARIANTS,EXCHANGE_ROOF_VIEWS,usesCorrectedRoofDraw} from '@/lib/exchange-roof-presentation';
import styles from './roof.module.css';

const views=Object.entries(EXCHANGE_ROOF_VIEWS);
export default function RoofComparison(){
 const canvas=useRef<HTMLCanvasElement>(null),[variant,setVariant]=useState('indexed-faces'),[scope,setScope]=useState('isolated'),[view,setView]=useState('above-slope'),[error,setError]=useState(''),[ready,setReady]=useState(false),[stats,setStats]=useState('Preparing isolated roof…');
 const viewRef=useRef(view);
 const cameraRef=useRef<FreeCamera|null>(null),[orbit,setOrbit]=useState(false),orbitRef=useRef(false);
 useEffect(()=>{orbitRef.current=orbit;},[orbit]);
 useEffect(()=>{viewRef.current=view;const camera=cameraRef.current,frame=EXCHANGE_ROOF_VIEWS[view];if(camera){camera.position=Vector3.FromArray(frame.position);camera.setTarget(Vector3.FromArray(frame.target));}},[view]);
 useEffect(()=>{
  let disposed=false,engine:Engine|null=null,scene:Scene|null=null,cleanup=()=>{};
  const boot=async()=>{try{
   setReady(false);setError('');const havok=await HavokPhysics();if(disposed)return;
   if(!Engine.isSupported())throw Error('WebGL is unavailable here. No roof image has been rendered or verified. The comparison controls describe the intended tests; open this page in a WebGL-enabled browser.');
   const activeEngine=new Engine(canvas.current!,true,{preserveDrawingBuffer:true,stencil:true});engine=activeEngine;engine.setHardwareScalingLevel(Math.max(1,window.devicePixelRatio/1.5));
   const activeScene=new Scene(engine);scene=activeScene;scene.clearColor=new Color4(.055,.09,.105,1);scene.enablePhysics(Vector3.Zero(),new HavokPlugin(true,havok));
   const frame=EXCHANGE_ROOF_VIEWS[viewRef.current],camera=new FreeCamera('roof-camera',Vector3.FromArray(frame.position),scene);camera.inputs.clear();camera.minZ=.1;camera.maxZ=650;camera.fov=.85;camera.setTarget(Vector3.FromArray(frame.target));cameraRef.current=camera;
   const sky=new HemisphericLight('roof-sky',new Vector3(0,1,0),scene);sky.intensity=.95;sky.groundColor=new Color3(.18,.13,.09);
   const sun=new DirectionalLight('roof-sun',new Vector3(-.5,-1,.4),scene);sun.position.set(35,70,-35);sun.intensity=1.5;sun.diffuse=new Color3(1,.85,.66);
   const shadows=new ShadowGenerator(1024,sun);
   const root=new TransformNode('roof-comparison',scene);
   // Reuse exact registered geometry. Only one hall, roof and the shared street;
   // this comparison does not commit a shot or create a kept physical record.
   const builder=buildExchangeYard as unknown as (...args:unknown[])=>{meshes:Mesh[];dispose:()=>void};
   const world=builder(scene,root,{},shadows,{solids:scope==='isolated'?EXCHANGE_SOLIDS.filter(s=>['station-hall','station-roof'].includes(s.id)):EXCHANGE_SOLIDS,details:false,stations:[],roofPresentation:variant,legacyRoofDraw:!usesCorrectedRoofDraw(variant)});
   applyRoofDiagnostic(world,variant);setReady(true);setStats(`${world.meshes.length} static bodies · ${world.meshes.length} meshes · ${world.meshes.length-1} shadow casters · ${world.meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0)} visible triangles · ${usesCorrectedRoofDraw(variant)?'corrected indexed roof draw':'old sequential roof draw'} · ${shadows.usePercentageCloserFiltering?'PCF':shadows.usePoissonSampling?'Poisson fallback':'blurred exponential'} · bias ${shadows.bias} · normal bias ${shadows.normalBias}`);
   let angle=Math.atan2(camera.position.z-64,camera.position.x-25);const resize=new ResizeObserver(()=>{activeEngine.resize();camera.fovMode=activeEngine.getRenderWidth()<activeEngine.getRenderHeight()?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;});resize.observe(canvas.current!);
   activeEngine.runRenderLoop(()=>{if(orbitRef.current){angle+=Math.min(.05,activeEngine.getDeltaTime()/1000)*.25;camera.position.set(25+Math.cos(angle)*56,43,64+Math.sin(angle)*56);camera.setTarget(new Vector3(25,15,64));}activeScene.render();});
   cleanup=()=>{resize.disconnect();activeEngine.stopRenderLoop();world.dispose();root.dispose();shadows.dispose();};
  }catch(e){cleanup();scene?.dispose();scene=null;engine?.dispose();engine=null;cameraRef.current=null;if(!disposed){setReady(false);setError(String(e));setStats('Rendering unavailable. No visual claim.');}}};void boot();
  return()=>{disposed=true;cameraRef.current=null;cleanup();scene?.dispose();engine?.dispose();};
 // Changing a view repositions the current camera; only recipe changes rebuild.
 },[variant,scope]);
 const selected=EXCHANGE_ROOF_VARIANTS.find(v=>v.id===variant)!;
 return <main className={styles.main}><header><p>EXCHANGE YARD · RENDER DIAGNOSTIC</p><h1>Roof comparison</h1><p>Unchanged registered roof geometry. Compare from the same viewpoint. These are rendering alternatives, not new playable layouts.</p></header><section className={styles.controls}><label>Rendering recipe<select value={variant} onChange={e=>{setOrbit(false);setVariant(e.target.value);}}>{EXCHANGE_ROOF_VARIANTS.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}</select></label><label>Scene context<select value={scope} onChange={e=>{setOrbit(false);setScope(e.target.value);}}><option value="isolated">Isolated hall and roof</option><option value="yard">Full PR86 architectural solids</option></select></label><label>Camera view<select value={view} onChange={e=>{setOrbit(false);setView(e.target.value);}}>{views.map(([id,v])=><option key={id} value={id}>{v.label}</option>)}</select></label><button disabled={!ready} aria-pressed={orbit} onClick={()=>setOrbit(v=>!v)}>{orbit?'Stop orbit':'Slow orbit'}</button></section><p>{selected.description}</p><div className={styles.scene}><canvas ref={canvas} aria-label="Isolated Exchange Yard roof rendering comparison"/>{error&&<p role="status" className={styles.error}>{error}</p>}</div><p className={styles.stats}>{stats}</p><details><summary>What this comparison can establish</summary><p>The earlier face correction reversed the index buffer, but flat shading left these roofs on a sequential triangle draw path that ignored those indices. Their submitted triangles still faced inward. The corrected draw uses the existing outward indices in both the main view and the shadow pass. Positions, normals, culling, colliders and the physical layout stay unchanged.</p><p>Compare Corrected triangle draw · current shadows with PR89 · PCF and bias at the same view. The original-shadow pair isolates the same draw correction under the older filter. The other seven recipes preserve their earlier draw behavior as diagnostic controls. Two-sided rendering can reveal the inward faces without correcting their draw order; removing the hidden cap can expose different surfaces through those missing faces.</p><p>The canopy already constructs outward triangles before flat shading and does not need this correction. Compare broad slopes, both gables and the overhang; watch whether artifacts track the camera. The draw-path defect is verified in code and engine dispatch, but complete visible repair still requires this comparison in a WebGL-enabled browser. Isolated lighting may not reproduce a full-world shadow problem; the scene-context selector restores all original architectural solids.</p></details><footer><a href="/lab/places-architecture">Return to Exchange Yard</a> · <a href="https://077e2174-rail-golf.charlesmish.workers.dev/lab/places-architecture">Original PR86 control</a></footer></main>;
}
