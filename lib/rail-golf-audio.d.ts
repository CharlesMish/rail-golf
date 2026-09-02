export type Outcome = "ace" | "breach" | "double" | "wet" | "oob" | "miss";

export type RailGolfAudioOptions = {
  createContext?: () => AudioContext;
  muted?: boolean;
};

export type RailGolfAudioEngine = {
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  playChargeStart(): void;
  startChargeTone(): void;
  updateChargeTone(charge: number): void;
  stopChargeTone(): void;
  playLaunch(power: number): void;
  startFlightTone(): void;
  updateFlightTone(speed: number): void;
  stopFlightTone(): void;
  playBreach(): void;
  playRuling(outcome: Outcome): void;
  dispose(): void;
  getContext(): AudioContext | null;
};

export const RUCKUS_LINE_DOUBLE_HEADROOM_CEILING: number;
export function createRailGolfAudio(options?: RailGolfAudioOptions): RailGolfAudioEngine;
