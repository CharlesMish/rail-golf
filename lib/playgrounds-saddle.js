import {Mesh,MeshBuilder,VertexData,PhysicsAggregate,PhysicsShapeType} from '@babylonjs/core';

export const SADDLE_PROOF=Object.freeze({id:'vesper-saddle-proof-v1',minX:-18,maxX:18,minZ:15,maxZ:75,topAtFront:12,downSlope:.08,ridgeCurve:.018,thickness:1.5,grid:1.5});
export const saddleHeight=(x,z,control='ridge')=>SADDLE_PROOF.topAtFront-SADDLE_PROOF.downSlope*(z-SADDLE_PROOF.minZ)-(control==='flat'||control==='box'?0:SADDLE_PROOF.ridgeCurve*x*x);
// A single closed triangulated solid. Both displayed surface and Havok MESH use
// these same vertices; there are no decorative lips or invisible catch colliders.
export function saddleGeometry(control='ridge',grid=SADDLE_PROOF.grid){
 if(!['ridge','flat'].includes(control)||![.75,1.5,3].includes(grid))throw Error('Unknown saddle proof configuration');
 const p=SADDLE_PROOF,positions=[],indices=[],nx=Math.round((p.maxX-p.minX)/grid),nz=Math.round((p.maxZ-p.minZ)/grid);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=p.minX+i*grid,z=p.minZ+j*grid;positions.push(x,saddleHeight(x,z,control),z);}
 const n=(nx+1)*(nz+1);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=p.minX+i*grid,z=p.minZ+j*grid;positions.push(x,saddleHeight(x,z,control)-p.thickness,z);}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;indices.push(a,c,b,b,c,d,a+n,b+n,c+n,b+n,d+n,c+n);}
 const wall=(a,b)=>indices.push(a,b,a+n,b,b+n,a+n);
 for(let i=0;i<nx;i++){wall(i,i+1);wall(nz*(nx+1)+i+1,nz*(nx+1)+i);}
 for(let j=0;j<nz;j++){wall((j+1)*(nx+1),j*(nx+1));wall(j*(nx+1)+nx,(j+1)*(nx+1)+nx);}
 const normals=[];VertexData.ComputeNormals(positions,indices,normals);return {positions,indices,normals};
}
export function buildSaddleProof(scene,root,materials,shadows,{control='ridge',grid=1.5}={}){
 const meshes=[],bodies=[],casters=[],features=new Map();
 const add=(mesh,physical,ground=false)=>{mesh.parent=root;mesh.receiveShadows=true;meshes.push(mesh);if(!ground){shadows.addShadowCaster(mesh);casters.push(mesh);}if(physical)bodies.push(new PhysicsAggregate(mesh,physical,{mass:0,restitution:ground?.1:.86,friction:ground?.8:.18},scene));if(ground)mesh.metadata={rangeGround:true};return mesh;};
 const groundMesh=MeshBuilder.CreateBox('vs-ground',{width:130,height:1,depth:150},scene);groundMesh.position.set(0,-.5,55);groundMesh.material=materials.sand;const ground=add(groundMesh,PhysicsShapeType.BOX,true);
 let mesh;
 if(control==='box'){const angle=Math.atan(SADDLE_PROOF.downSlope);mesh=MeshBuilder.CreateBox('vs-carrying-face',{width:36,height:1.5,depth:60/Math.cos(angle)},scene);mesh.rotation.x=angle;mesh.position.set(0,9.6-.75*Math.cos(angle),45-.75*Math.sin(angle));}
 else {mesh=new Mesh('vs-carrying-face',scene);const data=new VertexData();Object.assign(data,saddleGeometry(control,grid));data.applyToMesh(mesh);}
 mesh.material=materials.timber;add(mesh,control==='box'?PhysicsShapeType.BOX:PhysicsShapeType.MESH);mesh.metadata={lineFeature:{id:'carrying-face',kind:'range-timber',label:'RIDGE FACE'}};features.set('carrying-face',mesh);
 return {ground,features,control,grid,diagnostics:()=>({staticBodies:bodies.length,meshes:meshes.length,shadowCasters:casters.length,surfaceTriangles:mesh.getTotalIndices()/3,worldTriangles:meshes.reduce((n,m)=>n+m.getTotalIndices()/3,0),surfaceVertices:mesh.getTotalVertices()}),dispose(){for(const body of bodies)body.dispose();for(const caster of casters)shadows.removeShadowCaster(caster);for(const mesh of meshes)mesh.dispose();}};
}
export const SADDLE_CONFIG=Object.freeze({id:'vesper-saddle-proof',title:'Vesper Saddle proof',brief:'An unpromoted carrying-surface experiment.',defaultSetup:{railIndex:1,yaw:0,elevation:10,charge:.4},station:()=>({id:'saddle-proof-tee',label:'Proof apron',x:0,y:9,z:0,yaw:0}),bounds:{minX:-64,maxX:64,minZ:-20,maxZ:125,minY:-5},survey:{position:[65,65,-25],target:[0,7,45]},buildWorld:buildSaddleProof});
