export type PlaygroundAudio = {
  /** Mute stops active sources; enabling permits only future events. */
  setEnabled(enabled: boolean): void;
  /** Call synchronously from a player gesture; false means audio is unavailable. */
  unlock(): boolean;
  chargeStart(): void;
  chargeUpdate(value: number): void;
  chargeStop(): void;
  launch(power?: number): void;
  /** Actual physical impact only. Speed is in m/s, preferably normal impact speed. */
  contact(impact: { speed: number; ground?: boolean }): void;
  terminal(reason: string): void;
  dispose(): void;
};
export function createPlaygroundAudio(): PlaygroundAudio;
