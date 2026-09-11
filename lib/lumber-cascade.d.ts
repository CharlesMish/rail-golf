import type { VectorLike } from './rail-golf-v02';
export type CascadeTag = 'step-a' | 'step-b' | 'step-c';
export const CASCADE_STEPS: readonly {id:CascadeTag; x:number; z:number; width:number; depth:number; top:number}[];
export function cascadeContactTag(id: unknown, point: VectorLike | null | undefined): CascadeTag | null;
