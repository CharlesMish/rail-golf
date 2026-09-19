// Keep the variant's action traces and synchronous survey journal separate from the
// accepted score yard. The archive has its own IndexedDB name at the opt-in callsite.
const PREFIX='rail-golf:timber-receiver:';
export function receiverStorage(storage){
 const keys=()=>Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith(PREFIX));
 return {get length(){return keys().length;},key(i){return keys()[i]?.slice(PREFIX.length)??null;},
  getItem:key=>storage.getItem(PREFIX+key),setItem:(key,value)=>storage.setItem(PREFIX+key,value),removeItem:key=>storage.removeItem(PREFIX+key),
  clear(){for(const key of keys())storage.removeItem(key);}};
}
