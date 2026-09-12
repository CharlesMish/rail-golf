import {cascadeContactTag} from './lumber-cascade.js';
// NON-CANONICAL PLACEHOLDERS. No progression, leaderboard or economy consumes this module.
export const PLACEHOLDER_RULES = Object.freeze([
 {id:'seat',label:'Target seat',points:1000,sequence:['target-seat']},
 {id:'skip',label:'Skip activation',points:100,sequence:['skip']},
 {id:'banks',label:'Bank A → B',points:250,sequence:['bank-a','bank-b']},
 {id:'treads',label:'Treads 1 → 2 → 3',points:300,sequence:['step-a','step-b','step-c']},
 {id:'switch',label:'Switch use',points:50,sequence:['switch']},
].map(rule=>Object.freeze({...rule,sequence:Object.freeze(rule.sequence)})));

// Raw body callbacks stay raw. Consecutive chatter retains its count, not new tricks.
export function appendLineEvidence(ledger,event){
 const last=ledger.at(-1);
 if(event.kind==='contact'&&last?.kind==='contact'&&last.body===event.body&&last.surface===event.surface){
  last.count=(last.count??1)+1;return;
 }
 ledger.push({...event,count:event.count??1});
}
const tokenFor = event => {
 if(event.kind==='ruling'&&event.targetHit===true)return 'target-seat';
 if(event.kind==='pad-activation')return 'skip';
 if(event.kind==='switch-use')return 'switch';
 if(event.kind==='contact'&&['bank-a','bank-b','step-a','step-b','step-c'].includes(event.surface))return event.surface;
 return null;
};
export function scoreLine(ledger,rules=PLACEHOLDER_RULES){
 const tokens=ledger.map((event,index)=>({token:tokenFor(event),index}));
 const awards=[];
 for(const rule of rules){
  let next=0;const evidence=[];
  for(const entry of tokens){
   if(entry.token===rule.sequence[next]){evidence.push(entry.index);next++;}
   if(next===rule.sequence.length)break;
  }
  if(next===rule.sequence.length)awards.push({id:rule.id,label:rule.label,points:rule.points,evidence});
 }
 const used=new Set(awards.flatMap(a=>a.evidence));
 return {ruleSet:'placeholder-v1',nonCanonical:true,awards,total:awards.reduce((n,a)=>n+a.points,0),
  ignored:ledger.flatMap((event,index)=>used.has(index)?[]:[{index,reason:tokenFor(event)?'Repeated or incomplete family':'Evidence only — no placeholder rule'}])};
}

export function normalizeLineEvidence(value){
 if(!Array.isArray(value)||value.length>4096)return [];
 const kinds=['contact','pad-activation','switch-use','ruling','token'];
 if(!value.every(e=>e&&kinds.includes(e.kind)&&['surface','body'].every(k=>e[k]===undefined||(typeof e[k]==='string'&&e[k].length<=180))&&
  (e.count===undefined||(Number.isSafeInteger(e.count)&&e.count>0&&e.count<=100000))&&
  (e.point===undefined||['x','y','z'].every(k=>Number.isFinite(e.point?.[k])&&Math.abs(e.point[k])<10000))&&
  (e.targetHit===undefined||typeof e.targetHit==='boolean')&&(e.state===undefined||e.state==='A'||e.state==='B')))return [];
 return value.map(e=>({kind:e.kind,...(e.surface!==undefined?{surface:e.surface}:{}),...(e.body!==undefined?{body:e.body}:{}),
  ...(e.point?{point:{x:e.point.x,y:e.point.y,z:e.point.z}}:{}),...(e.targetHit!==undefined?{targetHit:e.targetHit}:{}),...(e.state?{state:e.state}:{}),count:e.count??1}));
}

// Called only with a real projectile collision and the diverter controller's body-checked result.
export function recordLineContact(ledger,node,point,diverterContact){
 if(!point)return;
 const surface=diverterContact?.kind?.startsWith('floor-')?diverterContact.kind:
  node.metadata?.yardBank ?? cascadeContactTag(node.metadata?.cascadeStep,point) ??
  (node.metadata?.deliveryRoute==='mill'?'mill':node.metadata?.yardLanding ?? 'other-solid');
 appendLineEvidence(ledger,{kind:'contact',body:node.name,surface,point:{x:point.x,y:point.y,z:point.z}});
 if(diverterContact?.kind?.startsWith('switch-'))appendLineEvidence(ledger,{kind:'switch-use',state:diverterContact.kind==='switch-a'?'A':'B',surface:'dock-switch'});
}
