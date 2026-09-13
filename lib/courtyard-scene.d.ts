import type { Scene, TransformNode, StandardMaterial, ShadowGenerator, PhysicsAggregate, Mesh } from '@babylonjs/core';
import type { Hole } from './rail-golf-v02';
export function buildCourtyard(scene: Scene, root: TransformNode, materials: Record<string, StandardMaterial>, shadows: Pick<ShadowGenerator, 'addShadowCaster'>, register: (body: PhysicsAggregate) => unknown, hole: Hole, options?:{loadingPlatformOverlay?:boolean;lineLab?:boolean}): {skyToken: Mesh | null};
