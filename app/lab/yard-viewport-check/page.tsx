'use client';
import {useState} from 'react';
import {YardControls} from '../places-architecture/yard-controls';
import styles from '../places-architecture/yard-play.module.css';

// Explicit DOM stress fixture: no Babylon scene, bodies, sound or saved records.
export default function YardViewportCheck(){
  const [phase,setPhase]=useState('ready'),[view,setView]=useState('launch');
  const [setup,setSetup]=useState({railIndex:1,yaw:0,elevation:35,charge:.4,carriageMode:'forecourt'});
  const [powerMode,setPowerMode]=useState<'hold'|'set'>('set'),[max,setMax]=useState(false);
  const [notice,setNotice]=useState('Synthetic layout fixture. Fire buttons never launch a physical shot.');
  const note=()=>setNotice('Fixture button reached. No physical or musical action occurred.');
  return <main className={styles.shell}>
    <section className={styles.stage} aria-label="Synthetic scene area"><div className={styles.syntheticBanner}>LAYOUT QA · synthetic content · no physics</div><div className={styles.syntheticStage}><h1>Exchange Yard viewport check</h1><p>The real control component and CSS, with a long result and four shelf entries.</p><label>Fixture phase <select aria-label="Fixture phase" value={phase} onChange={e=>setPhase(e.target.value)}><option value="ready">Ready</option><option value="result">Result</option><option value="flight">Flight</option></select></label><p><a href="/lab/places-architecture">Open the actual yard</a></p></div></section>
    <YardControls phase={phase} setup={setup} stations={[{id:'forecourt',label:'Forecourt'},{id:'freight',label:'Freight · comparison station'}]} view={view} powerMode={powerMode} shownPower={max?1:setup.charge} max={max} notice={notice}
      onSetup={patch=>setSetup(s=>({...s,...patch}))} onStation={id=>setSetup(s=>({...s,carriageMode:id}))} onView={setView} onPowerMode={setPowerMode} onPower={charge=>{setMax(false);setSetup(s=>({...s,charge}));}} onMax={()=>setMax(v=>!v)} onRetry={()=>setPhase('ready')} onStop={()=>setPhase('result')} fireProps={{onClick:note}}
      result={<section className={styles.result} aria-label="Line result"><p>Synthetic long result receipt · no trajectory was simulated.</p><button onClick={note}>Keep this line</button><details open><summary>Rebounds · 35 synthetic labels</summary><ol>{Array.from({length:35},(_,i)=><li key={i}>Layout-only event {i+1}, with a long architectural region label.</li>)}</ol></details></section>}>
      <details open><summary>Kept lines · 4/4 synthetic rows</summary><p>Layout-only entries; no real historical lines are loaded or stored.</p>{Array.from({length:4},(_,i)=><div className={styles.entry} key={i}><strong>Synthetic line {i+1} · station label</strong><p>Long starting-state and terminal description to stress the same shelf layout.</p><div className={styles.actions}><button onClick={note}>Restore line {i+1}</button><button onClick={note}>Download</button><button onClick={note}>Remove line {i+1}</button></div></div>)}</details>
      <details open><summary>About the yard &amp; controls</summary><p>Synthetic prose. Ordinary controls, long results and all four shelf rows should be reachable at 100% browser zoom. Scene and console should never overlap.</p></details>
      <footer><button onClick={note}>Sound on</button><a href="/lab/places-architecture">Actual Exchange Yard</a><span>End of fixture</span></footer>
    </YardControls>
  </main>;
}
