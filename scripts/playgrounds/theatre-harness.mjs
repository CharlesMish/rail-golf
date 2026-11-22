import {readFile} from 'node:fs/promises';
import Havok from '@babylonjs/havok';
import {Logger} from '@babylonjs/core';
import {createTheatreRuntime} from '../../lib/playgrounds-theatre.js';
Logger.LogLevels=0;
export const havok=await Havok({wasmBinary:await readFile(new URL('../../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm',import.meta.url))});
export function shoot(setup,{control='full'}={}){const runtime=createTheatreRuntime(havok,{control});runtime.fire(setup);for(let n=0;n<7300&&runtime.active;n++)runtime.step();const record=structuredClone(runtime.record);const costs=runtime.metrics();runtime.dispose();return {record,costs};}
if(process.argv[1]?.endsWith('theatre-harness.mjs')){
 for(const yaw of [-25,-15,0,15,25])for(const elevation of [18,30,45]){
  const setup={railIndex:1,yaw,elevation,charge:.55},r=shoot(setup).record;console.log(JSON.stringify({setup,contacts:r.contacts.map(c=>c.body),elapsed:r.elapsed,position:r.position}));
 }
}
