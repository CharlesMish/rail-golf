import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,PhysicsBody,Mesh,Vector3} from '@babylonjs/core';
import type {FloorState} from './diverter-lab';
export type DiverterContact={kind:'switch-a'|'switch-b'|'floor-a'|'floor-b'|'landing';point:Vector3;targetHit?:boolean};
export type DiverterHandles={
 readonly state:FloorState;readonly floor:Mesh;readonly floorBody:PhysicsBody;
 readonly switchBody:PhysicsBody;readonly targetBody:PhysicsBody|null;readonly groundBody:PhysicsBody|null;
 setState(state:FloorState):void;
 contact(other:PhysicsBody,point:Vector3|null|undefined,shotId:number):DiverterContact|null;
 flush():FloorState|null;dispose():void;
};
export type DiverterOptions={overlay?:boolean;supports?:boolean;states?:Record<FloorState,{pitch:number;roll?:number;yOffset?:number;material:string}>;floor?:{x:number;y:number;z:number;width:number;height:number;depth:number};switch?:{x:number;y:number;z:number;width:number;height:number;depth:number};target?:{id:string;x:number;z:number;radius:number}};
export function buildDiverterLab(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>,initial?:FloorState,options?:DiverterOptions):DiverterHandles;

export type YardLandingAuthority=Pick<DiverterHandles,'state'|'setState'|'contact'|'flush'|'dispose'>;
export function buildYardLandingAuthority(target:{id:string}|null,initial?:FloorState):YardLandingAuthority;
