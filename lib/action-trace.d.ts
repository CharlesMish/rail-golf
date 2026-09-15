import type {ActionEntry} from './lab-controls';
export const ACTION_TRACE_LIMITS:Readonly<{entries:number;bytes:number}>;
export type ActionTraceExport={version:number;limits:typeof ACTION_TRACE_LIMITS;retired:number;warning:string;entries:(ActionEntry&{build:string;session:string;sequence:number;timestamp:string;monotonicMs:number})[]};
export function createActionTrace(options:{storage:Storage;build:string;session?:string;limits?:typeof ACTION_TRACE_LIMITS}):{append:(entry:ActionEntry)=>void;export:()=>ActionTraceExport;clear:()=>void};
export function actionTraceCSV(trace:ActionTraceExport):string;
