import {barrelMesh,barrelPlanes} from './architectural-forms.js';
import {RAIL_RULES} from './rail-golf-v02.js';
import {configureExchangeShadows} from './exchange-roof-presentation.js';
import {Mesh,MeshBuilder,VertexData,PhysicsAggregate,PhysicsShapeType,Color3,StandardMaterial,Vector3} from '@babylonjs/core';

export const EXCHANGE_LAYOUT='playgrounds-exchange-yard-v1';
const box=(id,region,x,y,z,w,h,d,extra={})=>Object.freeze({id,region,x,y,z,w,h,d,shape:'box',...extra});
// A compact railway district. These records are the visible AND physical solids.
// Broad roofs/platforms receive shots; the dark street ends them under the
// unchanged first-ground contract. No invisible receiver or one-way surface.
export const EXCHANGE_GROUND=box('street','street',0,-.5,45,128,1,142,{ground:true});
export const EXCHANGE_SOLIDS=Object.freeze([
 box('viaduct-deck','viaduct',0,10.5,35,60,2,13),
 box('west-abutment','viaduct',-24,4.75,35,12,9.5,13),
 box('east-abutment','viaduct',24,4.75,35,12,9.5,13),
 box('west-pier','viaduct',-10,4.75,35,3,9.5,13),
 box('east-pier','viaduct',10,4.75,35,3,9.5,13),
 box('west-parapet','viaduct',-25,12.25,35,10,1.5,1),
 box('east-parapet','viaduct',25,12.25,35,10,1.5,1),
 box('west-loading-gallery','gallery',-25,4,68,18,8,20),
 box('west-store','store',-29,10.5,70,10,5,12),
 box('west-store-roof','store',-29,13,70,10,3,14,{shape:'gable'}),
 box('station-hall','hall',25,6.5,64,20,13,34),
 box('station-roof','hall',25,13,64,23,6,37,{shape:'gable'}),
 box('station-platform','platform',11.5,1.5,64,7,3,36),
 box('freight-dock','freight',-2,1.75,72,15,3.5,17),
 box('loading-crate','freight',-6,5.25,76,6,3.5,7),
 box('far-retaining-wall','wall',-4,10,87,66,20,2),
 box('west-retaining-wall','wall',-36,6,73,2,12,28),
 box('east-retaining-wall','wall',39,6,68,2,12,38),
 box('signal-house','signal',-24,3.5,16,10,7,10),
 box('signal-roof','signal',-24,7,16,12,3.5,12,{shape:'gable'}),
]);
export const EXCHANGE_STATIONS=Object.freeze([
 Object.freeze({id:'forecourt',label:'Forecourt · under or over',x:0,y:0,z:1,yaw:0}),
 Object.freeze({id:'service',label:'Service lane · across the works',x:-47,y:0,z:51,yaw:90}),
]);
export function exchangeStation(setup){const id=setup.carriageMode??'forecourt',station=EXCHANGE_STATIONS.find(s=>s.id===id);if(!station)throw Error('Unknown Exchange Yard station');return station;}
export function exchangeEnvironmentValid(state){return Boolean(state&&Object.keys(state).length===1&&state.layout===EXCHANGE_LAYOUT);}
const palette={street:[.15,.20,.22],viaduct:[.62,.56,.45],gallery:[.65,.41,.26],store:[.62,.38,.24],hall:[.70,.44,.29],platform:[.60,.62,.55],freight:[.65,.52,.30],wall:[.48,.53,.50],signal:[.68,.45,.28],roof:[.23,.43,.44],paint:[.87,.78,.54],dark:[.12,.19,.21],glass:[.31,.53,.57]};
function roofMesh(record,scene,legacyRoofWinding=false,legacyRoofDraw=false){
 const {w,h,d}=record,mesh=new Mesh('exchange-'+record.id,scene),data=new VertexData();
 data.positions=[-w/2,0,-d/2,w/2,0,-d/2,0,h,-d/2,-w/2,0,d/2,w/2,0,d/2,0,h,d/2];
 data.indices=[0,2,1,3,4,5,0,1,4,0,4,3,1,2,5,1,5,4,2,0,3,2,3,5];
 data.normals=[];VertexData.ComputeNormals(data.positions,data.indices,data.normals);data.applyToMesh(mesh);mesh.convertToFlatShadedMesh();
 // Babylon uses clockwise outward faces in this left-handed scene. Keep the
 // historical flat vertex buffer (and therefore convex-hull point order) exact;
 // reverse only the render indices and normals after flattening.
 if(!legacyRoofWinding){
  mesh.flipFaces(true);
  // Flat shading sets Babylon's unindexed draw flag. flipFaces only changes
  // indices/normals, so drawArrays would still submit the old inward vertex
  // order. Use the corrected indices without reordering any Havok hull points.
  // The old path is retained only for the owner rendering comparator.
  if(!legacyRoofDraw)mesh.isUnIndexed=false;
 }
 return mesh;
}
export function buildExchangeYard(scene,root,_materials,shadows,{solids=EXCHANGE_SOLIDS,details=true,stations=EXCHANGE_STATIONS,layout=solids===EXCHANGE_SOLIDS?EXCHANGE_LAYOUT:EXCHANGE_LAYOUT+'-ablation',legacyRoofWinding=false,legacyRoofDraw=false,roofPresentation='candidate'}={}){
 configureExchangeShadows(shadows,roofPresentation);
 const bodies=[],meshes=[],casters=[],decorations=[],ownMaterials=[];
 const mats=Object.fromEntries(Object.entries(palette).map(([id,rgb])=>{const m=new StandardMaterial('exchange-'+id,scene);m.diffuseColor=Color3.FromArray(rgb);m.specularColor=new Color3(.04,.04,.04);ownMaterials.push(m);return[id,m];}));
 for(const record of [EXCHANGE_GROUND,...solids]){
  const mesh=record.shape==='barrel'?barrelMesh(record,scene):record.shape==='gable'?roofMesh(record,scene,legacyRoofWinding,legacyRoofDraw):MeshBuilder.CreateBox('exchange-'+record.id,{width:record.w,height:record.h,depth:record.d},scene);
  mesh.parent=root;mesh.position.set(record.x,record.y,record.z);mesh.material=mats[['gable','barrel'].includes(record.shape)?'roof':record.region];mesh.receiveShadows=true;
  mesh.metadata=record.ground?{rangeGround:true}:{lineFeature:{id:record.id,kind:'range-timber',label:record.id.replaceAll('-',' ').toUpperCase()},rangeZone:record.region};
  bodies.push(new PhysicsAggregate(mesh,['gable','barrel'].includes(record.shape)?PhysicsShapeType.CONVEX_HULL:PhysicsShapeType.BOX,{mass:0,restitution:record.ground?.1:.86,friction:record.ground?.8:.18},scene));meshes.push(mesh);
  if(!record.ground){shadows.addShadowCaster(mesh);casters.push(mesh);}
 }
 // Surface paint only: windows/brick courses/track plans are lines exactly on
 // solids, with no suggestion of an open window or raised uncollided rail.
 // All small linework of each colour is batched into one rendered line mesh.
 const marks={paint:[],dark:[],glass:[]};
 const line=(color,...p)=>marks[color].push(p.map(v=>new Vector3(...v)));
 if(details){
  for(const s of solids.filter(s=>s.shape==='box'&&!s.ground&&['hall','store','signal'].includes(s.region))){
   const front=s.z-s.d/2-.012,left=s.x-s.w/2-.012;
   for(let y=s.y-s.h/2+.8;y<s.y+s.h/2;y+=1.4)line('dark',[s.x-s.w/2,y,front],[s.x+s.w/2,y,front]);
   for(let x=s.x-s.w/2+1.5;x<s.x+s.w/2-1;x+=3.5)line('glass',[x,s.y+.7,front],[x+1.5,s.y+.7,front],[x+1.5,s.y+2.2,front],[x,s.y+2.2,front],[x,s.y+.7,front]);
   for(let z=s.z-s.d/2+2;z<s.z+s.d/2-1;z+=5)line('glass',[left,s.y+.7,z],[left,s.y+2.2,z],[left,s.y+2.2,z+2],[left,s.y+.7,z+2],[left,s.y+.7,z]);
  }
  // The viaduct carries an east/west railway; a north/south painted service
  // alignment passes under it. These are embedded rail markings, not obstacles.
  for(const z of [32.5,36.5])line('dark',[-29,11.512,z],[29,11.512,z]);
  for(let x=-28;x<=28;x+=2)line('paint',[x,11.515,31.5],[x,11.515,37.5]);
  for(const x of [-2,2])line('dark',[x,.012,8],[x,.012,63]);
  for(let z=9;z<=61;z+=3)line('paint',[-3,.014,z],[3,.014,z]);
  for(const s of solids.filter(s=>['gallery','platform','freight'].includes(s.region)&&!s.id.includes('crate'))){const y=s.y+s.h/2+.015;line('paint',[s.x-s.w/2+.5,y,s.z-s.d/2+.5],[s.x+s.w/2-.5,y,s.z-s.d/2+.5],[s.x+s.w/2-.5,y,s.z+s.d/2-.5]);}
  for(const station of stations){const a=station.yaw*Math.PI/180,c=Math.cos(a),s=Math.sin(a),point=(x,z)=>[station.x+x*c+z*s,(station.y??0)+.016,station.z-x*s+z*c];line('paint',point(-7,-2),point(7,-2));line('paint',point(-7,-2),point(-7,3));line('paint',point(7,-2),point(7,3));}
  // Clock face is paint on the station facade. It is a landmark, not a target.
  const p=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;p.push([25+Math.cos(a)*1.7,10+Math.sin(a)*1.7,46.985]);}line('paint',...p);line('paint',[25,11.25,46.98],[25,10,46.98],[26,10,46.98]);
  for(const [color,lines]of Object.entries(marks)){const m=MeshBuilder.CreateLineSystem('exchange-painted-'+color,{lines},scene);m.parent=root;m.color=Color3.FromArray(palette[color]);m.isPickable=false;decorations.push(m);}
 }
 const state={layout};
 return {meshes,bodies,environment:{snapshot:()=>({...state}),restore(s){if(!s||Object.keys(s).length!==1||s.layout!==state.layout)throw Error('Invalid Exchange Yard environment');},reset(){}},diagnostics(){return {staticBodies:bodies.length,animatedBodies:0,worldMeshes:meshes.length+decorations.length,shadowCasters:casters.length,stationCount:stations.length};},dispose(){for(const b of bodies)b.dispose();for(const m of casters)shadows.removeShadowCaster(m);for(const m of meshes)m.dispose();for(const m of decorations)m.dispose(false,true);for(const m of ownMaterials)m.dispose();}};
}
// Convex clipping against the same box / gabled-prism boundaries used above.
// Presentation only; never decides a physical contact.
export function exchangeSegment(start,end,solid,padding=0){
 const a=[start.x-solid.x,start.y-solid.y,start.z-solid.z],b=[end.x-solid.x,end.y-solid.y,end.z-solid.z];
 const planes=solid.shape==='barrel'?barrelPlanes(solid):solid.shape==='gable'?[[1,0,0,solid.w/2],[ -1,0,0,solid.w/2],[0,0,1,solid.d/2],[0,0,-1,solid.d/2],[0,-1,0,0],[2*solid.h/solid.w,1,0,solid.h],[-2*solid.h/solid.w,1,0,solid.h]]:[[1,0,0,solid.w/2],[-1,0,0,solid.w/2],[0,1,0,solid.h/2],[0,-1,0,solid.h/2],[0,0,1,solid.d/2],[0,0,-1,solid.d/2]];
 let enter=0,leave=1;for(const [x,y,z,d]of planes){const n=Math.hypot(x,y,z),da=a[0]*x+a[1]*y+a[2]*z-d-padding*n,db=b[0]*x+b[1]*y+b[2]*z-d-padding*n;if(da>0&&db>0)return null;if(da<=0&&db<=0)continue;const t=da/(da-db);if(da>0)enter=Math.max(enter,t);else leave=Math.min(leave,t);if(enter>leave)return null;}return enter;
}
const vec=a=>({x:a.x,y:a.y,z:a.z}),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function exchangeClearFraction(ball,camera,solids=EXCHANGE_SOLIDS){let fraction=1;for(const s of [EXCHANGE_GROUND,...solids]){const hit=exchangeSegment(ball,camera,s,.3);if(hit!==null)fraction=Math.min(fraction,hit);}return fraction;}
export function exchangeFollowOffsets(ball){
 // Lower the boom before entering the visible viaduct, rather than discovering
 // its ceiling only once the camera has crossed the deck. This is a geometric
 // presentation clearance region; no future projectile path is predicted.
 const distance=Math.hypot(Math.max(0,Math.abs(ball.x)-30),Math.max(0,28.5-ball.z,ball.z-50.5)),t=Math.min(1,distance/14),near=1-t*t*(3-2*t),below=Math.min(1,Math.max(0,(11.5-ball.y)/3));
 const height=12+(Math.max(.7,9.1-ball.y)-12)*near*below;
 // Move gradually toward a side view beyond the crossing. A permanently
 // rearward boom cut through the deck when a returning roof line fell below it.
 const side=Math.min(1,Math.max(0,(ball.z-25)/20)),behind=-9+9*side*side*(3-2*side);
 return {position:{x:ball.x-7,y:ball.y+height,z:ball.z+behind},target:vec(ball)};
}
function exchangeFlightFrameForSolids(frame,ball,solids){
 const wanted=vec(frame.position);if(exchangeClearFraction(ball,wanted,solids)>=1)return {...frame,position:wanted,target:vec(ball)};
 let chosen=null,best=Infinity;
 // An underpass cannot use the Cistern's vertical escape. Search a small fixed
 // set of camera booms including a low horizontal ring beneath the deck.
 for(const height of [12,7,3,1])for(let i=0;i<16;i++){
  const a=i*Math.PI/8,c={x:ball.x+Math.cos(a)*9,y:ball.y+height,z:ball.z+Math.sin(a)*9};
  if(exchangeClearFraction(ball,c,solids)<1)continue;
  // Approach the clear boom continuously from the current camera. Choosing an
  // entire ring point at once caused a measured six-metre underpass jump.
  let low=0,high=1;for(let j=0;j<10;j++){const t=(low+high)/2,p={x:wanted.x+(c.x-wanted.x)*t,y:wanted.y+(c.y-wanted.y)*t,z:wanted.z+(c.z-wanted.z)*t};if(exchangeClearFraction(ball,p,solids)>=1)high=t;else low=t;}
  const p={x:wanted.x+(c.x-wanted.x)*high,y:wanted.y+(c.y-wanted.y)*high,z:wanted.z+(c.z-wanted.z)*high},cost=dist(wanted,p);
  if(cost<best){best=cost;chosen=p;}
 }
 if(!chosen){const fraction=exchangeClearFraction(ball,wanted,solids),distance=dist(ball,wanted),t=Math.max(0,fraction-.08/Math.max(distance,.01));chosen={x:ball.x+(wanted.x-ball.x)*t,y:ball.y+(wanted.y-ball.y)*t,z:ball.z+(wanted.z-ball.z)*t};}
 return {...frame,position:chosen,target:vec(ball)};
}
export function exchangeFlightFrame(frame,ball){return exchangeFlightFrameForSolids(frame,ball,EXCHANGE_SOLIDS);}
export function exchangeTerminalLabel(record){if(!record)return '';if(record.reason==='interrupted')return `Stopped by you at ${record.elapsed.toFixed(2)} s. Try another route when ready.`;if(record.reason==='first-ground-contact')return `Reached the dark street at ${record.elapsed.toFixed(2)} s. First ground contact ends the line.`;if(record.reason==='settled')return `Motion slowed on the architecture at ${record.elapsed.toFixed(2)} s. Retry or change station.`;if(record.reason==='out-of-bounds')return `Left the open district at ${record.elapsed.toFixed(2)} s. The sky and street ends are open.`;return `${record.reason.replaceAll('-',' ')} at ${record.elapsed.toFixed(2)} s.`;}
export const PLACES_ARCHITECTURE=Object.freeze({id:'places-architecture',title:'Exchange Yard',subtitle:'Under, over, across',brief:'A railway viaduct crosses the works. Copper roofs, a loading gallery and the far retaining wall offer different journeys. Choose any station; low drives and higher arcs see a different place. Dark street ends a shot. All raised surfaces are physical; fine lines are painted markings.',defaultSetup:{railIndex:1,yaw:0,elevation:35,charge:.4,carriageMode:'forecourt'},defaultPowerMode:'set',openInSurvey:false,overviewFlight:false,playground:{layout:EXCHANGE_LAYOUT,validateEnvironment:exchangeEnvironmentValid},station:exchangeStation,stationChoices:EXCHANGE_STATIONS.map(({id,label})=>({id,label})),bounds:{minX:-64,maxX:64,minZ:-26,maxZ:116,minY:-8,maxY:85},survey:{position:[-70,110,-5],target:[0,7,49]},buildWorld:buildExchangeYard,flightPresentation:{desired:exchangeFollowOffsets,constrain:exchangeFlightFrame,terminalLabel:exchangeTerminalLabel,indexHref:'/lab/places'}});
export function stationConfig(id){const station=exchangeStation({carriageMode:id});return {...PLACES_ARCHITECTURE,id:'places-architecture-'+id,station:()=>station};}

