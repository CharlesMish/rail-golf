import type {VectorLike} from './rail-golf-v02';
export const RUN_RULE:Readonly<{metresPerStep:number;pointsPerStep:number;cap:number;minSpeed:number;freeSeconds:number}>;
export function createRunTracker(rules?:typeof RUN_RULE):{beginStep():void;contact():void;step(position:VectorLike,velocity:VectorLike,seconds:number,hasClaim:boolean):{kind:'run';distance:number}|null;snapshot():{kind:'run';distance:number}|null};
