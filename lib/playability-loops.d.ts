import type { WorldcraftLine, WorldcraftPerformanceImpact } from './worldcraft-model';
export const LOOP_STORAGE_KEY:string;
export const LOOP_MAX_BYTES:number;
export const LOOP_GAIN:number;
export type ContactLoopPlan={format:'rail-golf-recorded-contact-pair';version:1;sources:WorldcraftLine[];offsetB:boolean;period:number;cycles:number};
export function validateLoopLine(value:unknown):WorldcraftLine;
export function importLoopLines(text:string):{lines:WorldcraftLine[];rejected:string[]};
export function readLocalLoopLines(storage:Pick<Storage,'getItem'>|null):{lines:WorldcraftLine[];warning:string};
export function createLoopPlan(lines:WorldcraftLine[],offsetB?:boolean):ContactLoopPlan;
export function validateLoopPlan(value:unknown):ContactLoopPlan;
export function loopEvents(plan:ContactLoopPlan):{time:number;layer:number;cycle:number;index:number;impact:WorldcraftPerformanceImpact}[];
export function loadLoopPair(storage:Pick<Storage,'getItem'>|null):{plan:ContactLoopPlan|null;warning:string;writable:boolean};
export type ContactLoopState={status:string;detail:string};
export function createContactLoopPlayer(options?:{onState?:(state:ContactLoopState)=>void;onTick?:(time:number)=>void}):{
 start(plan:ContactLoopPlan,muted?:boolean[]):Promise<boolean>;
 setMuted(layer:number,value:boolean):void;stop():void;dispose():void;
 counts():{playing:boolean;active:number;sources:{started:number;cleaned:number;finished:number;active:number}[];pending:number};
};
export function measureContactLoopAudio(plan:ContactLoopPlan,Context?:typeof OfflineAudioContext):Promise<{renderer:string;passes:number;layerGain:number;measurements:{offsetB:boolean;layers:number[];attacks:number;nodes:number;duration:number;sampleRate:number;floatPeak:number;rms:number;renderMs:number}[]}>;
