// Isolated geometry study. Coordinates are shared by rendering and Havok bodies.
// Projectile and launcher authority remain in the incumbent Rail Golf helpers.
export const VERTICAL_STATION = Object.freeze({id:'hoist-apron',label:'Hoist Apron',x:0,y:8,z:0,yaw:0});
export const VERTICAL_DEFAULT = Object.freeze({railIndex:1,yaw:0,elevation:28,charge:.65});
export const VERTICAL_BOUNDS = Object.freeze({minX:-60,maxX:60,minZ:-20,maxZ:152,minY:-8});
export const VERTICAL_SURVEY = Object.freeze({position:[100,107,-35],target:[0,13,68]});
// Open centre, three usable levels. The far plate leans over the void, so its
// ordinary surface normal can turn incoming flight down into the lower yard.
export const VERTICAL_SOLIDS = Object.freeze([
  Object.freeze({id:'low-cheek',label:'LOW RETURN',zone:'lower',x:-24,y:7,z:34,w:1.6,h:14,d:26,yaw:28}),
  Object.freeze({id:'lower-ramp',label:'LOWER RAMP REBOUND',zone:'lower',x:6,y:3.5,z:51,w:21,h:1.5,d:22,pitch:-16}),
  Object.freeze({id:'terrace-one',label:'FIRST TERRACE REBOUND',zone:'terraces',x:27,y:3,z:38,w:14,h:6,d:13}),
  Object.freeze({id:'terrace-two',label:'MIDDLE TERRACE REBOUND',zone:'terraces',x:27,y:7,z:56,w:14,h:14,d:13}),
  Object.freeze({id:'terrace-three',label:'UPPER TERRACE REBOUND',zone:'terraces',x:27,y:11,z:74,w:14,h:22,d:13}),
  Object.freeze({id:'gallery-deck',label:'HIGH GALLERY REBOUND',zone:'upper',x:-25,y:17,z:69,w:24,h:2,d:25}),
  Object.freeze({id:'gallery-cheek',label:'GALLERY RETURN',zone:'upper',x:-38,y:23,z:71,w:1.6,h:16,d:28,yaw:8}),
  Object.freeze({id:'cross-gantry',label:'GANTRY REBOUND',zone:'upper',x:0,y:31,z:88,w:58,h:2,d:8}),
  Object.freeze({id:'far-return',label:'HIGH RETURN',zone:'upper',x:0,y:24,z:113,w:47,h:34,d:2,pitch:-18}),
]);

export const VERTICAL_GROUND = Object.freeze({x:0,y:-.5,z:64,w:120,h:1,d:176});
export const VERTICAL_APRON = Object.freeze({x:0,y:7.5,z:-1,w:18,h:1,d:10});
