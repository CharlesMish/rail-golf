import {VERTICAL_STATION,VERTICAL_DEFAULT,VERTICAL_BOUNDS,VERTICAL_SURVEY} from './vertical-yard.js';
import {buildVerticalYard} from './vertical-yard-scene.js';

export const VERTICAL_YARD_LAB = Object.freeze({
  id:'vertical-yard',title:'VERTICAL YARD',
  brief:'Explore the high and low yard. No target or score. First ground contact ends the line.',
  defaultSetup:VERTICAL_DEFAULT,station:()=>VERTICAL_STATION,bounds:VERTICAL_BOUNDS,
  survey:VERTICAL_SURVEY,buildWorld:buildVerticalYard,
});
