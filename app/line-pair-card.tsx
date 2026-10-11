"use client";

import {parentLineSegments} from "@/lib/line-pair";

export function LinePairCard({
  sequence, endingHead, endingTail, parentLine, kept, canKeep, onAdjust, onRetry, onKeep, onExport,
}: {
  sequence: string;
  endingHead: string;
  endingTail: string;
  parentLine: string | null;
  kept: boolean;
  canKeep: boolean;
  onAdjust: () => void;
  onRetry: () => void;
  onKeep: () => void;
  onExport: () => void;
}) {
  return <>
    <p className="observed-line">{sequence}</p>
    <p className="ending-line"><span className="ending-head">{endingHead}</span>{endingTail ? <span className="ending-tail">{endingTail}</span> : null}</p>
    {parentLine ? <p className="parent-line">{parentLineSegments(parentLine).map((part, index) => <span key={index}>{part}</span>)}</p> : null}
    <div className="line-pair-actions">
      <button type="button" onClick={onAdjust}>Adjust Last Line</button>
      <button type="button" onClick={onRetry}>Retry</button>
      <button type="button" onClick={onKeep} disabled={!canKeep || kept}>{kept ? "Kept" : "Keep Line"}</button>
      <button type="button" data-export="end" onClick={onExport}>End / Export</button>
    </div>
  </>;
}
