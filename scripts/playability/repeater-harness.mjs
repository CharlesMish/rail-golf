import {persistenceHarness} from '../playgrounds/persistence-harness.mjs';
import {createShotRepeater} from '../../lib/playability-repeater.js';
export function repeaterHarness(emit=()=>{},options={}){
 const h=persistenceHarness(),events=[],queue=createShotRepeater(h.session,e=>{events.push(e);emit(e);},options);
 return {...h,queue,queueEvents:events,step(){queue.beforeStep();h.physics._step(1/120);queue.afterStep();},
  finish(){let ticks=0;for(;ticks<50000&&(queue.state.busy||queue.state.status==='running');ticks++)this.step();if(ticks>=50000)throw Error('Repeater lifecycle exceeded fixed bound');return ticks;},
  run(setup,count=5){queue.reset();if(!queue.manual(setup))throw Error('Manual refused');this.finish();if(!queue.start(setup,count))throw Error('Repeat refused');const ticks=this.finish();return{trial:queue.trial,records:queue.records,sequenceSeconds:ticks/120,state:queue.state};},
  dispose(){queue.dispose();h.dispose();}};
}
