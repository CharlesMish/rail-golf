// Acoustic interpretation is additive and separate from the unchanged physical
// Worldcraft v1 line. Unannotated historical gain is never inverted as face speed.
import {validateLoopLine} from './playability-loops.js';
import {packWorldcraftLine} from './worldcraft-model.js';
import {voiceImpact,impactGain,WORLDCRAFT_RESONANCE_NORMAL_FULL} from './worldcraft-resonance.js';
export const COUNTERLINE_RECORDINGS_KEY='rail-golf:counterline:recordings-v1';
const clone=structuredClone;
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
export function validateCounterlineProfile(value){
 if(!exact(value,'bankVoice,dynamics,version')||value.version!==1||!['normal-speed','total-speed'].includes(value.dynamics)||![null,'tuned-even'].includes(value.bankVoice)||(value.bankVoice&&value.dynamics!=='normal-speed'))throw Error('Unsupported captured acoustic interpretation.');
 return clone(value);
}
export function validateCounterlineAcoustics(value,line){
 if(!exact(value,'normalSpeeds,profile'))throw Error('Captured acoustics need their profile and measured face speeds.');
 const profile=validateCounterlineProfile(value.profile),impacts=line.performance?.impacts??[];
 if(!Array.isArray(value.normalSpeeds)||value.normalSpeeds.length!==impacts.length||value.normalSpeeds.some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>10000)))throw Error('Captured face speeds must match the physical contact order.');
 if(profile.bankVoice&&value.normalSpeeds.some((speed,i)=>speed===null||Math.abs(impactGain(speed,WORLDCRAFT_RESONANCE_NORMAL_FULL)-impacts[i].gain)>1e-12))throw Error('Tuned playback needs captured face speeds consistent with the recorded face-speed gains.');
 return {profile,normalSpeeds:[...value.normalSpeeds]};
}
export function captureCounterlineRecording(lineInput,resonance,profileInput){
 const line=packWorldcraftLine(lineInput),profile=validateCounterlineProfile(profileInput),impacts=resonance?.impacts??[];
 if(impacts.length!==(line.performance?.impacts.length??0)||impacts.some((v,i)=>{const p=line.performance.impacts[i];return ['piece','role','time','material','degree','note','hz','gain','callbacks'].some(key=>v[key]!==p[key])||v.dynamics!==profile.dynamics;}))throw Error('The acoustic capture does not match this physical line.');
 return validateCounterlineRecording({format:'rail-golf-counterline-recording',version:1,line,acoustics:{profile,normalSpeeds:impacts.map(v=>Number.isFinite(v.normalSpeed)?v.normalSpeed:null)}});
}
export function validateCounterlineRecording(value){
 if(!exact(value,'acoustics,format,line,version')||value.format!=='rail-golf-counterline-recording'||value.version!==1||JSON.stringify(value).length>280000)throw Error('Unsupported Counterline recording.');
 if(value.line?.version!==1||!exact(value.line,'contacts,createdAt,events,id,launch,performance,points,setup,terminal,version,worldSnapshot'))throw Error('A capture needs an unchanged complete physical line.');
 const line=packWorldcraftLine(value.line);
 if(line.performance?.impacts.length)validateLoopLine(line);
 else{const first=line.points[0],last=line.points.at(-1),end=line.terminal.elapsed;if(!Number.isFinite(end)||end<=0||end>60||first.t!==0||last.t!==end||!line.points.every((p,i)=>Number.isFinite(p.t)&&p.t>=0&&p.t<=end&&(i===0||p.t>line.points[i-1].t))||['x','y','z'].some((key,i)=>first[key]!==line.launch.muzzle[key]||last[key]!==line.terminal.position?.[i]))throw Error('The silent physical path does not match its launch and ending.');}
 return {format:value.format,version:1,line,acoustics:validateCounterlineAcoustics(value.acoustics,line)};
}
export function counterlineVoicedImpact(impact,profile,normalSpeed){
 const selected=validateCounterlineProfile(profile);
 if(!selected.bankVoice)return {...impact};
 if(!Number.isFinite(normalSpeed))throw Error('Tuned playback requires its captured face speed.');
 return voiceImpact({...impact,normalSpeed},selected.bankVoice);
}
export function counterlineRecordedImpacts(line,acoustics=null){
 const impacts=line.performance?.impacts??[];
 if(!acoustics)return clone(impacts); // Legacy means exactly stored gain, canonical timbre.
 const validated=validateCounterlineAcoustics(acoustics,line);
 return impacts.map((impact,i)=>counterlineVoicedImpact(impact,validated.profile,validated.normalSpeeds[i]));
}
export function assertCounterlineRecordingIds(recordings){
 const seen=new Map();for(const input of recordings){const value=validateCounterlineRecording(input),bytes=JSON.stringify(value);if(seen.has(value.line.id)&&seen.get(value.line.id)!==bytes)throw Error('This source identifier already has a different captured performance. Import refused.');seen.set(value.line.id,bytes);}return true;
}
export function loadCounterlineRecordings(storage){
 try{const raw=storage?.getItem(COUNTERLINE_RECORDINGS_KEY);if(!raw)return {recordings:[],warning:'',writable:true};if(raw.length>1200000)throw Error('Oversized captures');const values=JSON.parse(raw);if(!Array.isArray(values)||values.length>4)throw Error('Capture shelf needs at most four lines');const recordings=values.map(validateCounterlineRecording);assertCounterlineRecordingIds(recordings);return {recordings,warning:'',writable:true};}
 catch{return {recordings:[],warning:'Captured audio memory could not be read. Original bytes are preserved; download a new recording before leaving.',writable:false};}
}
export function counterlineRecordingLabel(acoustics){return acoustics?`${acoustics.profile.dynamics==='normal-speed'?'Face-speed':'Total-speed'} capture · ${acoustics.profile.bankVoice?'H tuned timber banks':'canonical timber / metal'}; original times and recorded dynamics`:'Historical recording · stored gains and canonical timber / metal; original voice selection unknown';}
