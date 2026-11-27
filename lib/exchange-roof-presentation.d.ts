import type {ShadowGenerator,Mesh} from '@babylonjs/core';
export const EXCHANGE_ROOF_VIEWS:Readonly<Record<string,{label:string;position:number[];target:number[]}>>;
export const EXCHANGE_ROOF_VARIANTS:readonly {id:string;label:string;description:string}[];
export function configureExchangeShadows(shadows:ShadowGenerator,mode?:string):void;
export function usesCorrectedRoofDraw(mode:string):boolean;
export function applyRoofDiagnostic(world:{meshes:Mesh[]},mode:string):void;
