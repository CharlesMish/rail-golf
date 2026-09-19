import {TEE_DEFAULT,TEE_ORIGIN_CONTROL,teeStation,teeEnd} from './travelling-tee.js';
import {buildTravellingTee} from './travelling-tee-scene.js';
export const travellingTeeConfig=Object.freeze({
 id:'travelling-tee',title:'TRAVELLING TEE',subtitle:'ORIGIN TRACK STUDY',
 brief:'Choose a launch origin or ride the track. No target or score. First ground contact ends the line.',
 defaultSetup:TEE_DEFAULT,station:teeStation,end:teeEnd,buildWorld:buildTravellingTee,
 survey:{position:[77,88,-18],target:[0,3,55]},originControl:TEE_ORIGIN_CONTROL,
});
