import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,Mesh,PhysicsAggregate} from '@babylonjs/core';
type Flight={mesh:Mesh;aggregate:PhysicsAggregate;elapsed:number;ended:string|null};
export function buildMechanismVocabulary(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>):{
  ground:Mesh;features:Map<string,Mesh>;paddle:Mesh;streamers:{ribbon:Mesh;arrow:Mesh}[];fanRotors:TransformNode[];readonly paddleBody:PhysicsAggregate;readonly windApplied:boolean;
  environment:{snapshot():{wind:string;paddleMode:string;paddleTick:string};restore(state:{wind:string;paddleMode?:string;paddleTick?:string}):void;reset():void;setControl(id:string,value:string):void};
  prepareLaunch():void;onLaunch():void;onResolve():void;onAction(action:string):void;beforeIdleStep(dt:number):void;updatePresentation(setup:unknown,dt?:number):void;diagnostics():Record<string,string>;beforeStep(flight:Flight|null,dt:number):void;dispose():void;
};
