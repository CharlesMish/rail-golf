import {writeFile} from 'node:fs/promises';
import {EXCHANGE_SOLIDS,EXCHANGE_STATIONS} from '../../lib/places-architecture.js';
const colors={viaduct:'#a89575',gallery:'#c18254',store:'#ad704c',hall:'#bf7750',platform:'#b3b7a1',freight:'#bca16b',wall:'#7e9690',signal:'#c3926d'};
const tx=x=>64+(x+55)*4.5,tz=z=>590-(z+5)*4.5;
const text=(x,y,label,size=12,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#21383a">${label}</text>`;
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#405354" stroke-width=".8"/>`;
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1050" height="670" viewBox="0 0 1050 670"><rect width="1050" height="670" fill="#f4f0e7"/><g font-family="Arial,sans-serif">${text(36,35,'Exchange Yard · the physical place',24)}${text(36,59,'Plan and sections from the shipped solid records. No trajectories or shot solutions.',13)}${text(64,95,'PLAN · metres · north / +z ↑',13)}`;
svg+=rect(tx(-55),tz(95),450,450,'#dde2db');
for(const s of EXCHANGE_SOLIDS){svg+=rect(tx(s.x-s.w/2),tz(s.z+s.d/2),s.w*4.5,s.d*4.5,s.shape==='gable'?'#468282':colors[s.region]);if(s.shape==='gable')svg+=`<path d="M${tx(s.x)} ${tz(s.z-s.d/2)}V${tz(s.z+s.d/2)}" stroke="#dcebe6"/>`;}
for(const s of EXCHANGE_STATIONS){const x=tx(s.x),z=tz(s.z),a=s.yaw*Math.PI/180,dx=Math.sin(a)*22,dy=-Math.cos(a)*22;svg+=`<circle cx="${x}" cy="${z}" r="7" fill="#007b91"/><path d="M${x} ${z}l${dx} ${dy}" stroke="#007b91" stroke-width="3"/>`;svg+=text(x+(s.id==='service'?12:0),z+23,s.id==='service'?'SERVICE LANE':'FORECOURT',11,s.id==='service'?'start':'middle');}
svg+=text(tx(0),tz(35)+4,'VIADUCT',13,'middle');svg+=text(tx(25),tz(65),'STATION',12,'middle');svg+=text(tx(-25),tz(61),'GALLERY',11,'middle');svg+=text(tx(-2),tz(72),'FREIGHT',11,'middle');svg+=text(tx(-24),tz(16)+4,'SIGNAL',10,'middle');svg+=text(tx(-4),tz(87)-9,'RETAINING WALL',11,'middle');
for(const n of [-40,-20,0,20,40])svg+=text(tx(n),610,String(n),11,'middle');
for(const n of [0,20,40,60,80])svg+=text(54,tz(n)+4,String(n),11,'end');
svg+=text(560,118,'LONG SECTION · x = 0',15);const sx=z=>570+(z+5)*4.1,sy=y=>290-y*5.2;
svg+=`<line x1="570" y1="290" x2="1000" y2="290" stroke="#405354" stroke-width="2"/>`;
for(const s of EXCHANGE_SOLIDS.filter(s=>Math.abs(s.x)<=s.w/2&&s.shape==='box'))svg+=rect(sx(s.z-s.d/2),sy(s.y+s.h/2),s.d*4.1,s.h*5.2,colors[s.region]);
svg+=text(sx(35),sy(12)-9,'railway deck',12,'middle');svg+=text(sx(35),sy(4),'open passage',11,'middle');svg+=text(sx(72),sy(3.5)-9,'freight dock',12,'middle');svg+=text(570,318,'Low launch → 9.5 m clear underside → broad upper deck',12);
svg+=text(560,379,'CROSS SECTION · z = 64',15);const cx=x=>570+(x+45)*4.7,cy=y=>545-y*6;
svg+=`<line x1="570" y1="545" x2="1000" y2="545" stroke="#405354" stroke-width="2"/>`;
for(const s of EXCHANGE_SOLIDS.filter(s=>Math.abs(s.z-64)<=s.d/2)){if(s.shape==='gable')svg+=`<path d="M${cx(s.x-s.w/2)} ${cy(s.y)} L${cx(s.x)} ${cy(s.y+s.h)} L${cx(s.x+s.w/2)} ${cy(s.y)} Z" fill="#468282" stroke="#405354"/>`;else svg+=rect(cx(s.x-s.w/2),cy(s.y+s.h/2),s.w*4.7,s.h*6,colors[s.region]);}
svg+=text(cx(-25),cy(8)-9,'gallery · 8 m',11,'middle');svg+=text(cx(25),cy(19)-9,'roof ridge · 19 m',11,'middle');svg+=text(570,573,'Roof triangles are solid convex prisms, not visual shells.',12);svg+=text(36,645,'Dark street: first-ground termination. Raised architecture: physical receivers. Fine tracks, masonry and windows: surface paint.',13);svg+='</g></svg>\n';
await writeFile('docs/experiments/places/architecture-plan.svg',svg);
