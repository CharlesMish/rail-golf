import type {VectorLike} from './rail-golf-v02';
import type {LineEvidence} from './line-score';
export type RedirectFeature={id:string;kind:string;label:string;assembly?:string};
export const REDIRECT_GATES:Readonly<{minIncomingSpeed:number;minOutgoingSpeed:number;minTurnDegrees:number;maxContactSeconds:number;freeSeconds:number;minSeparation:number;maxWaitSeconds:number;minReturnHorizontalSpeed:number;minReturnTurnDegrees:number}>;
export function createRedirectTracker(gates?:typeof REDIRECT_GATES):{beginStep(velocity:VectorLike,seconds:number):void;contact(feature:RedirectFeature|undefined,body:string,point:VectorLike):void;finish():void;drainDiagnostics():LineEvidence[];endStep(position:VectorLike,velocity:VectorLike,seconds:number):LineEvidence|null};

export const collectLineStepEvents:typeof import('./delivery-routes').collectDeliveryStepEvents;

export function redirectFeature(node:{metadata?:{lineFeature?:RedirectFeature;cascadeStep?:string}},point:VectorLike):RedirectFeature|undefined;
