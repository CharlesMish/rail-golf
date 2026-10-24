export type ResonanceMaterial = 'metal' | 'timber' | 'thunk';
export type ResonanceImpact = {
  piece: string;
  role: string;
  body: string;
  time: number;
  last: number;
  speed: number;
  material: ResonanceMaterial;
  degree: number | null;
  note: string;
  hz: number;
  gain: number;
  callbacks: number;
};
export type ResonanceLog = {
  impacts: ResonanceImpact[];
  sounds: number;
  callbacks: number;
  resonantCallbacks: number;
  collapsed: number;
  maxCallbacks: number;
};
export type ResonanceSpec = { piece: string; role: string; material: ResonanceMaterial; degree: number | null; note: string; hz: number };
export const WORLDCRAFT_SCALE: ReadonlyArray<Readonly<{ degree: number; name: string; hz: number }>>;
export const WORLDCRAFT_RESONANCE_HOLD: number;
export const WORLDCRAFT_RESONANCE_FULL_SPEED: number;
export const RESONANCE_VOICES: Readonly<Record<ResonanceMaterial, Readonly<{ hz?: number; partials: ReadonlyArray<Readonly<{ ratio: number; gain: number; decay: number }>>; noise: number; noiseDecay: number }>>>;
export function impactGain(speed: number): number;
export function resonanceOf(world: { rules?: { target?: { id: string } } | null; objects?: { id: string; kind: string; voice?: { material: 'metal' | 'timber'; degree: number } }[] } | null, body: string): ResonanceSpec | null;
export function formatResonanceImpact(impact: Pick<ResonanceImpact, 'piece' | 'time' | 'speed' | 'note' | 'material'>): string;
export function createResonanceEar(): {
  begin(): void;
  hear(input: { body: string; time: number; speed: number; world: Parameters<typeof resonanceOf>[0] }): ResonanceImpact | null;
  snapshot(): ResonanceLog;
};
export function scheduleImpact(ctx: OfflineAudioContext | AudioContext, when: number, impact: Pick<ResonanceImpact, 'material' | 'gain' | 'hz'>): AudioScheduledSourceNode[];
export function createVoiceLedger(): {
  watch(node: { stop?: () => void; disconnect?: () => void; addEventListener?: (type: string, listener: () => void) => void; onended?: (() => void) | null }): void;
  release(): number;
  counts(): { started: number; cleaned: number; finished: number; active: number };
};
export function audioBufferToWav(buffer: { getChannelData(channel: number): Float32Array; sampleRate: number; numberOfChannels?: number }): Uint8Array;
export function renderResonanceWav(impacts: ResonanceImpact[], options?: { OfflineAudioContext?: typeof OfflineAudioContext; sampleRate?: number; tail?: number }): Promise<Uint8Array>;
export function createResonanceOutput(): { unlock(): void; play(impact: ResonanceImpact): void; release(): number; counts(): { started: number; cleaned: number; finished: number; active: number }; dispose(): void };
