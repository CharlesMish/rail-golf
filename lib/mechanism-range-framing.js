import {Vector3,Camera} from '@babylonjs/core';
import {RANGE_CAMERA,RANGE_STATION} from './mechanism-range.js';
import {stationRailPosition} from './stations.js';

// Mirrors incumbent launcher-relative camera math only. Never modifies a launch setup.
export function rangeCameraFrame(setup,framing,width,height,mode='launch'){
 const rail=stationRailPosition(setup.railIndex,RANGE_STATION);
 if(mode==='survey'||framing==='range'){
  const horizontal=width/height<1.3;
  return {position:mode==='survey'?[...RANGE_CAMERA.survey]:[RANGE_CAMERA.address[0]+rail.x*.4,RANGE_CAMERA.address[1],RANGE_CAMERA.address[2]],
   target:[...(mode==='survey'?RANGE_CAMERA.surveyLook:RANGE_CAMERA.look)],fov:horizontal?1.25:RANGE_CAMERA.fov,horizontal,ease:4};
 }
 const radians=(setup.yaw+RANGE_STATION.yaw)*Math.PI/180,dx=Math.sin(radians),dz=Math.cos(radians),horizontal=width<height;
 return {position:[rail.x-dx*15,7.8,rail.z-dz*15],target:[rail.x+dx*34,3.6,rail.z+dz*34],fov:horizontal?.92:.69,horizontal,ease:Math.log(1000)};
}
export function placeRangeCamera(camera,target,frame){
 camera.position.copyFromFloats(...frame.position);target.copyFromFloats(...frame.target);
 camera.fov=frame.fov;camera.fovMode=frame.horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;camera.setTarget(target);
}
export function advanceRangeCamera(camera,target,frame,dt){
 const ease=1-Math.exp(-Math.max(0,dt)*frame.ease);
 Vector3.LerpToRef(camera.position,Vector3.FromArray(frame.position),ease,camera.position);
 Vector3.LerpToRef(target,Vector3.FromArray(frame.target),ease,target);
 camera.fov+=(frame.fov-camera.fov)*(1-Math.exp(-Math.max(0,dt)*3));
 camera.fovMode=frame.horizontal?Camera.FOVMODE_HORIZONTAL_FIXED:Camera.FOVMODE_VERTICAL_FIXED;
}
