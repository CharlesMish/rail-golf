'use client';
import {useSyncExternalStore} from 'react';
import SpatialLab from '../spatial-lab';
import {EXPRESSIVE_CROWN,EXPRESSIVE_CROWN_FLAT} from '@/lib/expressive-crown';
import styles from '../places-architecture/yard-play.module.css';

function subscribe(listener:()=>void){window.addEventListener('popstate',listener);window.addEventListener('crown-choice',listener);return()=>{window.removeEventListener('popstate',listener);window.removeEventListener('crown-choice',listener);};}
const selected=()=>new URL(window.location.href).searchParams.get('shape')==='flat'?'flat':'crown';
function choose(shape:string){const url=new URL(window.location.href);if(shape==='flat')url.searchParams.set('shape','flat');else url.searchParams.delete('shape');window.history.replaceState(window.history.state,'',url);window.dispatchEvent(new Event('crown-choice'));}
export default function CrownStudyPage(){
 const shape=useSyncExternalStore(subscribe,selected,()=>null);
 if(shape===null)return <main className={styles.shell}><p>Opening the crown study…</p></main>;
 const config=shape==='flat'?EXPRESSIVE_CROWN_FLAT:EXPRESSIVE_CROWN;
 return <SpatialLab key={config.id} config={config} playPresentation="yard" yardVersion={<div className={styles.version}><label>Receiving form <select aria-label="Receiving form" value={shape} onChange={event=>choose(event.target.value)}><option value="crown">Transverse crown</option><option value="flat">Flat control</option></select></label><p>Both forms have the same footprint, height, surface properties and two receiving decks. Changing forms clears the active shot and loads that form&apos;s separate line shelf.</p><p>The crown&apos;s visible facets are its actual convex collision surface. Its underside is flat. This is a geometry study with ordinary impact feedback; its Keeps are physical study records and cannot be imported as Counterline performances.</p><a href="/lab/instrument-foundry">Instrument Foundry</a></div>}/>;
}
