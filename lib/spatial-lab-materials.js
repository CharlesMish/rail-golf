import {StandardMaterial,Color3} from '@babylonjs/core';
import {buildRangePresentationMaterials} from './mechanism-range-presentation.js';

// The equipment and nearby machine/track hardware share the incumbent materials.
// World timber/sand retain their own blockout palette; accepted MR never imports this.
export function buildSpatialLabMaterials(scene){
 const equipment=buildRangePresentationMaterials(scene),world={...equipment};
 for(const [name,rgb] of Object.entries({sand:[.32,.29,.22],timber:[.63,.40,.23],bark:[.25,.13,.07],violet:[.67,.25,.94]})){
  const m=new StandardMaterial('spatial-'+name,scene);m.diffuseColor=Color3.FromArray(rgb);m.specularColor=new Color3(.08,.08,.08);
  if(name==='violet')m.emissiveColor=m.diffuseColor.scale(.32);world[name]=m;
 }
 return {equipment,world};
}
