// Isolated spatial sketch. No courtyard card, score table or progression imports.
export const RANGE_STATION = Object.freeze({id:'transfer-apron',label:'Transfer Apron',x:0,z:0,yaw:0});
export const RANGE_DEFAULT = Object.freeze({railIndex:1,yaw:-17,elevation:22,charge:.45});
export const RANGE_BOUNDS = Object.freeze({minX:-55,maxX:55,minZ:-14,maxZ:134,minY:-8});
export const RANGE_CAMERA = Object.freeze({address:[0,10,-21],look:[0,5,40],survey:[77,88,-18],surveyLook:[0,3,55],fov:.86});
export const RANGE_TABLE = Object.freeze({x:7,y:1.4,z:44,width:16,height:.8,depth:20});
export const RANGE_SWITCH = Object.freeze({x:19,y:3.3,z:29,width:3.8,height:5,depth:1});
const pitch=22*Math.PI/180;
export const RANGE_STATES = Object.freeze({
  A:Object.freeze({pitch:0,material:'amber'}),
  B:Object.freeze({pitch:-22,yOffset:10*Math.sin(pitch)+.4*(1-Math.cos(pitch)),material:'violet'}),
});
// Face dimensions and physics are authored once, used by browser and HEADLESS.
export const RANGE_SOLIDS = Object.freeze([
  {id:'split-bench',label:'SPLIT BENCH REBOUND',zone:'bench',x:-14,y:4.2,z:26,w:1.2,h:8.4,d:18,yaw:25},
  {id:'return-cheek',label:'BENCH RETURN',zone:'bench',x:-27,y:3,z:40,w:1.2,h:6,d:13,yaw:-25},
  {id:'rack-high',label:'HIGH STACK REBOUND',zone:'rack',x:27,y:6,z:65,w:12,h:12,d:9},
  {id:'rack-middle',label:'MIDDLE STACK REBOUND',zone:'rack',x:20,y:4,z:82,w:12,h:8,d:9},
  {id:'rack-low',label:'LOW STACK REBOUND',zone:'rack',x:10,y:2,z:98,w:14,h:4,d:10},
  {id:'return-wall',label:'RETURN WALL REBOUND',zone:'rack',x:38,y:10,z:83,w:1.4,h:20,d:32,yaw:-25},
]);
export function rangeEnd(point,velocity,elapsed,slowSince){
  if(![point.x,point.y,point.z,velocity.x,velocity.y,velocity.z].every(Number.isFinite))return 'invalid-physics';
  if(point.x<RANGE_BOUNDS.minX||point.x>RANGE_BOUNDS.maxX||point.z<RANGE_BOUNDS.minZ||point.z>RANGE_BOUNDS.maxZ||point.y<RANGE_BOUNDS.minY)return 'out-of-bounds';
  if(elapsed>=60)return 'safety-timeout';
  if(slowSince!==null&&elapsed>=5&&elapsed-slowSince>=3)return 'settled';
  return null;
}
