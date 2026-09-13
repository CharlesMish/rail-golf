import type {Hole} from './rail-golf-v02';
import type {YardStation} from './stations';
export type ScoreCard=Omit<Hole,'target'> & {mode:'score-only';target:null;allowedStations:readonly string[]};
export type GameCard=(Hole & {mode?:never})|ScoreCard;
export const SAW_BAY:Readonly<YardStation>;
export const LINE_STATIONS:Readonly<Record<'gate'|'lumber',YardStation>>;
export const OPEN_LINE:ScoreCard;
export const LINE_CARDS:readonly GameCard[];

export const SAW_BAY_OPEN_LINE:ScoreCard;
export function selectOpenLineStation(id:string,options?:{allowParked?:boolean}):ScoreCard;
export function acceptsLineStation(card:GameCard,id:string):boolean;
