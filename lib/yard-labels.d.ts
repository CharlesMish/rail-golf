import type { Hole, VectorLike } from './rail-golf-v02';

type PlanPoint = Pick<VectorLike, 'x' | 'z'>;
type AuthoredLabelCard = Pick<Hole, 'id' | 'requiredTags' | 'orderedTags'>;
export type YardFeatureLabel = {
  id: 'bank' | 'bank-a' | 'bank-b' | 'boost' | 'breach' | 'step-a' | 'step-b' | 'step-c' | 'sky' | 'mill';
  label: string;
  ordinal: number | null;
  optional: boolean;
};

export function stationTargetDistance(target: PlanPoint | null | undefined, station: PlanPoint | null | undefined): number | null;
export function stationTargetDistanceLabel(target: PlanPoint | null | undefined, station: PlanPoint | null | undefined): string | null;
export function isTreadLabelVisible(stepId: string, cameraPosition: VectorLike | null | undefined): boolean;
export function authoredFeatureLabels(hole: AuthoredLabelCard): YardFeatureLabel[];
export function yardFeatureLabels(hole: AuthoredLabelCard, options?: { survey?: boolean; routeFocus?: string }): YardFeatureLabel[];
