import type {VectorLike} from './rail-golf-v02';
export const LINE_SAFETY:Readonly<{hardCapSeconds:number;settledSpeed:number;settledSeconds:number;settledAfter:number}>;
export function createLineLifecycle(rules?:typeof LINE_SAFETY):{step(point:VectorLike,velocity:VectorLike,elapsed:number):'oob'|'safety-timeout'|'dead-ball'|'invalid-physics'|null};
