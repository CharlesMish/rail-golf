import type {Scene,TransformNode,StandardMaterial,ShadowGenerator,Mesh,Vector3} from '@babylonjs/core';
import type {DiverterHandles} from './diverter-scene';
export function buildMechanismRange(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>):{mechanism:DiverterHandles;features:Map<string,Mesh>;ground:Mesh;dispose():void;tableTop(x?:number,z?:number):Vector3};
