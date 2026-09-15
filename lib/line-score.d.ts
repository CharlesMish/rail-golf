import type {VectorLike} from './rail-golf-v02';
export type LineEvidence={kind:'contact'|'pad-activation'|'switch-use'|'ruling'|'token'|'redirect'|'rejected'|'termination'|'relationship'|'run';distance?:number;reason?:string;contactSeconds?:number;members?:string[];terminal?:boolean;feature?:string;label?:string;incoming?:VectorLike;outgoing?:VectorLike;turn?:number;freeSeconds?:number;separation?:number;surface?:string;body?:string;point?:VectorLike;targetHit?:boolean;state?:'A'|'B';count?:number};
export type PlaceholderRule={id:string;tier:string;label:string;points:number;perFeature?:boolean;supersededBy?:string;sequence:readonly string[]};
export const PLACEHOLDER_RULES:readonly PlaceholderRule[];
export function appendLineEvidence(ledger:LineEvidence[],event:LineEvidence):void;
export const VARIETY_RULE:Readonly<{pointsPerAdditionalClaim:number;cap:number}>;
export function scoreLine(ledger:readonly LineEvidence[],rules?:readonly PlaceholderRule[],variety?:typeof VARIETY_RULE,runRule?:typeof import("./line-run").RUN_RULE):{ruleSet:string;nonCanonical:boolean;total:number;run:number;runDistance:number;claimIds:string[];uniqueFeatureCount:number;secondary:number;claimTotal:number;awards:{id:string;tier:string;label:string;points:number;evidence:number[]}[];ignored:{index:number;reason:string}[]};
export function normalizeLineEvidence(value:unknown):LineEvidence[];

export function recordLineContact(ledger:LineEvidence[],node:{name:string;metadata?:{lineSwitchLabel?:string;lineFeature?:{id:string;label:string};yardBank?:string;cascadeStep?:string;deliveryRoute?:string;yardLanding?:string}},point:VectorLike|null|undefined,diverterContact?:{kind:string}|null):void;

export type RecordedLineReceipt={ruleSet:string;total:number;run:number;runDistance:number;claimIds:string[];uniqueFeatureCount:number;secondary:number;ending:string};
export function recordLineReceipt(ledger:readonly LineEvidence[]):RecordedLineReceipt;
export function normalizeLineReceipt(value:unknown):RecordedLineReceipt|undefined;

export function cascadeAssembly(event:LineEvidence):string|null;
