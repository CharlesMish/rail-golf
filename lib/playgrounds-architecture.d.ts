import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,Mesh,PhysicsAggregate} from '@babylonjs/core';
import type {SpatialConfig,SpatialWorld} from './spatial-lab-session';
export type ArchitectureSolid={id:string;x:number;y:number;z:number;w:number;h:number;d:number;zone?:string;pitch?:number;yaw?:number;roll?:number;ground?:boolean};
export const ARCHITECTURE_LAYOUT:string;
export const RINGWELL_SOLIDS:readonly ArchitectureSolid[];
export const RINGWELL_GROUND:ArchitectureSolid;
export function architectureEnvironmentValid(state:unknown):boolean;
export function buildArchitectureSolids(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:ShadowGenerator,options?:{solids?:readonly ArchitectureSolid[];ground?:ArchitectureSolid;palette?:boolean}):SpatialWorld & {features:Map<string,Mesh>;bodies:PhysicsAggregate[];meshes:Mesh[]};
export const PLAYGROUNDS_ARCHITECTURE:SpatialConfig;
