import type {TheatreRecord} from './playgrounds-theatre';
export type TheatreEntry={format:'rail-golf-theatre-line';version:1;layout:string;id:string;build:string;keptAt:string;record:TheatreRecord};
export const THEATRE_SHELF_KEY:string;
export const THEATRE_KEEP_LIMIT:number;
export function validTheatreRecord(record:unknown):record is TheatreRecord;
export function validTheatreEntry(entry:unknown):entry is TheatreEntry;
export function createTheatreShelf(storage:Pick<Storage,'getItem'|'setItem'>|null):{entries():TheatreEntry[];warning():string;keep(record:TheatreRecord,build:string):TheatreEntry|null;get(id:string):TheatreEntry|null;remove(id:string):void};
