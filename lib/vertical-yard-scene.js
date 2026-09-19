import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Color3} from '@babylonjs/core';
import {VERTICAL_SOLIDS,VERTICAL_GROUND,VERTICAL_APRON} from './vertical-yard.js';

// No moving apparatus, boost, target, hidden catch volume or scorer. Every broad
// visually solid face is an ordinary BOX body; narrow trim is surface dressing.
export function buildVerticalYard(scene,root,materials,shadows){
  const bodies=[],meshes=[],features=new Map();
  const receiverTimber=materials.timber.clone('vy-receiver-timber');receiverTimber.diffuseColor=new Color3(.78,.62,.40);
  const box=(id,record,material)=>{
    const mesh=MeshBuilder.CreateBox('vy-'+id,{width:record.w,height:record.h,depth:record.d},scene);
    mesh.parent=root;mesh.position.set(record.x,record.y,record.z);
    mesh.rotation.set((record.pitch??0)*Math.PI/180,(record.yaw??0)*Math.PI/180,0);
    mesh.material=materials[material];mesh.receiveShadows=true;shadows.addShadowCaster(mesh);meshes.push(mesh);return mesh;
  };
  const physical=(mesh,restitution=.86,friction=.18)=>{
    bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution,friction},scene));return mesh;
  };
  const ground=physical(box('ground',VERTICAL_GROUND,'sand'),.1,.8);ground.metadata={rangeGround:true};
  const apron=physical(box('hoist-apron',VERTICAL_APRON,'machine'),.1,.8);apron.metadata={rangeGround:true};
  for(const record of VERTICAL_SOLIDS){
    const mesh=physical(box(record.id,record,record.id==='cross-gantry'?'machine':'timber'));
    mesh.metadata={lineFeature:{id:record.id,kind:'range-timber',label:record.label},rangeZone:record.zone};
    features.set(record.id,mesh);
    // Inset board seams follow the *same* face transform rather than advertising
    // a different collision silhouette. Warm lower, pale upper edge language.
    for(const ratio of [-.3,0,.3]){
      const seam=box(record.id+'-seam',{x:0,y:ratio*record.h,z:-record.d/2-.014,w:record.w*.98,h:.06,d:.025},'bark');seam.parent=mesh;
    }
    const band=box(record.id+'-band',{x:0,y:record.h/2+.012,z:0,w:record.w,h:.025,d:record.d},record.zone==='lower'?'amber':'steel');band.parent=mesh;
    if(record.id==='far-return'){
      // Pale face reads as a deliberate angled receiver across the void.
      const face=box('return-face',{x:0,y:0,z:-record.d/2-.018,w:record.w-1.2,h:record.h-1.2,d:.025},'steel');face.parent=mesh;
      face.material=receiverTimber;
      for(const x of [-.46,.46]){
        const edge=box('return-upright',{x:x*record.w,y:0,z:-record.d/2-.04,w:.15,h:record.h-1,d:.05},'bark');edge.parent=mesh;
      }
    }
  }
  // Honest support posts: solid visual masses get real collisions and sensible
  // evidence labels. They do not carry a new authored trick/point family.
  for(const [id,x,z,h] of [['gallery-front-post',-33,59,16],['gallery-rear-post',-33,79,16],['gantry-left-post',-28,88,30],['gantry-right-post',28,88,30]]){
    const post=physical(box(id,{x,y:h/2,z,w:1.4,h,d:1.4},'bark'));
    post.metadata={lineFeature:{id,kind:'range-timber',label:'TIMBER POST REBOUND'}};features.set(id,post);
  }
  // Elevated launch slab is supported rather than floating. These supports are
  // behind/below the sporting equipment; the apron itself terminates a return.
  for(const x of [-8,8])physical(box('apron-support',{x,y:3.5,z:-1,w:1,h:7,d:8},'bark'),.1,.8);
  for(const x of [-4,0,4])box('rail',{x,y:8.04,z:-1,w:.12,h:.06,d:8},'cyan');
  // Two thin work rails on the floor reinforce depth without sealing the void.
  for(const x of [-8,-6])box('floor-track',{x,y:.025,z:68,w:.14,h:.05,d:132},'steel');
  return {features,ground,dispose(){for(const body of bodies)body.dispose();for(const mesh of meshes){shadows.removeShadowCaster?.(mesh);mesh.dispose();}receiverTimber.dispose();}};
}
