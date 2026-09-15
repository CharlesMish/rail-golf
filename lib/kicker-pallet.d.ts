import type {buildDiverterLab,DiverterOptions,DiverterHandles} from './diverter-scene';
export const KICKER_PALLET:NonNullable<DiverterOptions['floor']>;
export const KICKER_SWITCH:NonNullable<DiverterOptions['switch']>;
export const KICKER_STATES:NonNullable<DiverterOptions['states']>;
export function buildKickerPallet(scene:Parameters<typeof buildDiverterLab>[0],root:Parameters<typeof buildDiverterLab>[1],materials:Parameters<typeof buildDiverterLab>[2],shadows:Parameters<typeof buildDiverterLab>[3],initial?:'A'|'B',target?:DiverterOptions['target']):DiverterHandles;
