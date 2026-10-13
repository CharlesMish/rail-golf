export interface YardLabelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
/** x/y are the object's projected CSS-pixel anchor, not a proposed rectangle. */
export interface YardLabelInput extends YardLabelRect {
  id: string;
  /** Larger values claim space first. */
  priority?: number;
  side?: 'above' | 'below' | 'left' | 'right';
}
export interface YardLabelPlacement extends YardLabelRect {
  id: string;
  anchorX: number;
  anchorY: number;
  visible: boolean;
}
export interface YardLabelLayoutOptions {
  /** Screen-edge clearance; default 8 CSS px. */
  margin?: number;
  /** Separation between callouts and occupied UI; default 6 CSS px. */
  padding?: number;
  /** Minimum separation from the source anchor; default 10 CSS px. */
  gap?: number;
  /** Maximum source-to-nearest-label-edge distance; default 128 CSS px. */
  maxDisplacement?: number;
}
export function layoutYardLabels(
  labels: readonly YardLabelInput[],
  viewport: { width: number; height: number },
  obstacles?: readonly YardLabelRect[],
  options?: YardLabelLayoutOptions,
): YardLabelPlacement[];
