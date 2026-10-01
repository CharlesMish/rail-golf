import {Color3,Color4,DynamicTexture,Mesh,MeshBuilder,StandardMaterial} from '@babylonjs/core';
import {stableUnitInterval} from './rail-golf-v02.js';

// Adapted from Claude's timber-yard-polish experiment. Presentation only:
// no physical bodies, floor extension, camera changes, or evidence metadata.
export function applyLinecraftPresentation(scene,sky,materials){
 sky.groundColor=new Color3(.2,.15,.1);
 const horizon=new Color3(.42,.36,.3);
 const skyTexture=new DynamicTexture('linecraft-sky-gradient',{width:4,height:256},scene,false);
 const context=skyTexture.getContext();
 const gradient=context.createLinearGradient(0,0,0,256);
 // Canvas top maps to the lower pole; the midpoint is the horizon.
 for(const [position,color] of [[0,'#1d1b17'],[.5,horizon.toHexString()],[.525,'#8a7258'],[.59,'#3d5a6e'],[.7,'#163049'],[1,'#08131f']])gradient.addColorStop(position,color);
 context.fillStyle=gradient;context.fillRect(0,0,4,256);skyTexture.update();
 skyTexture.wrapV=DynamicTexture.CLAMP_ADDRESSMODE;
 const skyMaterial=new StandardMaterial('linecraft-sky-dome',scene);
 skyMaterial.disableLighting=true;skyMaterial.emissiveTexture=skyTexture;
 skyMaterial.diffuseColor=new Color3(0,0,0);skyMaterial.specularColor=new Color3(0,0,0);skyMaterial.fogEnabled=false;
 const dome=MeshBuilder.CreateSphere('linecraft-sky-dome',{diameter:500,segments:24,sideOrientation:Mesh.BACKSIDE},scene);
 dome.material=skyMaterial;dome.infiniteDistance=true;dome.isPickable=false;dome.applyFog=false;
 scene.fogColor=horizon.clone();scene.clearColor=new Color4(horizon.r,horizon.g,horizon.b,1);

 // Finer, lower-contrast grain with mipmaps to soften distant timber shimmer.
 const woodTexture=new DynamicTexture('linecraft-timber-grain',{width:256,height:512},scene,true);
 const grain=woodTexture.getContext();grain.fillStyle='#bba383';grain.fillRect(0,0,256,512);
 for(let i=0;i<14;i++){
  const seed=stableUnitInterval(`grain-band-${i}`);
  grain.fillStyle=seed>.5?`rgba(255, 236, 205, ${.03+seed*.05})`:`rgba(60, 36, 18, ${.03+seed*.06})`;
  grain.fillRect(seed*256-12,0,8+seed*26,512);
 }
 for(let i=0;i<180;i++){
  const seed=stableUnitInterval(`grain-${i}`),x=stableUnitInterval(`grain-x-${i}`)*256;
  grain.strokeStyle=`rgba(48, 29, 15, ${.03+seed*.08})`;grain.lineWidth=.4+seed*.9;
  grain.beginPath();grain.moveTo(x,0);grain.bezierCurveTo(x+4,180,x-3,320,x,512);grain.stroke();
 }
 woodTexture.update();materials.timber.diffuseTexture=woodTexture;materials.brick.diffuseTexture=woodTexture;

 // Draw the wrapped dirt tile once, then share it at yard/stripe footprint scales.
 const dirtTexture=new DynamicTexture('linecraft-yard-grain',{width:256,height:256},scene,true);
 const dirt=dirtTexture.getContext();dirt.fillStyle='#e4e4e4';dirt.fillRect(0,0,256,256);
 for(let i=0;i<420;i++){
  const a=stableUnitInterval(`dirt-x-${i}`),b=stableUnitInterval(`dirt-y-${i}`),c=stableUnitInterval(`dirt-r-${i}`);
  const radius=4+c*c*34,tone=c>.5?'255, 247, 226':'46, 32, 18',alpha=c>.5?.05+c*.07:.06+c*.1;
  for(const dx of [-256,0,256])for(const dy of [-256,0,256]){
   const x=a*256+dx,y=b*256+dy,blob=dirt.createRadialGradient(x,y,0,x,y,radius);
   blob.addColorStop(0,`rgba(${tone}, ${alpha})`);blob.addColorStop(1,`rgba(${tone}, 0)`);
   dirt.fillStyle=blob;dirt.fillRect(x-radius,y-radius,radius*2,radius*2);
  }
 }
 dirtTexture.update();
 // DynamicTexture.clone() creates an empty canvas in the installed Babylon version.
 // Reuse the drawn canvas explicitly for a second texture with independent UV scale.
 const stripeTexture=new DynamicTexture('linecraft-stripe-grain',dirt.canvas,scene,true);stripeTexture.update();
 for(const texture of [dirtTexture,stripeTexture]){
  texture.wrapU=DynamicTexture.WRAP_ADDRESSMODE;texture.wrapV=DynamicTexture.WRAP_ADDRESSMODE;
 }
 // Box top UVs run u along z and v along x. Rough footprint is 216 × 100 m;
 // stripe footprints are 10.15 × 17–30 m, so these repeats keep mottling near square.
 dirtTexture.uScale=20;dirtTexture.vScale=9;
 stripeTexture.uScale=1;stripeTexture.vScale=2.2;
 materials.rough.diffuseTexture=dirtTexture;
 materials.fairwayA.diffuseTexture=stripeTexture;materials.fairwayB.diffuseTexture=stripeTexture;
}
