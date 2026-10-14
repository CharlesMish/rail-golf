import type { Scene, ShadowGenerator, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { ApproachPose } from './approach-prop';

export type ApproachPropHandle = {
  mesh: { position: { x: number; y: number; z: number } };
  hit: boolean;
  dynamic: boolean;
};

export type ApproachYard = {
  prop: ApproachPropHandle | null;
  holdIfSleeping: () => void;
  pose: () => ApproachPose | null;
  lean: () => number | null;
  adopt: () => ApproachPose | null;
  preview: (pose: ApproachPose) => void;
  place: (pose: 'standing' | ApproachPose, options?: { rebuild?: boolean }) => ApproachPose | null;
  dispose: () => void;
};

export function propLeanDeg(mesh: { computeWorldMatrix: (force: boolean) => void; getDirection: (up: unknown) => { y: number; z: number } }): number;
export function readPropPose(mesh: unknown): ApproachPose | null;
export function standingPose(): ApproachPose;
export function poseFromLean(deg: number): ApproachPose;
export function holdApproachProp(prop: ApproachPropHandle | null): void;
export function createContactBook(): {
  contacts: string[];
  propHit: boolean;
  lipHit: boolean;
  firstGround: { x: number; y: number; z: number } | null;
  kicked: boolean;
  tags: string[];
  routes: string[];
  reset: () => void;
  observe: (event: object, ballBody: object, prop: ApproachPropHandle | null) => void;
};
export type ApproachBall = {
  mesh: { position: { x: number; y: number; z: number }; material: unknown };
  aggregate: { body: { getLinearVelocity: () => { x: number; y: number; z: number; length: () => number }; applyImpulse: (impulse: unknown, point: unknown) => void } };
  dispose: () => void;
};
export function launchApproachBall(scene: Scene, hole: unknown, shot: { railIndex: number; originX?: number; yaw: number; elevation: number; charge: number }, onCollide: (event: object, body: object) => void): ApproachBall;
export function observeFlightStep(ball: ApproachBall, book: ReturnType<typeof createContactBook>, hole: unknown, previous: { x: number; y: number; z: number }): { x: number; y: number; z: number };
export function flightSettled(ball: ApproachBall, prop: ApproachPropHandle | null, steps: number, settledCount: number): { settled: number; done: boolean };
export function mountApproachYard(scene: Scene, options: {
  hole: { id: string; courseWidth?: number; courseLength: number; target: { id: string }; station?: { id?: string; yaw?: number } | null };
  materials?: Record<string, StandardMaterial>;
  shadows?: Pick<ShadowGenerator, 'addShadowCaster'>;
  prop?: boolean | 'static';
  placard?: boolean;
  root?: TransformNode | null;
  initialPose?: ApproachPose | null;
}): ApproachYard;
