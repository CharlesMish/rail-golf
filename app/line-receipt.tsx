import {scoreLine} from '@/lib/line-score';
import type {LineEvidence} from '@/lib/line-score';
export function LineReceipt({ledger}:{ledger:LineEvidence[]}){
 const receipt=scoreLine(ledger);
 return <details className="line-receipt" open={ledger.length>0} key={ledger.length?`receipt-${ledger.length}`:'empty'}>
  <summary>LINE TOTAL — PLACEHOLDER · {receipt.total}</summary>
  <strong>NON-CANONICAL PLACEHOLDERS</strong>
  <p>One projectile. No unlocks. Values await design review.</p>
  {receipt.awards.length?<ul>{receipt.awards.map(a=><li key={a.id}>{a.tier} · {a.label} <b>+{a.points}</b></li>)}</ul>:<p>No qualified score events.</p>}
  <details><summary>Physical evidence · {ledger.reduce((n,e)=>n+(e.count??1),0)} observations</summary>
   <ol>{ledger.map((e,i)=><li key={i}>{e.surface??e.kind} · {e.kind}{(e.count??1)>1?` ×${e.count}`:''}<small>{e.label??e.body}{e.kind==='redirect'?` · turn ${e.turn?.toFixed(0)}° · free ${e.freeSeconds?.toFixed(2)}s · separation ${e.separation?.toFixed(1)}m`:''}{e.point?` (${e.point.x.toFixed(1)}, ${e.point.y.toFixed(1)}, ${e.point.z.toFixed(1)})`:""}</small><small>{receipt.ignored.find(x=>x.index===i)?.reason ?? 'Contributed to a qualified event'}{(e.count??1)>1?' · repeated contacts add no points':''}</small></li>)}</ol>
  </details>
  {!ledger.length&&<p>Fire a line, or select a recorded attempt, to inspect its receipt.</p>}
 </details>;
}
