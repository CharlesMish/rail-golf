// Audio-only arrangements of immutable Worldcraft shot records. Never imports
// a scene, physics engine, runtime or projectile constructor.
import { packWorldcraftLine, WORLDCRAFT_STORAGE_PREFIX, createWorldcraftStore } from './worldcraft-model.js';
import { resonanceOf, scheduleImpact, createVoiceLedger } from './worldcraft-resonance.js';
export const LOOP_STORAGE_KEY = 'rail-golf:playability:contact-loops-v1';
export const LOOP_MAX_BYTES = 2200000;
export const LOOP_GAIN = .45;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const clone = value => structuredClone(value);

export function validateLoopLine(input) {
 if (!input || JSON.stringify(input).length > 270000 || input.version !== 1 || typeof input.id !== 'string' || typeof input.createdAt !== 'string' || !Object.hasOwn(input,'id') || !Object.hasOwn(input,'createdAt') || Object.keys(input).sort().join(',') !== 'contacts,createdAt,events,id,launch,performance,points,setup,terminal,version,worldSnapshot') throw Error('Choose a complete Worldcraft kept line.');
 const line = packWorldcraftLine(input), end = line.terminal.elapsed;
 if (!finite(end) || end <= 0 || end > 60 || !['first-ground-contact','out-of-bounds','settled','safety-timeout','interrupted'].includes(line.terminal.reason)) throw Error('The line needs a bounded recorded ending.');
 if (!line.points.length || !line.points.every((p,i) => finite(p.t) && p.t >= 0 && p.t <= end && (i===0||p.t>line.points[i-1].t))) throw Error('The line needs its actual timestamped path.');
 const first=line.points[0],last=line.points.at(-1);
 if(first.t!==0||['x','y','z'].some(key=>first[key]!==line.launch.muzzle[key])||last.t!==end||!Array.isArray(line.terminal.position)||line.terminal.position.length!==3||['x','y','z'].some((key,i)=>last[key]!==line.terminal.position[i]))throw Error('The path does not match the recorded launch and ending.');
 if (!line.performance?.impacts.length) throw Error('This line has no recorded resonant sounds.');
 let previous = -1;
 for (const impact of line.performance.impacts) {
  if (impact.time < previous || impact.time > end) throw Error('Recorded sounds must remain in physical time order.');
  previous = impact.time;
  const target = line.worldSnapshot.world.rules?.target;
  const body = impact.role === 'orc' || impact.role === 'bell' ? `worldcraft-target-${target?.id}` : `worldcraft-object-${impact.piece}`;
  const spec = resonanceOf(line.worldSnapshot.world, body);
  if (!spec || ['piece','role','material','degree','note','hz'].some(key => spec[key] !== impact[key])) throw Error('A recorded sound does not match its source world voice.');
  if (!line.contacts.some(contact => contact.body === body && impact.time >= contact.first - 1e-9 && impact.time <= contact.last + 1e-9)) throw Error('A recorded sound has no corresponding physical contact.');
 }
 return clone(line);
}

export function importLoopLines(text) {
 if (typeof text !== 'string' || text.length > LOOP_MAX_BYTES) throw Error('Choose a Worldcraft memory export smaller than 2.2 MB.');
 const document = JSON.parse(text);
 const candidates = document?.format === 'rail-golf-worldcraft-local-export' && document.version === 1 && Array.isArray(document.lines) && document.lines.length <= 4 ? document.lines : [document];
 const lines = [], rejected = [];
 for (const line of candidates) { try { lines.push(validateLoopLine(line)); } catch (error) { rejected.push(String(error.message)); } }
 if (!lines.length) throw Error(rejected[0] ?? 'No recorded resonant line found.');
 return { lines, rejected };
}

export function readLocalLoopLines(storage) {
 // The existing store is used read-only. No existing shelf bytes are changed.
 if (!storage) return { lines: [], warning: 'Browser storage is unavailable. Import an exported Worldcraft memory file.' };
 const store = createWorldcraftStore({getItem:key=>storage.getItem(key),setItem(){throw Error('Read-only source shelf');}});
 const lines=[];for(const line of store.lines()){try{lines.push(validateLoopLine(line));}catch{/* Silent or unsupported lines stay untouched in their own shelf. */}}
 return {lines,warning:store.status().warning || (storage.getItem(WORLDCRAFT_STORAGE_PREFIX+'lines') && !lines.length ? 'Your local shelf has no supported resonant lines.' : '')};
}

