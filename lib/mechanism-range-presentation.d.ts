import type {Scene,Mesh,TransformNode,Vector3,StandardMaterial,ShadowGenerator} from '@babylonjs/core';
type Materials=Record<string,StandardMaterial>;
type Shadows=Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>;
export function buildRangePresentationMaterials(scene:Scene):Materials;
export function buildRangeLauncher(scene:Scene,materials:Materials,shadows:Shadows):{launcher:TransformNode;yaw:TransformNode;loft:TransformNode};
export function buildRangeProjectile(scene:Scene,body:Mesh,materials:Materials,shadows:Shadows,initial?:'round'|'ball'):{root:TransformNode;round:TransformNode;ball:Mesh;select(mode:'round'|'ball'):void;sync(velocity:Vector3):void;dispose():void};
