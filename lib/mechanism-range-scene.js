import {MeshBuilder,PhysicsAggregate,PhysicsShapeType,Vector3} from '@babylonjs/core';
import {buildRangeLegibility} from './mechanism-range-legibility.js';
import {buildDiverterLab} from './diverter-scene.js';
import {RANGE_SOLIDS,RANGE_TABLE,RANGE_SWITCH,RANGE_STATES} from './mechanism-range.js';

export function buildMechanismRange(scene,root,materials,shadows){
  const bodies=[],features=new Map();
  const box=(name,x,y,z,w,h,d,material,physical=false)=>{
    const mesh=MeshBuilder.CreateBox('mr-'+name,{width:w,height:h,depth:d},scene);
    mesh.parent=root;mesh.position.set(x,y,z);mesh.material=materials[material];mesh.receiveShadows=true;
    shadows.addShadowCaster(mesh);
    if(physical)bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:.1,friction:.8},scene));
    return mesh;
  };
  const ground=box('ground',0,-.5,60,110,1,148,'sand',true);
  ground.metadata={rangeGround:true};
  const tee=box('tee',0,.15,-1,14,.3,8,'machine',true);tee.metadata={rangeGround:true};
  for(const x of [-4,0,4])box('rail',x,.34,-1,.12,.06,7,'cyan');
  for(const record of RANGE_SOLIDS){
    const mesh=box(record.id,record.x,record.y,record.z,record.w,record.h,record.d,'timber');
    mesh.rotation.y=(record.yaw??0)*Math.PI/180;
    mesh.metadata={lineFeature:{id:record.id,kind:'range-timber',label:record.label},rangeZone:record.zone};
    bodies.push(new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:.86,friction:.18},scene));
    features.set(record.id,mesh);
    // Dark board seams and narrow edge banding expose the actual face orientation.
    for(const y of [-.32,0,.32]){
      const seam=box(record.id+'-seam',0,y*record.h,-record.d/2-.015,record.w,.07,.025,'bark');seam.parent=mesh;
    }
    const cap=box(record.id+'-cap',0,record.h/2+.02,0,record.w+.08,.04,record.d+.08,record.zone==='bench'?'amber':'steel');cap.parent=mesh;
    if(record.id.startsWith('rack-'))for(const z of [-.32,.32]){
      const strap=box('strap',0,record.h/2+.05,z*record.d,record.w+.1,.05,.22,'machine');strap.parent=mesh;
    }
  }
  // One transfer machine. The switch is ahead/right of its table, in the same sightline.
  const mechanism=buildDiverterLab(scene,root,materials,shadows,'A',{
    prefix:'mr-transfer-',overlay:true,target:null,supports:false,palletBoards:true,
    floor:RANGE_TABLE,switch:RANGE_SWITCH,states:RANGE_STATES,switchLabel:'TRANSFER CONTROL',
    feature:{id:'transfer-table',kind:'range-timber',label:'TRANSFER TABLE REBOUND'},
  });
  // Hinge and low skids sit below the useful surface in both states. No invisible walls.
  for(const x of [1,13])box('transfer-skid',x,.35,43,1.1,.7,21,'machine',true);
  const axle=MeshBuilder.CreateCylinder('mr-transfer-hinge',{height:18,diameter:.65,tessellation:16},scene);
  axle.parent=root;axle.position.set(7,1.35,34);axle.rotation.z=Math.PI/2;axle.material=materials.steel;
  bodies.push(new PhysicsAggregate(axle,PhysicsShapeType.CYLINDER,{mass:0,restitution:.1,friction:.8},scene));
  const legibility=buildRangeLegibility(scene,root,mechanism,features,materials);
  // No roof shell: an open structural frame gives height/scale without a penetrable cavity.
  for(const x of [20,46])box('loft-post',x,12,108,1,24,1,'bark',true);
  box('loft-crossbeam',33,23.5,108,27,1,1.3,'timber',true);
  for(const x of [-51,51])for(const z of [0,30,60,90,126])box('yard-edge',x,.9,z,.35,1.8,.35,'bark');
  // Two narrow work tracks cross the void without becoming new collision toys.
  for(const x of [-4,-1])box('work-track',x,.025,77,.16,.05,78,'steel');
  return {
    mechanism,features,ground,
    dispose(){legibility.dispose();mechanism.dispose();for(const b of bodies)b.dispose();},
    // Useful for authority and projection tests; the returned matrix belongs to the real body.
    tableTop(localX=0,localZ=0){return Vector3.TransformCoordinates(new Vector3(localX,RANGE_TABLE.height/2,localZ),mechanism.floor.computeWorldMatrix(true));},
  };
}
