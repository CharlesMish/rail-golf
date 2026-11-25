'use client';
import type {ButtonHTMLAttributes,ReactNode} from 'react';
import type {SpatialSetup} from '@/lib/spatial-lab-session';
import {RAIL_RULES} from '@/lib/rail-golf-v02';
import styles from './yard-play.module.css';

export type YardControlProps={
  phase:string; setup:SpatialSetup; stations:{id:string;label:string}[]; view:string;
  powerMode:'hold'|'set'; shownPower:number; max:boolean; notice?:string;
  onSetup:(patch:Partial<SpatialSetup>)=>void; onStation:(id:string)=>void;
  onPowerMode:(mode:'hold'|'set')=>void; onPower:(power:number)=>void; onMax:()=>void;
  onView:(mode:'launch'|'survey'|'flight')=>void; onRetry:()=>void; onStop:()=>void;
  fireProps:ButtonHTMLAttributes<HTMLButtonElement>; result?:ReactNode; children?:ReactNode;
};

// One control component serves the real runtime and the explicitly synthetic
// viewport fixture. It holds no physics, history or auto-launch authority.
export function YardControls(p:YardControlProps){
  const ready=p.phase==='ready',aim=ready||p.phase==='charging',live=p.phase==='flight';
  const available=!['loading','error'].includes(p.phase);
  return <aside className={styles.console} aria-label="Exchange Yard controls">
    <div className={styles.cameraRow} aria-label="Camera view">
      <button disabled={!['ready','result'].includes(p.phase)} aria-pressed={p.view==='launch'} onClick={()=>p.onView('launch')}>Launch view</button>
      <button disabled={!['ready','result','flight'].includes(p.phase)} aria-pressed={p.view==='survey'} onClick={()=>p.onView('survey')}>Survey</button>
      {live&&<button aria-pressed={p.view==='flight'} onClick={()=>p.onView('flight')}>Follow ball</button>}
    </div>
    {p.phase==='result'&&<div className={styles.actions}><button onClick={p.onRetry}>Next shot <kbd>R</kbd></button><span>Keep the completed line before moving on.</span></div>}
    {p.phase==='result'&&p.result}
    {live?<section className={styles.watching} aria-label="Watch this shot"><strong>{p.view==='survey'?'Surveying the yard':'Following the ball'}</strong><p>One committed shot. Watch its line, or stop when you are ready to move on.</p><div className={styles.actions}><button onClick={p.onStop}>Stop shot</button><button onClick={p.onRetry}>Retry <kbd>R</kbd></button></div></section>:<>
      <div className={styles.stationRow}>
        <label>Station<select aria-label="Launch station" value={p.setup.carriageMode} disabled={!['ready','result'].includes(p.phase)} onChange={e=>p.onStation(e.target.value)}>{p.stations.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label>Position<select aria-label="Launch position" value={p.setup.railIndex} disabled={!aim} onChange={e=>p.onSetup({railIndex:Number(e.target.value)})}>{RAIL_RULES.railPositions.map((x,i)=><option key={i} value={i}>{x===0?'Centre':`${x<0?'Left':'Right'} · ${Math.abs(x)} m`}</option>)}</select></label>
      </div>
      <div className={styles.aimControls}>
        <div><span className={styles.aimLabel}>Horizontal aim <output>{p.setup.yaw>=0?'+':''}{p.setup.yaw.toFixed(1)}°</output></span><div className={styles.aimRow}><button type="button" aria-label="Aim left" disabled={!aim} onClick={()=>p.onSetup({yaw:p.setup.yaw-.5})}>−</button><input aria-label="Horizontal aim" type="range" min={RAIL_RULES.minYaw} max={RAIL_RULES.maxYaw} step={0.5} value={p.setup.yaw} disabled={!aim} onChange={e=>p.onSetup({yaw:Number(e.target.value)})}/><button type="button" aria-label="Aim right" disabled={!aim} onClick={()=>p.onSetup({yaw:p.setup.yaw+.5})}>+</button></div></div>
        <div><span className={styles.aimLabel}>Elevation <output>{p.setup.elevation.toFixed(1)}°</output></span><div className={styles.aimRow}><button type="button" aria-label="Lower elevation" disabled={!aim} onClick={()=>p.onSetup({elevation:p.setup.elevation-.5})}>−</button><input aria-label="Elevation" type="range" min={RAIL_RULES.minElevation} max={RAIL_RULES.maxElevation} step={0.5} value={p.setup.elevation} disabled={!aim} onChange={e=>p.onSetup({elevation:Number(e.target.value)})}/><button type="button" aria-label="Raise elevation" disabled={!aim} onClick={()=>p.onSetup({elevation:p.setup.elevation+.5})}>+</button></div></div>
      </div>
      <div className={styles.powerHeading}><label>Power control<select aria-label="Power control" value={p.powerMode} disabled={!ready} onChange={e=>p.onPowerMode(e.target.value as 'hold'|'set')}><option value="set">Set power</option><option value="hold">Timed hold</option></select></label><button disabled={!['ready','result'].includes(p.phase)} aria-pressed={p.max} onClick={p.onMax}>MAX <kbd>X</kbd></button></div>
      <div className={styles.powerReadout}><span>{p.max?'Maximum power':p.powerMode==='hold'?'Charge':'Launch power'}</span><output>{Math.round(p.shownPower*1000)/10}%</output></div>
      {p.powerMode==='set'?<input className={styles.powerSlider} aria-label="Set launch power" type="range" min={0} max={100} step={1} value={p.setup.charge*100} disabled={!ready} onChange={e=>p.onPower(Number(e.target.value)/100)}/>:<div className={styles.powerTrack} role="progressbar" aria-label="Launch power" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.shownPower*100)}><i style={{width:`${p.shownPower*100}%`}}/></div>}
      <button {...p.fireProps} className={styles.fire} disabled={!aim}>{p.max?'Fire · 100%':p.powerMode==='set'?(p.phase==='charging'?'Release to fire':`Fire · ${Math.round(p.setup.charge*1000)/10}%`):p.phase==='charging'?'Release to fire':'Hold to charge'}</button>
      <div className={styles.actions}><button disabled={!available} onClick={p.onRetry}>Retry <kbd>R</kbd></button><button disabled={!live} onClick={p.onStop}>Stop shot</button><span>{p.phase==='result'?'Retry prepares the next shot.':p.powerMode==='hold'?'80% in 2 seconds · full in 3.':'Drag the scene to aim.'}</span></div>
      {p.notice&&ready&&<p className={styles.notice} role="status">{p.notice}</p>}
    </>}
    {p.phase!=='result'&&!live&&p.result}
    <div className={styles.secondary} hidden={live}>{p.children}</div>
  </aside>;
}
