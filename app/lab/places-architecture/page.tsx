'use client';
import {useSyncExternalStore} from 'react';
import SpatialLab from '../spatial-lab';
import {PLACES_ARCHITECTURE,PLACES_ARCHITECTURE_REFINED} from '@/lib/places-architecture';
import styles from './yard-play.module.css';

function subscribe(fn:()=>void){window.addEventListener('popstate',fn);window.addEventListener('yard-layout-choice',fn);return()=>{window.removeEventListener('popstate',fn);window.removeEventListener('yard-layout-choice',fn);};}
const currentLayout=()=>new URL(window.location.href).searchParams.get('layout')==='original'?'original':'refined';
const serverLayout=()=>null;
function selectLayout(value:string){const url=new URL(window.location.href);if(value==='original')url.searchParams.set('layout','original');else url.searchParams.delete('layout');window.history.replaceState(window.history.state,'',url);window.dispatchEvent(new Event('yard-layout-choice'));}

export default function ExchangeYardPage(){
  const layout=useSyncExternalStore(subscribe,currentLayout,serverLayout);
  if(layout===null)return <main className={styles.shell}><p>Opening Exchange Yard…</p></main>;
  const config=layout==='original'?PLACES_ARCHITECTURE:PLACES_ARCHITECTURE_REFINED;
  return <SpatialLab key={config.id} config={config} playPresentation="yard" yardVersion={<div className={styles.version}><label>Physical yard <select aria-label="Physical yard version" value={layout} onChange={e=>selectLayout(e.target.value)}><option value="refined">Refined · Forecourt &amp; Freight</option><option value="original">Original · Forecourt &amp; Service</option></select></label><p>Each version keeps its own line shelf. Switching clears the active shot and never fires automatically. The original physical layout uses the repaired roof rendering and these same controls.</p></div>}/>;
}