// A separate physical identity preserves v1 Keeps and its Service-lane control.
// All architectural solids and Forecourt coordinates remain byte-for-byte v1.
export const EXCHANGE_REFINED_LAYOUT='playgrounds-exchange-yard-v2';
export const EXCHANGE_REFINED_STATIONS=Object.freeze([
 EXCHANGE_STATIONS[0],
 Object.freeze({id:'freight',label:'Freight dock · back through the district',x:-2,y:3.5,z:67,yaw:180}),
]);
export function exchangeRefinedStation(setup){const id=setup.carriageMode??'forecourt',station=EXCHANGE_REFINED_STATIONS.find(s=>s.id===id);if(!station)throw Error('Unknown refined Exchange Yard station');return station;}
export function exchangeRefinedEnvironmentValid(state){return Boolean(state&&Object.keys(state).length===1&&state.layout===EXCHANGE_REFINED_LAYOUT);}
export function exchangeRefinedFollowOffsets(ball,_velocity,_heading,setup){
 const frame=exchangeFollowOffsets(ball);
 if(setup?.carriageMode==='freight')frame.position.x=ball.x-7*Math.tanh(ball.x/6);
 return frame;
}
export function exchangeRefinedLaunchFrame(frame,setup){
 if(setup.carriageMode!=='freight')return frame;
 const station=exchangeRefinedStation(setup),a=station.yaw*Math.PI/180,railOffset=RAIL_RULES.railPositions[setup.railIndex],x=station.x+railOffset*Math.cos(a),z=station.z-railOffset*Math.sin(a);
 return {...frame,position:[x+(frame.position[0]-x)*2/3,frame.position[1],z+(frame.position[2]-z)*2/3]};
}
export const PLACES_ARCHITECTURE_REFINED=Object.freeze({...PLACES_ARCHITECTURE,id:'places-architecture-refined',subtitle:'Forecourt and Freight',brief:'Explore the crossing from below, or turn the district around from the freight dock. Broad roofs, the viaduct and the loading gallery offer different returns and transfers. Dark street ends a shot. Raised surfaces are physical; fine lines are paint.',playground:{layout:EXCHANGE_REFINED_LAYOUT,validateEnvironment:exchangeRefinedEnvironmentValid},station:exchangeRefinedStation,stationChoices:EXCHANGE_REFINED_STATIONS.map(({id,label})=>({id,label})),buildWorld:(...args)=>buildExchangeYard(...args,{stations:EXCHANGE_REFINED_STATIONS,layout:EXCHANGE_REFINED_LAYOUT}),flightPresentation:{...PLACES_ARCHITECTURE.flightPresentation,desired:exchangeRefinedFollowOffsets,launchFrame:exchangeRefinedLaunchFrame}});

