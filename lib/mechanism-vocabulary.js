// Isolated feasibility study: no score, destination or production course imports.
export const VOCABULARY_STATION=Object.freeze({id:'fan-apron',label:'Fan Apron',x:0,z:0,yaw:0});
export const VOCABULARY_DEFAULT=Object.freeze({railIndex:1,yaw:0,elevation:25,charge:.55});
export const VOCABULARY_BOUNDS=Object.freeze({minX:-56,maxX:56,minZ:-14,maxZ:136,minY:-8});
export const WIND_VOLUME=Object.freeze({minX:-26,maxX:-2,minY:1,maxY:25,minZ:24,maxZ:66,acceleration:6});
export const WIND_STATES=Object.freeze(['OFF','LEFT','RIGHT']);
export const PADDLE_MODES=Object.freeze(['SYNC','LIVE']);
export const PADDLE_HZ=120;
export const VOCABULARY_ENVIRONMENT=Object.freeze({wind:'LEFT',paddleMode:'SYNC',paddleTick:'0'});
export const PADDLE=Object.freeze({x:20,y:8,z:49,width:17,height:14,depth:1.4,amplitudeDegrees:28,periodSeconds:9});
export function windAcceleration(point,state){
  const inside=point.x>=WIND_VOLUME.minX&&point.x<=WIND_VOLUME.maxX&&point.y>=WIND_VOLUME.minY&&point.y<=WIND_VOLUME.maxY&&point.z>=WIND_VOLUME.minZ&&point.z<=WIND_VOLUME.maxZ;
  return {x:inside&&state==='LEFT'?-WIND_VOLUME.acceleration:inside&&state==='RIGHT'?WIND_VOLUME.acceleration:0,y:0,z:0};
}
export function paddleTick(value){
  const numeric=typeof value==='number'?value:typeof value==='string'&&/^\d+$/.test(value)?Number(value):NaN;
  if(!Number.isSafeInteger(numeric)||numeric<0||numeric>=PADDLE.periodSeconds*PADDLE_HZ)throw Error('Invalid paddle phase');
  return numeric;
}
export function paddleYaw(seconds){return PADDLE.amplitudeDegrees*Math.PI/180*Math.sin(seconds*Math.PI*2/PADDLE.periodSeconds);}
export function vocabularyEnd(point,velocity,elapsed,slowSince){
  if(![point.x,point.y,point.z,velocity.x,velocity.y,velocity.z].every(Number.isFinite))return 'invalid-physics';
  if(point.x<VOCABULARY_BOUNDS.minX||point.x>VOCABULARY_BOUNDS.maxX||point.z<VOCABULARY_BOUNDS.minZ||point.z>VOCABULARY_BOUNDS.maxZ||point.y<VOCABULARY_BOUNDS.minY)return 'out-of-bounds';
  if(elapsed>=60)return 'safety-timeout';
  if(slowSince!==null&&elapsed>=5&&elapsed-slowSince>=3)return 'settled';
  return null;
}
