import type {SpatialSetup} from './spatial-lab-session';
import type {GuestRecord,createGuestSession} from './playgrounds-persistence';
export const REPEATER_PAUSE_TICKS:number;
export type RepeaterState={status:string;busy:boolean;planned:number;started:number;completed:number;remaining:number;pauseTicks:number;stopReason:string;testedSetup:SpatialSetup|null};
export type RepeaterEvent={kind:string;state?:RepeaterState;record?:GuestRecord|null;setup?:SpatialSetup;number?:number;serial?:number};
export function createShotRepeater(session:ReturnType<typeof createGuestSession>,emit?:(event:RepeaterEvent)=>void):{
 readonly state:RepeaterState;readonly records:GuestRecord[];readonly trial:GuestRecord|null;readonly plan:{setup:SpatialSetup;count:number;started:number}|null;readonly incomplete:{attempt:{mode:string;number:number;serial:number};record:GuestRecord|null;reason:string}|null;
 canStart(setup:SpatialSetup):boolean;manual(setup:SpatialSetup):boolean;start(setup:SpatialSetup,count:number):boolean;
 stop(reason?:string):void;beforeStep():void;afterStep():void;reset():boolean;
 restore(record:GuestRecord,after?:boolean):SpatialSetup|null;undo():SpatialSetup|null;dispose():void;
};
