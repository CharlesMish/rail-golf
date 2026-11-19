// Match the Radial Return world-space launch without changing Stone Circle's
// playable data. Native Stone Circle faces -120 degrees; this derived control
// omits only that station yaw. No terrace geometry or physics changes.
import { readFile, writeFile } from 'node:fs/promises';
import { loadHavok } from '../../../../scripts/foundry/contact-sweep.mjs';
import { validateRangePreset } from '../../../../lib/worldcraft-range.js';
import { createReturnHarness } from './harness.mjs';

const read = async id => JSON.parse(await readFile(new URL(`../../../../worlds/foundry/${id}/preset.json`,import.meta.url),'utf8'));
const radial = validateRangePreset(await read('radial-return'));
const stone = await read('amphitheater-place');
const matched = validateRangePreset({ ...stone, id:'stone-heading-plus-z', name:'Stone heading control', launcher:{x:0,z:32} });
const havok = await loadHavok(), a = createReturnHarness(havok,radial), b = createReturnHarness(havok,matched);
const report = { intervention:'Stone Circle station yaw -120 degrees omitted; all terrace geometry and physics unchanged. Radial Return station/muzzle/global ray are now matched.', rows:[] };
try {
  for (const [elevation,charge] of [[30,.25],[32,.22]]) {
    const setup={railIndex:1,originX:0,yaw:0,elevation,charge};
    const reference=a.shoot(setup), control=b.shoot(setup);
    if (JSON.stringify(reference.launch)!==JSON.stringify(control.launch)) throw Error('Global launch mismatch');
    report.rows.push({setup,launch:reference.launch,identicalGlobalLaunch:true,radial:{episodes:reference.episodes,terminal:reference.terminal},matchedStone:{episodes:control.episodes,terminal:control.terminal}});
  }
} finally { a.dispose(); b.dispose(); }
await writeFile(new URL('./heading-control.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
