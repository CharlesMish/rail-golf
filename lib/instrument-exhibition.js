import {appendInstrument,instrumentReferences} from './instrument-foundry.js';
import exchange from '../worlds/instruments/exhibition/exchange/instrument.json' with {type:'json'};
import hairpin from '../worlds/instruments/exhibition/hairpin-fable-v1/instrument.json' with {type:'json'};
import arc from '../worlds/instruments/exhibition/antiphonal-arc-v1/instrument.json' with {type:'json'};

// Temporary exhibition admission only. The ordinary Foundry registry remains
// unchanged. These are the original author files, not curated revisions.
const SUBMISSIONS=[exchange,hairpin,arc];

export function exhibitionInstruments(){
 return SUBMISSIONS.reduce((catalog,value)=>appendInstrument(catalog,value),instrumentReferences());
}
