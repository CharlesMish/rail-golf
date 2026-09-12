import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,PhysicsBody,Mesh,Vector3} from '@babylonjs/core';
import type {FloorState} from './diverter-lab';
export type DiverterContact={kind:'switch-a'|'switch-b'|'floor-a'|'floor-b'|'landing';point:Vector3;targetHit?:boolean};
export type DiverterHandles={
 readonly state:FloorState;readonly floor:Mesh;readonly floorBody:PhysicsBody;
 readonly switchBody:PhysicsBody;readonly targetBody:PhysicsBody;readonly groundBody:PhysicsBody;
 setState(state:FloorState):void;
 contact(other:PhysicsBody,point:Vector3|null|undefined,shotId:number):DiverterContact|null;
 flush():FloorState|null;dispose():void;
};
export function buildDiverterLab(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>,initial?:FloorState):DiverterHandles;
