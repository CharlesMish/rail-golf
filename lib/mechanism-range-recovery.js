import {rangeRestore} from './mechanism-range-controls.js';

// One terminal-independent transaction for all buttons/shortcuts. READY is published
// only after body cleanup, setup/environment restoration and immediate launch framing.
export function recoverRangeToSetup(action,ports){
 if(!['retry','reset','recall'].includes(action))return false;
 if(action==='recall'&&!ports.session.last)return false;
 ports.cancelInput();
 const saved=ports.session.action(action);
 const next=rangeRestore(action,ports.current, saved,ports.mode,ports.max);
 ports.clearPresentation();ports.publishSetup(next);ports.view.set('launch');
 ports.placeCamera(next.setup);ports.ready();return true;
}
