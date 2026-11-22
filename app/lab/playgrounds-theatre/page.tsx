'use client';
import {useEffect,useRef,useState} from 'react';
import HavokPhysics from '@babylonjs/havok';
import {BUILD_ID} from '@/lib/build-identity';
import {RAIL_RULES,chargeFromHold} from '@/lib/rail-golf-v02';
import {createTheatreRuntime,THEATRE_CONFIG,THEATRE_PARTS,theatreCorners,theatreHull,theatreProject,theatreSampleAt,type TheatrePoint,type TheatreRecord} from '@/lib/playgrounds-theatre';
import {createTheatreShelf,THEATRE_KEEP_LIMIT,type TheatreEntry} from '@/lib/playgrounds-theatre-records';
import {createPlaygroundAudio} from '@/lib/playgrounds-audio';
import type {SpatialSetup} from '@/lib/spatial-lab-session';
import styles from './theatre.module.css';

type View='front'|'wing'|'plan';
type Status='loading'|'ready'|'flight'|'error';
const tone=['#b6b0e7','#dfb17e'];
const W=580,H=360;
function Plot({view,path,comparison,time,close=false,setup}:{view:View;path:TheatrePoint[];comparison:TheatrePoint[];time:number;close?:boolean;setup?:SpatialSetup}){
 const plan=view==='plan';const xMin=view==='front'?-58:view==='wing'?-16:-48,xMax=view==='front'?58:view==='wing'?100:48;
 const yMin=plan?-16:0,yMax=plan?100:close?40:90;
 const scale=Math.min((W-44)/(xMax-xMin),(H-30)/(yMax-yMin));
 const xOffset=(W-(xMax-xMin)*scale)/2,yOffset=(H-(yMax-yMin)*scale)/2;
 const map=(p:number[])=>{const [x,y]=theatreProject(p,view);return [xOffset+(x-xMin)*scale,H-yOffset-(y-yMin)*scale];};
 const toPoints=(p:TheatrePoint[])=>p.map(a=>map(a.slice(1)).join(',')).join(' ');
 const point=theatreSampleAt(path,time),comparePoint=theatreSampleAt(comparison,time),before=path.filter(p=>p[0]<=time),ghost=theatreSampleAt(comparison,time);
 const minTime=Math.min(time,path.at(-1)?.[0]??0),outside=point&&!plan&&point[2]>yMax;
 const title=plan?'Stage plan':view==='front'?'Front cloth':'Wing cloth';
 return <figure className={`${styles.plot} ${plan?styles.plan:''}`}>
  <figcaption><strong>{title}</strong><span>{plan?'Across × depth':view==='front'?'Across × height':'Depth × height'}</span></figcaption>
  <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: actual recorded trajectory in a fixed orthographic view`}>
   <defs><clipPath id={`clip-${view}`}><rect x="0" y="0" width={W} height={H}/></clipPath></defs>
   <g clipPath={`url(#clip-${view})`}>
    {[0,20,40,60,80].filter(n=>n<=yMax).map(n=>{const a=map(plan?[xMin,0,n]:view==='front'?[xMin,n,0]:[0,n,xMin]),b=map(plan?[xMax,0,n]:view==='front'?[xMax,n,0]:[0,n,xMax]);return <g key={n}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className={styles.grid}/><text x="8" y={a[1]-4} className={styles.axis}>{n} m</text></g>;})}
    {THEATRE_PARTS.map((part,i)=><polygon key={part.id} points={theatreHull(theatreCorners(part).map(p=>map(p))).map(p=>p.join(',')).join(' ')} fill={tone[i]} fillOpacity={plan?.3:.16} stroke={tone[i]} strokeWidth="1.2"/>)}
    {comparison.length>1&&<polyline points={toPoints(comparison)} fill="none" stroke="#6cc9cf" strokeWidth="2" strokeDasharray="5 4" opacity=".7"/>}
    {before.length>1&&<polyline points={toPoints(before)} fill="none" stroke="#f6b75d" strokeWidth="2.7"/>}
    {point&&<circle cx={map(point.slice(1))[0]} cy={map(point.slice(1))[1]} r="5" fill="#ffe0a2" stroke="#17151f" strokeWidth="1.5"/>}
    {comparePoint&&<circle cx={map(comparePoint.slice(1))[0]} cy={map(comparePoint.slice(1))[1]} r="4.5" fill="#6cc9cf" stroke="#17151f" strokeWidth="1.5"/>}
    {plan&&setup&&(()=>{const x=RAIL_RULES.railPositions[setup.railIndex],r=setup.yaw*Math.PI/180,a=map([x,0,0]),b=map([x+Math.sin(r)*8,0,Math.cos(r)*8]);return <g><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#ffe0a2" strokeWidth="3"/><circle cx={a[0]} cy={a[1]} r="5" fill="#ffe0a2"/><text x={a[0]+10} y={a[1]+5} className={styles.axis}>Launcher</text></g>;})()}
   </g>
  </svg>
  <p className={styles.plotNote}>{outside?'Flight is above this frame; choose Wide.':path.length?`${minTime.toFixed(2)} s${time>(path.at(-1)?.[0]??0)?' · current line ended':''}${ghost&&time>(comparison.at(-1)?.[0]??0)?' · comparison ended':''}`:plan?'The short arrow shows aim, not a predicted flight.':'A shot makes both views at the same time.'}</p>
 </figure>;
}
export default function TheatrePage(){
 const cloths=useRef<HTMLElement|null>(null),controls=useRef<HTMLElement|null>(null);
 const runtime=useRef<ReturnType<typeof createTheatreRuntime>|null>(null),shelf=useRef<ReturnType<typeof createTheatreShelf>|null>(null),audio=useRef<ReturnType<typeof createPlaygroundAudio>|null>(null);
 const [status,setStatus]=useState<Status>('loading'),[setup,setSetup]=useState<SpatialSetup>({...THEATRE_CONFIG.defaultSetup}),[path,setPath]=useState<TheatrePoint[]>([]),[last,setLast]=useState<TheatreRecord|null>(null),[kept,setKept]=useState<TheatreEntry[]>([]),[comparison,setComparison]=useState(''),[time,setTime]=useState(0),[notice,setNotice]=useState(''),[warning,setWarning]=useState(''),[keptLast,setKeptLast]=useState(false),[close,setClose]=useState(false),[sound,setSound]=useState(true),[slow,setSlow]=useState(false),[holdMode,setHoldMode]=useState(false),[charging,setCharging]=useState(false),[charge,setCharge]=useState(0),[error,setError]=useState('');
 const soundRef=useRef(true),slowRef=useRef(false),chargeStarted=useRef<number|null>(null),setupRef=useRef(setup),holdRef=useRef(false),button=useRef<HTMLButtonElement>(null);
 const current=kept.find(entry=>entry.id===comparison),maxTime=Math.max(last?.elapsed??0,current?.record.elapsed??0,path.at(-1)?.[0]??0),busy=status==='flight'||status==='loading'||status==='error';
 const refreshShelf=()=>{if(!shelf.current)return;setKept(shelf.current.entries());setWarning(shelf.current.warning());};
 useEffect(()=>{let closed=false,raf=0,previous=0,accumulator=0,updates=0;const init=async()=>{
  try{let storage:Storage|null=null;try{storage=window.localStorage;}catch{}shelf.current=createTheatreShelf(storage);setKept(shelf.current.entries());setWarning(shelf.current.warning());audio.current=createPlaygroundAudio();const havok=await HavokPhysics();if(closed)return;
   runtime.current=createTheatreRuntime(havok,{onEnd(record){if(closed)return;setLast(record);setPath(record.path);setTime(record.elapsed);setStatus('ready');setNotice(record.reason==='first-ground-contact'?'First ground contact. Both cloths show the same finished flight.':`Flight ended: ${record.reason.replaceAll('-',' ')}.`);if(soundRef.current)audio.current?.terminal(record.reason);},onContact(impact){if(soundRef.current)audio.current?.contact({speed:impact.normal?Math.abs(impact.incoming.reduce((sum,value,index)=>sum+value*impact.normal![index],0)):Math.hypot(...impact.incoming),ground:impact.ground});}});
   setStatus('ready');
   const tick=(now:number)=>{if(closed)return;const dt=previous?Math.min(.05,(now-previous)/1000):0;previous=now;
    if(!document.hidden&&runtime.current?.active){accumulator+=dt*(slowRef.current?.5:1);while(accumulator>=1/120&&runtime.current.active){runtime.current.step();accumulator-=1/120;if(++updates%4===0){const samples=runtime.current.samples;setPath([...samples]);setTime(samples.at(-1)?.[0]??0);}}}else accumulator=0;
    if(chargeStarted.current!==null){const value=chargeFromHold(now-chargeStarted.current);setCharge(value);if(soundRef.current)audio.current?.chargeUpdate(value);}
    raf=requestAnimationFrame(tick);
   };raf=requestAnimationFrame(tick);
  }catch(e){if(!closed){setError(e instanceof Error?e.message:String(e));setStatus('error');}}
 };void init();const cancel=()=>{chargeStarted.current=null;setCharging(false);audio.current?.chargeStop();};window.addEventListener('blur',cancel);const visibility=()=>{if(document.hidden){previous=0;accumulator=0;cancel();}};document.addEventListener('visibilitychange',visibility);
 return()=>{closed=true;cancelAnimationFrame(raf);runtime.current?.dispose();runtime.current=null;audio.current?.dispose();audio.current=null;window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',visibility);};},[]);
 const patch=(key:keyof SpatialSetup,value:number)=>{if(busy||charging)return;const next={...setupRef.current,[key]:value};setupRef.current=next;setSetup(next);};
 const fire=(power=setupRef.current.charge)=>{if(!runtime.current||runtime.current.active)return;const next={...setupRef.current,charge:power};if(soundRef.current)audio.current?.unlock();if(runtime.current.fire(next)){cloths.current?.scrollIntoView({block:'start',behavior:'instant'});setupRef.current=next;setSetup(next);setStatus('flight');setLast(null);setPath([...runtime.current.samples]);setTime(0);setNotice('Live flight · both dots are the same physical ball.');setKeptLast(false);if(soundRef.current)audio.current?.launch(power);}};
 const begin=(now:number)=>{if(busy)return;if(!holdRef.current){fire();return;}chargeStarted.current=now;setCharging(true);setCharge(0);if(soundRef.current){audio.current?.unlock();audio.current?.chargeStart();}};
 const release=(now:number)=>{if(chargeStarted.current===null)return;const power=chargeFromHold(now-chargeStarted.current);chargeStarted.current=null;setCharging(false);audio.current?.chargeStop();fire(power);};
 const cancelCharge=()=>{chargeStarted.current=null;setCharging(false);audio.current?.chargeStop();};
 const keep=()=>{if(!last||keptLast)return;try{const entry=shelf.current?.keep(last,BUILD_ID);if(entry){setKeptLast(true);setNotice('Kept on this device. Choose it below to compare or Restore.');}refreshShelf();}catch(e){setWarning(String(e));}};
 const restore=(entry:TheatreEntry)=>{if(busy)return;runtime.current?.clear();const next={...entry.record.setup};setupRef.current=next;setSetup(next);setLast(entry.record);setPath(entry.record.path);setTime(entry.record.elapsed);setKeptLast(true);setNotice(`Recorded setup restored; Fire runs Havok again. This line was recorded in build ${entry.build}${entry.build!==BUILD_ID?' (different from this build)':''}.`);};
 const download=(entry:TheatreEntry)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(entry,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`two-shadow-${entry.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <main className={styles.page}>
  <header className={styles.header}><div><p className={styles.eyebrow}>Rail Golf · The next playgrounds</p><h1>Two-Shadow Theatre</h1><p>One flight, two views. Make a turn on one cloth, find a shape you like, or compose two lines that resemble each other from only one side.</p></div><a href="/lab/playgrounds">All playgrounds</a></header>
  <div className={styles.toolbar}><button onClick={()=>controls.current?.scrollIntoView({block:'start',behavior:'instant'})}>Launch settings</button><span className={styles.key}>● Current flight</span><span className={styles.compareKey}>┄ Kept comparison</span><label>Frame <select value={close?'close':'wide'} onChange={e=>setClose(e.target.value==='close')}><option value="wide">Wide</option><option value="close">Low flight</option></select></label><button aria-pressed={slow} onClick={()=>{slowRef.current=!slow;setSlow(!slow);}}>{slow?'Half-speed viewing':'Normal viewing speed'}</button><button aria-pressed={sound} onClick={()=>{soundRef.current=!sound;setSound(!sound);audio.current?.setEnabled(!sound);if(!sound)audio.current?.unlock();}}>Sound {sound?'on':'off'}</button></div>
  <section ref={cloths} className={styles.cloths} aria-label="Two projections of one physical flight"><Plot view="front" path={path} comparison={current?.record.path??[]} time={time} close={close}/><Plot view="wing" path={path} comparison={current?.record.path??[]} time={time} close={close}/></section>
  <div className={styles.transport}><label>Recorded time <output>{time.toFixed(2)} s</output><input type="range" aria-label="Scrub both recorded views" min="0" max={Math.max(.01,maxTime)} step={1/60} value={Math.min(time,maxTime)} disabled={status==='flight'||!path.length} onChange={e=>setTime(Number(e.target.value))}/></label><p>{status==='flight'?'Live · fixed physics time':path.length?'Scrub selects recorded positions in both views.':'Fire to make a line.'} Dashed paths are completed, previously Kept flights.</p></div>
  {error?<p role="alert" className={styles.notice}>{error}</p>:<p role="status" className={styles.notice}>{status==='loading'?'Opening the physical theatre…':notice||'The open center, upright flat and sloping rostrum offer three different ways to begin.'}</p>}
  <section className={styles.lower}>
   <div><Plot view="plan" path={path} comparison={current?.record.path??[]} time={time} setup={setup}/><p className={styles.legend}><i style={{background:tone[0]}}/> Upright flat <i style={{background:tone[1]}}/> Sloping rostrum</p><p className={styles.small}>These are schematic views of real 3D Havok motion. The cloths are visual projections, not collision surfaces. The stage floor ends a shot on first contact.</p></div>
   <section ref={controls} className={styles.controls} aria-label="Theatre launch controls"><h2>Choose the next flight</h2><p className={styles.small}>Fire brings both cloths into view before the flight starts moving.</p><fieldset disabled={busy||charging}><legend>Launcher</legend>{RAIL_RULES.railPositions.map((position,index)=><button key={position} aria-pressed={setup.railIndex===index} onClick={()=>patch('railIndex',index)}>{position===0?'Center':position<0?'Left':'Right'}</button>)}</fieldset>
    <label>Aim <output>{setup.yaw.toFixed(1)}°</output><input aria-label="Horizontal aim" type="range" min={RAIL_RULES.minYaw} max={RAIL_RULES.maxYaw} step="0.5" value={setup.yaw} disabled={busy||charging} onChange={e=>patch('yaw',Number(e.target.value))}/></label>
    <label>Elevation <output>{setup.elevation.toFixed(1)}°</output><input aria-label="Elevation" type="range" min={RAIL_RULES.minElevation} max={RAIL_RULES.maxElevation} step="0.5" value={setup.elevation} disabled={busy||charging} onChange={e=>patch('elevation',Number(e.target.value))}/></label>
    <label>Power <output>{Math.round((charging?charge:setup.charge)*100)}%</output><input aria-label="Launch power" type="range" min="0" max="100" step="1" value={setup.charge*100} disabled={busy||charging||holdMode} onChange={e=>patch('charge',Number(e.target.value)/100)}/></label>
    <label className={styles.check}><input type="checkbox" checked={holdMode} disabled={busy||charging} onChange={e=>{holdRef.current=e.target.checked;setHoldMode(e.target.checked);}}/> Hold to charge instead of set power</label>
    <div className={styles.fireRow}><button ref={button} className={styles.fire} disabled={busy} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);begin(e.timeStamp);}} onPointerUp={e=>release(e.timeStamp)} onClick={e=>{if(e.detail===0&&!holdRef.current)fire();}} onPointerCancel={cancelCharge} onLostPointerCapture={cancelCharge} onBlur={cancelCharge} onKeyDown={e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();begin(e.timeStamp);}}} onKeyUp={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();release(e.timeStamp);}}}>{status==='flight'?'In flight':charging?'Release to fire':holdMode?'Hold to charge':'Fire'}</button><button disabled={!last||busy||keptLast||kept.length>=THEATRE_KEEP_LIMIT} onClick={keep}>{keptLast?'Kept':'Keep this line'}</button></div>
    <button className={styles.reset} disabled={busy||charging} onClick={()=>{runtime.current?.clear();const next={...THEATRE_CONFIG.defaultSetup};setupRef.current=next;setSetup(next);setLast(null);setPath([]);setTime(0);setKeptLast(false);setNotice('Opening setup restored. Your Kept lines remain.');}}>Reset launch</button>
   </section>
  </section>
  <section className={styles.shelf} aria-label="Kept theatre lines"><div className={styles.shelfTitle}><h2>Your Kept lines <span>{kept.length}/{THEATRE_KEEP_LIMIT}</span></h2><label>Compare with <select value={comparison} onChange={e=>setComparison(e.target.value)}><option value="">None</option>{kept.map((entry,index)=><option key={entry.id} value={entry.id}>Line {index+1}</option>)}</select></label></div><p>Keep is voluntary. Restore prepares the original launch; you choose when to Fire. Full shelves never replace an older line.</p>{warning&&<p role="status" className={styles.warning}>{warning}</p>}{!kept.length&&<p className={styles.empty}>An empty theatre for now. Keep a flight when it gives you another idea.</p>}{kept.map((entry,index)=><div key={entry.id} className={styles.entry}><strong>Line {index+1}</strong><span>{entry.record.elapsed.toFixed(2)} s · {entry.record.contacts.filter(c=>c.body!=='theatre-ground').length?'with a physical contact':'open flight'}</span><button disabled={busy||charging} onClick={()=>restore(entry)}>Restore</button><button onClick={()=>download(entry)}>Download</button><button disabled={busy||charging} onClick={()=>{shelf.current?.remove(entry.id);if(comparison===entry.id)setComparison('');refreshShelf();}}>Remove</button></div>)}</section>
  <footer className={styles.footer}><p>Try changing one launch control, then compare both cloths. No score and no required picture.</p><span>Experimental build {BUILD_ID}</span></footer>
 </main>;
}
