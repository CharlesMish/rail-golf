import type {SpatialRecord,SpatialSetup,SpatialStation} from './spatial-lab-session';
export type PlaygroundContract={layout:string;validateEnvironment:(state:unknown)=>boolean;station:(setup:SpatialSetup)=>SpatialStation};
export type PlaygroundEntry={format:string;version:number;layout:string;id:string;build:string;keptAt:string;record:SpatialRecord;path:number[][]};
export function validPlaygroundEntry(entry:unknown,contract:PlaygroundContract):boolean;
export function createPlaygroundShelf(contract:PlaygroundContract,storage:Pick<Storage,'getItem'|'setItem'>|null):{entries():PlaygroundEntry[];warning():string;keep(record:SpatialRecord,path:number[][],build:string):PlaygroundEntry|null;get(id:string):PlaygroundEntry|null;remove(id:string):void};
export function createBrowserPlaygroundShelf(contract:PlaygroundContract|undefined,host?:unknown):ReturnType<typeof createPlaygroundShelf>|null;
