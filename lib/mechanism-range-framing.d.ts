import type {FreeCamera,Vector3} from '@babylonjs/core';
import type {RangeSetup} from './mechanism-range-session';
export type RangeFraming='familiar'|'range';
export type RangeFrame={position:number[];target:number[];fov:number;horizontal:boolean;ease:number};
export function rangeCameraFrame(setup:RangeSetup,framing:RangeFraming,width:number,height:number,mode?:string):RangeFrame;
export function placeRangeCamera(camera:FreeCamera,target:Vector3,frame:RangeFrame):void;
export function advanceRangeCamera(camera:FreeCamera,target:Vector3,frame:RangeFrame,dt:number):void;
