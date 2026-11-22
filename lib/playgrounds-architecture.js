import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Color3} from '@babylonjs/core';

export const ARCHITECTURE_LAYOUT='playgrounds-ringwell-v1';
const solid=(id,x,y,z,w,h,d,extra={})=>Object.freeze({id,x,y,z,w,h,d,...extra});
export const RINGWELL_SOLIDS=Object.freeze([
 solid('far-wall',0,15,69,56,30,2,{zone:'wall'}),
 solid('east-wall',28,15,42,2,30,56,{zone:'wall'}),
 solid('west-near-wall',-28,15,25,2,30,22,{zone:'wall'}),
 solid('west-far-wall',-28,15,59,2,30,22,{zone:'wall'}),
 solid('near-west-wall',-18,9,14,20,18,2,{zone:'wall'}),
 solid('near-east-wall',18,9,14,20,18,2,{zone:'wall'}),
 solid('west-gallery',-20,5,43,14,10,30,{zone:'west'}),
 solid('east-gallery',20,9,47,14,18,28,{zone:'east'}),
 solid('low-landing',0,2.5,61,26,5,14,{zone:'low'}),
 solid('ear-floor',-36,5,42,18,10,12,{zone:'ear'}),
 solid('ear-end',-46,15,42,2,20,14,{zone:'ear',yaw:15}),
 solid('ear-near',-36,15,35.5,18,20,1,{zone:'ear'}),
 solid('ear-far',-36,15,48.5,18,20,1,{zone:'ear'}),
 solid('launch-pier',0,10,12,14,20,10,{zone:'tee',ground:true}),
]);
export const RINGWELL_GROUND=solid('ground',0,-.5,40,130,1,120,{ground:true,zone:'ground'});
export function architectureEnvironmentValid(state){return Boolean(state&&typeof state==='object'&&Object.keys(state).length===1&&state.layout===ARCHITECTURE_LAYOUT);}
// Code-owned box solids only. Dimensions and transforms are shared by visible
// meshes and Havok; this does not extend the imported Worldcraft vocabulary.
export function buildArchitectureSolids(scene,root,materials,shadows,{solids=RINGWELL_SOLIDS,ground=RINGWELL_GROUND,palette=true}={}){
 const bodies=[],meshes=[],features=new Map(),casters=[];
 const ownMaterials=[];
 const colors={wall:[.58,.66,.64],west:[.72,.61,.40],east:[.48,.67,.70],low:[.61,.68,.45],ear:[.76,.56,.41],tee:[.32,.35,.35],ground:[.14,.22,.25]};
 const resolved={};
 if(palette)for(const [zone,rgb]of Object.entries(colors)){const m=materials.timber.clone('ringwell-'+zone);m.diffuseColor=Color3.FromArray(rgb);m.specularColor=new Color3(.06,.06,.06);resolved[zone]=m;ownMaterials.push(m);}
 for(const record of [ground,...solids]){
   const mesh=MeshBuilder.CreateBox('rw-'+record.id,{width:record.w,height:record.h,depth:record.d},scene);mesh.parent=root;mesh.position.set(record.x,record.y,record.z);mesh.rotation.set((record.pitch??0)*Math.PI/180,(record.yaw??0)*Math.PI/180,(record.roll??0)*Math.PI/180);mesh.material=resolved[record.zone]??materials.timber;mesh.receiveShadows=true;
   mesh.metadata=record.ground?{rangeGround:true}:{lineFeature:{id:record.id,kind:'range-timber',label:record.id.replaceAll('-',' ').toUpperCase()},rangeZone:record.zone};
   bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:record.ground ? .1 : .86,friction:record.ground ? .8 : .18},scene));meshes.push(mesh);features.set(record.id,mesh);
   if(!record.ground){shadows.addShadowCaster(mesh);casters.push(mesh);}
 }
 const state=solids===RINGWELL_SOLIDS&&ground===RINGWELL_GROUND
   ? {layout:ARCHITECTURE_LAYOUT}
   : {layout:ARCHITECTURE_LAYOUT+'-probe',geometry:JSON.stringify({ground,solids})};
 const snapshot=()=>({...state});
 return {features,bodies,meshes,environment:{snapshot,restore(candidate){if(!candidate||Object.keys(candidate).length!==Object.keys(state).length||Object.entries(state).some(([key,value])=>candidate[key]!==value))throw Error('Invalid Cistern environment');},reset(){}},diagnostics(){return {staticBodies:bodies.length,meshes:meshes.length,shadowCasters:casters.length};},dispose(){for(const b of bodies)b.dispose();for(const m of casters)shadows.removeShadowCaster(m);for(const m of meshes)m.dispose();for(const m of ownMaterials)m.dispose();}};
}
export const PLAYGROUNDS_ARCHITECTURE=Object.freeze({
 id:'playgrounds-architecture',title:'Gallery Cistern',subtitle:'A room for a long fall',
 brief:'An open cistern with high and low galleries and a side chamber. Try visiting a different part of the room, or returning to one by a different route. The dark floor and launch pier end a shot.',
 defaultSetup:{railIndex:1,yaw:0,elevation:18,charge:.4},defaultPowerMode:'set',openInSurvey:true,overviewFlight:true,
 playground:{layout:ARCHITECTURE_LAYOUT,validateEnvironment:architectureEnvironmentValid},
 station:()=>({id:'ringwell-entry',label:'Cistern entry',x:0,y:20,z:15,yaw:0}),
 bounds:{minX:-65,maxX:65,minZ:-20,maxZ:100,minY:-8,maxY:85},survey:{position:[-25,145,28],target:[-7,10,43]},
 buildWorld:buildArchitectureSolids,
});