export function createLoopPlan(lines, offsetB = false) {
 if (!Array.isArray(lines) || lines.length !== 2 || typeof offsetB !== 'boolean') throw Error('Choose exactly two recorded lines.');
 const sources = lines.map(validateLoopLine);
 // Whole flights remain on their measured clock. Round up to a half second and
 // leave >= .5 s after the later projectile ending. This is silence, not stretch.
 const period = Math.ceil((Math.max(...sources.map(line => line.terminal.elapsed)) + .5) * 2) / 2;
 return {format:'rail-golf-recorded-contact-pair',version:1,sources,offsetB,period,cycles:Math.min(8,Math.max(1,Math.floor(120/period)))};
}
export function validateLoopPlan(value) {
 if (!value || value.format !== 'rail-golf-recorded-contact-pair' || value.version !== 1) throw Error('Unsupported recorded-contact pair.');
 const plan = createLoopPlan(value.sources,value.offsetB);
 if (value.period !== plan.period || value.cycles !== plan.cycles) throw Error('The saved pair has changed timing.');
 return plan;
}
export function loopEvents(planInput) {
 const plan=validateLoopPlan(planInput), events=[];
 for(let cycle=0;cycle<plan.cycles;cycle++) for(let layer=0;layer<2;layer++) {
  for(const [index,impact]of plan.sources[layer].performance.impacts.entries()) {
   const offset=layer===1&&plan.offsetB?plan.period/2:0;
   const time=cycle*plan.period+impact.time+offset;
   // Keep the whole source line, including B's delayed last pass. No wrapping,
   // clipping or hidden time quantization at the common loop boundary.
   events.push({time,layer,cycle,index,impact:clone(impact)});
  }
 }
 events.sort((a,b)=>a.time-b.time||a.layer-b.layer||a.index-b.index);
 // At most 24 overlapping attacks (120 resonant sources) in the 2.1 s voice
 // lifetime. Refuse a dense import rather than silently dropping its notes.
 for(let i=0,j=0;i<events.length;i++){while(events[i].time-events[j].time>=2.1)j++;if(i-j+1>24)throw Error('This pair is too dense for the bounded audio study (24 overlapping attacks).');}
 return events;
}
export function loadLoopPair(storage) {
 try {const raw=storage?.getItem(LOOP_STORAGE_KEY);if(!raw)return {plan:null,warning:'',writable:true};if(raw.length>600000)throw Error('Oversized saved pair');return {plan:validateLoopPlan(JSON.parse(raw)),warning:'',writable:true};}
 catch{return {plan:null,warning:'The saved pair could not be read. Its original bytes are preserved.',writable:false};}
}

