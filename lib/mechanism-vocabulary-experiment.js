import {VOCABULARY_STATION,VOCABULARY_DEFAULT,VOCABULARY_BOUNDS,vocabularyEnd} from './mechanism-vocabulary.js';
import {buildMechanismVocabulary} from './mechanism-vocabulary-scene.js';
export const MECHANISM_VOCABULARY=Object.freeze({
  id:'mechanism-vocabulary',title:'Fan & Paddle Works',subtitle:'Mechanism vocabulary · isolated feasibility lab',
  brief:'Explore two working bays. Fan flow acts only inside the ribbon-marked volume. The timber paddle begins the same slow cycle at each launch. No target or score.',
  defaultSetup:VOCABULARY_DEFAULT,station:()=>VOCABULARY_STATION,bounds:VOCABULARY_BOUNDS,end:vocabularyEnd,
  survey:{position:[85,85,-23],target:[0,5,53]},buildWorld:buildMechanismVocabulary,
  controls:[{id:'wind',label:'Fan flow',options:['OFF','LEFT','RIGHT']}],
});
