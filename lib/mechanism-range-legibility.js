import {MeshBuilder,Mesh,StandardMaterial,Color3} from '@babylonjs/core';

export const RANGE_EVENT_HOLD_MS=3200;
// Presentation consumes qualified authority; raw/rejected contacts never enter this list.
export function rangeLineEvents(evidence=[]){
 return evidence.flatMap(event=>event.kind==='redirect'&&event.label
  ?[{kind:'redirect',label:event.label,feature:event.feature,point:event.point}]
  :event.kind==='switch'&&['A','B'].includes(event.state)
   ?[{kind:'switch',label:`TRANSFER ${event.state==='B'?'A → B':'B → A'} · ${event.state==='B'?'RAISED':'LEVEL'}`}]:[]);
}
export function rangeLineReceipt(record){
 return {events:rangeLineEvents(record?.evidence),terminal:record?.reason?`LINE ENDED — ${record.reason.replaceAll('-',' ').toUpperCase()}`:''};
}

// A billboard at the real qualified contact point, never a new body or raw-contact effect.
export function createRangeDepartureMarkers(scene){
 const markers=[];
 const clear=()=>{for(const {mesh,material} of markers){mesh.dispose();material.dispose();}markers.length=0;};
 return {get count(){return markers.length;},clear,
  add(event,now){
   if(event.kind!=='redirect'||!event.point||![event.point.x,event.point.y,event.point.z].every(Number.isFinite))return false;
   const root=new Mesh('mr-qualified-departure',scene);root.isPickable=false;root.billboardMode=Mesh.BILLBOARDMODE_ALL;
   root.position.copyFromFloats(event.point.x,event.point.y,event.point.z);
   const ring=MeshBuilder.CreateTorus('mr-departure-ring',{diameter:1.6,thickness:.075,tessellation:40},scene);
   ring.parent=root;ring.rotation.x=Math.PI/2;ring.isPickable=false;
   const material=new StandardMaterial('mr-departure-light',scene);material.disableLighting=true;material.emissiveColor=new Color3(.45,.95,1);material.alpha=.9;ring.material=material;
   markers.push({mesh:root,material,started:now});return true;
  },
  update(now){for(let i=markers.length-1;i>=0;i--){const marker=markers[i],age=(now-marker.started)/RANGE_EVENT_HOLD_MS;
   if(age>=1){marker.mesh.dispose();marker.material.dispose();markers.splice(i,1);continue;}
   marker.mesh.scaling.setAll(1+Math.min(age*3,1)*.65);marker.material.alpha=.9*(1-Math.max(0,(age-.55)/.45));
  }},dispose:clear,
 };
}

// Thin surface finishes and pipework only. No collider, feature tag, contact callback or impulse.
export function buildRangeLegibility(scene,root,mechanism,features,materials){
 const meshes=[];
 const box=(name,w,h,d,x,y,z,material,parent=root)=>{
  const m=MeshBuilder.CreateBox('mr-readability-'+name,{width:w,height:h,depth:d},scene);m.parent=parent;m.position.set(x,y,z);m.material=material;m.isPickable=false;m.receiveShadows=true;meshes.push(m);return m;
 };
 const switchMesh=mechanism.switchBody.transformNode;
 // Continuous casing: actuator foot -> existing right-angle drive -> hinge.
 const drive=[box('drive-out',2.2,.46,.46,18,1.1,29,materials.amber),
  box('drive-long',.46,.46,5.4,17,1.1,31.5,materials.amber),
  box('drive-cross',10.4,.46,.46,12,1.1,34,materials.amber)];
 for(const [x,z] of [[17,29],[17,34],[7,34]])box('coupling',.66,.62,.66,x,1.1,z,materials.steel);
 // Face framing stays inside the shootable block's existing footprint.
 for(const x of [-1.6,1.6])box('actuator-frame',.12,4.5,.035,x,0,-.52,materials.machine,switchMesh);
 for(const y of [-2.2,2.2])box('actuator-frame',3.3,.12,.035,0,y,-.52,materials.machine,switchMesh);
 // One sightline treatment: pale grain on the existing inward broad return-wall face.
 // The 20 m wall and every approach/collider remain exactly where v0 put them.
 const wall=features.get('return-wall');
 const pale=new StandardMaterial('mr-return-face-timber',scene);pale.diffuseColor=new Color3(.78,.60,.38);pale.specularColor=new Color3(.06,.06,.06);pale.emissiveColor=new Color3(.035,.024,.01);
 box('return-face',.028,17.6,28.8,-.722,0,0,pale,wall);
 for(const z of [-14.4,14.4])box('return-edge',.035,17.6,.14,-.74,0,z,materials.machine,wall);
 for(const y of [-8.8,8.8])box('return-edge',.035,.14,28.8,-.74,y,0,materials.machine,wall);
 for(const y of [-4.4,0,4.4])box('return-grain',.035,.055,28.8,-.74,y,0,materials.bark,wall);
 const update=()=>{for(const mesh of drive)mesh.material=switchMesh.material;};update();
 const observer=scene.onBeforeRenderObservable.add(update);
 return {meshes,update,dispose(){scene.onBeforeRenderObservable.remove(observer);for(const mesh of meshes)mesh.dispose();pale.dispose();}};
}
