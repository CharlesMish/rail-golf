import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {counterlineWorlds,counterlineCameraFrame} from '../../lib/counterline-worlds.js';
import {worldcraftBox} from '../../lib/worldcraft-model.js';
import {projectileScreen} from '../../lib/flight-framing.js';
const old=JSON.parse(await readFile('public/playability/loops-examples.json')).lines;
const records=JSON.parse(await readFile('public/refinement/counterline-examples.json')).recordings;
const worlds=counterlineWorlds(old[0].worldSnapshot.world),rows=[];
// Actual canvas dimensions in the responsive layout, not the full viewport.
for(const entry of worlds.slice(0,2))for(const [width,height]of [[780,585],[366,397],[820,290],[566,330]])for(const view of ['launch','overview']){
 const frame=counterlineCameraFrame(entry.world,entry.opening,view,width,height,entry.foundryId),points=entry.world.objects.flatMap(object=>{const box=worldcraftBox(object);return [{id:object.id,part:'center',point:box.center},...box.corners.map((point,i)=>({id:object.id,part:`corner${i}`,point}))];});
 const projected=points.map(p=>({...p,screen:projectileScreen(frame,p.point,width/height,frame.horizontal)}));const outside=projected.filter(p=>p.screen.depth<=.1||Math.abs(p.screen.x)>1||Math.abs(p.screen.y)>1);rows.push({world:entry.id,width,height,view,frame,centers:entry.world.objects.length,centerOutside:outside.filter(p=>p.part==='center'),cornersOutside:outside.filter(p=>p.part!=='center'),maxAbsX:Math.max(...projected.map(p=>Math.abs(p.screen.x))),maxAbsY:Math.max(...projected.map(p=>Math.abs(p.screen.y)))});
}
const results=[];for(const recording of records)for(const [width,height]of [[780,585],[366,397],[820,290]]){const entry=worlds.find(w=>w.world.id===recording.line.worldSnapshot.world.id),frame=counterlineCameraFrame(entry.world,recording.line.setup,'overview',width,height,entry.foundryId,recording.line);const touched=recording.line.contacts.filter(c=>c.body.startsWith('worldcraft-object-')).map(c=>({...c,screen:projectileScreen(frame,c.point,width/height,frame.horizontal)}));results.push({source:recording.line.id,width,height,frame,touchedOutside:touched.filter(p=>p.screen.depth<=.1||Math.abs(p.screen.x)>1||Math.abs(p.screen.y)>1)});}
const sourceHashes={};for(const file of ['lib/counterline-worlds.js','app/lab/places-counterline/counterline.tsx','scripts/refinement/counterline-camera.mjs'])sourceHashes[file]=createHash('sha256').update(await readFile(file)).digest('hex');
const evidence={sourceHashes,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),authority:'Mathematical frustum checks of real registered solid corners and actual recorded contact locations. No rendered WebGL, occlusion, lighting or visual-comfort certification.',rows,results};await writeFile('docs/experiments/refinement/counterline-camera.json',JSON.stringify(evidence)+'\n');console.log(JSON.stringify({launchAndOverview:rows.map(r=>({world:r.world,size:[r.width,r.height],view:r.view,centerOutside:r.centerOutside.length,cornersOutside:r.cornersOutside.length})),results:results.map(r=>({source:r.source,size:[r.width,r.height],outside:r.touchedOutside.length}))},null,2));
