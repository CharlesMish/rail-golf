import test from 'node:test';
import assert from 'node:assert/strict';
import {linecraftFeedback,linecraftShotDetails,linecraftPowerLabel} from '../lib/linecraft-feedback.js';

const shot={projectileId:7,stationId:'lumber',yaw:0,elevation:30,originX:0,railIndex:1,charge:.305,linecraftMeta:{stage:'learn',lessonId:'treads'},shotControls:{powerMode:'set',max:false}};
const ground=[{kind:'contact',surface:'floor-a',terminal:true,point:{x:1.25,y:0,z:18.75}},{kind:'termination',reason:'ground-contact'},{kind:'ruling',surface:'ground',label:'LINE ENDED',targetHit:false}];
test('raw tread contacts and later qualified rebounds do not imply ordered lesson credit',()=>{
 const ledger=[{kind:'contact',surface:'step-a'},{kind:'contact',surface:'step-b'},{kind:'redirect',surface:'step-b',feature:'b',label:'TREAD 2 KICK'},{kind:'redirect',surface:'step-c',feature:'c',label:'TREAD 3 KICK'},...ground];
 const result=linecraftFeedback({...shot,ledger});
 assert.equal(result.lesson.reached,0);assert.equal(result.lesson.complete,false);
 assert.match(result.contacts,/TREAD 1 → TREAD 2/);assert.equal(result.events,'TREAD 2 rebound → TREAD 3 rebound');
 assert.match(result.progress,/Next required: TREAD 1/);assert.match(result.ending,/FLOOR A.*x 1.3, y 0.0, z 18.8 m/);
 assert.equal(result.firstKiss,true);
});
test('an interrupted line retains observed progress without claiming a final landing or completion',()=>{
 const result=linecraftFeedback({...shot,ledger:[{kind:'redirect',surface:'step-a',feature:'a'}, {kind:'termination',reason:'retry-interrupted'}]});
 assert.equal(result.interrupted,true);assert.equal(result.firstKiss,false);assert.equal(result.lesson.reached,1);
 assert.match(result.ending,/no final landing ruling/);assert.equal(result.lesson.complete,false);
});
test('unknown terminal surfaces stay unknown instead of naming a goal from the ruling event',()=>{
 const result=linecraftFeedback({...shot,ledger:[{kind:'termination',reason:'ground-contact'},{kind:'ruling',surface:'imaginary-goal',targetHit:false}]});
 assert.equal(result.ending,'Ground contact');assert.doesNotMatch(result.ending,/imaginary/);
});
test('interrupted evidence matching every clause still reports no completed attempt',()=>{
 const result=linecraftFeedback({...shot,ledger:['step-a','step-b','step-c'].map(surface=>({kind:'redirect',surface,feature:surface})).concat({kind:'termination',reason:'retry-interrupted'})});
 assert.match(result.progress,/3\/3 ordered rebounds observed/);assert.match(result.progress,/no completed attempt/);assert.doesNotMatch(result.progress,/Lesson complete/);
});
test('copyable receipt uses the frozen launch and retains exact power, mode and build',()=>{
 const launch={build:'tested-build',setup:{...shot,yaw:-8.25,charge:.305001},launchSpeed:42.5,environment:{floor:'B'}};
 const text=linecraftShotDetails({...shot,yaw:55,ledger:ground,linecraftLaunch:launch});
 assert.match(text,/Build: tested-build/);assert.match(text,/yaw: -8.3°/);assert.match(text,/exact charge: 0.305001/);
 assert.match(text,/Power control: set · MAX: false/);assert.match(text,/Starting pallet: B/);
 assert.equal(linecraftPowerLabel(.3),'30.0%');assert.equal(linecraftPowerLabel(.305),'30.5%');
 const old=linecraftShotDetails({...shot,shotControls:undefined});assert.match(old,/MAX: not recorded/);
});
