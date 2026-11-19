import type {SpatialRecord} from './spatial-lab-session';
export type GateEntry={format:string;version:number;layout:string;id:string;build:string;keptAt:string;record:SpatialRecord;path:number[][]};
export function validGateEntry(entry:unknown):boolean;
export function createGateShelf(storage:Pick<Storage,'getItem'|'setItem'>|null):{entries():GateEntry[];warning():string;keep(record:SpatialRecord,path:number[][],build:string):GateEntry|null;get(id:string):GateEntry|null;remove(id:string):void};
export function createBrowserGateShelf(layout:string|undefined,host?:unknown):ReturnType<typeof createGateShelf>|null;
