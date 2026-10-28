import type { WorldcraftDocument, WorldcraftGoal, WorldcraftGoalResult, WorldcraftObject, WorldcraftKind, WorldcraftSetup, WorldcraftSnapshot, WorldcraftContact, WorldcraftTerminal, WorldcraftLaunch, WorldcraftPoint } from './worldcraft-model';

export const RANGE_PRESET_FORMAT: 'rail-golf-worldcraft-range-preset';
export const RANGE_PRESET_VERSION: 1;
export const RANGE_SHOT_FORMAT: 'rail-golf-worldcraft-range-shot';
export const RANGE_CATALOG: 'worldcraft-prefabs-v2';
export const RANGE_PHYSICS: 'rail-golf-v02-worldcraft-v1';

export type RangePreset = {
  format: 'rail-golf-worldcraft-range-preset';
  version: 1;
  id: string;
  name: string;
  environment: { preset: 'forest-clearing-v1'; seed: 1 };
  launcher: { x: number };
  objects: WorldcraftObject[];
  rules: {
    launcher: {
      fixed: boolean;
      yaw: number;
      elevation: number;
      charge: number;
      originFixed?: boolean;
      window?: { yawMin: number; yawMax: number; elevationMin: number; elevationMax: number; chargeMin: number; chargeMax: number };
    };
    fixed: string[];
    allowance: Partial<Record<WorldcraftKind, number>>;
    goal: WorldcraftGoal;
  };
};
export type RangeShot = {
  format: 'rail-golf-worldcraft-range-shot';
  version: 1;
  presetId: string | null;
  presetHash: string | null;
  worldSnapshot: WorldcraftSnapshot;
  setup: WorldcraftSetup;
  launchPhase: number | null;
  bindingHash: string;
  contacts: WorldcraftContact[];
  terminal: WorldcraftTerminal;
  outcome: WorldcraftGoalResult;
  points: WorldcraftPoint[];
};
export type RecordedTrail = { label: string; worldIdentity: string; setup: WorldcraftSetup; points: WorldcraftPoint[] };

export function validateRangePreset(value: unknown): RangePreset;
export function adaptRangePreset(preset: unknown): { preset: RangePreset; world: WorldcraftDocument };
export function projectRangePreset(preset: RangePreset, world: WorldcraftDocument): RangePreset;
export function exportRangePreset(preset: RangePreset): string;
export function parseRangePreset(text: string): RangePreset;
export function importRangeDocument(text: string): { kind: 'preset'; preset: RangePreset } | { kind: 'world'; world: WorldcraftDocument };
export function createOpenWorkshopPreset(): RangePreset;
export function createMusicalWorkshopPreset(): RangePreset;
export function createBackPocketPreset(): RangePreset;
export function createSoftLandingPreset(): RangePreset;
export function createResonantRunFreePreset(): RangePreset;
export function createResonantRunPhrasePreset(): RangePreset;
export function createTravellingBellPreset(): RangePreset;
export function rangeOpeningSetup(preset: RangePreset): WorldcraftSetup;
export function rangeStartingSetup(preset: unknown): WorldcraftSetup;
export function retargetRangeOpening(preset: RangePreset, setup: WorldcraftSetup): RangePreset;
export function listRangePresets(): { id: string; name: string; goal: WorldcraftGoal['kind'] }[];
export function rangePreset(id: string): RangePreset;
export function recordedTrail(record: { label?: string; worldIdentity: string; setup: WorldcraftSetup; points: WorldcraftPoint[] }): RecordedTrail;
export function workshopTrailStep<T>(memory: { presetId?: string | null; history?: RecordedTrail | null; historyMarks?: T[] | null; comparison?: RecordedTrail | null; comparisonMarks?: T[] | null }, step: { kind: 'ready' | 'fire' | 'resolve' | 'adjust'; worldIdentity?: string; setup?: WorldcraftSetup; points?: WorldcraftPoint[]; marks?: T[] | null }): { presetId: string | null; history: RecordedTrail | null; historyMarks: T[] | null; comparison: RecordedTrail | null; comparisonMarks: T[] | null };
export function latchRecordedComparison(previous: RecordedTrail | null, next: { label?: string; worldIdentity: string; setup: WorldcraftSetup; points: WorldcraftPoint[] }): { comparison: RecordedTrail | null; history: RecordedTrail };
export function inferOutcome(world: WorldcraftDocument, input: unknown): WorldcraftGoalResult;
export function rangeBindingText(worldIdentity: string, setup: WorldcraftSetup, launchPhase?: number): string;
export function exportRangeShot(shot: RangeShot): string;
export function parseRangeShot(text: string): RangeShot;
export function sha256Hex(text: string): Promise<string>;
export function bindRangeShot(input: { world: WorldcraftDocument; setup: WorldcraftSetup; build?: string; worldSnapshot?: WorldcraftSnapshot; preset?: RangePreset | null; id?: string; createdAt?: string; launch: WorldcraftLaunch; points: WorldcraftPoint[]; events?: unknown[]; contacts?: WorldcraftContact[]; terminal: WorldcraftTerminal; launchPhase?: number | null }): Promise<RangeShot>;
