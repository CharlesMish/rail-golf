import {PLAYGROUNDS_ARCHITECTURE,RINGWELL_SOLIDS,buildArchitectureSolids} from '../../lib/playgrounds-architecture.js';
export const ARCHITECTURE_SHOTS=Object.freeze({
 opening:{railIndex:1,yaw:0,elevation:18,charge:.4},
 'low-return':{railIndex:1,yaw:0,elevation:15,charge:.4},
 'west-reception':{railIndex:1,yaw:-15,elevation:15,charge:.4},
 'cross-galleries':{railIndex:1,yaw:60,elevation:35,charge:.4},
 'high-circuit':{railIndex:1,yaw:45,elevation:5,charge:.5},
 'ear-return':{railIndex:1,yaw:-45,elevation:15,charge:.4},
 'short-miss':{railIndex:1,yaw:0,elevation:5,charge:.2},
 'high-escape':{railIndex:1,yaw:0,elevation:45,charge:.75},
 'slow-pocket':{railIndex:1,yaw:-45,elevation:45,charge:.2},
 'side-not-top':{railIndex:1,yaw:60,elevation:25,charge:.4},
});
export function architectureControl(name='full'){
 if(!['full','walls-only','receivers-only'].includes(name))throw Error('Unknown architecture ablation');
 const solids=name==='full'?RINGWELL_SOLIDS:RINGWELL_SOLIDS.filter(s=>s.ground||(name==='walls-only'?s.zone==='wall':['west','east','low'].includes(s.zone)));
 return {...PLAYGROUNDS_ARCHITECTURE,buildWorld:(scene,root,materials,shadows)=>buildArchitectureSolids(scene,root,materials,shadows,{solids})};
}
export function architectureNeighbours(setup){
 const out=[];
 for(const [key,step]of [['yaw',.5],['elevation',.5],['charge',.01]])for(const sign of [-1,1]){const value=Math.round((setup[key]+step*sign)*100)/100;if(key==='elevation'&&value<5)continue;out.push({control:key,delta:step*sign,setup:{...setup,[key]:value}});}
 for(const railIndex of [0,2])out.push({control:'railIndex',delta:railIndex-setup.railIndex,setup:{...setup,railIndex}});
 return out;
}
export function summary(result){
 const {record,impacts}=result;
 const regions=[...new Set(record.contacts.map(c=>RINGWELL_SOLIDS.find(s=>'rw-'+s.id===c.body)?.zone).filter(z=>z&&!['wall','tee'].includes(z)))];
 const tops=[...new Set(impacts.filter(c=>c.normal&&Math.abs(c.normal[1])>.98&&c.incoming[1]<0).map(c=>c.body))];
 return {setup:record.setup,order:record.contacts.map(c=>c.body),regions,topFaces:tops,reason:record.reason,elapsed:record.elapsed,position:record.position};
}
export function matchesFamily(id,result){
 const s=summary(result),o=s.order;
 if(id==='low-return')return o[0]==='rw-low-landing'&&o[1]==='rw-far-wall'&&s.topFaces.includes('rw-low-landing');
 if(id==='west-reception')return o.includes('rw-far-wall')&&s.topFaces.includes('rw-west-gallery');
 if(id==='cross-galleries')return s.topFaces.includes('rw-east-gallery')&&s.topFaces.includes('rw-west-gallery');
 if(id==='high-circuit')return o[0]==='rw-east-gallery'&&o[1]==='rw-east-wall'&&o.includes('rw-far-wall');
 if(id==='ear-return')return o.includes('rw-ear-end')&&o.includes('rw-west-gallery')&&result.record.position[0]>-27&&s.reason==='first-ground-contact';
 throw Error('Unknown architecture family');
}
