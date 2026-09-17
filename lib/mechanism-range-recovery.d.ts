import type {RangeSetup,createMechanismSession} from './mechanism-range-session';
import type {createRangeView,rangeRestore} from './mechanism-range-controls';
export function recoverRangeToSetup(action:'retry'|'reset'|'recall',ports:{session:ReturnType<typeof createMechanismSession>;current:RangeSetup;mode:'hold'|'set';max:boolean;view:ReturnType<typeof createRangeView>;cancelInput():void;clearPresentation():void;publishSetup(next:ReturnType<typeof rangeRestore>):void;placeCamera(setup:RangeSetup):void;ready():void}):boolean;
