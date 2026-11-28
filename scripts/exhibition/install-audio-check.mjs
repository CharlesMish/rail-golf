// Install/remove a LOCAL, explicit-button browser probe using the real audio code.
// node scripts/exhibition/install-audio-check.mjs [fixtures.json]
// node scripts/exhibition/install-audio-check.mjs --remove
// Remove before production build/publication; the reproducible source stays here.
import {mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const route=resolve('app/lab/exhibition-audio-check'),data=resolve('public/exhibition-audio-check-fixtures.json');
if(process.argv[2]==='--remove'){
 await rm(route,{recursive:true,force:true});await rm(data,{force:true});console.log('Removed temporary exhibition audio page and fixture copy.');
}else{
 const input=resolve(process.argv[2]??'docs/experiments/instrument-exhibition/ensemble-audio-fixtures.json'),raw=await readFile(input,'utf8');
 const parsed=JSON.parse(raw);if(parsed.format!=='rail-golf-exhibition-audio-review'||parsed.version!==1||!Array.isArray(parsed.cases)||parsed.cases.length>4)throw Error('Expected bounded review fixtures');
 await mkdir(route,{recursive:true});await mkdir(resolve('public'),{recursive:true});await writeFile(data,raw);
 await writeFile(resolve(route,'page.tsx'),`'use client';
import {useEffect,useRef,useState} from 'react';
import {measureEnsembleAudio,measureEnsembleClock,validateCounterlineEnsemble,type CounterlineEnsemble} from '@/lib/counterline-ensemble';
type Fixture={id:string;label:string;record:CounterlineEnsemble};
export default function AudioCheck(){
 const [cases,setCases]=useState<Fixture[]>([]),[index,setIndex]=useState(0),[level,setLevel]=useState(.3),[output,setOutput]=useState<unknown>(null),[busy,setBusy]=useState(false);
 const probe=useRef<AbortController|null>(null);
 useEffect(()=>{const c=new AbortController();fetch('/exhibition-audio-check-fixtures.json',{signal:c.signal}).then(r=>r.json()).then(raw=>{const v=raw as {cases:Fixture[]};setCases(v.cases.map(f=>({...f,record:validateCounterlineEnsemble(f.record)})));}).catch(e=>{if(!c.signal.aborted)setOutput(String(e));});return()=>{c.abort();probe.current?.abort();};},[]);
 const run=async(clock:boolean)=>{if(!cases[index])return;probe.current?.abort();const controller=new AbortController();probe.current=controller;setBusy(true);setOutput({status:clock?'Measuring recorded browser clock; plays once.':'Rendering existing voices offline; no sound output.'});const record=structuredClone(cases[index].record);record.settings.layers.forEach(layer=>{layer.gain=level;});try{const measurement=clock?await measureEnsembleClock(record,{signal:controller.signal}):await measureEnsembleAudio(record);if(!controller.signal.aborted)setOutput({case:cases[index].id,level,measurement});}catch(e){if(!controller.signal.aborted)setOutput({error:String(e)});}finally{setBusy(false);}};
 return <main style={{height:'100dvh',overflow:'auto',padding:24,background:'#13232b',color:'#e8f1ed',font:'16px/1.5 system-ui'}}><h1>Exhibition audio check</h1><p>Temporary local diagnostic. These are independently measured recorded Havok sources. No live physics, listening verdict or automatic playback.</p><label>Recorded case<select aria-label="Recorded case" value={index} onChange={e=>setIndex(Number(e.target.value))} disabled={busy}>{cases.map((c,i)=><option key={c.id} value={i}>{c.label}</option>)}</select></label><label>All layer levels<select aria-label="All layer levels" value={level} onChange={e=>setLevel(Number(e.target.value))} disabled={busy}><option value={.3}>30% default</option><option value={.45}>45% permitted maximum</option></select></label><p><button disabled={busy||!cases.length} onClick={()=>void run(false)}>Measure recorded audio offline</button> <button disabled={busy||!cases.length} onClick={()=>void run(true)}>Measure recorded timing (plays once)</button> <button onClick={()=>{probe.current?.abort();setBusy(false);setOutput({status:'Stopped explicitly.'});}}>Stop timing probe</button></p><pre data-audio-measurement style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(output,null,2)}</pre></main>;
}
`);
 console.log('Temporary page ready at /lab/exhibition-audio-check. Remove it with --remove before final build.');
}
