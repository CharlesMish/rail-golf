import type { Hole, ShotSetup, VectorLike, MechanismTag, Outcome } from './rail-golf-v02';
export type SavedLine = ShotSetup & {
  holeId:string; stationId:string; windId:string; projectileId:number;
  outcome:Outcome|null; receipt:string; points:VectorLike[];
  contacts:{id:string; kind:MechanismTag|'sky'|'mill'|'first-kiss'|'wet'; point:VectorLike}[];
};
export type LineShelf<T = SavedLine> = {recent:T[]; wins:T[]};
export const SHOT_LIBRARY_KEY:string;
export function packLine(line:SavedLine): SavedLine & {speed:number};
export function lineFamily(line:SavedLine):string;
export function collectLine<T extends SavedLine>(shelf:LineShelf<T>|undefined,line:T):LineShelf<T>;
export function normalizeShotLibrary(value:unknown,holes:readonly Hole[]):Record<string,LineShelf>;