// Maintenance canopy: a modest receiving region opposite the signal house.
// The barrel profile is visibly faceted and one convex body with a flat soffit.
export const EXCHANGE_FORMS_LAYOUT='playgrounds-exchange-yard-v3';
export const EXCHANGE_FORMS_ADDITION=Object.freeze([
 box('maintenance-canopy','maintenance',25,5,14,22,4,20,{shape:'barrel',segments:10}),
 ...[-1,1].flatMap(sx=>[-1,1].map(sz=>box(`maintenance-pier-${sx}-${sz}`,'viaduct',25+sx*8.5,2.5,14+sz*7.5,3,5,3))),
]);
export const EXCHANGE_FORMS_SOLIDS=Object.freeze([...EXCHANGE_SOLIDS,...EXCHANGE_FORMS_ADDITION]);
export function exchangeFormsFollowOffsets(ball,velocity,heading,setup){
 const frame=exchangeRefinedFollowOffsets(ball,velocity,heading,setup);
 if(setup?.carriageMode==='forecourt'){
  // Stay slightly in front of the hall's eave as an eastern canopy departure
  // approaches its facade; the previous side boom crossed the roof's front lip.
  const east=Math.min(1,Math.max(0,(ball.x-10)/8)),north=Math.min(1,Math.max(0,(ball.z-34)/8));
  frame.position.z-=3*east*north;
  const belowEave=Math.min(1,Math.max(0,(18-ball.y)/5));
  frame.position.y-=Math.max(0,frame.position.y-ball.y-3)*east*north*belowEave;
 }
 return frame;
}
export const PLACES_ARCHITECTURE_FORMS=Object.freeze({...PLACES_ARCHITECTURE_REFINED,id:'places-architecture-forms',subtitle:'The maintenance canopy',brief:'A barrel-roofed maintenance canopy receives journeys beside the crossing. From Forecourt, approach its sloping sides or the open passage below. From Freight, carry over the crossing or continue a roof transfer into the near court. Dark street ends a shot. Raised surfaces are physical; fine lines are paint.',flightPresentation:{...PLACES_ARCHITECTURE_REFINED.flightPresentation,desired:exchangeFormsFollowOffsets,constrain:(frame,ball)=>exchangeFlightFrameForSolids(frame,ball,EXCHANGE_FORMS_SOLIDS)},playground:{layout:EXCHANGE_FORMS_LAYOUT,validateEnvironment:state=>Boolean(state&&Object.keys(state).length===1&&state.layout===EXCHANGE_FORMS_LAYOUT)},buildWorld:(...args)=>buildExchangeYard(...args,{solids:EXCHANGE_FORMS_SOLIDS,stations:EXCHANGE_REFINED_STATIONS,layout:EXCHANGE_FORMS_LAYOUT})});
