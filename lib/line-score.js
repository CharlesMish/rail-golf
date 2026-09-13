import {REDIRECT_GATES} from './line-recognition.js';
import {cascadeContactTag} from './lumber-cascade.js';
// NON-CANONICAL PLACEHOLDERS. No progression, leaderboard or economy consumes this module.
export const PLACEHOLDER_RULES = Object.freeze([
 {id:'common',tier:'COMMON',label:'Redirect',points:100,sequence:['redirect'],perFeature:true},
 {id:'seat',tier:'FINISH',label:'TARGET SEAT',points:500,sequence:['target-seat']},
 {id:'sky',tier:'NAMED',label:'SKY TOKEN',points:250,sequence:['sky']},
 {id:'skip',tier:'NAMED',label:'SKIP',points:250,sequence:['skip']},
 {id:'mill',tier:'NAMED',label:'MILL ROUTE',points:250,sequence:['mill','target-seat']},
 {id:'return',tier:'NAMED',label:'MILL RETURN',points:250,sequence:['mill-return']},
 {id:'direct',tier:'NAMED',label:'DIRECT FINISH',points:250,sequence:['direct']},
 {id:'banks',tier:'SIGNATURE',label:'BANK A → B',points:500,sequence:['bank-a','bank-b']},
 {id:'banks-reverse',tier:'SIGNATURE',label:'BANK B → A',points:500,sequence:['bank-b','bank-a']},
 {id:'treads',tier:'SIGNATURE',label:'TREAD RUN 1 → 2 → 3',points:600,sequence:['step-a','step-b','step-c']},
 {id:'saw-mill',tier:'NAMED',label:'SAW → MILL',points:250,sequence:['saw-mill']},
 {id:'switch',tier:'NAMED',label:'DOCK SWITCH',points:250,sequence:['switch']},
].map(rule=>Object.freeze({...rule,sequence:Object.freeze(rule.sequence)})));

// NON-CANONICAL: secondary texture counts distinct awarded claim IDs, never raw samples.
export const VARIETY_RULE = Object.freeze({pointsPerAdditionalClaim:50,cap:200});

// Raw body callbacks stay raw. Consecutive chatter retains its count, not new tricks.
export function appendLineEvidence(ledger,event){
 const last=ledger.at(-1);
 if(event.kind==='contact'&&last?.kind==='contact'&&last.body===event.body&&last.surface===event.surface){
  last.count=(last.count??1)+1;return;
 }
 ledger.push({...event,count:event.count??1});
}
const tokensFor = event => {
 if(event.kind==='relationship'&&event.surface==='saw-mill')return ['saw-mill'];
 if(event.kind==='ruling'&&event.targetHit===true)return ['target-seat'];
 if(event.kind==='pad-activation')return ['skip'];
 if(event.kind==='switch-use')return ['switch'];
 if(event.kind==='token'&&event.surface==='sky')return ['sky'];
 if(event.kind==='redirect'&&event.feature){
  const tokens=['redirect',event.surface];
  const a=event.incoming,b=event.outgoing;
  if(event.surface==='mill'&&a&&b&&Math.hypot(a.x,a.z)>REDIRECT_GATES.minReturnHorizontalSpeed&&Math.hypot(b.x,b.z)>REDIRECT_GATES.minReturnHorizontalSpeed&&
    (a.x*b.x+a.z*b.z)/(Math.hypot(a.x,a.z)*Math.hypot(b.x,b.z))<=Math.cos(REDIRECT_GATES.minReturnTurnDegrees*Math.PI/180))tokens.push('mill-return');
  return tokens;
 }
 return [];
};
export function scoreLine(ledger,rules=PLACEHOLDER_RULES,variety=VARIETY_RULE){
 const seenRedirects=new Set();
 const tokens=ledger.map((event,index)=>{const duplicate=event.kind==='redirect'&&seenRedirects.has(event.feature);if(event.kind==='redirect')seenRedirects.add(event.feature);return {tokens:duplicate?[]:tokensFor(event),index};});
 // A physical landing is permitted; any earlier solid/mechanism/token precludes Direct.
 const seat=tokens.find(e=>e.tokens.includes('target-seat'));
 if(seat&&!ledger.slice(0,seat.index).some(e=>['contact','pad-activation','switch-use','token','redirect','relationship'].includes(e.kind)&&!(e.kind==='contact'&&e.terminal===true)))tokens[seat.index].tokens.push('direct');
 const awards=[];
 for(const rule of rules){
  if(rule.perFeature){
   const seen=new Set();
   for(const entry of tokens){const e=ledger[entry.index];
    if(entry.tokens.includes('redirect')&&!seen.has(e.feature)){seen.add(e.feature);awards.push({id:rule.id+':'+e.feature,tier:rule.tier,label:e.label??rule.label,points:rule.points,evidence:[entry.index]});}
   }
   continue;
  }
  let next=0;const evidence=[];
  for(const entry of tokens){
   if(entry.tokens.includes(rule.sequence[next])){evidence.push(entry.index);next++;}
   if(next===rule.sequence.length)break;
  }
  if(next===rule.sequence.length)awards.push({id:rule.id,tier:rule.tier,label:rule.id==='seat'?(ledger[evidence.at(-1)].label??rule.label):rule.label,points:rule.points,evidence});
 }
 awards.sort((a,b)=>a.evidence.at(-1)-b.evidence.at(-1));
 const used=new Set(awards.flatMap(a=>a.evidence));
 const claimIds=[...new Set(awards.map(a=>a.id))];
 const secondary=Math.min(variety.cap,Math.max(0,claimIds.length-1)*variety.pointsPerAdditionalClaim);
 const uniqueFeatureCount=new Set(ledger.filter(e=>e.kind==='redirect'||e.kind==='relationship').flatMap(e=>e.members??[e.feature]).filter(Boolean)).size;
 return {ruleSet:'placeholder-v3',nonCanonical:true,awards,claimIds,uniqueFeatureCount,secondary,claimTotal:awards.reduce((n,a)=>n+a.points,0),total:awards.reduce((n,a)=>n+a.points,0)+secondary,
  ignored:ledger.flatMap((event,index)=>used.has(index)?[]:[{index,reason:event.reason??(tokensFor(event).length?'Repeated or incomplete family':'Raw evidence — no qualified claim')}])};
}

