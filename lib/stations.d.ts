import type { ShotSetup, VectorLike } from './rail-golf-v02';
export type YardStation = { id: string; label: string; x: number; z: number; yaw: number };
export const YARD_STATIONS: Readonly<Record<'gate' | 'lumber', YardStation>>;
export function stationRailPosition(railIndex: number, station?: YardStation): VectorLike;
export function stationAim(shot: Pick<ShotSetup, 'yaw' | 'elevation'>, station?: YardStation): VectorLike;
export function stationMuzzle(shot: Pick<ShotSetup, 'railIndex' | 'yaw' | 'elevation'>, station?: YardStation): VectorLike;
