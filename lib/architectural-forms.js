import {Mesh,VertexData} from '@babylonjs/core';
// Code-owned circular-segment prism. The finite facets seen by the player are
// the very same convex hull used by Havok: no smooth skin over a flat receiver.
export function barrelProfile({w,h,segments=10}){
 const radius=(w*w/4+h*h)/(2*h);
 return Array.from({length:segments+1},(_,i)=>{const x=-w/2+w*i/segments;return [x,Math.sqrt(Math.max(0,radius*radius-x*x))-(radius-h)];});
}
export function barrelMesh(record,scene){
 const profile=barrelProfile(record),n=profile.length,positions=[],indices=[];
 for(const z of [-record.d/2,record.d/2])for(const [x,y]of profile)positions.push(x,y,z);
 for(let i=1;i<n-1;i++){indices.push(0,i,i+1);indices.push(n,n+i+1,n+i);}
 for(let i=0;i<n-1;i++){indices.push(i,n+i,i+1,i+1,n+i,n+i+1);}
 indices.push(0,n-1,n,n-1,2*n-1,n);
 const normals=[];
 // Correct each triangle toward the outside under Babylon's normal convention.
 const centre=[0,record.h/3,0];
 for(let k=0;k<indices.length;k+=3){const a=indices[k]*3,b=indices[k+1]*3,c=indices[k+2]*3;
  const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2],vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
  const cx=(positions[a]+positions[b]+positions[c])/3-centre[0],cy=(positions[a+1]+positions[b+1]+positions[c+1])/3-centre[1],cz=(positions[a+2]+positions[b+2]+positions[c+2])/3-centre[2];
  // Babylon LH normal is -cross(edge1,edge2).
  if(-(uy*vz-uz*vy)*cx-(uz*vx-ux*vz)*cy-(ux*vy-uy*vx)*cz<0)[indices[k+1],indices[k+2]]=[indices[k+2],indices[k+1]];
 }
 VertexData.ComputeNormals(positions,indices,normals);
 const mesh=new Mesh('exchange-'+record.id,scene),data=new VertexData();data.positions=positions;data.indices=indices;data.normals=normals;data.applyToMesh(mesh);mesh.convertToFlatShadedMesh();return mesh;
}
export function barrelPlanes(record){
 const profile=barrelProfile(record),planes=[[0,0,1,record.d/2],[0,0,-1,record.d/2],[0,-1,0,0]];
 for(let i=0;i<profile.length-1;i++){const [x,y]=profile[i],[xx,yy]=profile[i+1],slope=(yy-y)/(xx-x);planes.push([-slope,1,0,y-slope*x]);}
 return planes;
}
