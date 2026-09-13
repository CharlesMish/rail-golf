import type {Hole} from './rail-golf-v02';
import type {YardStation} from './stations';
export type ScoreCard=Omit<Hole,'target'> & {mode:'score-only';target:null};
export type GameCard=Hole|ScoreCard;
export const SAW_BAY:Readonly<YardStation>;
export const LINE_STATIONS:Readonly<Record<'gate'|'lumber'|'saw',YardStation>>;
export const OPEN_LINE:ScoreCard;
export const LINE_CARDS:readonly GameCard[];
