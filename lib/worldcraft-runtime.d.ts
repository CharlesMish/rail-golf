import type { Mesh, Scene, ShadowGenerator } from '@babylonjs/core';
import type { SpatialFlight, SpatialRecord } from './spatial-lab-session';
import type { VectorLike } from './rail-golf-v02';
import type { WorldcraftDocument as WorldcraftWorld, WorldcraftSetup, WorldcraftPinResult, WorldcraftTargetResult } from './worldcraft-model';
import type { ResonanceLog } from './worldcraft-resonance';
import type { WorldcraftMaterials } from './worldcraft-scene';
export const WORLDCRAFT_SAMPLE_LIMIT:number;
export type WorldcraftRecord = Omit<SpatialRecord,'setup'> & { setup:WorldcraftSetup;world:WorldcraftWorld;worldIdentity:string;launch:{station:{id:string;label:string;x:number;z:number;yaw:number};muzzle:VectorLike;rail:VectorLike;aim:VectorLike;direction:VectorLike;speed:number;mass:number;radius:number};samples:{t:number;x:number;y:number;z:number}[];terminal:{reason:string;elapsed:number;position:number[]};pinResult:WorldcraftPinResult|null;targetResult:WorldcraftTargetResult|null;resonance:ResonanceLog;build:string };
export type WorldcraftEvent = { kind:string;last?:WorldcraftRecord;[key:string]:unknown };
export type WorldcraftRuntime = {
  readonly world:WorldcraftWorld;readonly flight:SpatialFlight|null;readonly last:WorldcraftRecord|null;readonly objectMeshes:Map<string,Mesh>;readonly mode:'build'|'play';readonly error:string;
  setMode(mode:'build'|'play'):boolean;launch(setup:WorldcraftSetup):boolean;replaceWorld(world:WorldcraftWorld,options?:{intent?:'edit'|'load'}):{ok:boolean;error?:string};clearShot():void;beforeStep():void;afterStep():void;dispose():void;
  diagnostics():{mode:string;revision:number;worldIdentity:string;objectCount:number;staticBodies:number;liveBodies:number;meshes:number;materials:number;textures:number;physicsBodies:number;shadowCasters:number;rebuildCount:number;rebuildMs:number;samples:number;live:boolean;disposed:boolean;error:string};
};
export function worldcraftWorldIdentity(world:WorldcraftWorld):string;
export function createWorldcraftRuntime(scene:Scene,options:{world:WorldcraftWorld;onEvent?:(event:WorldcraftEvent)=>void;materials?:WorldcraftMaterials;shadows?:ShadowGenerator|null;build?:string}):WorldcraftRuntime;
