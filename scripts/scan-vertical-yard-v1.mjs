// Developer-only coarse spatial survey, not a solver or player walkthrough.
// Usage: node scripts/scan-vertical-yard-v1.mjs [optional-output.json]
import {readFile,writeFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {verticalHarness} from '../tests/helpers/vertical-yard-physics.mjs';
const havok=await Havok({wasmBinary:await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
const h=verticalHarness(havok),families=new Map();let launches=0,faceLaunches=0,bypasses=0,oob=0;
try{
 for(const railIndex of [0,1,2])for(const yaw of [-30,-20,-10,0,10,20,30])for(const elevation of [10,20,30,40,50,60])for(const charge of [.45,.65,.85,1]){
  const r=h.shoot({railIndex,yaw,elevation,charge});launches++;
  const events=r.evidence.filter(e=>e.kind==='redirect'),features=events.map(e=>e.feature);
  if(r.reason==='out-of-bounds')oob++;
  if(!features.some(id=>id.startsWith('ladder-'))){bypasses++;continue;}
  if(!features.some(id=>id.startsWith('ladder-')&&!id.endsWith('-stanchion')))continue;
  faceLaunches++;const key=features.join(' > ');families.set(key,(families.get(key)??0)+1);
 }
}finally{h.dispose();}
const result={launches,faceLaunches,bypasses,oob,familyCount:families.size,families:Object.fromEntries(families)};
if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
