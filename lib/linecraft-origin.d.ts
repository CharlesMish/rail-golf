import type {ShotSetup} from './rail-golf-v02';
export const LINECRAFT_ORIGIN:Readonly<Record<'gate'|'lumber',{min:number;max:number;step:number}>>;
export function linecraftOrigin(setup:Pick<ShotSetup,'railIndex'|'originX'>):number;
export function validLinecraftOrigin(setup:Pick<ShotSetup,'originX'>,station:'gate'|'lumber'):boolean;
export function selectLinecraftOrigin<T extends Pick<ShotSetup,'railIndex'>>(setup:T,station:'gate'|'lumber',requested:number):T&{originX:number};
export function shiftLinecraftOrigin<T extends Pick<ShotSetup,'railIndex'|'originX'>>(setup:T,station:'gate'|'lumber',direction:number):T&{originX:number};
