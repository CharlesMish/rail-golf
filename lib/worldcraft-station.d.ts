import type { WorldcraftDocument, WorldcraftSetup } from './worldcraft-model';

export type WorldcraftStationView = {
  id: 'worldcraft';
  label: string;
  x: number;
  z: number;
  yaw: number;
};

export type WorldcraftStationPose = {
  station: WorldcraftStationView;
  rail: { x: number; y: number; z: number };
  aim: { x: number; y: number; z: number };
  muzzle: { x: number; y: number; z: number };
  launcher: { x: number; y: number; z: number };
  yawRadians: number;
  heading: { x: number; y: number; z: number };
  address: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
  };
};

export function worldcraftStation(world: WorldcraftDocument, setup: WorldcraftSetup): WorldcraftStationView;
export function worldcraftStationPose(world: WorldcraftDocument, setup: WorldcraftSetup): WorldcraftStationPose;
export function worldcraftSurveyHome(world: WorldcraftDocument, setup: WorldcraftSetup): { angle: number; elevation: number; radius: number; x: number; z: number } | null;
export function worldcraftStoredLauncher(launcher: { x: number; z?: number; yaw?: number }, originX: number): { x: number; z?: number; yaw?: number };
