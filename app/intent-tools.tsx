"use client";

import {useState} from "react";
import styles from "./intent-lab.module.css";

// Apply only to the Intent Lab's incumbent MannersGame root, never to other labs.
export const intentShellClassName=styles.shell;

export type IntentCondition = "sentence" | "keep" | "score";
export type IntentAttemptId = string | number;
export type IntentSentenceOption = {id:string;label:string;stationLabel:string;clauses:string[]};
export type IntentKeptEntry = {attemptId:IntentAttemptId;line:{stationId?:string;receipt?:string;build?:string}};
const LABELS:Record<IntentCondition,string>={sentence:"SENTENCE",keep:"KEEP",score:"SCORE"};
const ORDERS:IntentCondition[][]=[["keep","sentence","score"],["sentence","keep","score"]];

function Clauses({clauses,reached}:{clauses:string[];reached:number}){
  return <ol className={styles.clauses} aria-label="Required events in order">
    {clauses.map((clause,index)=><li key={`${index}-${clause}`} data-reached={index<reached}>
      {index>0&&<span className={styles.arrow} aria-hidden="true">→</span>}
      <span>{clause} <span aria-label={index<reached?"reached":"not reached"}>{index<reached?"✓":"○"}</span></span>
    </li>)}
  </ol>;
}

/** Presentation only: selecting an order never changes the active condition or game state. */
export function IntentControls({condition,sentenceId,sentences,clauseReached,headline,disabled,onCondition,onSentence}:{
  condition:IntentCondition;sentenceId:string;sentences:IntentSentenceOption[];clauseReached:number;
  headline?:string;disabled:boolean;onCondition:(condition:IntentCondition)=>void;onSentence:(id:string)=>void;
}){
  const [order,setOrder]=useState(0);
  const sentence=sentences.find(item=>item.id===sentenceId);
  return <section className={styles.controls} data-condition={condition} aria-label="Intent Lab conditions" inert={disabled?true:undefined}>
    <div className={styles.heading}><span>INTENT LAB</span><label className={styles.order}>ORDER
      <select aria-label="Suggested condition order" value={order} disabled={disabled} onChange={event=>setOrder(Number(event.target.value))}>
        <option value={0}>Keep → Sentence → Score</option><option value={1}>Sentence → Keep → Score</option>
      </select>
    </label></div>
    <div className={styles.conditions} role="group" aria-label="Active intention">
      {ORDERS[order].map(item=><button type="button" key={item} aria-pressed={condition===item} disabled={disabled}
        onClick={()=>{if(item!==condition)onCondition(item);}}>{LABELS[item]}</button>)}
    </div>
    {condition==="sentence"?<>
      <label className={styles.prompt}>PROMPT<select aria-label="Sentence prompt" value={sentenceId} disabled={disabled}
        onChange={event=>onSentence(event.target.value)}>
        {sentences.map(item=><option key={item.id} value={item.id}>{item.label} · {item.stationLabel}</option>)}
      </select></label>
      {sentence&&<Clauses clauses={sentence.clauses} reached={clauseReached}/>}
      {headline&&<p className={styles.status} aria-live="polite">{headline}</p>}
    </>:<p className={styles.hint}>{condition==="keep"?"Make a line. Keep it if you want to return to it.":"The current Open Line score rules. No target required."}</p>}
    <p className={styles.contract}>Changing condition starts a fresh setup at this station, with Kicker A.</p>
  </section>;
}

/** Inline content for the incumbent result panel; no overlay, auto-retry or scoring authority. */
export function IntentResult({condition,sentenceLabel,clauses=[],clauseReached=0,headline,lastAttemptId,kept,onKeep,onDiscard}:{
  condition:IntentCondition;sentenceLabel?:string;clauses?:string[];clauseReached?:number;headline?:string;
  lastAttemptId:IntentAttemptId|null;kept:IntentKeptEntry[];onKeep:()=>void;onDiscard:()=>void;
}){
  if(condition==="score")return null;
  const alreadyKept=lastAttemptId!==null&&kept.some(entry=>entry.attemptId===lastAttemptId);
  return <section className={styles.result} aria-label={`${LABELS[condition]} result`}>
    {condition==="sentence"?<>
      {sentenceLabel&&<p className={styles.eyebrow}>{sentenceLabel}</p>}
      <p className={styles.resultHeadline}>{headline??"LINE ENDED"}</p>
      <Clauses clauses={clauses} reached={clauseReached}/>
      <p className={styles.hint}>Retry to edit this line. Return to setup to change the condition.</p>
    </>:<>
      <p className={styles.resultHeadline}>{alreadyKept?"LINE KEPT":"KEEP THIS LINE?"}</p>
      <div className={styles.actions}>
        <button type="button" onClick={onKeep} disabled={lastAttemptId===null||alreadyKept||kept.length>=3}>{alreadyKept?"KEPT":"KEEP LINE"}</button>
        <button type="button" onClick={onDiscard} disabled={lastAttemptId===null}>{alreadyKept?"TRY AGAIN":"DISCARD / TRY AGAIN"}</button>
      </div>
      <p className={styles.hint}>{kept.length>=3?"Three lines kept. You can still explore, retry and recall them.":`${kept.length} / 3 kept this session. No score or required finish.`}</p>
    </>}
  </section>;
}

/** Small local study controls inside Shot Tools. Ghosts are recorded paths, Survey-only. */
export function IntentStudyTools({condition,kept,keptGhosts,onGhosts,onRecallKeep,onSurvey,onExport,status,disabled=false}:{
  condition:IntentCondition;kept:IntentKeptEntry[];keptGhosts:boolean;onGhosts:(visible:boolean)=>void;
  onRecallKeep:(attemptId:IntentAttemptId)=>void;onSurvey:()=>void;onExport:(format:"json"|"csv")=>void;
  status?:string;disabled?:boolean;
}){
  return <section className={styles.study} aria-label="Intent study tools">
    <h3>Intent study · local record</h3>
    <div className={styles.actions}><button type="button" onClick={()=>onExport("json")}>EXPORT JSON</button><button type="button" onClick={()=>onExport("csv")}>EXPORT CSV</button></div>
    {status&&<p className={styles.hint} role="status">{status}</p>}
    {condition==="keep"&&<>
      <div className={styles.heading}><span>KEPT LINES · {kept.length} / 3</span><button type="button" onClick={onSurvey} disabled={disabled}>SURVEY KEPT LINES</button></div>
      <label className={styles.ghostToggle}><input type="checkbox" checked={keptGhosts} onChange={event=>onGhosts(event.target.checked)}/> Show kept ghosts in Survey</label>
      <p className={styles.hint}>These are paths you fired. Recall restores the starting setup; it does not fire.</p>
      {kept.length===0?<p className={styles.hint}>Keep a resolved line to place it here.</p>:<ol className={styles.kept}>
        {kept.map((entry,index)=><li key={entry.attemptId}><span>LINE {index+1}<small>{entry.line.stationId==="lumber"?"Lumber Walk":entry.line.stationId==="gate"?"Yard Gate":entry.line.stationId??"Recorded station"}</small></span><button type="button" disabled={disabled} onClick={()=>onRecallKeep(entry.attemptId)}>RECALL</button></li>)}
      </ol>}
    </>}
  </section>;
}
