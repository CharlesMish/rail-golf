import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,Mesh,PhysicsAggregate} from '@babylonjs/core';
type Flight={mesh:Mesh;aggregate:PhysicsAggregate;elapsed:number;ended:string|null};
export function buildMechanismVocabulary(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>):{
  ground:Mesh;features:Map<string,Mesh>;paddle:Mesh;readonly paddleBody:PhysicsAggregate;readonly windApplied:boolean;
  environment:{snapshot():{wind:string};restore(state:{wind:string}):void;reset():void};
  onLaunch():void;onResolve():void;onAction():void;beforeStep(flight:Flight|null,dt:number):void;dispose():void;
};
