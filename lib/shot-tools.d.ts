import type { Hole, HoleRecord, VectorLike } from './rail-golf-v02';
export function launchCharge(mode: 'hold' | 'set', selected: number, milliseconds: number, max?: boolean): number;
export function interruptedRecord(previous: HoleRecord | undefined): HoleRecord;
export function rememberAttempt<T extends { projectileId: number }>(history: T[], attempt: T): T[];
export function landingEdgeGap(hole: Hole, point: VectorLike): number;
export function landingReceipt(hole: Hole, point: VectorLike): string;

export function maxLatchAfter(enabled:boolean,action:'toggle'|'retry'|'recall'|'import'|'set'):boolean;
