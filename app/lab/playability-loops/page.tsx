'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BUILD_ID } from '@/lib/build-identity';
import type { WorldcraftLine } from '@/lib/worldcraft-model';
import { createContactLoopPlayer, createLoopPlan, importLoopLines, loadLoopPair, measureContactLoopAudio, LOOP_MAX_BYTES, LOOP_STORAGE_KEY, readLocalLoopLines, validateLoopPlan, type ContactLoopPlan } from '@/lib/playability-loops';
import styles from './loops.module.css';

type Source={key:string;label:string;line:WorldcraftLine};
const shortBuild=(line:WorldcraftLine)=>line.worldSnapshot.build.slice(0,10);
const phrase=(line:WorldcraftLine)=>line.performance?.impacts.map(i=>i.note).join(' · ')??'';

export default function RecordedContactLoops(){
 const [sources,setSources]=useState<Source[]>([]),[selected,setSelected]=useState(['','']);
 const [offset,setOffset]=useState(false),[muted,setMuted]=useState([false,false]);
 const [status,setStatus]=useState('loading'),[notice,setNotice]=useState(''),[warning,setWarning]=useState('');
 const [elapsed,setElapsed]=useState(0),[qa,setQa]=useState(false),[measurement,setMeasurement]=useState('');
 const player=useRef<ReturnType<typeof createContactLoopPlayer>|null>(null),storage=useRef<Storage|null>(null),writable=useRef(true),upload=useRef<HTMLInputElement>(null),importNumber=useRef(0),importEpoch=useRef(0),mounted=useRef(false);
 useEffect(()=>{
  let alive=true;mounted.current=true;
  const output=createContactLoopPlayer({onState:state=>{if(alive){setStatus(state.status);if(state.detail)setNotice(state.detail);}},onTick:time=>{if(alive)setElapsed(time);}});player.current=output;
  try{storage.current=window.localStorage;}catch{storage.current=null;}
  const saved=loadLoopPair(storage.current);writable.current=saved.writable;
  let local:{lines:WorldcraftLine[];warning:string}={lines:[],warning:''};
  try{local=readLocalLoopLines(storage.current);}catch{local.warning='Local Worldcraft memory is unavailable. File import still works.';}
  const initialWarning=[saved.warning,local.warning].filter(Boolean).join(' ');
  fetch('/playability/loops-examples.json').then(response=>{if(!response.ok)throw Error('Example recordings could not load.');return response.text();}).then(text=>{
   if(!alive)return;setQa(new URLSearchParams(window.location.search).get('qa')==='1');setWarning(initialWarning);
   const examples=importLoopLines(text).lines;
   const choices:Source[]=[...examples.map((line,i)=>({key:`example:${i}`,label:i===0?'A short answer · recorded example':'A longer reply · recorded example',line})),...local.lines.map((line,i)=>({key:`browser:${i}`,label:`Your Keep ${i+1} · ${line.worldSnapshot.world.name}`,line})),...(saved.plan?.sources??[]).map((line,i)=>({key:`saved:${i}`,label:`Saved layer ${i===0?'A':'B'} · ${line.worldSnapshot.world.name}`,line}))];
   setSources(choices);setSelected(saved.plan?['saved:0','saved:1']:['example:0','example:1']);setOffset(saved.plan?.offsetB??false);setStatus('stopped');
   setNotice(saved.plan?'Your saved pair is ready. Start chooses when to listen.':'Two real Havok recordings are ready to compare.');
  }).catch(error=>{if(alive){const fallback=saved.plan?.sources??local.lines;setSources(fallback.map((line,i)=>({key:`fallback:${i}`,label:`Recorded line ${i+1}`,line})));setSelected(fallback.length?['fallback:0',`fallback:${fallback.length>1?1:0}`]:['','']);setStatus('stopped');setWarning(String(error.message));}});
  const hidden=()=>{if(document.hidden){output.stop();if(alive)setNotice('Stopped when this page became hidden. Start again when ready.');}};
  const pagehide=()=>output.stop();document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',pagehide);
  return()=>{alive=false;mounted.current=false;document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',pagehide);output.dispose();player.current=null;};
 },[]);
 const chosen=useMemo(()=>selected.map(key=>sources.find(source=>source.key===key)),[selected,sources]);
 const plan=useMemo<ContactLoopPlan|null>(()=>{try{return chosen.every(Boolean)?createLoopPlan(chosen.map(source=>source!.line),offset):null;}catch{return null;}},[chosen,offset]);
 const running=status==='playing'||status==='starting';
 const stop=()=>{importEpoch.current++;player.current?.stop();setElapsed(0);setNotice('Stopped. Start listens from the beginning.');};
 const choose=(layer:number,key:string)=>{stop();setSelected(values=>values.map((value,i)=>i===layer?key:value));setNotice('Source changed. Start listens from the beginning.');};
 const toggle=(layer:number)=>{const next=muted.map((value,i)=>i===layer?!value:value);player.current?.setMuted(layer,next[layer]);setMuted(next);};
 const download=(name:string,value:unknown)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);};
 const save=()=>{if(!plan)return;try{if(!storage.current||!writable.current)throw Error('Save is unavailable. Download the pair to preserve it.');storage.current.setItem(LOOP_STORAGE_KEY,JSON.stringify(plan));setNotice('Pair saved with both original shot records. Reload stays silent.');}catch(error){setWarning(String((error as Error).message));}};
 const readFile=async(file:File)=>{
  stop();const token=importEpoch.current;if(file.size>LOOP_MAX_BYTES){setWarning('Choose a file smaller than 2.2 MB.');return;}
  try{const text=await file.text();if(!mounted.current||token!==importEpoch.current)return;const data=JSON.parse(text),prefix=`import:${++importNumber.current}`;
   player.current?.stop();setElapsed(0);
   if(data?.format==='rail-golf-recorded-contact-pair'){
    const pair=validateLoopPlan(data);setSources(values=>[...values.filter(v=>!v.key.startsWith('import:')),...pair.sources.map((line,i)=>({key:`${prefix}:${i}`,label:`Imported layer ${i===0?'A':'B'} · ${line.worldSnapshot.world.name}`,line}))]);setSelected([`${prefix}:0`,`${prefix}:1`]);setOffset(pair.offsetB);setMuted([false,false]);setNotice('Pair restored silently. Both original records are preserved.');
   }else{
    const result=importLoopLines(text);setSources(values=>[...values.filter(v=>!v.key.startsWith('import:')),...result.lines.map((line,i)=>({key:`${prefix}:${i}`,label:`Imported Keep ${i+1} · ${line.worldSnapshot.world.name}`,line}))]);setSelected([`${prefix}:0`,`${prefix}:${result.lines.length>1?1:0}`]);setNotice(`Loaded ${result.lines.length} recorded line${result.lines.length===1?'':'s'}. ${result.rejected.length?'Silent or unsupported lines were left out.':''} Start chooses when to listen.`);
   }
  }catch(error){if(mounted.current&&token===importEpoch.current)setWarning(String((error as Error).message));}
 };
 const displaySpan=plan?plan.period*(offset?1.5:1):1;
 return <main className={styles.page}>
  <header className={styles.header}><p className={styles.eyebrow}>RAIL GOLF · RECORDED CONTACTS</p><h1>Let one shot<br/>answer another.</h1><p className={styles.intro}>Two physical lines become a small musical apparatus. Listen to each alone, then let their measured rhythms overlap.</p><p className={styles.truth}>Audio-only playback of recorded contacts. No projectile is being fired and no new collisions are happening.</p></header>
  <section className={styles.transport} aria-label="Recorded audio playback">
   <button className={styles.primary} disabled={!plan||running||muted.every(Boolean)} onClick={()=>{if(plan){importEpoch.current++;setNotice('Listening to recorded events with the original Worldcraft voices.');void player.current?.start(plan,muted).catch(error=>setWarning(String(error.message))); }}}>{status==='starting'?'Starting audio…':'Start recorded loops'}</button>
   <button onClick={stop} disabled={!running}>Stop</button>
   <p role="status" aria-live="polite">{status==='playing'&&plan?`Listening · pass ${Math.min(plan.cycles,Math.floor(elapsed/plan.period)+1)} of ${plan.cycles}`:notice||'Loading recorded lines…'}</p>
  </section>
  {warning&&<p className={styles.warning} role="alert">{warning}</p>}
  <section className={styles.layers} aria-label="Two recorded layers">{[0,1].map(layer=><article className={styles.layer} key={layer} data-layer={layer} data-muted={muted[layer]}>
   <div className={styles.layerHeading}><h2>Layer {layer===0?'A':'B'}</h2><button aria-pressed={!muted[layer]} onClick={()=>toggle(layer)}>{muted[layer]?'Muted':'Listening'}</button></div>
   <label className={styles.label}>Recorded line<select value={selected[layer]} onChange={event=>choose(layer,event.target.value)} disabled={!sources.length}>{sources.map(source=><option key={source.key} value={source.key}>{source.label}</option>)}</select></label>
   {chosen[layer]&&<><p className={styles.notes}>{phrase(chosen[layer]!.line)}</p><p className={styles.meta}>{chosen[layer]!.line.performance!.impacts.length} attacks · {(chosen[layer]!.line.terminal.elapsed as number).toFixed(3)}s recorded flight</p>
    <svg className={styles.track} viewBox="0 0 900 100" role="img" aria-label={`Recorded contact timing for layer ${layer===0?'A':'B'}`}>
     <path d="M20 48H880" className={styles.rail}/>{chosen[layer]!.line.performance!.impacts.map((impact,i)=>{const x=20+860*(impact.time+(layer===1&&offset&&plan?plan.period/2:0))/displaySpan;return <g key={i}><line x1={x} x2={x} y1={30} y2={66} className={styles.strike}/><circle cx={x} cy={48} r={6+impact.gain*6}/><title>{impact.note} at {impact.time.toFixed(4)} seconds after the recorded launch</title></g>;})}
     <text x="20" y="91">0 s</text><text x="880" y="91" textAnchor="end">{displaySpan.toFixed(1)} s</text>
    </svg>
    <p className={styles.meta}>First pass, at measured timing{layer===1&&offset?' plus the half-cycle entrance delay':''}. Loudness follows the recorded strikes.</p>
    <details className={styles.provenance}><summary>Original shot and provenance</summary><p>{chosen[layer]!.line.worldSnapshot.world.name} · source build <code>{shortBuild(chosen[layer]!.line)}</code></p><p>Recorded ending: {chosen[layer]!.line.terminal.reason}. Sound attacks use the existing Worldcraft contact debounce; repeated solver callbacks are retained in each attack’s callback count.</p><p className={styles.meta}>This listener uses the original Worldcraft timber and metal voices at recorded gains. Later bank-sound choices were not stored in this record format. This record includes the full source world, launch setup, actual sampled path, contacts and ending. It describes history; this page does not validate it by firing again.</p><button onClick={()=>download(`rail-golf-loop-source-${layer===0?'a':'b'}.json`,chosen[layer]!.line)}>Download original line</button></details>
   </>}
  </article>)}</section>
  <section className={styles.arrangement}>
   <label className={styles.check}><input type="checkbox" checked={offset} onChange={event=>{stop();setOffset(event.target.checked);setNotice('Entrance changed. Start listens from the beginning.');}}/>Let B enter half a cycle later</label>
   <p>{plan?`One cycle is ${plan.period.toFixed(1)} seconds: the longer flight plus silence. Nothing is sped up, snapped to a beat or shortened. Start plays ${plan.cycles} passes, then stops.`:'Choose two lines to begin.'} {offset?'B keeps its whole delayed final pass.':''}</p>
   <div className={styles.buttons}><button onClick={save} disabled={!plan}>Save pair</button><button onClick={()=>plan&&download('rail-golf-recorded-contact-pair.json',plan)} disabled={!plan}>Download pair</button><button disabled={status==='loading'} onClick={()=>upload.current?.click()}>Import recorded lines or pair</button><button disabled={!sources.some(s=>s.key==='example:0')} onClick={()=>{stop();setSelected(['example:0','example:1']);setOffset(false);setMuted([false,false]);setNotice('Original example pair restored. Nothing starts automatically.');}}>Reset examples</button></div>
   <input ref={upload} type="file" accept="application/json,.json" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void readFile(file);}}/>
  </section>
  <section className={styles.visit}><h2>Bring a line of your own</h2><p>In <Link href="/lab/worldcraft">Worldcraft</Link>, find a shot you want to hear again and Keep it. Return here and reload to find Keeps from this preview in the selectors. A silent line stays in its original shelf.</p><p>For a line kept on another preview, open <strong>Worlds &amp; kept lines → Export local memory</strong> there, then import that file here. Imported lines never overwrite your Worldcraft shelf. Save pair preserves this listening arrangement; Download pair carries it between previews.</p><p>Try A alone, B alone, then both. Does a small change of entrance make you want to find a different physical line?</p></section>
  {qa&&<section aria-label="Audio diagnostics"><button disabled={!plan} onClick={()=>{if(plan){stop();setMeasurement('Rendering…');void measureContactLoopAudio(plan).then(result=>setMeasurement(JSON.stringify(result))).catch(error=>setMeasurement(String(error.message)));}}}>Measure recorded audio offline</button><output data-audio-measurement>{measurement}</output></section>}
  <footer className={styles.footer}><Link href="/lab/playability">Other experiments</Link><span>Recorded audio study · Build {BUILD_ID}</span></footer>
 </main>;
}