export function normalizeLineEvidence(value){
 if(!Array.isArray(value)||value.length>4096)return [];
 const kinds=['contact','pad-activation','switch-use','ruling','token','redirect','rejected','termination','relationship'];
 if(!value.every(e=>e&&kinds.includes(e.kind)&&['surface','body','feature','label','reason'].every(k=>e[k]===undefined||(typeof e[k]==='string'&&e[k].length<=180))&&
  (e.count===undefined||(Number.isSafeInteger(e.count)&&e.count>0&&e.count<=100000))&&
  (e.point===undefined||['x','y','z'].every(k=>Number.isFinite(e.point?.[k])&&Math.abs(e.point[k])<10000))&&
  (['incoming','outgoing'].every(k=>e[k]===undefined||['x','y','z'].every(a=>Number.isFinite(e[k]?.[a]))))&&
  (['turn','freeSeconds','separation','contactSeconds'].every(k=>e[k]===undefined||Number.isFinite(e[k])))&&
  (e.members===undefined||(Array.isArray(e.members)&&e.members.length<=4&&e.members.every(x=>typeof x==='string'&&x.length<=180)))&&
  (e.terminal===undefined||typeof e.terminal==='boolean')&&
  (e.targetHit===undefined||typeof e.targetHit==='boolean')&&(e.state===undefined||e.state==='A'||e.state==='B')))return [];
 return value.map(e=>({kind:e.kind,...Object.fromEntries(['feature','label','incoming','outgoing','turn','freeSeconds','separation','terminal','reason','contactSeconds','members'].filter(k=>e[k]!==undefined).map(k=>[k,e[k]])),...(e.surface!==undefined?{surface:e.surface}:{}),...(e.body!==undefined?{body:e.body}:{}),
  ...(e.point?{point:{x:e.point.x,y:e.point.y,z:e.point.z}}:{}),...(e.targetHit!==undefined?{targetHit:e.targetHit}:{}),...(e.state?{state:e.state}:{}),count:e.count??1}));
}

// Called only with a real projectile collision and the diverter controller's body-checked result.
export function recordLineContact(ledger,node,point,diverterContact){
 if(!point)return;
 const surface=diverterContact?.kind?.startsWith('floor-')?diverterContact.kind:
  node.metadata?.yardBank ?? cascadeContactTag(node.metadata?.cascadeStep,point) ??
  (node.metadata?.deliveryRoute==='mill'?'mill':node.metadata?.yardLanding ?? 'other-solid');
 appendLineEvidence(ledger,{kind:'contact',body:node.name,surface,...(node.metadata?.lineFeature?{feature:node.metadata.lineFeature.id,label:node.metadata.lineFeature.label}:{}),terminal:diverterContact?.kind==='landing',point:{x:point.x,y:point.y,z:point.z}});
 if(diverterContact?.kind?.startsWith('switch-'))appendLineEvidence(ledger,{kind:'switch-use',state:diverterContact.kind==='switch-a'?'A':'B',surface:'dock-switch'});
}

// Immutable per-attempt accounting alongside (not replacing) its raw ledger and setup.
export function recordLineReceipt(ledger){
 const r=scoreLine(ledger);
 return {ruleSet:r.ruleSet,total:r.total,claimIds:r.claimIds,uniqueFeatureCount:r.uniqueFeatureCount,secondary:r.secondary,
 ending:ledger.findLast(e=>e.kind==='termination')?.reason ?? 'unresolved'};
}
export function normalizeLineReceipt(r){
 if(!r||typeof r.ruleSet!=='string'||r.ruleSet.length>80||typeof r.ending!=='string'||r.ending.length>80||
 !['total','uniqueFeatureCount','secondary'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<1000000)||
 !Array.isArray(r.claimIds)||r.claimIds.length>128||r.claimIds.some(id=>typeof id!=='string'||id.length>200))return undefined;
 return {ruleSet:r.ruleSet,total:r.total,claimIds:[...r.claimIds],uniqueFeatureCount:r.uniqueFeatureCount,secondary:r.secondary,ending:r.ending};
}
