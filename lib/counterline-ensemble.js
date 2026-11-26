// Recorded sources have no runtime/scene access. Only the live caller advances Havok.
import {createVoiceLedger,scheduleImpact} from './worldcraft-resonance.js';
import {validateCounterlineAcoustics,validateCounterlinePhysicalLine,validateCounterlineProfile,counterlineRecordedImpacts,counterlineVoicedImpact} from './counterline-recording.js';
import {counterlineStepBudget} from './counterline.js';
export const ENSEMBLE_KEY='rail-golf:counterline:ensembles-v1';
export const ENSEMBLE_LIMIT=36,ENSEMBLE_TAIL=2.4,ENSEMBLE_DELAY=.1;
const clone=structuredClone;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys;
export function ensembleSettings(input={}){
 const v={delay:ENSEMBLE_DELAY,layers:Array.from({length:3},()=>({gain:.3,muted:false})),...input};
 if(!exact(v,'delay,layers')||v.delay!==ENSEMBLE_DELAY||!Array.isArray(v.layers)||v.layers.length!==3||v.layers.some(l=>!exact(l,'gain,muted')||!Number.isFinite(l.gain)||l.gain<0||l.gain>.45||typeof l.muted!=='boolean'))throw Error('Ensemble needs three bounded layer settings (0–45%) and the original 100 ms delay.');
 return clone(v);
}
export function createCounterlineEnsemble(sources,acoustics,settings={}){
 if(!Array.isArray(sources)||sources.length!==3||!sources[2]||!Array.isArray(acoustics)||acoustics.length!==3)throw Error('An ensemble needs two optional recorded slots and one independent live source.');
 const physical=sources.map(v=>v===null?null:validateCounterlinePhysicalLine(v));
 const policies=acoustics.map((v,i)=>{if(v===null)return null;if(!physical[i])throw Error('Acoustic policy has no physical source.');return validateCounterlineAcoustics(v,physical[i]);});
 const seen=new Map();physical.forEach(line=>{if(!line)return;const bytes=JSON.stringify(line);if(seen.has(line.id)&&seen.get(line.id)!==bytes)throw Error('Conflicting physical source identifier.');seen.set(line.id,bytes);});
 const result={format:'rail-golf-counterline-ensemble',version:1,sources:physical,acoustics:policies,settings:ensembleSettings(settings)};
 if(JSON.stringify(result).length>900000)throw Error('Ensemble exceeds the bounded recording size.');return result;
}
export function validateCounterlineEnsemble(v){
 if(!exact(v,'acoustics,format,settings,sources,version')||v.format!=='rail-golf-counterline-ensemble'||v.version!==1||JSON.stringify(v).length>900000)throw Error('Unsupported ensemble recording.');
 return createCounterlineEnsemble(v.sources,v.acoustics,v.settings);
}
export function loadEnsembles(storage){
 let raw=null;try{raw=storage?.getItem(ENSEMBLE_KEY)??null;if(raw&&raw.length>3600000)throw Error('Too large');const records=raw?JSON.parse(raw):[];if(!Array.isArray(records)||records.length>4)throw Error('Four arrangement slots only');return {records:records.map(validateCounterlineEnsemble),raw,writable:true,warning:''};}
 catch{return {records:[],raw,writable:false,warning:'Saved ensembles could not be read. Original bytes are preserved. Download before leaving.'};}
}
export function saveEnsembles(storage,records,expectedRaw){
 if(!storage)throw Error('Ensembles are in memory only. Download before leaving.');
 if(!Array.isArray(records)||records.length>4)throw Error('All four ensemble slots are full. Download or remove one first.');
 const valid=records.map(validateCounterlineEnsemble);if(storage.getItem(ENSEMBLE_KEY)!==expectedRaw)throw Error('Another tab changed ensembles. Download before reloading.');const raw=JSON.stringify(valid);if(raw.length>3600000)throw Error('Ensemble library exceeds its bounded storage size.');storage.setItem(ENSEMBLE_KEY,raw);return raw;
}
export function ensembleAttackOverlap(times){const sorted=[...times].sort((a,b)=>a-b);let left=0,maximum=0;for(let right=0;right<sorted.length;right++){while(sorted[right]-sorted[left]>=ENSEMBLE_TAIL)left++;maximum=Math.max(maximum,right-left+1);}return maximum;}
export function createEnsembleAudio(options={}){
 const Context=options.Context??globalThis.AudioContext??globalThis.webkitAudioContext,schedule=options.schedule??scheduleImpact,setTimer=options.setInterval??globalThis.setInterval,clearTimer=options.clearInterval??globalThis.clearInterval;
 let ctx=null,timer=null,generation=0,disposed=false,active=false,origin=0,lastPump=0,next=0,events=[],endTime=Infinity,settings=ensembleSettings(),firedSettings=null,profile=null;
 const ledgers=Array.from({length:3},()=>createVoiceLedger());
 let audit={origin:0,audioOrigin:0,delay:ENSEMBLE_DELAY,scheduled:[],late:[],status:'idle'};
 const notify=(status,detail='')=>{audit.status=status;options.onState?.({status,detail});};
 const halt=(status='stopped',detail='',interrupt=false)=>{generation++;active=false;events=[];next=0;if(timer!==null){clearTimer(timer);timer=null;}ledgers.forEach(l=>l.release());const closing=ctx;ctx=null;if(closing&&closing.state!=='closed'){try{Promise.resolve(closing.close()).catch(()=>{});}catch{}}notify(status,detail);if(interrupt)options.onInterrupt?.(detail);};
 const fail=detail=>halt('interrupted',detail,true);
 const emit=(impact,layer)=>{
  if(!ctx||!active)return;const when=origin+ENSEMBLE_DELAY+impact.time,late=ctx.currentTime-when;
  if(late>.008){audit.late.push({layer,time:impact.time,late});fail('Audio timing fell behind. The ensemble stopped; Retry explicitly.');return;}
  const mix=settings.layers[layer];if(mix.muted||mix.gain===0||!(impact.gain>0))return;
  if(ensembleAttackOverlap([...audit.scheduled.map(e=>e.target),when])>ENSEMBLE_LIMIT){fail('Ensemble exceeded 36 overlapping attacks. All playback stopped; reduce the arrangement or level a source to zero. No notes were silently discarded.');return;}
  try{const actual=Math.max(when,ctx.currentTime),nodes=schedule(ctx,actual,{...impact,gain:impact.gain*mix.gain});nodes.forEach(n=>ledgers[layer].watch(n));audit.scheduled.push({layer,time:impact.time,target:when,scheduled:actual,observedAt:ctx.currentTime,sources:nodes.length});}catch(e){fail(`Audio stopped: ${String(e.message??e)}`);}
 };
 const pump=()=>{if(!active||!ctx)return;if(ctx.state!=='running'){fail('Audio suspended. Fire or audition explicitly when ready.');return;}const now=ctx.currentTime;if(now-lastPump>.12){fail('Scheduling interrupted. The ensemble stopped instead of drifting.');return;}lastPump=now;while(active&&next<events.length&&origin+ENSEMBLE_DELAY+events[next].impact.time<=now+.08){const event=events[next++];emit(event.impact,event.layer);}if(active&&now>=endTime)halt('finished','Ensemble finished.');};
 const start=(sources,recordedOnly=false)=>{
  if(disposed||!ctx||ctx.state!=='running'||active)return false;
  try{if(!Array.isArray(sources)||sources.length>(recordedOnly?3:2))throw Error('At most two recorded companions.');events=sources.flatMap((s,layer)=>{if(!s)return [];const line=validateCounterlinePhysicalLine(s.line);return counterlineRecordedImpacts(line,s.acoustics??null).map(impact=>({impact,layer}));}).sort((a,b)=>a.impact.time-b.impact.time||a.layer-b.layer);
   const voiced=events.filter(e=>!settings.layers[e.layer].muted&&settings.layers[e.layer].gain>0&&e.impact.gain>0);if(ensembleAttackOverlap(voiced.map(e=>e.impact.time))>ENSEMBLE_LIMIT)throw Error('Recorded arrangement exceeds the 36-attack budget; choose a sparser source or mute a layer.');
  }catch(e){halt('unavailable',String(e.message??e));return false;}
  next=0;endTime=Infinity;origin=ctx.currentTime;lastPump=origin;active=true;firedSettings=clone(settings);audit={origin,audioOrigin:origin+ENSEMBLE_DELAY,delay:ENSEMBLE_DELAY,scheduled:[],late:[],status:'playing'};notify('playing',recordedOnly?'Recorded-only audition; no physical shot.':`${sources.filter(Boolean).length} recorded companion(s), one live physical shot.`);pump();if(active)timer=setTimer(pump,20);return active;
 };
 return {
  async prepare(input={},liveProfile=null){if(disposed)return false;halt();settings=ensembleSettings(input);profile=liveProfile===null?null:validateCounterlineProfile(liveProfile);firedSettings=null;if(!Context){notify('unavailable','Web Audio unavailable.');return false;}const token=generation;try{ctx=new Context({latencyHint:'interactive'});const opening=ctx;notify('starting','Preparing synchronized audio…');opening.onstatechange=()=>{if(ctx===opening&&active&&opening.state!=='running')fail('Audio suspended. Fire or audition explicitly when ready.');};if(opening.state==='suspended')await opening.resume();if(token!==generation||disposed)return false;if(opening.state!=='running'){halt('unavailable','Audio could not start.');return false;}return true;}catch(e){if(token===generation)halt('unavailable',String(e.message??e));return false;}},
  commit(sources=[]){return start(sources);},
  audition(recording){const v=validateCounterlineEnsemble(recording);if(active)return false;settings=ensembleSettings(v.settings);if(!start(v.sources.map((line,i)=>line?{line,acoustics:v.acoustics[i]}:null),true))return false;endTime=origin+ENSEMBLE_DELAY+Math.max(...v.sources.map(l=>l?.terminal.elapsed??0))+ENSEMBLE_TAIL;return true;},
  elapsed(){return active&&ctx?Math.max(0,ctx.currentTime-origin):null;},
  live(impact){try{emit(profile?counterlineVoicedImpact(impact,profile,impact.normalSpeed):impact,2);}catch(e){fail(`Acoustic capture stopped: ${String(e.message??e)}`);}},
  finish(elapsed){if(!active||!ctx)return;endTime=origin+ENSEMBLE_DELAY+Math.max(elapsed,events.at(-1)?.impact.time??0)+ENSEMBLE_TAIL;pump();},
  setLayer(layer,patch){if(!Number.isInteger(layer)||layer<0||layer>2)return;const layers=clone(settings.layers);layers[layer]={...layers[layer],...patch};const nextSettings=ensembleSettings({...settings,layers});if(active&&nextSettings.layers[layer].gain!==settings.layers[layer].gain)throw Error('Stop or finish playback before changing levels.');const cut=!settings.layers[layer].muted&&nextSettings.layers[layer].muted;settings=nextSettings;if(cut)ledgers[layer].release();},
  stop(){halt();},interrupt(detail='Ensemble interrupted.'){fail(detail);},
  state(){return {active,context:ctx?.state??'uncreated',pending:Math.max(0,events.length-next),sources:ledgers.map(l=>l.counts()),settings:clone(settings),firedSettings:clone(firedSettings),audit:clone(audit)};},
  dispose(){if(disposed)return;disposed=true;halt();}
 };
}
export async function measureEnsembleAudio(input,Context=globalThis.OfflineAudioContext){
 const v=validateCounterlineEnsemble(input);if(!Context)throw Error('OfflineAudioContext unavailable.');const duration=Math.max(...v.sources.map(l=>l?.terminal.elapsed??0))+ENSEMBLE_DELAY+ENSEMBLE_TAIL,measurements=[];
 for(const layers of [[0],[1],[2],[0,1,2]]){const ctx=new Context(1,Math.ceil(duration*44100),44100);let nodes=0,attacks=0;for(const layer of layers){const line=v.sources[layer],mix=v.settings.layers[layer];if(!line||mix.muted||mix.gain===0)continue;for(const impact of counterlineRecordedImpacts(line,v.acoustics[layer])){if(!(impact.gain>0))continue;nodes+=scheduleImpact(ctx,ENSEMBLE_DELAY+impact.time,{...impact,gain:impact.gain*mix.gain}).length;attacks++;}}const start=performance.now(),buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let peak=0,sum=0;for(const n of data){peak=Math.max(peak,Math.abs(n));sum+=n*n;}measurements.push({layers,attacks,nodes,duration:buffer.duration,sampleRate:buffer.sampleRate,floatPeak:peak,rms:Math.sqrt(sum/data.length),renderMs:performance.now()-start});}
 return {renderer:'Actual OfflineAudioContext; three recorded histories, not live physics',settings:v.settings,measurements};
}
export async function measureEnsembleClock(input,{signal}={}){
 const v=validateCounterlineEnsemble(input),impacts=counterlineRecordedImpacts(v.sources[2],v.acoustics[2]);let frame=0,done=false,frames=0,lastFrame=null,maxFrameMs=0,maxDue=0,ticks=0,index=0,finished=false,last=null,resolveWait=null;
 const audio=createEnsembleAudio({onState(s){last=s;if(['finished','interrupted','unavailable'].includes(s.status))done=true;}}),stop=()=>{done=true;cancelAnimationFrame(frame);audio.stop();resolveWait?.();};signal?.addEventListener('abort',stop,{once:true});
 try{if(signal?.aborted||!await audio.prepare(v.settings)||signal?.aborted)throw Error('Audio probe cancelled or unavailable');if(!audio.commit(v.sources.slice(0,2).map((line,i)=>line?{line,acoustics:v.acoustics[i]}:null)))throw Error('Audio probe could not start');await new Promise(resolve=>{resolveWait=resolve;const next=now=>{if(done||signal?.aborted){resolve();return;}if(lastFrame!==null)maxFrameMs=Math.max(maxFrameMs,now-lastFrame);lastFrame=now;frames++;const elapsed=audio.elapsed();if(elapsed!==null&&!finished){try{const due=counterlineStepBudget(elapsed,ticks);maxDue=Math.max(maxDue,due);for(let i=0;i<due;i++){const physical=ticks++/120;while(index<impacts.length&&impacts[index].time<=physical+1e-9)audio.live(impacts[index++]);if(ticks/120>=v.sources[2].terminal.elapsed-1e-9){finished=true;audio.finish(v.sources[2].terminal.elapsed);break;}}}catch(e){audio.interrupt(String(e));}}frame=requestAnimationFrame(next);};frame=requestAnimationFrame(next);});const state=audio.state();return {renderer:'Actual browser AudioContext/rAF; recorded notifications, NOT live Havok',frames,maxFrameMs,maxDueTicks:maxDue,physicalNotifications:index,status:last,audit:state.audit,sources:state.sources};}finally{cancelAnimationFrame(frame);signal?.removeEventListener('abort',stop);audio.dispose();}
}
