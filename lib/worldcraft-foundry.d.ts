import type { WorldcraftDocument } from './worldcraft-model';
import type { RangePreset } from './worldcraft-range';

export const FOUNDRY_MANIFEST_FORMAT: 'rail-golf-worldcraft-foundry-manifest';
export const FOUNDRY_MANIFEST_VERSION: 1;
export const FOUNDRY_KINDS: readonly ['shot-study', 'workshop', 'authored-world'];
export const FOUNDRY_LIMITATION_CATEGORIES: readonly ['physical-geometry', 'authoring-tooling', 'presentation'];

export type FoundryKind = 'shot-study' | 'workshop' | 'authored-world';
export type FoundryLimitationCategory = 'physical-geometry' | 'authoring-tooling' | 'presentation';
export type FoundryLimitation = {
  category: FoundryLimitationCategory;
  concept: string;
  missing: string;
  extension: string;
};
export type FoundryShot = {
  id: string;
  setup: { railIndex: 1; originX: number; yaw: number; elevation: number; charge: number };
  launchPhase: number | null;
  terminal: { reason: string; elapsed: number; position: number[] };
  outcome: { kind: string; status: string };
};
export type FoundryManifest = {
  format: 'rail-golf-worldcraft-foundry-manifest';
  version: 1;
  id: string;
  name: string;
  kind: FoundryKind;
  invitation: string;
  physicalQuestion: string;
  editable: { launcher: boolean; geometry: boolean };
  challenge: { id: string; label: string } | null;
  sourceBuild: string;
  seed: number;
  testedShots: FoundryShot[];
  nearbySensitivity: string;
  validationEvidence: string;
  limitations: FoundryLimitation[];
  customCode: { module: string; reason: string } | null;
};
export type FoundryCard = {
  id: string;
  name: string;
  kind: FoundryKind;
  invitation: string;
  editable: { launcher: boolean; geometry: boolean };
  hasChallenge: boolean;
  challengeId: string | null;
};
export type FoundryPair = {
  preset: RangePreset;
  manifest: FoundryManifest;
  world: WorldcraftDocument;
  worldIdentity: string;
};

export function validateFoundryManifest(value: unknown, preset: unknown): FoundryManifest;
export function loadFoundryPair(preset: unknown, manifest: unknown): FoundryPair;
export function listFoundryWorlds(): FoundryCard[];
export function foundryPreset(id: string): RangePreset;
export function foundryRecord(id: string): FoundryPair;
export function foundryRemixWorld(authored: WorldcraftDocument, options?: { id?: string; name?: string; challengeId?: string | null }): WorldcraftDocument;
export function foundryCopyName(name: string): string;
