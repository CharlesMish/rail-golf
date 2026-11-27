import {appendInstrument,instrumentReferences} from './instrument-foundry.js';

// Director-approved submissions only. Add one local JSON import and one entry
// here after its actual-Havok evidence/review. Do not change the reference files
// or teach the player a second physics/audio implementation.
const REGISTERED=[];

export function registeredInstruments(){
 return REGISTERED.reduce((catalog,value)=>appendInstrument(catalog,value),instrumentReferences());
}
