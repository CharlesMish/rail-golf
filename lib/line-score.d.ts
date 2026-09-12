import type {VectorLike} from './rail-golf-v02';
export type LineEvidence={kind:'contact'|'pad-activation'|'switch-use'|'ruling'|'token';surface?:string;body?:string;point?:VectorLike;targetHit?:boolean;state?:'A'|'B';count?:number};
export type PlaceholderRule={id:string;label:string;points:number;sequence:readonly string[]};
export const PLACEHOLDER_RULES:readonly PlaceholderRule[];
export function appendLineEvidence(ledger:LineEvidence[],event:LineEvidence):void;
export function scoreLine(ledger:readonly LineEvidence[],rules?:readonly PlaceholderRule[]):{ruleSet:string;nonCanonical:boolean;total:number;awards:{id:string;label:string;points:number;evidence:number[]}[];ignored:{index:number;reason:string}[]};
export function normalizeLineEvidence(value:unknown):LineEvidence[];

export function recordLineContact(ledger:LineEvidence[],node:{name:string;metadata?:{yardBank?:string;cascadeStep?:string;deliveryRoute?:string;yardLanding?:string}},point:VectorLike|null|undefined,diverterContact?:{kind:string}|null):void;
