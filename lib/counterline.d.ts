import type { WorldcraftLine, WorldcraftPerformanceImpact } from './worldcraft-model';
export const COUNTERLINE_GAIN:number, COUNTERLINE_DELAY:number;
export const COUNTERLINE_PAIR_KEY:string, COUNTERLINE_SHELF_PREFIX:string;
export type CounterlineSettings={voice:'canonical-resonance-v1';gain:number;delay:number;liveMuted:boolean;companionMuted:boolean};
export type CounterlinePair={format:'rail-golf-counterline-pair';version:1;sources:[WorldcraftLine,WorldcraftLine];settings:CounterlineSettings};
export function counterlineSettings(input?:Partial<CounterlineSettings>):CounterlineSettings;
export function createCounterlinePair(companion:WorldcraftLine,live:WorldcraftLine,settings?:Partial<CounterlineSettings>):CounterlinePair;
export function validateCounterlinePair(input:unknown):CounterlinePair;
export function loadCounterlinePair(storage:Pick<Storage,'getItem'>|null):{pair:CounterlinePair|null;writable:boolean;warning:string};
export type CounterlineAudit={origin:number;audioOrigin:number;delay:number;scheduled:{layer:number;time:number;target:number;scheduled:number;observedAt:number;sources:number}[];late:{layer:number;time:number;late:number}[];status:string};
export function createCounterlineAudio(options?:{onState?:(value:{status:string;detail:string})=>void;onInterrupt?:(detail:string)=>void}):{
 prepare(settings?:Partial<CounterlineSettings>):Promise<boolean>;commit(companion?:WorldcraftLine|null):boolean;elapsed():number|null;live(impact:WorldcraftPerformanceImpact):void;finish(elapsed:number):void;setMuted(layer:0|1,value:boolean):void;stop():void;interrupt(detail?:string):void;state():{active:boolean;context:string;pending:number;sources:{active:number;started:number;cleaned:number;finished:number}[];settings:CounterlineSettings;firedSettings:CounterlineSettings|null;audit:CounterlineAudit};dispose():void;
};
export function counterlineStepBudget(elapsed:number,ticks:number):number;
export function measureCounterlineAudio(pair:CounterlinePair,Context?:typeof OfflineAudioContext):Promise<unknown>;
export function measureCounterlineClock(pair:CounterlinePair,options?:{signal?:AbortSignal}):Promise<unknown>;
export function assertCounterlineSourceIds(lines:WorldcraftLine[]):boolean;
