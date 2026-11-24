// One historical contact phrase beside one new physical flight. This module
// deliberately has no scene/runtime import and cannot manufacture a collision.
import { validateLoopLine } from './playability-loops.js';
import { createVoiceLedger, scheduleImpact } from './worldcraft-resonance.js';
export const COUNTERLINE_GAIN = .45;
export const COUNTERLINE_DELAY = .1;
export const COUNTERLINE_PAIR_KEY = 'rail-golf:counterline:pair-v1';
export const COUNTERLINE_SHELF_PREFIX = 'rail-golf:counterline:shelf-v1:';
const clone = value => structuredClone(value);
export function counterlineSettings(input={}) {
 const result={voice:'canonical-resonance-v1',gain:COUNTERLINE_GAIN,delay:COUNTERLINE_DELAY,liveMuted:false,companionMuted:false,...input};
 if(Object.keys(result).sort().join(',')!=='companionMuted,delay,gain,liveMuted,voice'||result.voice!=='canonical-resonance-v1'||result.gain!==COUNTERLINE_GAIN||result.delay!==COUNTERLINE_DELAY||typeof result.liveMuted!=='boolean'||typeof result.companionMuted!=='boolean')throw Error('Unsupported Counterline playback settings.');
 return result;
}
export function createCounterlinePair(companion,live,settings) {
 const sources=[validateLoopLine(companion),validateLoopLine(live)];
 return {format:'rail-golf-counterline-pair',version:1,sources,settings:counterlineSettings(settings)};
}
export function validateCounterlinePair(input) {
 if(!input||JSON.stringify(input).length>600000||Object.keys(input).sort().join(',')!=='format,settings,sources,version'||input.format!=='rail-golf-counterline-pair'||input.version!==1||!Array.isArray(input.sources)||input.sources.length!==2)throw Error('Unsupported Counterline pair.');
 if(!input.settings||Object.keys(input.settings).sort().join(',')!=='companionMuted,delay,gain,liveMuted,voice')throw Error('Pairing needs its explicit playback settings.');
 return createCounterlinePair(input.sources[0],input.sources[1],input.settings);
}
export function loadCounterlinePair(storage) {
 try{const raw=storage?.getItem(COUNTERLINE_PAIR_KEY);return {pair:raw?validateCounterlinePair(JSON.parse(raw)):null,writable:true,warning:''};}
 catch{return {pair:null,writable:false,warning:'Saved pairing could not be read. Original bytes are preserved; export a new pairing instead.'};}
}
/**
 * Launch uses this context clock as physical t=0, with 100ms common acoustic
 * latency. Havok still advances exclusively in 1/120s steps. Live notes arrive
 * from collision callbacks; history is an independent immutable schedule.
 * A long stall cancels, rather than making two clocks drift or dropping notes.
 */
