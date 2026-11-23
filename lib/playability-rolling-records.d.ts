import type {RollingRecord} from './playability-rolling';
export type RollingEntry={id:string;layout:string;build:string;record:RollingRecord};
export function rollingShelfKey(shape?:'sphere'|'stone'):string;
export function validRollingSetup(state:unknown):boolean;
export function validRollingRecord(record:unknown,shape?:'sphere'|'stone'):record is RollingRecord;
export function createRollingShelf(storage?:Pick<Storage,'getItem'|'setItem'>|null,shape?:'sphere'|'stone'):{entries():RollingEntry[];warning():string;keep(record:RollingRecord,build:string):RollingEntry|null;remove(id:string):void};
