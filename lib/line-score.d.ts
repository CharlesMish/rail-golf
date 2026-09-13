import type {VectorLike} from './rail-golf-v02';
export type LineEvidence={kind:'contact'|'pad-activation'|'switch-use'|'ruling'|'token'|'redirect';terminal?:boolean;feature?:string;label?:string;incoming?:VectorLike;outgoing?:VectorLike;turn?:number;freeSeconds?:number;separation?:number;surface?:string;body?:string;point?:VectorLike;targetHit?:boolean;state?:'A'|'B';count?:number};
export type PlaceholderRule={id:string;tier:string;label:string;points:number;perFeature?:boolean;sequence:readonly string[]};
export const PLACEHOLDER_RULES:readonly PlaceholderRule[];
export function appendLineEvidence(ledger:LineEvidence[],event:LineEvidence):void;
export function scoreLine(ledger:readonly LineEvidence[],rules?:readonly PlaceholderRule[]):{ruleSet:string;nonCanonical:boolean;total:number;awards:{id:string;tier:string;label:string;points:number;evidence:number[]}[];ignored:{index:number;reason:string}[]};
export function normalizeLineEvidence(value:unknown):LineEvidence[];

export function recordLineContact(ledger:LineEvidence[],node:{name:string;metadata?:{lineFeature?:{id:string;label:string};yardBank?:string;cascadeStep?:string;deliveryRoute?:string;yardLanding?:string}},point:VectorLike|null|undefined,diverterContact?:{kind:string}|null):void;
