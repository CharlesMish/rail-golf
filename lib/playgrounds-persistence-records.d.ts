import type {GuestRecord} from './playgrounds-persistence';
export type GuestEntry={id:string;layout:string;build:string;record:GuestRecord};
export const GUEST_SHELF_KEY:string;
export function validGuestSetup(state:unknown):boolean;
export function validGuestRecord(record:unknown):record is GuestRecord;
export function createGuestShelf(storage?:Pick<Storage,'getItem'|'setItem'>|null):{entries():GuestEntry[];warning():string;keep(record:GuestRecord,build:string):GuestEntry|null;remove(id:string):void};
