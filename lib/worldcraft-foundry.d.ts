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
export type FoundryPresentation = {
  dynamics?: 'normal-speed' | 'total-speed';
  bankVoice?: boolean;
  timeline?: boolean;
};
export type FoundryLayout = { objects: { id: string; x: number; z: number; yaw: number }[] };
export type FoundryShot = {
  id: string;
  setup: { railIndex: 1; originX: number; yaw: number; elevation: number; charge: number };
  launchPhase: number | null;
  layout?: FoundryLayout;
  terminal: { reason: string; elapsed: number; position: number[] };
  outcome: { kind: string; status: string };
  contacts?: string[];
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
  sourceSha: string | null;
  presentation: FoundryPresentation | null;
  seed: number;
  testedShots: FoundryShot[];
  nearbySensitivity: string;
  validationEvidence: string;
  limitations: FoundryLimitation[];
  customCode: { module: string; reason: string } | null;
};
export type FoundrySection = 'featured' | 'construction' | 'studies';
export type FoundryCard = {
  id: string;
  name: string;
  kind: FoundryKind;
  invitation: string;
  editable: { launcher: boolean; geometry: boolean };
  hasChallenge: boolean;
  challengeId: string | null;
  section: FoundrySection;
};
export type FoundryPair = {
  preset: RangePreset;
  manifest: FoundryManifest;
  world: WorldcraftDocument;
  worldIdentity: string;
};

export function applyFoundryLayout(preset: RangePreset, layout: unknown): { preset: RangePreset; layout: FoundryLayout };
export function foundryContactBodies(contacts: { body?: string }[] | null | undefined): string[];
export function foundryContactsMatch(expected: string[], contacts: { body?: string }[] | null | undefined): boolean;
export function validateFoundryManifest(value: unknown, preset: unknown): FoundryManifest;
export function loadFoundryPair(preset: unknown, manifest: unknown): FoundryPair;
export function listFoundryWorlds(): FoundryCard[];
export function foundryPresentation(id: string | null | undefined): FoundryPresentation | null;
export function foundryPreset(id: string): RangePreset;
export function foundryRecord(id: string): FoundryPair;
export function foundryRemixWorld(authored: WorldcraftDocument, options?: { id?: string; name?: string; challengeId?: string | null }): WorldcraftDocument;
export function foundryCopyName(name: string): string;
