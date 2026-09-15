import {stationAim,stationMuzzle} from './stations.js';
import {chargeToSpeed} from './rail-golf-v02.js';

// Lab input authority only; never imported by physics/scoring/progression modules.
export const LAB_PHASES=Object.freeze({
 selectHole:['ready','result'],nextHole:['ready','result'],selectStation:['ready','result'],
 reset:['ready','charging','flight','theatre','result'],retry:['ready','charging','flight','theatre','result'],
 restoreLine:['ready'],recallAttempt:['ready','result'],recallRoute:['ready','result'],
 beginCharge:['ready'],release:['charging'],cancelCharge:['charging'],toggleMax:['ready','result'],
 shiftRail:['ready','charging'],nudgeYaw:['ready','charging'],nudgeElevation:['ready','charging'],
 toggleSurvey:['ready','charging'],compareAttempts:['ready'],
});
const names={selectHole:'select-card',nextHole:'next-card',selectStation:'select-station',reset:'reset-card',retry:'retry',restoreLine:'restore-last-line',recallAttempt:'recall-attempt',recallRoute:'recall-route',beginCharge:'begin-charge',release:'fire',cancelCharge:'cancel-charge',toggleMax:'toggle-max',shiftRail:'shift-rail',nudgeYaw:'aim-yaw',nudgeElevation:'aim-elevation',toggleSurvey:'toggle-survey',compareAttempts:'compare-lines'};
export function createLabControl({read,handlers,record,request:describeRequest=()=>({}),onError=()=>{}}){
 let revision=0,activeSource='internal/programmatic';
 const snapshot=()=>structuredClone(read());
 const emit=(action,source,before,accepted,reason,request)=>record({action,source,before,after:snapshot(),accepted,reason,...(request?{request}:{})});
 return {
  revision:()=>revision,
  source:()=>activeSource,
  // Also invalidates a held gesture when physics changes flight/theatre/result.
  transition(action,change,source='internal/programmatic'){
   const before=snapshot();revision++;change();emit(action,source,before,true,'transition');
  },
  rejectGesture(reason){emit('control-gesture','pointer',snapshot(),false,reason);},
  run(method,args=[],source='internal/programmatic'){
   const before=snapshot(),action=method==='reset'&&args[0]?'adjust-last-line':names[method]??method;
   const request={method,args:structuredClone(args),...describeRequest(method,args)};
   const fn=handlers()[method];
   if(!LAB_PHASES[method]?.includes(before.phase)){emit(action,source,before,false,'phase-guard',request);return false;}
   if(!fn){emit(action,source,before,false,'handler-unavailable',request);return false;}
   const previousSource=activeSource;activeSource=source;
   const quiet=method==='nudgeYaw'||method==='nudgeElevation'; // fire snapshot records aim; held arrows are not action-trace spam
   try{
    // false / a reason string is an explicit no-op (e.g. no saved line).
    const result=fn(...args),accepted=result!==false&&typeof result!=='string';
    if(accepted)revision++;
    if(!quiet)emit(action,source,before,accepted,accepted?'accepted':typeof result==='string'?result:'unavailable',request);
    return accepted;
   }catch(error){emit(action,source,before,false,'action-error: '+String(error),request);onError(String(error));return false;}
   finally{activeSource=previousSource;}
  },
 };
}

// Pointer click must belong to the same mounted control and authoritative revision
// as its pointer-down. A result/phase change between the two cannot select a new card.
export function createLabGestureGate(){
 let gesture=null;
 return {
  down(target,revision,pointerId){gesture={target,revision,pointerId,used:false,cancelled:false};},
  cancel(pointerId){if(gesture?.pointerId===pointerId)gesture.cancelled=true;},
  click(target,revision){
   if(!gesture)return 'missing-pointer-down';
   if(gesture.used)return 'duplicate-gesture';
   gesture.used=true;
   if(gesture.cancelled)return 'cancelled-gesture';
   if(gesture.target!==target)return 'different-control';
   if(gesture.revision!==revision)return 'stale-gesture';
   return null;
  },
 };
}

// One immutable snapshot supplies BOTH physical launch and every saved/survey identity.
export function captureLabLaunch(card,setup,environment,build){
 const aim=structuredClone(setup),station=card.station;
 return Object.freeze({card:card.id,station:station?.id??'gate',windId:card.wind.id,build,
  setup:Object.freeze(aim),environment:Object.freeze({...environment}),launchSpeed:chargeToSpeed(aim.charge),
  muzzle:Object.freeze(stationMuzzle(aim,station)),direction:Object.freeze(stationAim(aim,station))});
}

// Single course rebuild for each return action. Shared with the session regression.
export function returnLabToSetup(mode,{interrupt,cancel,memory,environment,restoreEnvironment,load,exactPower}){
 interrupt();cancel();
 const saved=memory();
 if(mode==='reset')restoreEnvironment('A');
 else if(mode==='adjust'&&saved)restoreEnvironment(saved.environment?.floor??'A');
 else restoreEnvironment(environment()); // Retry deliberately keeps current machinery.
 load(mode!=='reset');
 if(mode==='adjust'&&saved)exactPower(saved.charge);
}