export function createCounterlineAudio(options={}) {
 const Context=options.Context??globalThis.AudioContext??globalThis.webkitAudioContext;
 const schedule=options.schedule??scheduleImpact;
 const setTimer=options.setInterval??globalThis.setInterval,clearTimer=options.clearInterval??globalThis.clearInterval;
 let ctx=null,timer=null,generation=0,disposed=false,active=false,origin=0,lastPump=0,next=0,events=[],liveEnd=null,endTime=Infinity,settings=counterlineSettings(),firedSettings=null;
 const ledgers=[createVoiceLedger(),createVoiceLedger()];
 let audit={origin:0,audioOrigin:0,delay:COUNTERLINE_DELAY,scheduled:[],late:[],status:'idle'};
 const notify=(status,detail='')=>{audit.status=status;options.onState?.({status,detail});};
 const halt=(status='stopped',detail='',interrupt=false)=>{
  generation++;active=false;events=[];next=0;
  if(timer!==null){clearTimer(timer);timer=null;}
  ledgers.forEach(ledger=>ledger.release());
  const closing=ctx;ctx=null;if(closing&&closing.state!=='closed'){try{Promise.resolve(closing.close()).catch(()=>{});}catch{}}
  notify(status,detail);if(interrupt)options.onInterrupt?.(detail);
 };
 const fail=detail=>halt('interrupted',detail,true);
 const emit=(impact,layer)=>{
  if(!ctx||!active)return;
  const when=origin+COUNTERLINE_DELAY+impact.time,late=ctx.currentTime-when;
  // A few milliseconds of audio-clock block rounding is tolerated. A missed
  // deadline is never quietly rescheduled as if its timing were still exact.
  if(late>.008){audit.late.push({layer,time:impact.time,late});fail('Audio timing fell behind. This pairing stopped; Retry when ready.');return;}
  if(layer===0?settings.companionMuted:settings.liveMuted)return;
  if(audit.scheduled.filter(event=>Math.abs(event.target-when)<2.1).length>=24){fail('Pairing exceeded the bounded voice budget (24 overlapping attacks). No further notes were played.');return;}
  try{
   const actual=Math.max(when,ctx.currentTime);
   const nodes=schedule(ctx,actual,{...impact,gain:impact.gain*COUNTERLINE_GAIN});nodes.forEach(node=>ledgers[layer].watch(node));
   audit.scheduled.push({layer,time:impact.time,target:when,scheduled:actual,observedAt:ctx.currentTime,sources:nodes.length});
  }catch(error){fail(`Audio stopped: ${String(error.message??error)}`);}
 };
 const pump=()=>{
  if(!active||!ctx)return;
  if(ctx.state!=='running'){fail('Audio was suspended. Retry explicitly when ready.');return;}
  const now=ctx.currentTime;
  if(now-lastPump>.12){fail('Playback paused after a scheduling interruption. Retry when ready.');return;}
  lastPump=now;
  while(active&&next<events.length&&origin+COUNTERLINE_DELAY+events[next].time<=now+.08)emit(events[next++],0);
  if(active&&now>=endTime)halt('finished','Pairing finished.');
 };
 return {
  async prepare(input={}) {
   if(disposed)return false;halt();settings=counterlineSettings(input);firedSettings=null;
   if(!Context){notify('unavailable','Web Audio is unavailable.');return false;}
   const token=generation;
   try{
    ctx=new Context({latencyHint:'interactive'});const opening=ctx;notify('starting','Preparing audio…');
    opening.onstatechange=()=>{if(ctx===opening&&active&&opening.state!=='running')fail('Audio was suspended. Retry explicitly when ready.');};
    if(opening.state==='suspended')await opening.resume();
    if(token!==generation||disposed)return false;
    if(opening.state!=='running'){halt('unavailable','Audio could not start. Try Fire again.');return false;}
    return true;
   }catch(error){if(token===generation)halt('unavailable',String(error.message??error));return false;}
  },
  commit(companion=null) {
   if(disposed||!ctx||ctx.state!=='running'||active)return false;
   let source;try{source=companion?validateLoopLine(companion):null;}catch(error){halt('unavailable',String(error.message??error));return false;}
   events=source?clone(source.performance.impacts):[];next=0;liveEnd=null;endTime=Infinity;
   origin=ctx.currentTime;lastPump=origin;active=true;firedSettings=clone(settings);
   audit={origin,audioOrigin:origin+COUNTERLINE_DELAY,delay:COUNTERLINE_DELAY,scheduled:[],late:[],status:'playing'};
   notify('playing',source?'One companion alongside this live shot.':'Solo physical shot.');
   pump();if(active)timer=setTimer(pump,20);return active;
  },
  elapsed(){return active&&ctx?Math.max(0,ctx.currentTime-origin):null;},
  live(impact){emit(impact,1);},
  finish(elapsed){if(!active||!ctx)return;liveEnd=elapsed;endTime=origin+COUNTERLINE_DELAY+Math.max(liveEnd,events.at(-1)?.time??0)+2.1;pump();},
  setMuted(layer,value){if(layer!==0&&layer!==1)return;settings[layer===0?'companionMuted':'liveMuted']=value===true;if(value)ledgers[layer].release();},
  stop(){halt();},
  interrupt(detail='Pairing interrupted.'){halt('interrupted',detail,true);},
  state(){return {active,context:ctx?.state??'uncreated',pending:Math.max(0,events.length-next),sources:ledgers.map(l=>l.counts()),settings:clone(settings),firedSettings:clone(firedSettings),audit:clone(audit)};},
  dispose(){if(disposed)return;disposed=true;halt();},
 };
}
// Exact integer step budget, shared by the browser route and physical tests.
// Refuse stalls; never cap and discard physical elapsed time.
export function counterlineStepBudget(elapsed,ticks) {
 if(!Number.isFinite(elapsed)||elapsed<0||!Number.isInteger(ticks)||ticks<0)throw Error('Invalid fixed-step clock.');
 const due=Math.max(0,Math.floor((elapsed+1e-9)*120)-ticks);
 if(due>12)throw Error('Physical display fell behind. Pairing stopped; Retry when ready.');
 return due;
}
export async function measureCounterlineAudio(pairInput,Context=globalThis.OfflineAudioContext) {
 const pair=validateCounterlinePair(pairInput);if(!Context)throw Error('OfflineAudioContext unavailable.');
 const duration=Math.max(...pair.sources.map(l=>l.terminal.elapsed))+COUNTERLINE_DELAY+2.1,measurements=[];
 for(const layers of [[0],[1],[0,1]]){
  const ctx=new Context(1,Math.ceil(duration*44100),44100);let nodes=0,attacks=0;
  for(const layer of layers)for(const impact of pair.sources[layer].performance.impacts){nodes+=scheduleImpact(ctx,COUNTERLINE_DELAY+impact.time,{...impact,gain:impact.gain*COUNTERLINE_GAIN}).length;attacks++;}
  const start=performance.now(),buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let peak=0,squares=0;
  for(const sample of data){peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;}
  measurements.push({layers,attacks,nodes,duration:buffer.duration,sampleRate:buffer.sampleRate,floatPeak:peak,rms:Math.sqrt(squares/data.length),renderMs:performance.now()-start});
 }
 return {renderer:'Actual browser OfflineAudioContext; two historical Havok records, not a live physics run',gain:COUNTERLINE_GAIN,commonDelay:COUNTERLINE_DELAY,measurements};
}

