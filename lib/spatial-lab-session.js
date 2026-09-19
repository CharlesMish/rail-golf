import {createMechanismSession} from './mechanism-range-session.js';
import {stationMuzzle,stationAim,stationRailPosition} from './stations.js';
import {rangeSetup} from './mechanism-range-controls.js';

// New labs configure the accepted session instead of copying its sphere, launch,
// solver cadence, redirect tracker, contact ledger or terminal recovery authority.
export function spatialEnd(bounds,p,v,t,slow){
 if(![p.x,p.y,p.z,v.x,v.y,v.z].every(Number.isFinite))return 'invalid-physics';
 if(p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ||p.y<bounds.minY||(bounds.maxY!==undefined&&p.y>bounds.maxY))return 'out-of-bounds';
 if(t>=60)return 'safety-timeout';
 if(slow!==null&&t>=5&&t-slow>=3)return 'settled';
 return null;
}
export function spatialSetup(config,setup,patch={}){
 const normalized=rangeSetup(setup,patch);
 return config.originControl?.normalize(normalized)??normalized;
}
export function spatialControlSetup(config,current,patch,phase){
 const origin=Object.hasOwn(patch,'carriageMode')||Object.hasOwn(patch,'originX')||Object.hasOwn(patch,'tourRunning')||Boolean(config.originControl&&Object.hasOwn(patch,'railIndex'));
 if(origin?phase!=='ready':!['ready','charging'].includes(phase))return current;
 if(config.originControl&&Object.hasOwn(patch,'carriageMode')&&config.originControl.selectMode)return config.originControl.selectMode(current,patch.carriageMode);
 if(config.originControl&&Object.hasOwn(patch,'originX')&&config.originControl.select)return config.originControl.select(current,patch.originX);
 if(config.originControl&&Object.hasOwn(patch,'tourRunning')&&config.originControl.setRunning)return config.originControl.setRunning(current,patch.tourRunning);
 return spatialSetup(config,current,patch);
}
export function spatialLaunch(config,setup){
 const station=config.station(setup),muzzle=stationMuzzle(setup,station),rail=stationRailPosition(setup.railIndex,station);
 muzzle.y+=station.y??0;rail.y=station.y??0;
 return {station:{...station},muzzle,rail,aim:stationAim(setup,station)};
}
export function spatialCameraFrame(config,setup,width,height,mode='launch'){
 const {station,rail}=spatialLaunch(config,setup),horizontal=width<height;
 if(mode==='survey')return {position:[...config.survey.position],target:[...config.survey.target],fov:horizontal?.92:.86,horizontal,ease:4};
 const r=(setup.yaw+station.yaw)*Math.PI/180;
 return {position:[rail.x-Math.sin(r)*15,rail.y+7.8,rail.z-Math.cos(r)*15],target:[rail.x+Math.sin(r)*34,rail.y+3.6,rail.z+Math.cos(r)*34],fov:horizontal?.92:.69,horizontal,ease:Math.log(1000)};
}
export function createSpatialSession(scene,world,config,emit=()=>{}){
 const environment=world.environment??{snapshot:()=>({}),restore(){},reset(){}};
 const session=createMechanismSession(scene,world,event=>{
   if(event.kind==='end')event.last.station={...config.station(event.last.setup)};
   emit(event);
 },{
  prepareLaunch:setup=>world.prepareLaunch?.(setup),beforeIdleStep:dt=>world.beforeIdleStep?.(dt),
  station:config.station,environment,end:config.end??((...args)=>spatialEnd(config.bounds,...args)),
  contact:(other,point,flight)=>world.contact?.(other,point,flight)??null,
  flush:()=>world.flush?.(),onLaunch:f=>world.onLaunch?.(f),onResolve:(f,r)=>world.onResolve?.(f,r),onAction:a=>world.onAction?.(a),beforeStep:(f,dt)=>world.beforeStep?.(f,dt),afterStep:(f,dt)=>world.afterStep?.(f,dt),
 });
 return session;
}

// Setup motion only. This clock never advances Havok or adds velocity to a round.
// Sync once more at release so an origin isn't captured from the prior render frame.
export function createSpatialOriginClock(config,read,publish){
 let previous=null;
 return {
  reset(now){previous=now;},
  sync(now,phase,paused=false){
   const elapsed=previous===null?0:Math.max(0,(now-previous)/1000);previous=now;
   const current=read();if(paused||!config.originControl?.advance)return current;
   const next=config.originControl.advance(current,elapsed,phase);
   if(next!==current)publish(next);return next;
  },
 };
}
