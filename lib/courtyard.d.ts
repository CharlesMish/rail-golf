import type { Hole, RangeTarget, VolumeBox, MechanismTag } from './rail-golf-v02';
export const COURTYARD_BANKS: readonly (VolumeBox & { id: MechanismTag })[];
export const COURTYARD_TARGETS: readonly RangeTarget[];
export const COURTYARD_HOLES: readonly Hole[];
export function isCourtyardChallengeUnlocked(index: number, records?: Record<string, { cleared: boolean } | undefined>): boolean;

export const COURTYARD_SKIP_PAD: NonNullable<Hole["boost"]>;
