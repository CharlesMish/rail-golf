import {recognizedIntentEvents} from './intent-lab.js';
import {matchLinecraftSentence} from './linecraft-lab.js';

// Read-only presentation of observed evidence. Never generate claims or score.
const surfaces={'bank-a':'BANK A','bank-b':'BANK B','step-a':'TREAD 1','step-b':'TREAD 2','step-c':'TREAD 3','floor-a':'FLOOR A','floor-b':'FLOOR B',ground:'GROUND','other-solid':'UNNAMED SOLID'};
const surfaceLabel=event=>surfaces[event.surface]??event.label??event.surface??'Unidentified surface';
const number=value=>Number.isFinite(value)?value.toFixed(1):'unknown';
export const linecraftPowerLabel=value=>`${number(value*100)}%`;

export function linecraftFeedback(shot){
 const ledger=shot.ledger??[];
 const reason=ledger.findLast(event=>event.kind==='termination')?.reason??'unresolved';
 const interrupted=['retry-interrupted','interrupted','unresolved'].includes(reason);
 const terminalContact=ledger.findLast(event=>event.kind==='contact'&&event.terminal);
 const kiss=shot.contacts?.findLast(contact=>contact.kind==='first-kiss');
 const point=terminalContact?.point??kiss?.point;
 const location=point?` · x ${number(point.x)}, y ${number(point.y)}, z ${number(point.z)} m`:'';
 const ending=interrupted?'Interrupted · no final landing ruling':reason==='ground-contact'?`Ground contact${terminalContact?` · ${surfaceLabel(terminalContact)}`:''}${location}`:reason.replaceAll('-',' ')+location;
 const contacts=ledger.filter(event=>event.kind==='contact').map(surfaceLabel).filter((label,index,all)=>index===0||label!==all[index-1]);
 const events=recognizedIntentEvents(ledger).map(event=>{
  if(event.kind!=='redirect')return event.label;
  const label=surfaceLabel(event);
  return / (rebound|reject|kick)$/i.test(label)?label.replace(/ (rebound|reject|kick)$/i,' rebound'):`${label} rebound`;
 });
 const meta=shot.linecraftMeta?.linecraft??shot.linecraftMeta;
 const lesson=meta?.stage==='learn'&&meta.lessonId?matchLinecraftSentence(meta.lessonId,ledger):null;
 const progress=interrupted?`Interrupted · ${lesson?`${lesson.reached}/${lesson.total} ordered rebounds observed · `:''}no completed attempt`:lesson?`${lesson.reached}/${lesson.total} ordered rebounds${lesson.complete?' · Lesson complete':` · Next required: ${lesson.labels[lesson.reached]}`}`:meta?'Open · no required finish':'Progress not recorded';
 return {interrupted,ending,contacts:contacts.join(' → ')||'No solid contacts recorded',events:events.join(' → ')||'No qualified events recorded',progress,firstKiss:reason==='ground-contact',lesson};
}

export function linecraftShotDetails(shot){
 const feedback=linecraftFeedback(shot),launch=shot.linecraftLaunch,setup=launch?.setup??shot;
 return [
  `Rail Golf · shot #${shot.projectileId}`,
  `Build: ${launch?.build??shot.build??'unknown'}`,
  `Start: ${shot.stationId==='gate'?'Yard Gate':shot.stationId==='lumber'?'Lumber Walk':shot.stationId??'unknown'}`,
  `Stage: ${(shot.linecraftMeta?.linecraft??shot.linecraftMeta)?.stage??'unknown'}`,
  `Power control: ${shot.shotControls?.powerMode??'not recorded'} · MAX: ${shot.shotControls?String(shot.shotControls.max):'not recorded'}`,
  `Origin: ${number(setup.originX)} m · yaw: ${number(setup.yaw)}° · elevation: ${number(setup.elevation)}°`,
  `Power: ${linecraftPowerLabel(setup.charge)} · exact charge: ${setup.charge} · launch speed: ${launch?.launchSpeed??'unknown'} m/s`,
  `Exact setup: ${JSON.stringify(launch?.setup??{railIndex:shot.railIndex,originX:shot.originX,yaw:shot.yaw,elevation:shot.elevation,charge:shot.charge})}`,
  `Starting pallet: ${launch?.environment?.floor??shot.environment?.floor??'unknown'}`,
  `State: ${feedback.interrupted?'interrupted':'final'}`,
  `Ending: ${feedback.ending}`,
  `Contacts: ${feedback.contacts}`,
  `Qualified events: ${feedback.events}`,
  `Progress: ${feedback.progress}`,
 ].join('\n');
}
