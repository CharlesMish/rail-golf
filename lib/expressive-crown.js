import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Color3,StandardMaterial} from '@babylonjs/core';
import {barrelMesh} from './architectural-forms.js';
import {configureExchangeShadows} from './exchange-roof-presentation.js';
import {createResonanceEar,contactStrike} from './worldcraft-resonance.js';
import {exchangeSegment} from './places-architecture.js';

// A code-owned geometry comparison, deliberately outside the Worldcraft import
// contract. The existing crown is turned across the line of fire. No physics
// coefficient or redirect rule changes between the crown and flat controls.
export const CROWN_LAYOUT='playgrounds-expressive-crown-v1';
export const CROWN_FLAT_LAYOUT='playgrounds-expressive-crown-flat-v1';
export const CROWN_SOLID=Object.freeze({id:'crown',w:22,h:4,d:20,x:0,y:0,z:32,segments:10});
const acousticWorld={objects:[{id:'crown',kind:'barrel',voice:{material:'timber',degree:0}},{id:'near-deck',kind:'receiver',voice:{material:'metal',degree:2}},{id:'far-deck',kind:'receiver',voice:{material:'metal',degree:4}}]};
export function buildCrownStudy(scene,root,_materials,shadows,{flat=false}={}){
 configureExchangeShadows(shadows,'candidate');
 const bodies=[],meshes=[],casters=[],materials=[],ear=createResonanceEar();let incoming=null,disposed=false;
 const material=(name,color)=>{const m=new StandardMaterial('crown-'+name,scene);m.diffuseColor=Color3.FromArray(color);m.specularColor=new Color3(.04,.04,.04);materials.push(m);return m;};
 const groundMat=material('ground',[.13,.19,.22]),crownMat=material('timber',[.64,.43,.25]),nearMat=material('near',[.25,.54,.58]),farMat=material('far',[.65,.61,.37]);
 const add=(id,size,position,mat,ground=false)=>{const m=MeshBuilder.CreateBox(ground?'crown-ground':'worldcraft-object-'+id,size,scene);m.position.set(...position);finish(m,id,mat,ground,PhysicsShapeType.BOX);return m;};
 const finish=(mesh,id,mat,ground,shape)=>{mesh.parent=root;mesh.material=mat;mesh.receiveShadows=true;mesh.metadata=ground?{rangeGround:true}:{lineFeature:{id,kind:'range-timber',label:id.replaceAll('-',' ').toUpperCase()}};bodies.push(new PhysicsAggregate(mesh,shape,{mass:0,restitution:ground?.1:.86,friction:ground?.8:.18},scene));meshes.push(mesh);if(!ground){shadows?.addShadowCaster(mesh);casters.push(mesh);}};
 add('ground',{width:72,height:1,depth:120},[0,-.5,44],groundMat,true);
 if(flat)add('crown',{width:CROWN_SOLID.d,height:CROWN_SOLID.h,depth:CROWN_SOLID.w},[0,CROWN_SOLID.h/2,CROWN_SOLID.z],crownMat);
 else{const mesh=barrelMesh(CROWN_SOLID,scene);mesh.name='worldcraft-object-crown';mesh.rotation.y=Math.PI/2;mesh.position.set(0,0,CROWN_SOLID.z);finish(mesh,'crown',crownMat,false,PhysicsShapeType.CONVEX_HULL);}
 add('near-deck',{width:18,height:1,depth:9},[0,.5,14.5],nearMat);
 add('far-deck',{width:24,height:1,depth:18},[0,.5,59],farMat);
 const layout=flat?CROWN_FLAT_LAYOUT:CROWN_LAYOUT;
 return {meshes,bodies,environment:{snapshot:()=>({layout}),restore(state){if(!state||Object.keys(state).length!==1||state.layout!==layout)throw Error('Different crown-study geometry.');},reset(){}},
  onLaunch(){ear.begin();incoming=null;},
  beforeStep(flight){const v=flight?.aggregate.body.getLinearVelocity();incoming=v?{x:v.x,y:v.y,z:v.z}:null;},
  contact(other,_point,flight,event){const velocity=flight?.aggregate.body.getLinearVelocity(),strike=contactStrike(event,incoming);ear.hear({body:other?.transformNode.name,time:flight.elapsed,speed:velocity?.length()??0,...strike,world:acousticWorld,dynamics:'normal-speed'});return null;},
  resonance:()=>ear.snapshot(),
  diagnostics(){return {staticBodies:bodies.length,animatedBodies:0,worldMeshes:meshes.length,shadowCasters:casters.length,physicalOnsets:ear.snapshot().sounds};},
  dispose(){if(disposed)return;disposed=true;for(const b of bodies)b.dispose();for(const m of casters)shadows?.removeShadowCaster(m);for(const m of meshes)m.dispose();for(const m of materials)m.dispose();},
 };
}
const station=()=>({id:'crown-apron',label:'Crown apron',x:0,y:0,z:0,yaw:0});
const decks=[{shape:'box',x:0,y:.5,z:14.5,w:18,h:1,d:9},{shape:'box',x:0,y:.5,z:59,w:24,h:1,d:18}];
// Rotate the same crown supporting planes, rather than treating its camera
// obstruction as a box. This is presentation only and never determines contact.
export function crownViewClear(ball,camera,flat=false){
 const local=p=>({x:-(p.z-CROWN_SOLID.z),y:p.y,z:p.x});
 const crown=flat?{shape:'box',x:0,y:2,z:32,w:20,h:4,d:22}:{...CROWN_SOLID,x:0,y:0,z:0,shape:'barrel'};
 const hit=flat?exchangeSegment(ball,camera,crown,.08):exchangeSegment(local(ball),local(camera),crown,.08);
 return hit===null&&decks.every(deck=>exchangeSegment(ball,camera,deck,.08)===null);
}
export function crownFlightFrame(frame,ball,flat=false){
 if(crownViewClear(ball,frame.position,flat))return {...frame,target:{x:ball.x,y:ball.y,z:ball.z}};
 let chosen=null,best=Infinity;
 for(const height of [10,18])for(let i=0;i<16;i++){
  const a=i*Math.PI/8,p={x:ball.x+Math.cos(a)*11,y:ball.y+height,z:ball.z+Math.sin(a)*11};
  if(!crownViewClear(ball,p,flat))continue;
  const cost=Math.hypot(p.x-frame.position.x,p.y-frame.position.y,p.z-frame.position.z);
  if(cost<best){chosen=p;best=cost;}
 }
 return {...frame,position:chosen??{x:ball.x,y:ball.y+18,z:ball.z},target:{x:ball.x,y:ball.y,z:ball.z}};
}
const config=flat=>({id:flat?'expressive-crown-flat':'expressive-crown',title:'Across the crown',subtitle:flat?'Flat receiving control':'A transverse barrel surface',brief:'A broad timber crown lies between two low receiving decks. Contact position changes where the ball leaves the surface. Try a lower approach, then an arc. Raised surfaces are physical; dark ground ends the shot. This isolated geometry study uses ordinary impact feedback and its own physical Keeps, not Counterline recordings.',defaultSetup:{railIndex:1,yaw:0,elevation:15,charge:.4},defaultPowerMode:'set',openInSurvey:false,overviewFlight:false,playground:{layout:flat?CROWN_FLAT_LAYOUT:CROWN_LAYOUT,validateEnvironment:state=>Boolean(state&&Object.keys(state).length===1&&state.layout===(flat?CROWN_FLAT_LAYOUT:CROWN_LAYOUT))},station,bounds:{minX:-36,maxX:36,minZ:-16,maxZ:104,minY:-8,maxY:85},survey:{position:[-47,64,-5],target:[0,1,35]},flightPresentation:{desired:ball=>({position:{x:ball.x-10,y:ball.y+10,z:ball.z-6},target:{x:ball.x,y:ball.y,z:ball.z}}),constrain:(frame,ball)=>crownFlightFrame(frame,ball,flat),terminalLabel:r=>!r?'':r.reason==='first-ground-contact'?`Reached the dark ground at ${r.elapsed.toFixed(2)} s.`:r.reason==='interrupted'?'Stopped. Try another approach when ready.':`${r.reason.replaceAll('-',' ')} at ${r.elapsed.toFixed(2)} s.`,indexHref:'/lab/instrument-foundry'},buildWorld:(...args)=>buildCrownStudy(...args,{flat})});
export const EXPRESSIVE_CROWN=Object.freeze(config(false));
export const EXPRESSIVE_CROWN_FLAT=Object.freeze(config(true));
