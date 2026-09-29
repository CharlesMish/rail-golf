import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,PhysicsAggregate} from '@babylonjs/core';
import type {Hole,VectorLike,MechanismTag} from './rail-golf-v02';
import type {DeliveryRoute} from './delivery-routes';
export const LINECRAFT_SECOND_PAD:Readonly<{x:number;z:number;halfWidth:number;halfDepth:number;minY:number;maxY:number;verticalSpeed:number;forwardKick:number}>;
export const LINECRAFT_THIRD_PAD:typeof LINECRAFT_SECOND_PAD;
export const LINECRAFT_EXTRA_PADS:ReadonlyArray<typeof LINECRAFT_SECOND_PAD>;
export const LINECRAFT_LOW_STACK:Readonly<{x:number;y:number;z:number;width:number;height:number;depth:number;yaw:number}>;
export function buildLinecraftReflectors(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'>,register:(body:PhysicsAggregate)=>unknown):object;
export function collectLinecraftStepEvents(start:VectorLike,end:VectorLike,hole:Omit<Hole,'target'>,tags?:MechanismTag[],routes?:DeliveryRoute[]):ReturnType<typeof import('./line-recognition').collectLineStepEvents>;
