import { validateRangePreset } from '../../lib/worldcraft-range.js';
export function overpassPreset({ control = 'raised' } = {}) {
  const objects = [];
  for (const [ix, x] of [-6,-2,2,6].entries()) for (const [iz,z] of [34,38].entries()) {
    objects.push({id:`deck-${ix}-${iz}`,kind:'plate',x,z,yaw:0,lift:7,tilt:90,voice:{material:'timber',degree:0}});
  }
  objects.push({id:'pier-west',kind:'bank',x:-8.5,z:36,yaw:90});
  objects.push({id:'pier-east',kind:'bank',x:8.5,z:36,yaw:90});
  objects.push({id:'return-wall',kind:'bank',x:0,z:46,yaw:0});
  const kept = control === 'no-deck' ? objects.filter(o=>!o.id.startsWith('deck-')) : objects;
  return validateRangePreset({format:'rail-golf-worldcraft-range-preset',version:1,id:`overpass${control==='raised'?'':`-${control}`}`,name:'Overpass',environment:{preset:'forest-clearing-v1',seed:1},launcher:{x:-2},objects:kept,rules:{launcher:{fixed:false,yaw:0,elevation:35,charge:.44},fixed:kept.map(o=>o.id),allowance:{},goal:{kind:'none'}}});
}

// QA-only references, never imported by the player UI.
export const SPATIAL_REFERENCES = Object.freeze({
  'upper-carry': { railIndex: 1, originX: -2, yaw: 0, elevation: 35, charge: .44 },
  'lower-return': { railIndex: 1, originX: -2, yaw: 0, elevation: 14, charge: .83 },
  'beyond-deck': { railIndex: 1, originX: -2, yaw: 0, elevation: 35, charge: .47 },
  short: { railIndex: 1, originX: -2, yaw: 0, elevation: 14, charge: .40 },
  ceiling: { railIndex: 1, originX: -2, yaw: 0, elevation: 13, charge: 1 },
  'ceiling-lip': { railIndex: 1, originX: -2, yaw: 0, elevation: 13.5, charge: 1 },
  'high-bypass': { railIndex: 1, originX: -2, yaw: 0, elevation: 40, charge: .65 },
});

export function spatialFamily(row) {
  const top = row.rawContacts.some(contact => contact.body.includes('-deck-') && contact.point[1] > 7.3 && contact.incoming[1] < 0 && Math.abs(contact.normal?.[1] ?? 0) > .98);
  const underside = row.rawContacts.some(contact => contact.body.includes('-deck-') && contact.point[1] < 7.05 && contact.incoming[1] > 0 && Math.abs(contact.normal?.[1] ?? 0) > .98);
  if (top) return 'top';
  if (underside) return 'underside';
  if (row.contacts.some(contact => contact.body.endsWith('return-wall'))) return 'wall';
  return row.contacts.some(contact => contact.body.startsWith('worldcraft-object-')) ? 'edge-or-pier' : 'no-piece';
}