export function createContactLoopPlayer(options={}) {
 const Context=options.Context??globalThis.AudioContext??globalThis.webkitAudioContext;
 const schedule=options.schedule??scheduleImpact;
 const setTimer=options.setInterval??globalThis.setInterval,clearTimer=options.clearInterval??globalThis.clearInterval;
 let ctx=null,timer=null,generation=0,disposed=false,playing=false,muted=[false,false],startTime=0,events=[],next=0,lastPump=0,endTime=0;
 const ledgers=[createVoiceLedger(),createVoiceLedger()];
 const notify=(status,detail='')=>options.onState?.({status,detail});
 const halt=(status='stopped',detail='')=>{
  generation++;playing=false;events=[];next=0;
  if(timer!==null){clearTimer(timer);timer=null;}
  for(const ledger of ledgers)ledger.release();
  const closing=ctx;ctx=null;if(closing&&closing.state!=='closed'){try{Promise.resolve(closing.close()).catch(()=>{});}catch{/* Already closed. */}}
  notify(status,detail);
 };
 const pump=()=>{
  if(!playing||!ctx)return;
  if(ctx.state!=='running'){halt('stopped','Audio was interrupted. Start again when ready.');return;}
  const now=ctx.currentTime;
  if(now-lastPump>.5){halt('stopped','Playback paused because the audio scheduler was delayed. Start again when ready.');return;}
  lastPump=now;
  if(now>=endTime){halt('finished','Finished this finite listen.');return;}
  try{while(next<events.length&&startTime+events[next].time<=now+.15){
   const event=events[next++],when=startTime+event.time;
   if(!muted[event.layer]&&when>=now-.035)for(const node of schedule(ctx,Math.max(now,when),{...event.impact,gain:event.impact.gain*LOOP_GAIN}))ledgers[event.layer].watch(node);
  }}catch(error){halt('unavailable',`Audio scheduling stopped: ${String(error.message??error)}`);return;}
  options.onTick?.(Math.max(0,now-startTime));
 };
 return {
  async start(planInput,mask=[false,false]) {
   if(disposed)return false;
   halt();let plan,pending;try{plan=validateLoopPlan(planInput);pending=loopEvents(plan);}catch(error){notify('unavailable',String(error.message??error));return false;}
   if(!Context){notify('unavailable','This browser does not provide Web Audio.');return false;}
   const token=generation;muted=mask.map(Boolean);
   try{
    ctx=new Context({latencyHint:'interactive'});const opening=ctx;
    notify('starting');
    if(opening.state==='suspended')await opening.resume();
    if(token!==generation||disposed)return false;
    if(opening.state!=='running'){halt('unavailable','Audio could not start. Use Start again.');return false;}
    events=pending;next=0;startTime=opening.currentTime+.08;lastPump=opening.currentTime;
    endTime=startTime+Math.max(plan.period*plan.cycles,events.at(-1)?.time??0)+2.1;
    playing=true;notify('playing');pump();if(!playing)return false;timer=setTimer(pump,25);return true;
   }catch(error){if(token===generation)halt('unavailable',`Audio could not start: ${String(error.message??error)}`);return false;}
  },
  setMuted(layer,value){if(layer!==0&&layer!==1)return;muted[layer]=value===true;if(muted[layer])ledgers[layer].release();},
  stop(){halt();},
  counts(){return {playing,active:ledgers.reduce((sum,l)=>sum+l.counts().active,0),sources:ledgers.map(l=>l.counts()),pending:Math.max(0,events.length-next)};},
  dispose(){if(disposed)return;disposed=true;halt();},
 };
}

// Optional QA measurement: actual shared Web Audio voices, two complete passes,
// float PCM before WAV quantization. No audio destination or physical simulation.
export async function measureContactLoopAudio(plan, Context=globalThis.OfflineAudioContext) {
 if(typeof Context!=='function')throw Error('OfflineAudioContext is unavailable');
 const measured=[];
 for(const offset of [false,true]){
  const candidate=createLoopPlan(plan.sources,offset),events=loopEvents(candidate).filter(e=>e.cycle<2);
  for(const layers of [[0],[1],[0,1]]){
   const selected=events.filter(e=>layers.includes(e.layer)),duration=Math.max(candidate.period*2,selected.at(-1)?.time??0)+2.1;
   const ctx=new Context(1,Math.ceil(duration*44100),44100);let nodes=0;
   for(const event of selected)nodes+=scheduleImpact(ctx,event.time,{...event.impact,gain:event.impact.gain*LOOP_GAIN}).length;
   const start=performance.now(),buffer=await ctx.startRendering(),samples=buffer.getChannelData(0);
   let peak=0,squares=0;for(const sample of samples){peak=Math.max(peak,Math.abs(sample));squares+=sample*sample;}
   measured.push({offsetB:offset,layers,attacks:selected.length,nodes,duration:buffer.duration,sampleRate:buffer.sampleRate,floatPeak:peak,rms:Math.sqrt(squares/samples.length),renderMs:performance.now()-start});
  }
 }
 return {renderer:'Browser OfflineAudioContext; shared Worldcraft scheduleImpact + mix limiter',passes:2,layerGain:LOOP_GAIN,measurements:measured};
}
