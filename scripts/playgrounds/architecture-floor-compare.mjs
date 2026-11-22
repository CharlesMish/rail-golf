import {architectureHarness} from './architecture-harness.mjs';
import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,buildArchitectureSolids} from '../../lib/playgrounds-architecture.js';
import {ARCHITECTURE_SHOTS,architectureNeighbours,summary} from './architecture-fixtures.mjs';
for(const roll of [null,0,-3]){
 const solids=roll===null?RINGWELL_SOLIDS:RINGWELL_SOLIDS.filter(s=>s.id!=='ear-floor').map(s=>s.id==='west-gallery'?{...s,x:-29,w:32,roll}:s),h=architectureHarness({...PLAYGROUNDS_ARCHITECTURE,buildWorld:(s,r,m,sh)=>buildArchitectureSolids(s,r,m,sh,{solids})}),rows=[];
 for(const y of [-60,-45,-30,-15,0,15,30,45,60])for(const e of [5,15,25,35,45])for(const c of [.2,.3,.4,.5,.6,.75])rows.push(summary(h.shoot({railIndex:1,yaw:y,elevation:e,charge:c})));
 const setup=ARCHITECTURE_SHOTS['ear-return'],ref=h.shoot(setup),near=architectureNeighbours(setup).map(n=>{const r=h.shoot(n.setup);return summary(r);});
 console.log(JSON.stringify({roll,summary:{settled:rows.filter(r=>r.reason==='settled').length,over15:rows.filter(r=>r.elapsed>15).length,over25:rows.filter(r=>r.elapsed>25).length,max:Math.max(...rows.map(r=>r.elapsed)),earReached:rows.filter(r=>r.order.includes('rw-ear-end')).length},reference:summary(ref),neighbours:near.map(n=>({setup:n.setup,time:n.elapsed,order:n.order,reason:n.reason})),long:rows.filter(r=>r.elapsed>25)}));h.dispose();
}
