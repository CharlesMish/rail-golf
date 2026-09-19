import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,PhysicsAggregate,Mesh} from '@babylonjs/core';
export type ReceiverGeometry={x:number;y:number;z:number;width:number;height:number;depth:number;yaw:number};
export const TIMBER_RECEIVER:Readonly<ReceiverGeometry>;
export function buildTimberReceiver(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'>,register:(body:PhysicsAggregate)=>unknown,geometry?:ReceiverGeometry):{wall:Mesh;body:PhysicsAggregate};
