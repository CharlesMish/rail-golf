// One lab selection snapshot supplies React AND every control/launcher lookup.
// No persistence, navigation, MAX, scoring or world-state behavior lives here.
export function createLabSelection(initialCards){
 const cards=[...initialCards],listeners=new Set();
 let snapshot=Object.freeze({index:0,hole:cards[0],revision:0});
 const serverSnapshot=snapshot;
 const publish=index=>{
  if(!Number.isInteger(index)||!cards[index])throw Error('Unknown lab card');
  snapshot=Object.freeze({index,hole:cards[index],revision:snapshot.revision+1});
  for(const listener of listeners)listener();
 };
 return {cards,getSnapshot:()=>snapshot,getServerSnapshot:()=>serverSnapshot,
  subscribe:listener=>{listeners.add(listener);return ()=>listeners.delete(listener);},
  select:publish,
  replaceOpenLine:card=>{if(card.id!=='open-line')throw Error('Expected Open Line');const index=cards.findIndex(c=>c.id==='open-line');cards[index]=card;publish(snapshot.index);},
 };
}
export function createSelectionWitness(report){
 let previous='',lastVisible='';
 return {check(rendered,authority,stage){
  const different=rendered.card!==authority.card||rendered.station!==authority.station;
  const key=different?JSON.stringify([rendered.card,rendered.station,authority.card,authority.station]):'';
  if(key!==previous){report({kind:different?'state-divergence':'state-aligned',rendered:{...rendered},authority:{card:authority.card,station:authority.station},stage});previous=key;}
  const visibleKey=JSON.stringify(rendered);
  if(!different&&visibleKey!==lastVisible){report({kind:'visible-selection',rendered:{...rendered},authority:{card:authority.card,station:authority.station},stage});lastVisible=visibleKey;}
  return !different;
 }};
}
