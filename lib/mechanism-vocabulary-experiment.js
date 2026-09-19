import {VOCABULARY_STATION,VOCABULARY_DEFAULT,VOCABULARY_BOUNDS,vocabularyEnd} from './mechanism-vocabulary.js';
import {buildMechanismVocabulary} from './mechanism-vocabulary-scene.js';
export const MECHANISM_VOCABULARY=Object.freeze({
  id:'mechanism-vocabulary',title:'Fan & Paddle Works',subtitle:'Mechanism vocabulary · isolated feasibility lab',
  brief:'Explore two working bays. Visible flow acts only inside the ribbon-marked bay. The moving timber face is a real reflector. No target or score.',
  defaultSetup:VOCABULARY_DEFAULT,station:()=>VOCABULARY_STATION,bounds:VOCABULARY_BOUNDS,end:vocabularyEnd,
  survey:{position:[85,85,-23],target:[0,5,53]},buildWorld:buildMechanismVocabulary,
  controls:[{id:'wind',label:'WIND',options:['OFF','LEFT','RIGHT'],placement:'primary'},{id:'paddleMode',label:'PADDLE',options:['SYNC','LIVE'],placement:'primary'}],
  controlHint:'SYNC previews the cycle, then starts each shot from the same phase. LIVE launches at the current phase. Recall holds its saved LIVE phase; press LIVE again to resume.',
});
