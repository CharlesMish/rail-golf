"use client";

import {useEffect, useId, useRef} from "react";
import styles from "./linecraft-lab.module.css";

// This stylesheet only applies to the isolated Linecraft Lab root.
export const linecraftShellClassName = styles.shell;
export type LinecraftStage = "learn" | "open";
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
  stage, lessonIndex, lessonCount, sentenceLabel, stationLabel, clauses = [], clauseReached = 0,
  headline, disabled, scoreVisible, onScoreVisible, onOpen, onRestart, onShelf, shelfCount,
  canContinue, onContinue, replaying = false, onStopReplay,
}: {
  stage: LinecraftStage; lessonIndex: number; lessonCount: number;
  sentenceLabel?: string; stationLabel?: string; clauses?: string[]; clauseReached?: number;
  headline?: string; disabled: boolean; scoreVisible: boolean;
  onScoreVisible: (visible: boolean) => void; onOpen: () => void; onRestart: () => void;
  onShelf: () => void; shelfCount: number; canContinue: boolean; onContinue: () => void;
  replaying?: boolean; onStopReplay?: () => void;
}) {
  if (replaying) return <section className={styles.controls} data-replaying="true" aria-label="Recorded line replay">
    <div className={styles.heading}><span>RECORDED REPLAY</span><button type="button" onClick={onStopReplay}>STOP REPLAY</button></div>
    <p className={styles.hint} role="status">Recorded path · distance-normalized six seconds · starting pallet frozen. No new physics.</p>
  </section>;
  return <section className={styles.controls} data-stage={stage} aria-label="Linecraft Lab" inert={disabled ? true : undefined}>
    <div className={styles.heading}>
      <span>LINECRAFT LAB <b>{stage === "learn" ? `LEARN ${lessonIndex + 1} / ${lessonCount}` : "OPEN"}</b></span>
      <button type="button" onClick={onShelf} disabled={disabled}>LINE SHELF <span>{shelfCount}/4</span></button>
    </div>
    {stage === "learn" ? <>
      <p className={styles.lesson}>{sentenceLabel}<span>{stationLabel}</span></p>
      <Clauses clauses={clauses} reached={clauseReached}/>
      {headline && <p className={styles.status} aria-live="polite">{headline}</p>}
      <p className={styles.teaching}>Drag to aim. Hold/release to fire. Survey names faces.</p>
      <div className={styles.navigation}>
        {canContinue && <button type="button" onClick={onContinue} disabled={disabled} className={styles.primary}>{lessonIndex === lessonCount - 1 ? "TRY OPEN" : "CONTINUE STUDY"}</button>}
        <button type="button" className={styles.quiet} onClick={onOpen} disabled={disabled}>SKIP TO OPEN <span>· skip curriculum</span></button>
      </div>
    </> : <>
      <p className={styles.openHint}>The same yard. No required sentence. Keep what matters to you.</p>
      <div className={styles.navigation}>
        <label className={styles.scoreToggle}><input type="checkbox" checked={scoreVisible} disabled={disabled} onChange={event => onScoreVisible(event.target.checked)}/> SCORE {scoreVisible ? "ON" : "HIDDEN"}</label>
        <button type="button" className={styles.quiet} onClick={onRestart} disabled={disabled}>RESTART LEARN</button>
      </div>
      <p className={styles.contract}>{scoreVisible ? "Score is a non-canonical placeholder. Hiding it changes no physics or values." : "Score is still recorded for the study. Visibility changes no physics or values."}</p>
    </>}
  </section>;
}

/** Resolved shots are Keep-worthy solely at the player's discretion. */
export function LinecraftResult({
  stage, sentenceLabel, clauses = [], clauseReached = 0, complete, isLastLesson,
  canContinue, canKeep, alreadyKept, shelfCount, onKeep, onContinue, onShelf,
}: {
  stage: LinecraftStage; sentenceLabel?: string; clauses?: string[]; clauseReached?: number; headline?: string;
  complete: boolean; isLastLesson: boolean; canContinue: boolean; canKeep: boolean; alreadyKept: boolean;
  shelfCount: number; onKeep: () => void; onContinue: () => void; onShelf: () => void;
}) {
  return <section className={styles.result} aria-label={`${stage === "learn" ? "Learn" : "Open"} line result`}>
    {stage === "learn" && <>
      {sentenceLabel && <p className={styles.eyebrow}>{sentenceLabel}</p>}
      <Clauses clauses={clauses} reached={clauseReached}/>
      <p className={styles.hint}>{complete ? "You can retry this line, keep it, or move on." : "The marked clauses show how far the line reached. Retry, or continue the study."}</p>
    </>}
    <div className={styles.actions}>
      <button type="button" className={styles.primary} onClick={onKeep} disabled={!canKeep || alreadyKept || shelfCount >= 4}>{alreadyKept ? "LINE KEPT ✓" : "KEEP LINE"}</button>
      <button type="button" onClick={onShelf}>LINE SHELF · {shelfCount}/4</button>
      {stage === "learn" && <button type="button" onClick={onContinue} disabled={!canContinue}>{isLastLesson ? "TRY OPEN" : complete ? "NEXT LESSON" : "CONTINUE STUDY"}</button>}
    </div>
    <p className={styles.hint}>{shelfCount >= 4 && !alreadyKept ? "Shelf full. Remove a line from the shelf to keep another." : "Keep is your choice. No score, recognition or finished sentence is required."}</p>
  </section>;
}

/** Four local slots, independent from Learn/Open. Runtime supplies all recorded authority. */
export function LinecraftShelf({
  entries, ghostId, onGhost, onRestore, onReplay, onRemove, onShare, onExport, status,
  disabled = false, onClose, shareLink,
}: {
  entries: LinecraftShelfEntry[]; ghostId: string | null; onGhost: (id: string | null) => void;
  onRestore: (id: string) => void; onReplay: (id: string) => void; onRemove: (id: string) => void;
  onShare?: (id: string) => void; onExport: (format: "json" | "csv") => void;
  status?: string; disabled?: boolean; onClose?: () => void; shareLink?: string;
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
      <footer className={styles.export}>
        <div className={styles.actions}><button type="button" onClick={() => onExport("json")}>EXPORT STUDY JSON</button><button type="button" onClick={() => onExport("csv")}>EXPORT STUDY CSV</button></div>
        <p className={styles.hint}>Study exports associate attempts, unchanged score and your voluntary Keep decisions.</p>
        {status && <p className={styles.notice} role="status">{status}</p>}
      </footer>
    </aside>
  </div>;
}
