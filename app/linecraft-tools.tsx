"use client";

import {useEffect, useId, useRef} from "react";
import styles from "./linecraft-lab.module.css";

// This stylesheet only applies to the isolated Linecraft Lab root.
export const linecraftShellClassName = styles.shell;
export const linecraftResultShelfClassName = styles.resultShelfButton;
export const linecraftOriginControlClassName = styles.originControl;
export type LinecraftStage = "learn" | "explore" | "open";
export type LinecraftShelfEntry = {
  id: string;
  title: string;
  stationLabel: string;
  description?: string;
  stage: LinecraftStage;
  scoreTotal?: number | null;
};

function Clauses({clauses, reached}: {clauses: string[]; reached: number}) {
  return <ol className={styles.clauses} aria-label="Required events in order">
    {clauses.map((clause, index) => <li key={`${index}-${clause}`} data-reached={index < reached}>
      {index > 0 && <span className={styles.arrow} aria-hidden="true">→</span>}
      <span>{clause} <span aria-label={index < reached ? "reached" : "not reached"}>{index < reached ? "✓" : "○"}</span></span>
    </li>)}
  </ol>;
}

/** Presentation only; the runtime owns lesson attempts, score authority and all resets. */
export function LinecraftControls({
  stage, lessonIndex, lessonCount, clauses = [], clauseReached = 0,
  disabled, onOpen, onNext, onRestart, fired,
  replaying = false, onStopReplay,
}: {
  stage: LinecraftStage; lessonIndex: number; lessonCount: number;
  clauses?: string[]; clauseReached?: number;
  disabled: boolean; fired: boolean;
  onOpen: () => void; onNext: () => void; onRestart: () => void;
  replaying?: boolean; onStopReplay?: () => void;
}) {
  if (replaying) return <section className={styles.controls} data-replaying="true" aria-label="Recorded line replay">
    <div className={styles.heading}><span>RECORDED REPLAY</span><button type="button" onClick={onStopReplay}>STOP REPLAY</button></div>
    <p className={styles.hint} role="status">Recorded path · no new shot.</p>
  </section>;
  return <section className={styles.controls} data-stage={stage} aria-label="Linecraft Lab" inert={disabled ? true : undefined}>
    <div className={styles.heading}>
      {stage === "learn" ? <div className={styles.sentence}><span>{lessonIndex+1} / {lessonCount} · </span><Clauses clauses={clauses} reached={clauseReached}/></div> : <span>{stage==='explore'?'OPEN · YARD GATE':'OPEN YARD'}</span>}
      <div className={styles.navigation}>
        {stage === 'learn' ? <button type="button" className={styles.quiet} onClick={onOpen} disabled={disabled}>Skip Lessons</button>
          : stage === 'explore' ? <button type="button" className={styles.quiet} onClick={onNext} disabled={disabled}>Next Lesson</button>
          : <button type="button" className={styles.quiet} onClick={onRestart} disabled={disabled}>Restart Lessons</button>}
      </div>
    </div>
    {stage === "learn" && !fired && <p className={styles.teaching}>Drag to aim · hold and release to fire · Survey names faces.</p>}
  </section>;
}

/** Resolved shots are Keep-worthy solely at the player's discretion. */
export function LinecraftResult({
  stage, lessonIndex, lessonCount, clauses, clauseReached, complete, isLastLesson, canContinue, canKeep, alreadyKept, shelfCount,
  onKeep, onContinue, onExplore, onShelf, onAdjust, showKeepExplanation,
}: {
  stage: LinecraftStage; lessonIndex:number; lessonCount:number; clauses:string[]; clauseReached:number;
  complete: boolean; isLastLesson: boolean; canContinue: boolean; canKeep: boolean; alreadyKept: boolean;
  shelfCount: number; onKeep: () => void; onContinue: () => void; onExplore: () => void; onShelf: () => void; onAdjust: () => void; showKeepExplanation:boolean;
}) {
  return <section className={styles.result} aria-label={`${stage === "learn" ? "Learn" : "Open"} line result`}>
    {stage==='learn'&&<div className={styles.sentence}><span>{lessonIndex+1} / {lessonCount} · </span><Clauses clauses={clauses} reached={clauseReached}/></div>}
    <div className={styles.actions}>
      {stage === "learn" && complete ? <>
        <button type="button" className={styles.primary} onClick={onExplore} disabled={!canContinue}>Explore Here</button>
        {!isLastLesson&&<button type="button" className={styles.quiet} onClick={onContinue} disabled={!canContinue}>Next Lesson</button>}
      </> : <button type="button" className={styles.primary} onClick={onAdjust}>Adjust Last Line</button>}
      <button type="button" className={styles.quiet} onClick={onKeep} disabled={!canKeep || alreadyKept || shelfCount >= 4}>{alreadyKept ? "Kept ✓" : "Keep Line"}</button>
      {stage==='learn'&&!complete&&canContinue&&<button type="button" className={styles.quiet} onClick={onContinue}>{isLastLesson?'Skip Lessons':'Skip Lesson'}</button>}
    </div>
    {shelfCount >= 4 && !alreadyKept ? <p className={styles.hint}>Shelf full. <button type="button" className={styles.quiet} onClick={onShelf}>Manage Shelf</button></p> : showKeepExplanation && <p className={styles.hint}>Keep saves this line to your Shelf so you can restore or replay it later.</p>}
  </section>;
}

