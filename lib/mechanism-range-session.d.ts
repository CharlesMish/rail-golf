import type {Scene,Mesh,PhysicsAggregate} from '@babylonjs/core';
import type {buildMechanismRange} from './mechanism-range-scene';
import type {LineEvidence} from './line-score';
export type RangeSetup={railIndex:number;yaw:number;elevation:number;charge:number};
export type RangeRecord={setup:RangeSetup;environment:{floor:'A'|'B'};endEnvironment:{floor:'A'|'B'};reason:string;elapsed:number;evidence:LineEvidence[];contacts:{body:string;count:number;first:number;last:number}[];position:number[]};
export type RangeEvent={kind:string;label?:string;feature?:string;point?:{x:number;y:number;z:number};reason?:string;state?:'A'|'B';last?:RangeRecord};
export function createMechanismSession(scene:Scene,world:ReturnType<typeof buildMechanismRange>,emit?:(event:RangeEvent)=>void,options?:Record<string,unknown>):{
 readonly flight:{id:number;mesh:Mesh;aggregate:PhysicsAggregate;ended:string|null;elapsed:number}|null;
 readonly last:RangeRecord|null;fire(setup:RangeSetup):boolean;beforeStep():void;afterStep():void;
 action(action:'retry'|'reset'|'recall'):RangeSetup|null;dispose():void;
};
