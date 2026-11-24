import {validGuestSetup} from './playgrounds-persistence.js';

export const REPEATER_PAUSE_TICKS=90;
const clone=value=>structuredClone(value);
const setupKey=s=>s&&JSON.stringify([s.railIndex,s.yaw,s.elevation,s.charge]);

// A bounded command queue around an existing one-ball session. No clock, collision
// rules, pose corrections, prop forces, storage or background callback lives here.
export function createShotRepeater(session,emit=()=>{}, {requireTrial=true}={}){
 let status='idle',disposed=false,active=null,tested=null,plan=null,records=[],trial=null,incomplete=null,pause=0,serial=0,stopReason='';
 const busy=()=>active!==null||session.status==='flight'||session.status==='settling';
 const snapshot=()=>({status,busy:busy(),planned:plan?.count??0,started:plan?.started??0,completed:records.length,remaining:status==='running'?Math.max(0,(plan?.count??0)-(plan?.started??0)):0,pauseTicks:pause,stopReason,testedSetup:tested?clone(tested):null});
 const notify=()=>emit({kind:'state',state:snapshot()});
 const launch=(setup,kind)=>{
  if(disposed||busy()||session.status!=='ready')return false;
  // Remove the retired terminal ball before committing the next real shot.
  session.next();
  if(!session.fire(setup))return false;
  active={mode:kind,number:kind==='repeat'?++plan.started:0,serial:++serial};
  emit({kind:'shot-started',setup:clone(setup),...active});notify();return true;
 };
 const stop=(reason='player')=>{
  if(disposed)return;
  if(status==='running'||status==='stopping'){status=busy()?'stopping':'idle';pause=0;stopReason=reason;notify();}
 };
 return {
  get state(){return snapshot();},
  get records(){return clone(records);},
  get trial(){return trial?clone(trial):null;},
  get plan(){return plan?clone(plan):null;},
  get incomplete(){return incomplete?clone(incomplete):null;},
  canStart(setup){return !disposed&&!busy()&&status==='idle'&&session.status==='ready'&&validGuestSetup(setup)&&(!requireTrial||setupKey(setup)===setupKey(tested));},
  manual(setup){
   if(disposed||status!=='idle'||!validGuestSetup(setup)||busy())return false;
   stopReason='';incomplete=null;const fired=launch(clone(setup),'manual');
   if(fired){plan=null;records=[];trial=null;tested=null;notify();}return fired;
  },
  start(setup,count){
   if(!this.canStart(setup)||!Number.isInteger(count)||count<3||count>5)return false;
   plan={setup:clone(setup),count,started:0};if(!requireTrial)trial=null;records=[];incomplete=null;status='running';pause=0;stopReason='';
   if(!launch(plan.setup,'repeat')){status='idle';stopReason='launch-refused';notify();return false;}return true;
  },
  stop,
  // Called once per established physics tick, never once per rendered frame.
  beforeStep(){
   if(disposed)return;
   if(status==='running'&&!active&&pause>0){pause--;if(pause===0&&!launch(plan.setup,'repeat')){status='blocked';stopReason='launch-refused';notify();}}
   session.beforeStep();
  },
  afterStep(){
   if(disposed)return;session.afterStep();
   if(!active)return;
   if(session.status==='blocked'){
    status='blocked';stopReason='object-not-settled';pause=0;
    incomplete={attempt:clone(active),record:session.last?clone(session.last):null,reason:stopReason};
    emit({kind:'shot-blocked',record:incomplete.record,...active});active=null;notify();return;
   }
   if(session.status!=='ready'||!session.last?.settledEnvironment)return;
   const completed=active;active=null;const record=clone(session.last);
   if(completed.mode==='manual'){tested=clone(record.setup);trial=record;}else records.push(record);
   emit({kind:'shot-complete',record,...completed});
   if(status==='running'&&plan.started<plan.count)pause=REPEATER_PAUSE_TICKS;
   else {status='idle';pause=0;}
   notify();
  },
  reset(){
   if(disposed||busy())return false;stop('reset');session.reset();tested=null;trial=null;incomplete=null;plan=null;records=[];status='idle';stopReason='';pause=0;notify();return true;
  },
  restore(record,after=false){
   if(disposed||busy()||!record?.settledEnvironment)return null;
   stop('restore');const setup=session.restore({setup:record.setup,environment:after?record.settledEnvironment:record.environment});
   // Restore only places the world: it never queues a launch or resumes a saved plan.
   tested=null;status='idle';pause=0;notify();return setup;
  },
  undo(){
   if(disposed||busy())return null;stop('undo');const prior=session.last;if(!prior)return null;
   // restore clears the Guest wrapper's pending end state; legacy undo does not.
   const setup=session.restore({setup:prior.setup,environment:prior.environment});tested=null;status='idle';pause=0;notify();return setup;
  },
  dispose(){if(disposed)return;stop('left-study');disposed=true;status='disposed';active=null;pause=0;},
 };
}
