import {PhysicsAggregate,PhysicsMotionType,PhysicsShapeType,Vector3} from '@babylonjs/core';

// Shared by Fan & Paddle Works and the isolated Swing Gate study. The caller
// owns the pure fixed-tick pose law. Reset is a launch/recovery operation only;
// live motion always uses Havok's ANIMATED target-transform authority.
export function createPeriodicReflector(scene,mesh,pose){
  let aggregate=null;
  return {
    get aggregate(){return aggregate;},
    reset(tick){
      aggregate?.dispose();
      const next=pose(tick);
      mesh.position.copyFrom(next.position);
      mesh.rotationQuaternion.copyFrom(next.rotation);
      mesh.computeWorldMatrix(true);
      aggregate=new PhysicsAggregate(mesh,PhysicsShapeType.BOX,{mass:0,restitution:.86,friction:.18},scene);
      aggregate.body.setMotionType(PhysicsMotionType.ANIMATED);
    },
    move(tick){const next=pose(tick);aggregate.body.setTargetTransform(next.position,next.rotation);},
    stop(){aggregate.body.setAngularVelocity(Vector3.Zero());aggregate.body.setLinearVelocity(Vector3.Zero());},
    dispose(){aggregate?.dispose();aggregate=null;},
  };
}