/** Four local slots, independent from Learn/Open. Runtime supplies all recorded authority. */
export function LinecraftShelf({
  entries, ghostId, onGhost, onRestore, onReplay, onRemove, onShare, onExport, status,
  disabled = false, onClose, shareLink, scoreVisible, onScoreVisible,
}: {
  entries: LinecraftShelfEntry[]; ghostId: string | null; onGhost: (id: string | null) => void;
  onRestore: (id: string) => void; onReplay: (id: string) => void; onRemove: (id: string) => void;
  onShare?: (id: string) => void; onExport: (format: "json" | "csv") => void;
  status?: string; disabled?: boolean; onClose?: () => void; shareLink?: string;
  scoreVisible?: boolean; onScoreVisible?: (visible:boolean)=>void;
}) {
  const headingId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {closeRef.current = onClose;}, [onClose]);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {event.preventDefault(); event.stopPropagation(); closeRef.current?.();}
      if (event.key !== "Tab" || !dialogRef.current) return;
      const buttons = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]'));
      const first = buttons[0], last = buttons.at(-1);
      if (!first || !last) {event.preventDefault(); return;}
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {event.preventDefault(); first.focus();}
    };
    document.addEventListener("keydown", handleKey, true);
    return () => {document.removeEventListener("keydown", handleKey, true); if (previous?.isConnected) previous.focus();};
  }, []);
  return <div className={styles.shelfBackdrop}>
    <aside ref={dialogRef} className={styles.shelf} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div className={styles.heading}><h2 id={headingId}>LINE SHELF <span>{entries.length} / 4</span></h2>{onClose && <button type="button" onClick={onClose}>CLOSE</button>}</div>
      <p className={styles.hint}>Saved in this browser. The shelf survives reload; each visit starts a fresh study session. Export before clearing browser data.</p>
      <p className={styles.contract}>A line ends at first ground contact. Restore: exact setup in Open, then fire manually; no lesson credit. Ghost: recorded history, never prediction. Replay: sampled path over distance-normalized six seconds, with starting pallet frozen; no new physics.</p>
      {entries.length === 0 ? <p className={styles.empty}>Make a line in Learn or Open, then choose KEEP LINE.</p> : <ol className={styles.entries}>
        {entries.map((entry, index) => <li key={entry.id}>
          <div className={styles.entryTitle}><span className={styles.slot}>{String(index + 1).padStart(2, "0")}</span><div><strong>{entry.title}</strong><small>{entry.stationLabel} · {entry.stage.toUpperCase()}</small></div></div>
          {entry.description && <p className={styles.description}>{entry.description}</p>}
          <div className={styles.actions}>
            <button type="button" disabled={disabled} onClick={() => onRestore(entry.id)}>RESTORE</button>
            <button type="button" disabled={disabled} aria-pressed={ghostId === entry.id} onClick={() => onGhost(ghostId === entry.id ? null : entry.id)}>{ghostId === entry.id ? "HIDE GHOST" : "GHOST"}</button>
            <button type="button" disabled={disabled} onClick={() => onReplay(entry.id)}>PLAY REPLAY</button>
            {onShare && <button type="button" disabled={disabled} onClick={() => onShare(entry.id)}>COPY SETUP LINK</button>}
            <button type="button" disabled={disabled} className={styles.quiet} aria-label={`Remove ${entry.title}`} onClick={() => onRemove(entry.id)}>REMOVE</button>
          </div>
        </li>)}
      </ol>}
      {onShare && <p className={styles.contract}>Setup links restore a launch setup. They never fire automatically or contain the recorded replay.</p>}
      {shareLink && <label className={styles.shareLink}>Setup link · select to copy<input type="text" readOnly value={shareLink} aria-label="Kept line setup link" onFocus={event => event.currentTarget.select()}/></label>}
      <footer className={styles.export}><details><summary>Study tools</summary>
        {onScoreVisible&&<label className={styles.scoreToggle}><input type="checkbox" checked={scoreVisible} disabled={disabled} onChange={event=>onScoreVisible(event.target.checked)}/> Show provisional score in Open</label>}
        <div className={styles.actions}><button type="button" onClick={() => onExport("json")}>Export study JSON</button><button type="button" onClick={() => onExport("csv")}>Export study CSV</button></div>
        <p className={styles.hint}>Exports retain attempts and Keep choices. Score visibility changes no physical or scoring rule.</p>
      </details>
        {status && <p className={styles.notice} role="status">{status}</p>}
      </footer>
    </aside>
  </div>;
}