// Explicit browser QA only: recorded event notifications delivered on actual
// requestAnimationFrame cadence. This is an audio scheduler probe, NOT Havok.
export async function measureCounterlineClock(pairInput,{signal}={}) {
 const pair=validateCounterlinePair(pairInput);let frame=0,done=false,lastFrame=null,last=null,frames=0,maxFrameMs=0,maxDue=0,ticks=0,index=0,finishedLive=false;
 const player=createCounterlineAudio({onState(state){last=state;if(['finished','interrupted','unavailable'].includes(state.status))done=true;}});
 const stop=()=>{done=true;player.stop();};signal?.addEventListener('abort',stop,{once:true});
 try{
  if(signal?.aborted)throw Error('Measurement cancelled');
  if(!await player.prepare(pair.settings)||signal?.aborted)throw Error('Audio clock could not start');
  if(!player.commit(pair.sources[0]))throw Error('Recorded timing probe could not start');
  await new Promise(resolve=>{
   const next=now=>{
    if(lastFrame!==null)maxFrameMs=Math.max(maxFrameMs,now-lastFrame);lastFrame=now;frames++;
    if(done||signal?.aborted){resolve();return;}
    const elapsed=player.elapsed();
    if(elapsed!==null&&!finishedLive){
     try{const due=counterlineStepBudget(elapsed,ticks);maxDue=Math.max(maxDue,due);for(let i=0;i<due;i++){
      // A collision notification carries the beginning-of-step timestamp.
      const physical=ticks/120;ticks++;
      while(index<pair.sources[1].performance.impacts.length&&pair.sources[1].performance.impacts[index].time<=physical+1e-9)player.live(pair.sources[1].performance.impacts[index++]);
      if(ticks/120>=pair.sources[1].terminal.elapsed-1e-9){finishedLive=true;player.finish(pair.sources[1].terminal.elapsed);break;}
     }}catch(error){player.interrupt(String(error));}
    }
    frame=requestAnimationFrame(next);
   };frame=requestAnimationFrame(next);
  });
  const state=player.state();return {renderer:'Actual browser AudioContext and requestAnimationFrame; recorded notifications, NOT live Havok',frames,maxFrameMs,maxDueTicks:maxDue,physicalNotifications:index,status:last,audit:state.audit,sources:state.sources};
 }finally{cancelAnimationFrame(frame);signal?.removeEventListener('abort',stop);player.dispose();}
}
// Source identifiers are labels, not authentication. Refuse an import that
// reuses one for different physical bytes rather than showing the wrong option.
export function assertCounterlineSourceIds(lines) {
 const seen=new Map();
 for(const input of lines){const line=validateLoopLine(input),text=JSON.stringify(line);if(seen.has(line.id)&&seen.get(line.id)!==text)throw Error(`Source identifier ${line.id} already belongs to a different recorded line. Import refused.`);seen.set(line.id,text);}
 return true;
}
