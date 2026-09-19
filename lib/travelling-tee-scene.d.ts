import type {Scene,TransformNode,StandardMaterial,ShadowGenerator} from '@babylonjs/core';
import type {TeeSetup} from './travelling-tee';
import type {buildMechanismRange} from './mechanism-range-scene';
export function buildTravellingTee(scene:Scene,root:TransformNode,materials:Record<string,StandardMaterial>,shadows:Pick<ShadowGenerator,'addShadowCaster'|'removeShadowCaster'>):ReturnType<typeof buildMechanismRange> & {updatePresentation(setup:TeeSetup):void;environment:{snapshot():{floor:'A'|'B'};restore(value?:{floor?:'A'|'B'}):void;reset():void}};
