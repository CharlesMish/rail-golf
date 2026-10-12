"use client";

import {COPY} from "@/lib/pallet-carry";

export function PalletCarryCard({
  sequence, endingHead, endingTail, status,
  showAdjust, showStation, showContinuation, onAdjust, onRetry, onStation,
}: {
  sequence: string;
  endingHead: string;
  endingTail: string;
  status: string;
  showAdjust: boolean;
  showStation: boolean;
  showContinuation: boolean;
  onAdjust: () => void;
  onRetry: () => void;
  onStation: () => void;
}) {
  return <>
    <p className="observed-line">{sequence}</p>
    <p className="ending-line"><span className="ending-head">{endingHead}</span>{endingTail ? <span className="ending-tail">{endingTail}</span> : null}</p>
    <p className="pallet-carry-status" role="status">{status}</p>
    {showContinuation ? <p className="pallet-carry-continuation" role="status" data-continuation="shown">{COPY.continuation}</p> : null}
    {showAdjust ? <p className="pallet-carry-adjust-instruction">{COPY.adjustInstruction}</p> : null}
    <div className="pallet-carry-actions">
      {showStation ? <button type="button" data-station-change="true" onClick={onStation}>{COPY.stationInstruction}</button> : null}
      {showAdjust ? <button type="button" onClick={onAdjust}>{COPY.adjustLabel}</button> : null}
      <button type="button" onClick={onRetry}>Retry</button>
    </div>
  </>;
}
