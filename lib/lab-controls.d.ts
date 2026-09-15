import type {GameCard} from './line-lab';
import type {ShotSetup} from './rail-golf-v02';
export type ActionSource='pointer'|'keyboard'|'restore/share'|'internal/programmatic';
export type ControlState={phase:string;card:string;station:string;floor:string;attempt?:string;setup?:ShotSetup};
export type ActionEntry={action:string;source:ActionSource;before:ControlState;after:ControlState;accepted:boolean;reason:string;request?:{method:string;args:unknown[];card?:string;station?:string}};
export const LAB_PHASES:Readonly<Record<string,readonly string[]>>;
// Heterogeneous existing game commands; argument validation remains in their handlers.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLabControl(options:{read:()=>ControlState;handlers:()=>Record<string,((...args:any[])=>unknown)|undefined>;record:(entry:ActionEntry)=>void;request?:(method:string,args:unknown[])=>{card?:string;station?:string};onError?:(error:string)=>void}):{revision:()=>number;source:()=>ActionSource;transition:(action:string,change:()=>void,source?:ActionSource)=>void;rejectGesture:(reason:string)=>void;run:(method:string,args?:unknown[],source?:ActionSource)=>boolean};
export function createLabGestureGate():{down:(target:unknown,revision:number,pointerId:number)=>void;cancel:(pointerId:number)=>void;click:(target:unknown,revision:number)=>string|null};
export function captureLabLaunch(card:GameCard,setup:ShotSetup,environment:{floor:'A'|'B'},build:string):Readonly<{card:string;station:string;windId:string;build:string;setup:ShotSetup;environment:{floor:'A'|'B'};launchSpeed:number;muzzle:{x:number;y:number;z:number};direction:{x:number;y:number;z:number}}>;
export function returnLabToSetup(mode:'retry'|'reset'|'adjust',callbacks:{interrupt:()=>void;cancel:()=>void;memory:()=>({charge:number;environment?:{floor:'A'|'B'}}|undefined);environment:()=>('A'|'B');restoreEnvironment:(state:'A'|'B')=>void;load:(restore:boolean)=>void;exactPower:(power:number)=>void}):void;
