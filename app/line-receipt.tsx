import {chargeToSpeed} from '@/lib/rail-golf-v02';
import {RUN_RULE} from '@/lib/line-run';
import {scoreLine} from '@/lib/line-score';
import type {SavedLine} from '@/lib/shot-library';
import type {LineEvidence} from '@/lib/line-score';
export function LineReceipt({ledger,shot}:{ledger:LineEvidence[];shot?:SavedLine}){
 const receipt=scoreLine(ledger);
 return <details className="line-receipt" open={ledger.length>0} key={ledger.length?`receipt-${ledger.length}`:'empty'}>
  <summary>LINE TOTAL — PLACEHOLDER · {receipt.total}</summary>
  <strong>NON-CANONICAL PLACEHOLDERS</strong>
  <p>One projectile. No unlocks. Values await design review.</p>
  {receipt.awards.length?<ul>{receipt.awards.map(a=><li key={a.id}>{a.tier} · {a.label} <b>+{a.points}</b></li>)}</ul>:<p>No qualified score events.</p>}
  <p>CLAIMS · {receipt.claimTotal}<br/>VARIETY · +{receipt.secondary} / 200 · {receipt.awards.filter(a=>a.tier!=='FINISH').length} non-finish claims · {receipt.uniqueFeatureCount} qualified features<br/>RUN · +{receipt.run} / {RUN_RULE.cap} · {receipt.runDistance.toFixed(1)} m qualified free flight</p>
  <details><summary>Physical & recognition evidence · {ledger.length} records</summary>
   <>{shot&&<p>Build {shot.build??'unknown'} · {shot.holeId} / {shot.stationId}<br/>Rail {shot.railIndex+1} · yaw {shot.yaw}° · elevation {shot.elevation}° · charge {shot.charge} · speed {chargeToSpeed(shot.charge)} m/s<br/>Ending: {shot.lineReceipt?.ending??'legacy / unrecorded'} · recorded total: {shot.lineReceipt?.total??'—'} · rule set: {shot.lineReceipt?.ruleSet??'legacy'}</p>}</>
   <ol>{ledger.map((e,i)=><li key={i}>{e.surface??e.kind} · {e.kind}{(e.count??1)>1?` ×${e.count}`:''}<small>{e.label??e.body}{(e.kind==='redirect'||e.kind==='rejected')?` · turn ${e.turn?.toFixed(0)??'—'}° · free ${e.freeSeconds?.toFixed(2)??'—'}s · separation ${e.separation?.toFixed(1)??'—'}m`:''}{e.point?` (${e.point.x.toFixed(1)}, ${e.point.y.toFixed(1)}, ${e.point.z.toFixed(1)})`:""}</small>{e.kind==='rejected'&&<small>Incoming {e.incoming?Math.hypot(e.incoming.x,e.incoming.y,e.incoming.z).toFixed(1):'—'} m/s · outgoing {e.outgoing?Math.hypot(e.outgoing.x,e.outgoing.y,e.outgoing.z).toFixed(1):'—'} m/s · contact {e.contactSeconds?.toFixed(3)??'—'} s</small>}<small>{receipt.ignored.find(x=>x.index===i)?.reason.replaceAll('-',' ') ?? 'Contributed to a qualified event'}{(e.count??1)>1?' · repeated contacts add no points':''}</small></li>)}</ol>
  </details>
  {!ledger.length&&<p>Fire a line, or select a recorded attempt, to inspect its receipt.</p>}
 </details>;
}
