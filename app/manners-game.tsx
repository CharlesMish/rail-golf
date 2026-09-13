"use client";

import { useEffect, useRef, useState } from "react";
import {
  Color3,
  Color4,
  Camera,
  DirectionalLight,
  DynamicTexture,
  ImageProcessingConfiguration,
  Engine,
  FreeCamera,
  GlowLayer,
  HavokPlugin,
  HemisphericLight,
  LinesMesh,
  Matrix,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  Quaternion,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Eye,
  Flag,
  Map,
  RotateCcw,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  HOLES as PRACTICE_HOLES,
  RANGE_MECHANISMS,
  RANGE_TARGETS as PRACTICE_TARGETS,
  RAIL_RULES,
  addressLabChipLabel,
  chargeToSpeed,
  clamp,
  clampElevation,
  clampYaw,
  classifyChallengeRuling,
  formatMiss,
  isAceLanding,
  mergeHoleRecord,
  normalizeHoleRecord,
  resolveAddressLabFromSearch,
  resolveOpeningAddress,
  resolveSessionStartHoleIndex,
  shiftRail,
  stableUnitInterval,
  verticalRecoveryImpulse,
} from "@/lib/rail-golf-v02";
import type { AddressLabMode, Hole, HoleRecord, MechanismTag, Outcome, ShotSetup } from "@/lib/rail-golf-v02";

import {LINE_CARDS,LINE_STATIONS} from "@/lib/line-lab";
import type {GameCard} from "@/lib/line-lab";
import { COURTYARD_HOLES, COURTYARD_TARGETS, isCourtyardChallengeUnlocked } from "@/lib/courtyard";
import { buildCourtyard } from "@/lib/courtyard-scene";

import { DELIVERY_ROUTES, DELIVERY_BOOK_KEY, SKY_TOKEN, collectDeliveryStepEvents, padImpulse, earnedDeliveryRoutes, readDeliveryBook, LEGACY_DELIVERY_BOOK_KEY } from "@/lib/delivery-routes";
import type { DeliveryRoute, DeliveryBook } from "@/lib/delivery-routes";

import { launchCharge, interruptedRecord, rememberAttempt, landingReceipt } from "@/lib/shot-tools";

import { SHOT_LIBRARY_KEY, packLine, collectLine, normalizeShotLibrary } from "@/lib/shot-library";
import type { LineShelf, SavedLine } from "@/lib/shot-library";

import { YARD_STATIONS, stationAim, stationMuzzle, stationRailPosition } from "@/lib/stations";
import { LineReceipt } from './line-receipt';
import { appendLineEvidence, recordLineContact, scoreLine, recordLineReceipt } from '@/lib/line-score';
import {createLineLifecycle} from '@/lib/line-lifecycle';
import {createSawMillTracker,createRedirectTracker,collectLineStepEvents,redirectFeature} from '@/lib/line-recognition';
import type { LineEvidence } from '@/lib/line-score';
import { encodeShareLine, decodeShareLine, restoreShareLine } from '@/lib/share-line';
import { BUILD_ID } from "@/lib/build-identity";
import { DIVERTER_HOLES, DIVERTER_TARGETS, DIVERTER_SWITCH, DIVERTER_FLOOR, FLOOR_STATES, floorForAction } from "@/lib/diverter-lab";
import type { FloorState, FloorEnvironment } from "@/lib/diverter-lab";
import { COURTYARD_DIVERTER_HOLES, COURTYARD_DIVERTER_TARGETS, YARD_DIVERTER_OPTIONS, YARD_DIVERTER_SWITCH, YARD_DIVERTER_FLOOR } from "@/lib/courtyard-diverter";
import { withSharedYardPad } from "@/lib/delivery-routes";
import { buildDiverterLab, buildYardLandingAuthority } from "@/lib/diverter-scene";
import type { DiverterHandles, DiverterContact } from "@/lib/diverter-scene";
import { CASCADE_STEPS, cascadeContactTag } from "@/lib/lumber-cascade";

type Phase = "booting" | "ready" | "charging" | "flight" | "theatre" | "result" | "error";

type ProgressRecords = Record<string, HoleRecord | undefined>;
type AimSetup = Pick<ShotSetup, "railIndex" | "yaw" | "elevation">;
type EvidenceKind = MechanismTag | "first-kiss" | "wet" | "sky" | "mill";

type ShotContact = {
  id: string;
  kind: EvidenceKind;
  point: Vector3;
};

type ShotResult = {
  outcome: Outcome;
  headline: string;
  detail: string;
  point: Vector3;
  clear: boolean;
};

type ShotMemory = ShotSetup & {
  build?:string;
  ledger?:LineEvidence[];
  lineReceipt?:ReturnType<typeof recordLineReceipt>;
  environment?: FloorEnvironment;
  environmentAfter?: FloorEnvironment;
  stationId: string;
  outcome: Outcome | null;
  holeId: string;
  windId: string;
  projectileId: number;
  points: Vector3[];
  contacts: ShotContact[];
  receipt: string;
};

type FlightState = {
  ledger:LineEvidence[];
  redirectTracker:ReturnType<typeof createRedirectTracker>;
  sawMillTracker:ReturnType<typeof createSawMillTracker>;
  captioned:Set<string>;
  captionedVariety:number;
  lifecycle:ReturnType<typeof createLineLifecycle>;
  environment?: FloorEnvironment;
  aggregate: PhysicsAggregate;
  bodyMesh: Mesh;
  visual: TransformNode;
  points: Vector3[];
  trail: LinesMesh | null;
  previousPhysicsPosition: Vector3;
  physicsElapsed: number;
  launchedAt: number;
  lastTrailSampleAt: number;
  setup: ShotSetup;
  projectileId: number;
  breached: boolean;
  mechanismTags: Set<MechanismTag>;
  deliveryRoutes: Set<DeliveryRoute>;
  touchedSolid: boolean;
  contacts: ShotContact[];
  locked: boolean;
  lockedAt: number;
  pendingResult: ShotResult | null;
};

type DynamicBody = {
  aggregate: PhysicsAggregate;
  mesh: Mesh;
};

type DustMote = {
  mesh: Mesh;
  seed: number;
};

type TheatreFx = {
  mesh: Mesh;
  material: StandardMaterial;
  bornAt: number;
  lifetime: number;
  growth: number;
};

type WorldHandles = {
  ghostLine: LinesMesh | null;
};

type GameActions = {
  selectStation: (id: string) => void;
  retry: () => void;
  recallAttempt: (id: number) => void;
  compareAttempts: () => void;
  beginCharge: () => void;
  release: () => void;
  cancelCharge: () => void;
  reset: (restore?: boolean) => void;
  shiftRail: (direction: number) => void;
  nudgeYaw: (amount: number) => void;
  nudgeElevation: (amount: number) => void;
  restoreLine: () => void;
  toggleSurvey: () => void;
  selectHole: (index: number) => void;
  nextHole: () => void;
  recallRoute: (id: DeliveryRoute) => void;
};

type LiveTone = {
  oscillator: OscillatorNode;
  gain: GainNode;
};



const EMPTY_RECORD: HoleRecord = {
  attempts: 0,
  bestOutcome: null,
  hasAce: false,
  hasBreach: false,
  perfect: false,
  cleared: false,
};

function displayPercent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function evidenceLabel(kind: EvidenceKind) {
  if (kind.startsWith('floor-')) return 'FLOOR '+kind.slice(-1).toUpperCase()+' BOUNCE';
  if (kind.startsWith('switch-')) return 'SWITCH → '+kind.slice(-1).toUpperCase();
  if (kind.startsWith("step-")) return `TREAD ${{ "step-a": 1, "step-b": 2, "step-c": 3 }[kind as "step-a" | "step-b" | "step-c"]}`;
  if (kind === "sky") return "SKY TOKEN";
  if (kind === "mill") return "MILL REBOUND";
  if (kind === "first-kiss") return "FIRST KISS";
  if (kind === "bank") return "TIMBER BANK";
  if (kind === "bank-a") return "BANK A";
  if (kind === "bank-b") return "BANK B";
  if (kind === "boost") return "HOT SKIP";
  if (kind === "wet") return "WET";
  return "BREACH";
}

function readStoredJson(key: string): unknown {
  try { return JSON.parse(window.localStorage.getItem(key) ?? 'null'); }
  catch { return null; }
}

function loadProgress(HOLES: readonly GameCard[], storageKey: string): ProgressRecords {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const records: ProgressRecords = {};
    for (const hole of HOLES) {
      const candidate = normalizeHoleRecord(parsed[hole.id]);
      if (candidate) records[hole.id] = candidate;
    }
    return records;
  } catch {
    return {};
  }
}

function chooseResumeHole(records: ProgressRecords, HOLES: readonly GameCard[]) {
  const firstUnstamped = HOLES.findIndex((hole) => !records[hole.id]?.perfect && !records[hole.id]?.cleared);
  return firstUnstamped < 0 ? 0 : firstUnstamped;
}


function resultCopy(hole: Hole, outcome: Outcome, point: Vector3, tags: MechanismTag[] = []): ShotResult {
  const tagReceipt = tags.length ? tags.map(evidenceLabel).join(" + ") : "DIRECT";
  if (outcome === "double") {
    return {
      outcome,
      headline: "TRICK STAMPED",
      detail: `${tagReceipt} → ${hole.target.label}. One rail completed the full mechanism line.`,
      point,
      clear: true,
    };
  }
  if (outcome === "ace") {
    return {
      outcome,
      headline: hole.requiredTags.length ? "TARGET HIT" : "CLEAN SEAT",
      detail: hole.requiredTags.length
        ? `${hole.target.label} cleared. Optional trick stamp: ${hole.requiredTags.map(evidenceLabel).join(" → ")} → landing.`
        : `First contact landed on ${hole.target.label}. Direct line recorded.`,
      point,
      clear: true,
    };
  }
  if (outcome === "breach") {
    return {
      outcome,
      headline: "MECHANISM REGISTERED",
      detail: `${tagReceipt} → missed ${hole.target.label}. ${formatMiss(hole, point)}.`,
      point,
      clear: false,
    };
  }
  if (outcome === "wet") {
    return {
      outcome,
      headline: "WET RULING",
      detail: "The swept rail entered the water volume. The splash is terminal, even after a breach.",
      point,
      clear: false,
    };
  }
  if (outcome === "oob") {
    return {
      outcome,
      headline: "OUT OF BOUNDS",
      detail: "Course control lost the round beyond the authored ground. Restore or revise the line.",
      point,
      clear: false,
    };
  }
  return {
    outcome,
    headline: "MISSED THE SEAT",
    detail: `${formatMiss(hole, point)}. The live trail is now your survey instrument.`,
    point,
    clear: false,
  };
}

export function MannersGame({ courtyard = false, diverterLab = false, courtyardDiverter = false, lineLab = false }: { courtyard?: boolean; diverterLab?: boolean; courtyardDiverter?: boolean; lineLab?:boolean }) {
  courtyardDiverter = courtyardDiverter || lineLab;
  courtyard = courtyard || courtyardDiverter;
  diverterLab = diverterLab || courtyardDiverter;
  const HOLES = lineLab ? LINE_CARDS : courtyardDiverter ? COURTYARD_DIVERTER_HOLES : diverterLab ? DIVERTER_HOLES : courtyard ? COURTYARD_HOLES : PRACTICE_HOLES;
  const STATIONS = lineLab ? LINE_STATIONS : YARD_STATIONS;
  const RANGE_TARGETS = lineLab ? COURTYARD_TARGETS : courtyardDiverter ? COURTYARD_DIVERTER_TARGETS : diverterLab ? DIVERTER_TARGETS : courtyard ? COURTYARD_TARGETS : PRACTICE_TARGETS;
  const STORAGE_KEY = lineLab ? "rail-golf-line-lab-v1" : courtyardDiverter ? "rail-golf-courtyard-diverter-v2" : diverterLab ? "rail-golf-diverter-lab-v1" : courtyard ? "rail-golf-timber-courtyard-v01" : "rail-golf-mechanism-range-v03";
  const holeUnlocked = (index: number) => index >= 0 && index < HOLES.length &&
    (lineLab || !courtyard || isCourtyardChallengeUnlocked(index, recordsRef.current));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [liveLineTotal,setLiveLineTotal] = useState(0);
  const [sessionBest,setSessionBest] = useState<Record<string,number>>({});
  const [lineLedger,setLineLedger] = useState<LineEvidence[]>([]);
  const [claimCaption,setClaimCaption] = useState<{text:string;serial:number}|null>(null);
  useEffect(()=>{if(!claimCaption)return;const timer=setTimeout(()=>setClaimCaption(null),2200);return ()=>clearTimeout(timer);},[claimCaption]);
  const [shareNotice,setShareNotice] = useState('');
  const [shareLink,setShareLink] = useState('');
  const floorStateRef = useRef<FloorState>('A');
  const [floorState, setFloorState] = useState<FloorState>('A');
  const floorLabelRef = useRef<HTMLDivElement>(null);
  const switchLabelRef = useRef<HTMLDivElement>(null);
  const resultCardRef = useRef<HTMLElement>(null);
  const destinationRef = useRef<HTMLDivElement>(null);
  const mechanismRef = useRef<HTMLDivElement>(null);
  const deliveryPadRef = useRef<HTMLDivElement>(null);
  const skyLabelRef = useRef<HTMLDivElement>(null);
  const deliveryBookRef = useRef<DeliveryBook>({});
  const cascadeLabelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const secondBankRef = useRef<HTMLDivElement>(null);
  const chargePointerRef = useRef<number | null>(null);
  const evidenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const actionsRef = useRef<Partial<GameActions>>({});
  const worldRef = useRef<WorldHandles | null>(null);
  const phaseRef = useRef<Phase>("booting");
  const holeIndexRef = useRef(0);
  const yawRef = useRef(HOLES[0].defaultShot.yaw);
  const elevationRef = useRef(HOLES[0].defaultShot.elevation);
  const railRef = useRef(HOLES[0].defaultShot.railIndex);
  const chargeRef = useRef(0);
  const powerModeRef = useRef<"hold" | "set">("hold");
  const selectedPowerRef = useRef(.5);
  const compareRef = useRef(false);
  const stationHoleRef = useRef<Record<string, number>>({ gate: 0, lumber: 2, saw: 3 });
  const historyRef = useRef<Record<string, ShotMemory[]>>({});
  const libraryRef = useRef<Record<string, LineShelf<ShotMemory>>>({});
  const libraryKey = `${SHOT_LIBRARY_KEY}-${lineLab ? "line-lab-v1" : courtyardDiverter ? "courtyard-diverter-v2" : diverterLab ? "diverter" : courtyard ? "yard" : "range"}`;
  const surveyRef = useRef(false);
  const mutedRef = useRef(false);
  const audioMasterRef = useRef<GainNode | null>(null);
  const ghostVisibleRef = useRef(true);
  const recordsRef = useRef<ProgressRecords>({});
  const memoriesRef = useRef<Record<string, ShotMemory | undefined>>({});
  const addressLabRef = useRef<AddressLabMode | null>(null);

  const [phase, setPhase] = useState<Phase>("booting");
  const [addressLabMode, setAddressLabMode] = useState<AddressLabMode | null>(null);
  const [holeIndex, setHoleIndex] = useState(0);
  const [records, setRecords] = useState<ProgressRecords>({});
  const [yaw, setYaw] = useState(HOLES[0].defaultShot.yaw);
  const [elevation, setElevation] = useState(HOLES[0].defaultShot.elevation);
  const [railIndex, setRailIndex] = useState(HOLES[0].defaultShot.railIndex);
  const [charge, setCharge] = useState(0);
  const [survey, setSurvey] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(true);
  const [powerMode, setPowerMode] = useState<"hold" | "set">("hold");
  const [selectedPower, setSelectedPower] = useState(.5);
  const [compare, setCompare] = useState(false);
  const [history, setHistory] = useState<ShotMemory[]>([]);
  const [winningLines, setWinningLines] = useState<ShotMemory[]>([]);
  const [retryNotice, setRetryNotice] = useState("");
  const [lastShot, setLastShot] = useState<ShotMemory | null>(null);
  const [mechanismInFlight, setMechanismInFlight] = useState<string | null>(null);
  const [result, setResult] = useState<ShotResult | null>(null);
  const [deliveryBook, setDeliveryBook] = useState<DeliveryBook>({});
  const [deliveryLive, setDeliveryLive] = useState<DeliveryRoute[]>([]);
  const [routeFocus, setRouteFocus] = useState<DeliveryRoute>('direct');
  const [recalledPower, setRecalledPower] = useState<number | null>(null);
  const [bootMessage, setBootMessage] = useState("Opening the mechanism range");

  const setGamePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  useEffect(() => {
    ghostVisibleRef.current = ghostVisible;
    if (worldRef.current?.ghostLine) worldRef.current.ghostLine.isVisible = ghostVisible;
  }, [ghostVisible]);

  useEffect(() => {
    mutedRef.current = muted;
    const master = audioMasterRef.current;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, master.context.currentTime, .01);
  }, [muted]);

  useEffect(() => {
    if (phase !== "result") return;
    resultCardRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("button, input, select, textarea, a, [role='switch']"));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.code === "KeyR" && !event.repeat && !(event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable='true']"))) {
        event.preventDefault(); actionsRef.current.retry?.(); return;
      }
      if (isInteractiveTarget(event.target)) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
      if (event.repeat && event.code === "Space") return;
      if (event.code === "Space") actionsRef.current.beginCharge?.();
      if (event.code === "ArrowLeft" || event.code === "KeyA") actionsRef.current.nudgeYaw?.(-0.7);
      if (event.code === "ArrowRight" || event.code === "KeyD") actionsRef.current.nudgeYaw?.(0.7);
      if (event.code === "ArrowUp" || event.code === "KeyW") actionsRef.current.nudgeElevation?.(0.7);
      if (event.code === "ArrowDown" || event.code === "KeyS") actionsRef.current.nudgeElevation?.(-0.7);
      if (event.code === "KeyQ") actionsRef.current.shiftRail?.(-1);
      if (event.code === "KeyE") actionsRef.current.shiftRail?.(1);
      if (event.code === "KeyL") actionsRef.current.restoreLine?.();
      if (event.code === "KeyV") actionsRef.current.toggleSurvey?.();
      if (event.code === "KeyG") setGhostVisible((visible) => !visible);
      if (event.code === "KeyM") setMuted((value) => !value);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space" || phaseRef.current !== "charging" || chargePointerRef.current !== null) return;
      event.preventDefault();
      actionsRef.current.release?.();
    };
    const cancelCharge = () => actionsRef.current.cancelCharge?.();
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") cancelCharge();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", cancelCharge);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", cancelCharge);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let engine: Engine | null = null;
    let scene: Scene | null = null;
    let audioContext: AudioContext | null = null;

    const initialize = async () => {
      try {
        let sharedStart:ReturnType<typeof restoreShareLine>|null=null;
        if (courtyardDiverter) {
          const encoded=new URLSearchParams(window.location.hash.slice(1)).get('line');
          if(encoded){try{
            const parsed=decodeShareLine(encoded);
            const route=lineLab?'/lab/lines':'/lab/courtyard-diverter';
            if(parsed.route!==route) throw new Error('This shared line belongs to a different lab route.');
            sharedStart=restoreShareLine(parsed,BUILD_ID);
            floorStateRef.current=sharedStart.environment.floor;setFloorState(sharedStart.environment.floor);
            setShareNotice([sharedStart.warning,lineLab?'Shared setup loaded. Dock state is inactive in this score yard. Press Fire to try the line.':'Shared setup loaded. Press Fire to try the line.'].filter(Boolean).join(' '));
          }catch{setShareNotice('Invalid or incompatible line link. Authored starting setup retained.');}}
        }
        const labMode = courtyard || diverterLab ? null : resolveAddressLabFromSearch(window.location.search);
        addressLabRef.current = labMode;
        setAddressLabMode(labMode);
        setBootMessage("Loading Havok once");
        const havok = await HavokPhysics();
        if (disposed) return;

        engine = new Engine(canvas, true, {
          antialias: true,
          preserveDrawingBuffer: false,
          stencil: true,
          adaptToDeviceRatio: true,
        });
        engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
        scene = new Scene(engine);
        scene.clearColor = new Color4(0.075, 0.115, 0.135, 1);
        scene.imageProcessingConfiguration.toneMappingEnabled = true;
        scene.imageProcessingConfiguration.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
        scene.imageProcessingConfiguration.exposure = 1.05;
        scene.imageProcessingConfiguration.contrast = 1.08;
        scene.fogMode = Scene.FOGMODE_LINEAR;
        scene.fogStart = 105;
        scene.fogEnd = 230;
        scene.fogColor = new Color3(0.075, 0.115, 0.135);
        scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
        const physicsEngine = scene.getPhysicsEngine();
        physicsEngine?.setTimeStep(1 / 120);
        physicsEngine?.setSubTimeStep(1000 / 120);

        const camera = new FreeCamera("range-director", new Vector3(0, 8, -15), scene);
        camera.fov = 0.69;
        camera.minZ = 0.1;
        camera.maxZ = 280;
        camera.inputs.clear();
        let cameraTarget = new Vector3(0, 4, 30);
        const identityMatrix = Matrix.Identity();
        camera.setTarget(cameraTarget);
        scene.activeCamera = camera;

        const sky = new HemisphericLight("range-sky", new Vector3(-0.2, 1, -0.1), scene);
        sky.intensity = 0.9;
        sky.diffuse = new Color3(0.7, 0.81, 0.91);
        sky.groundColor = new Color3(0.075, 0.11, 0.07);

        const sun = new DirectionalLight("range-sun", new Vector3(-0.42, -0.85, 0.35), scene);
        sun.position = new Vector3(38, 54, -34);
        sun.intensity = 1.65;
        sun.diffuse = new Color3(1, 0.83, 0.62);
        const shadows = new ShadowGenerator(window.innerWidth > 930 ? 2048 : 1024, sun);
        shadows.useBlurExponentialShadowMap = true;
        shadows.blurKernel = 12;
        shadows.setDarkness(0.2);
        shadows.bias = 0.001;

        const glow = new GlowLayer("range-glow", scene, { blurKernelSize: 32 });
        glow.intensity = 0.3;

        const makeMaterial = (
          name: string,
          diffuse: Color3,
          emissive = new Color3(0, 0, 0),
          roughness = 0.78,
        ) => {
          const material = new StandardMaterial(name, scene!);
          material.diffuseColor = diffuse;
          material.emissiveColor = emissive;
          material.specularColor = new Color3(1 - roughness, 1 - roughness, 1 - roughness);
          return material;
        };

        const materials = {
          rough: makeMaterial("rough", new Color3(0.045, 0.155, 0.09)),
          fairwayA: makeMaterial("fairway-a", new Color3(0.115, 0.23, 0.14)),
          fairwayB: makeMaterial("fairway-b", new Color3(0.095, 0.205, 0.12)),
          green: makeMaterial("green", new Color3(0.095, 0.285, 0.18)),
          steel: makeMaterial("steel", new Color3(0.29, 0.35, 0.34), new Color3(0.02, 0.025, 0.024), 0.24),
          machine: makeMaterial("machine", new Color3(0.085, 0.13, 0.135), new Color3(0.006, 0.01, 0.01), 0.35),
          cyan: makeMaterial("cyan", new Color3(0.025, 0.4, 0.44), new Color3(0.045, 0.82, 0.92), 0.18),
          amber: makeMaterial("amber", new Color3(0.46, 0.17, 0.035), new Color3(1, 0.27, 0.025), 0.2),
          violet: makeMaterial("violet", new Color3(0.28, 0.08, 0.42), new Color3(0.72, 0.2, 1), 0.18),
          lime: makeMaterial("lime", new Color3(0.16, 0.4, 0.08), new Color3(0.48, 1, 0.16), 0.18),
          boost: makeMaterial("boost", new Color3(0.42, 0.04, 0.22), new Color3(1, 0.08, 0.52), 0.14),
          hot: makeMaterial("hot", new Color3(0.39, 0.045, 0.012), new Color3(1, 0.075, 0.012), 0.14),
          brick: makeMaterial("brick", new Color3(0.42, 0.265, 0.13), new Color3(0.014, 0.007, 0.002)),
          bark: makeMaterial("bark", new Color3(0.31, 0.18, 0.095)),
          timber: makeMaterial("timber", new Color3(0.62, 0.40, 0.23)),
          leaf: makeMaterial("leaf", new Color3(0.075, 0.20, 0.13)),
          leafLight: makeMaterial("leaf-light", new Color3(0.13, 0.255, 0.17)),
          sand: makeMaterial("sand", new Color3(0.47, 0.39, 0.23)),
          water: makeMaterial("water", new Color3(0.025, 0.22, 0.28), new Color3(0.01, 0.1, 0.15), 0.2),
        };
        materials.water.alpha = 0.82;

        // Subtle procedural grain; shared once by the timber and crates.
        const woodTexture = new DynamicTexture("timber-grain", { width: 128, height: 512 }, scene, false);
        const grain = woodTexture.getContext() as CanvasRenderingContext2D;
        grain.fillStyle = "#bba383";
        grain.fillRect(0, 0, 128, 512);
        for (let i = 0; i < 100; i += 1) {
          const seed = stableUnitInterval(`grain-${i}`);
          grain.strokeStyle = `rgba(48, 29, 15, ${0.035 + seed * 0.13})`;
          grain.lineWidth = 0.5 + seed * 1.4;
          grain.beginPath();
          grain.moveTo(seed * 128, 0);
          grain.bezierCurveTo(seed * 128 + 5, 180, seed * 128 - 4, 320, seed * 128 + 1, 512);
          grain.stroke();
        }
        woodTexture.update();
        materials.timber.diffuseTexture = woodTexture;
        materials.brick.diffuseTexture = woodTexture;
        if (courtyard) {
          materials.rough.diffuseColor = new Color3(.20, .18, .125);
          materials.fairwayA.diffuseColor = new Color3(.26, .24, .17);
          materials.fairwayB.diffuseColor = new Color3(.24, .22, .155);
        }
        const targetSurfaces = {
          cyan: makeMaterial("cyan-seat-surface", new Color3(0.05, 0.32, 0.34), new Color3(0.01, 0.12, 0.14)),
          amber: makeMaterial("amber-seat-surface", new Color3(0.46, 0.24, 0.055), new Color3(0.16, 0.065, 0.005)),
          violet: makeMaterial("violet-seat-surface", new Color3(0.25, 0.12, 0.34), new Color3(0.075, 0.02, 0.11)),
          lime: makeMaterial("lime-seat-surface", new Color3(0.24, 0.36, 0.07), new Color3(0.07, 0.11, 0.01)),
        };

        const launcher = new TransformNode("shared-launcher", scene);
        const yawPivot = new TransformNode("launcher-yaw", scene);
        yawPivot.parent = launcher;
        yawPivot.position.y = 1.55;
        const elevationPivot = new TransformNode("launcher-elevation", scene);
        elevationPivot.parent = yawPivot;

        const carriage = MeshBuilder.CreateBox("launcher-carriage", { width: 2.7, height: 1.05, depth: 2.5 }, scene);
        carriage.parent = launcher;
        carriage.position.y = 1.02;
        carriage.material = materials.machine;
        shadows.addShadowCaster(carriage);

        const trim = MeshBuilder.CreateBox("launcher-trim", { width: 2.1, height: 0.09, depth: 2.58 }, scene);
        trim.parent = launcher;
        trim.position.y = 1.49;
        trim.material = materials.cyan;

        const barrel = MeshBuilder.CreateBox("launcher-barrel", { width: 0.68, height: 0.56, depth: 5.7 }, scene);
        barrel.parent = elevationPivot;
        barrel.position.z = 2.45;
        barrel.material = materials.machine;
        shadows.addShadowCaster(barrel);

        for (const x of [-0.43, 0.43]) {
          const coil = MeshBuilder.CreateBox(`launcher-coil-${x}`, { width: 0.08, height: 0.1, depth: 5.05 }, scene);
          coil.parent = elevationPivot;
          coil.position.set(x, 0.27, 2.42);
          coil.material = materials.cyan;
        }

        const muzzleRing = MeshBuilder.CreateTorus(
          "launcher-muzzle",
          { diameter: 1.08, thickness: 0.12, tessellation: 28 },
          scene,
        );
        muzzleRing.parent = elevationPivot;
        muzzleRing.position.z = RAIL_RULES.muzzleLength;
        muzzleRing.rotation.x = Math.PI / 2;
        muzzleRing.material = materials.cyan;

        let aimSpine: LinesMesh | null = null;
        let courseRoot: TransformNode | null = null;
        let diverterHandles: DiverterHandles | ReturnType<typeof buildYardLandingAuthority> | null = null;
        let labLanding: DiverterContact | null = null;
        let courseAggregates: PhysicsAggregate[] = [];
        let breachBodies: DynamicBody[] = [];
        let dustMotes: DustMote[] = [];
        let flagPennant: Mesh | null = null;
        let skyToken: Mesh | null = null;
        let flight: FlightState | null = null;
        let ghostLine: LinesMesh | null = null;
        let theatreFx: TheatreFx[] = [];
        let chargeStartedAt = 0;
        let projectileCounter = 0;
        const impactFocus = new Vector3(0, 0.5, 48);
        let lastRenderUiAt = 0;
        let dragPointer: number | null = null;
        let dragX = 0;
        let dragY = 0;
        let chargeTone: LiveTone | null = null;
        let flightTone: LiveTone | null = null;
        let followDirection = new Vector3(0, 0, 1);

        worldRef.current = { ghostLine };

        const ensureAudio = () => {
          if (!audioContext) {
            audioContext = new AudioContext({ latencyHint: "interactive" });
            audioMasterRef.current = audioContext.createGain();
            audioMasterRef.current.gain.value = mutedRef.current ? 0 : 1;
            audioMasterRef.current.connect(audioContext.destination);
          }
          if (audioContext.state === "suspended") void audioContext.resume();
          return audioContext;
        };

        const stopLiveTone = (live: LiveTone | null) => {
          if (!live) return;
          const now = audioContext?.currentTime ?? 0;
          live.gain.gain.cancelScheduledValues(now);
          live.gain.gain.setTargetAtTime(0.0001, now, 0.02);
          try {
            live.oscillator.stop(now + 0.09);
          } catch {
            // An oscillator may already be stopping after a phase transition.
          }
        };

        const stopChargeTone = () => {
          stopLiveTone(chargeTone);
          chargeTone = null;
        };

        const stopFlightTone = () => {
          stopLiveTone(flightTone);
          flightTone = null;
        };

        const tone = (
          startFrequency: number,
          endFrequency: number,
          duration: number,
          gainValue: number,
          type: OscillatorType = "sine",
          delay = 0,
        ) => {
          if (mutedRef.current) return;
          const context = ensureAudio();
          const now = context.currentTime + delay;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(startFrequency, now);
          oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
          gain.gain.setValueAtTime(gainValue, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
          oscillator.connect(gain).connect(audioMasterRef.current!);
          oscillator.start(now);
          oscillator.stop(now + duration + 0.03);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        };

        const noise = (duration: number, gainValue: number, delay = 0) => {
          if (mutedRef.current) return;
          const context = ensureAudio();
          const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
          const channel = buffer.getChannelData(0);
          for (let i = 0; i < channel.length; i += 1) {
            channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / channel.length, 1.8);
          }
          const source = context.createBufferSource();
          const gain = context.createGain();
          gain.gain.value = gainValue;
          source.buffer = buffer;
          source.connect(gain).connect(audioMasterRef.current!);
          source.start(context.currentTime + delay);
          source.onended = () => { source.disconnect(); gain.disconnect(); };
        };

        const startChargeTone = () => {
          if (mutedRef.current) return;
          stopChargeTone();
          const context = ensureAudio();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sawtooth";
          oscillator.frequency.value = 62;
          gain.gain.value = 0.025;
          oscillator.connect(gain).connect(audioMasterRef.current!);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
          oscillator.start();
          chargeTone = { oscillator, gain };
        };

        const startFlightTone = () => {
          if (mutedRef.current) return;
          stopFlightTone();
          const context = ensureAudio();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "triangle";
          oscillator.frequency.value = 96;
          gain.gain.value = 0.018;
          oscillator.connect(gain).connect(audioMasterRef.current!);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
          oscillator.start();
          flightTone = { oscillator, gain };
        };

        const playLaunch = (power: number) => {
          tone(76 + power * 54, 25, 0.58, 0.24, "sawtooth");
          tone(760, 115, 0.27, 0.06, "square");
          noise(0.32, 0.12);
        };

        const playBreach = () => {
          tone(138, 42, 0.55, 0.22, "square");
          noise(0.58, 0.18);
        };

        const playRuling = (outcome: Outcome) => {
          if (outcome === "double") {
            tone(262, 524, .42, .055, "triangle");
            tone(392, 784, .52, .04, "triangle", .08);
          } else if (outcome === "ace") {
            tone(196, 392, .32, .045, "triangle");
            tone(294, 588, .4, .03, "triangle", .1);
          }
        };

        const getAimDirection = () => {
          const raw = stationAim({yaw:yawRef.current, elevation:elevationRef.current}, HOLES[holeIndexRef.current].station);
          return new Vector3(raw.x, raw.y, raw.z);
        };

        const getHorizontalDirection = () => {
          const yawRadians = ((yawRef.current + (HOLES[holeIndexRef.current].station?.yaw ?? 0)) * Math.PI) / 180;
          return new Vector3(Math.sin(yawRadians), 0, Math.cos(yawRadians));
        };

        const getMuzzle = () => {
          const muzzle = stationMuzzle({ railIndex:railRef.current, yaw:yawRef.current, elevation:elevationRef.current }, HOLES[holeIndexRef.current].station);
          return new Vector3(muzzle.x, muzzle.y, muzzle.z);
        };

        const updateLauncher = () => {
          const station = HOLES[holeIndexRef.current].station;
          const rail = stationRailPosition(railRef.current, station);
          launcher.position.set(rail.x, 0, rail.z);
          launcher.rotation.y = (station?.yaw ?? 0) * Math.PI / 180;
          yawPivot.rotation.y = (yawRef.current * Math.PI) / 180;
          elevationPivot.rotation.x = (-elevationRef.current * Math.PI) / 180;
          const direction = getAimDirection();
          const muzzle = getMuzzle();
          const points = [muzzle.add(direction.scale(0.18)), muzzle.add(direction.scale(3.2))];
          aimSpine = MeshBuilder.CreateLines(
            "muzzle-aim-spine",
            { points, updatable: true, instance: aimSpine ?? undefined },
            scene!,
          );
          aimSpine.color = new Color3(0.31, 0.9, 0.94);
          aimSpine.alpha = 0.8;
          aimSpine.isPickable = false;
        };

        const disposeCourse = () => {
          diverterHandles?.dispose(); diverterHandles = null; labLanding = null;
          for (const aggregate of courseAggregates) aggregate.dispose();
          courseAggregates = [];
          breachBodies = [];
          dustMotes = [];
          flagPennant = null;
          for (const mesh of courseRoot?.getChildMeshes() ?? []) shadows.removeShadowCaster(mesh);
          courseRoot?.dispose(false, false);
          courseRoot = null;
        };

        const registerAggregate = (aggregate: PhysicsAggregate) => {
          courseAggregates.push(aggregate);
          return aggregate;
        };

        const createCourse = (hole: GameCard) => {
          disposeCourse();
          courseRoot = new TransformNode(`course-${hole.id}`, scene!);
          if (diverterLab && !courtyardDiverter) {
            diverterHandles = buildDiverterLab(scene!, courseRoot, materials, shadows, floorStateRef.current);
            return;
          }

          const place = <T extends Mesh>(mesh: T) => {
            mesh.parent = courseRoot;
            return mesh;
          };

          const rough = place(MeshBuilder.CreateBox(
            `${hole.id}-rough`,
            { width: hole.courseWidth ?? 64, height: 1, depth: hole.courseLength + 42 },
            scene!,
          ));
          rough.position.set(0, -0.5, (hole.courseLength + 8) / 2);
          if (courtyardDiverter) rough.metadata = {yardLanding:"ground"};
          rough.material = materials.rough;
          rough.receiveShadows = true;
          registerAggregate(new PhysicsAggregate(
            rough,
            PhysicsShapeType.BOX,
            { mass: 0, friction: 0.8, restitution: 0.1 },
            scene!,
          ));

          for (let index = 0; index < hole.fairwayCenters.length; index += 1) {
            const width = Math.max(17, 30 - index * 0.95);
            const stripe = place(MeshBuilder.CreateBox(
              `${hole.id}-stripe-${index}`,
              { width, height: 0.065, depth: 10.15 },
              scene!,
            ));
            stripe.position.set(hole.fairwayCenters[index], 0.025, 4 + index * 10);
            stripe.material = index % 2 === 0 ? materials.fairwayA : materials.fairwayB;
            stripe.receiveShadows = true;
          }

          const tee = place(MeshBuilder.CreateBox(
            `${hole.id}-tee`,
            { width: 13, height: 0.34, depth: 7.5 },
            scene!,
          ));
          tee.position.set(0, 0.16, -0.5);
          if (courtyardDiverter) tee.metadata = {yardLanding:"tee"};
          tee.material = materials.steel;
          tee.receiveShadows = true;
          registerAggregate(new PhysicsAggregate(
            tee,
            PhysicsShapeType.BOX,
            { mass: 0, friction: 0.9, restitution: 0.06 },
            scene!,
          ));

          for (const rangeTarget of RANGE_TARGETS) {
            const active = rangeTarget.id === hole.target?.id;
            const targetMaterial = materials[rangeTarget.material];
            const green = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-green`,
              { height: 0.12, diameter: rangeTarget.radius * 2 + 4.4, tessellation: 64 },
              scene!,
            ));
            green.position.set(rangeTarget.x, 0.07, rangeTarget.z);
            green.material = materials.bark; // Neutral apron: only the coloured disk is the destination.
            green.receiveShadows = true;
            // A dark outer curb gives each landing disk a clear physical edge.
            const curb = place(MeshBuilder.CreateTorus(
              `${hole.id}-${rangeTarget.id}-curb`,
              { diameter: rangeTarget.radius * 2 + 0.65, thickness: 0.24, tessellation: 64 }, scene!,
            ));
            curb.position.set(rangeTarget.x, 0.14, rangeTarget.z);
            curb.material = materials.machine;
            curb.receiveShadows = true;

            const target = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-target`,
              { height: active ? 0.22 : 0.16, diameter: rangeTarget.radius * 2, tessellation: 64 },
              scene!,
            ));
            target.position.set(rangeTarget.x, active ? 0.2 : 0.16, rangeTarget.z);
            if (courtyardDiverter) target.metadata = {yardLanding:rangeTarget.id};
            target.material = targetSurfaces[rangeTarget.material];
            target.receiveShadows = true;
            registerAggregate(new PhysicsAggregate(
              target,
              PhysicsShapeType.CYLINDER,
              { mass: 0, friction: 0.74, restitution: 0.12 },
              scene!,
            ));

            const ring = place(MeshBuilder.CreateTorus(
              `${hole.id}-${rangeTarget.id}-ring`,
              {
                diameter: rangeTarget.radius * 2,
                thickness: active ? 0.19 : 0.08,
                tessellation: 64,
              },
              scene!,
            ));
            ring.position.set(rangeTarget.x, active ? 0.36 : 0.28, rangeTarget.z);
            ring.material = active ? targetMaterial : targetSurfaces[rangeTarget.material];

            // Keep an active destination legible at address without giving a
            // near target extra visual weight. The target's authored distance
            // determines the witness scale; its footprint remains the anchor.
            const destinationScale = active ? Math.max(1, rangeTarget.z / 80) : 1;
            const pinHeight = active ? (rangeTarget.beaconHeight ?? 6.4 * destinationScale) : 4.5;
            const pin = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-pin`,
              { height: pinHeight, diameter: active ? 0.22 * destinationScale : 0.11, tessellation: 12 },
              scene!,
            ));
            pin.position.set(rangeTarget.x, pinHeight / 2, active ? rangeTarget.z : rangeTarget.z + 1.25);
            pin.material = active ? targetMaterial : materials.steel;
            const beacon = place(MeshBuilder.CreateSphere(
              `${hole.id}-${rangeTarget.id}-beacon`,
              { diameter: active ? 0.72 * destinationScale : 0.36 },
              scene!,
            ));
            beacon.position.set(rangeTarget.x, pinHeight, active ? rangeTarget.z : rangeTarget.z + 1.25);
            beacon.material = targetMaterial;
            if (active) {
              // A flag over a landing halo has a different silhouette from the breach gate.
              const pennant = place(MeshBuilder.CreateBox(
                `${hole.id}-${rangeTarget.id}-destination-flag`,
                { width: 2.1 * destinationScale, height: 0.9 * destinationScale, depth: 0.055 },
                scene!,
              ));
              pennant.position.set(rangeTarget.x + 1.05 * destinationScale, pinHeight - 0.65 * destinationScale, rangeTarget.z);
              pennant.material = targetMaterial;
              const innerRing = place(MeshBuilder.CreateTorus(
                `${hole.id}-${rangeTarget.id}-landing-halo`,
                { diameter: rangeTarget.radius * 2 - 0.38, thickness: 0.065, tessellation: 64 }, scene!,
              ));
              innerRing.position.set(rangeTarget.x, 0.33, rangeTarget.z);
              innerRing.material = targetMaterial;
              flagPennant = beacon;
            }
          }

          for (const station of courtyard ? Object.values(STATIONS) : [YARD_STATIONS.gate]) {
          const railBed = place(MeshBuilder.CreateBox(
            `${hole.id}-rail-bed`,
            { width: 11.2, height: 0.2, depth: 2.6 },
            scene!,
          ));
          railBed.position.set(station.x, 0.47, station.z);
          railBed.rotation.y = station.yaw * Math.PI / 180;
          railBed.material = materials.steel;

          for (let railIndex = 0; railIndex < RAIL_RULES.railPositions.length; railIndex += 1) {
            const rail = place(MeshBuilder.CreateBox(
              `${hole.id}-rail-${railIndex}`,
              { width: 0.16, height: 0.08, depth: 6.1 },
              scene!,
            ));
            const railPosition = stationRailPosition(railIndex, station);
            rail.position.set(railPosition.x, 0.61, railPosition.z);
            rail.rotation.y = station.yaw * Math.PI / 180;
            rail.material = station.id === (hole.station?.id ?? "gate") && railIndex === railRef.current ? materials.cyan : materials.steel;
          }

          }
          if (courtyard) {
            skyToken = buildCourtyard(scene!, courseRoot, materials, shadows, registerAggregate, hole, {loadingPlatformOverlay:courtyardDiverter&&!lineLab,lineLab}).skyToken;
            if(lineLab) diverterHandles=buildYardLandingAuthority(hole.target,floorStateRef.current);
            else if (courtyardDiverter && hole.target) diverterHandles = buildDiverterLab(scene!,courseRoot,materials,shadows,floorStateRef.current,{...YARD_DIVERTER_OPTIONS,target:hole.target});
          } else {
          const bankVolume = RANGE_MECHANISMS.bank;
          const bankFace = place(MeshBuilder.CreateBox(
            `${hole.id}-timber-bank-face`,
            {
              width: bankVolume.halfWidth * 2,
              height: bankVolume.maxY - bankVolume.minY,
              depth: bankVolume.halfDepth * 2,
            },
            scene!,
          ));
          bankFace.position.set(
            bankVolume.x,
            bankVolume.minY + (bankVolume.maxY - bankVolume.minY) / 2,
            bankVolume.z,
          );
          bankFace.material = materials.timber;
          bankFace.receiveShadows = true;
          shadows.addShadowCaster(bankFace);
          registerAggregate(new PhysicsAggregate(
            bankFace,
            PhysicsShapeType.BOX,
            { mass: 0, friction: 0.18, restitution: 0.86 },
            scene!,
          ));
          const bankDepth = bankVolume.halfDepth * 2;
          const bankHeight = bankVolume.maxY - bankVolume.minY;
          const plankCount = Math.ceil(bankDepth / 1.67);
          const plankPitch = bankDepth / plankCount;
          for (let plank = 0; plank < plankCount; plank += 1) {
            const board = place(MeshBuilder.CreateBox(
              `${hole.id}-bank-board-${plank}`,
              { width: 0.04, height: bankHeight - 0.27, depth: plankPitch - 0.055 }, scene!,
            ));
            board.position.set(
              bankVolume.x + bankVolume.halfWidth + 0.015,
              (bankVolume.minY + bankVolume.maxY) / 2,
              bankVolume.z - bankVolume.halfDepth + (plank + 0.5) * plankPitch,
            );
            board.material = plank % 3 === 0 ? materials.brick : materials.timber;
            board.receiveShadows = true;
          }
          const braceCount = Math.ceil(bankDepth / 2.15);
          for (let brace = 0; brace <= braceCount; brace += 1) {
            const timber = place(MeshBuilder.CreateBox(
              `${hole.id}-bank-timber-${brace}`,
              { width: 1.06, height: 8.8, depth: 0.24 },
              scene!,
            ));
            timber.position.set(bankVolume.x - 0.82, 4.4, bankVolume.z - bankVolume.halfDepth + brace * bankDepth / braceCount);
            timber.material = brace % 2 === 0 ? materials.brick : materials.bark;
          }
          const bankSign = place(MeshBuilder.CreateBox(
            `${hole.id}-bank-sign`,
            { width: 0.18, height: 1.25, depth: 5.4 },
            scene!,
          ));
          bankSign.position.set(bankVolume.x + 0.82, 7.2, bankVolume.z);
          bankSign.material = hole.requiredTags.includes("bank") ? materials.amber : materials.brick;
          // Repeated inset strike marks make the working face readable along its length.
          for (let z = bankVolume.z - bankVolume.halfDepth + 5; z < bankVolume.z + bankVolume.halfDepth; z += 8) {
            const strike = place(MeshBuilder.CreateBox(`${hole.id}-bank-strike-${z}`,
              { width: 0.055, height: 0.16, depth: 3.4 }, scene!));
            strike.position.set(bankVolume.x + bankVolume.halfWidth + 0.05, 4.5, z);
            strike.material = hole.requiredTags.includes("bank") ? materials.amber : materials.brick;
          }

          const boostVolume = RANGE_MECHANISMS.boost;
          const boostPad = place(MeshBuilder.CreateBox(
            `${hole.id}-boost-pad`,
            { width: boostVolume.halfWidth * 2, height: 0.24, depth: boostVolume.halfDepth * 2 },
            scene!,
          ));
          boostPad.position.set(boostVolume.x, 0.15, boostVolume.z);
          boostPad.material = materials.machine;
          for (let stripe = -2; stripe <= 2; stripe += 1) {
            const boostStripe = place(MeshBuilder.CreateBox(
              `${hole.id}-boost-stripe-${stripe}`,
              { width: 0.3, height: 0.1, depth: boostVolume.halfDepth * 1.72 },
              scene!,
            ));
            boostStripe.position.set(boostVolume.x + stripe * 1.45, 0.33, boostVolume.z);
            boostStripe.material = hole.requiredTags.includes("boost") ? materials.boost : targetSurfaces.violet;
          }
          for (const side of [-1, 1]) {
            const edge = place(MeshBuilder.CreateBox(
              `${hole.id}-boost-edge-${side}`,
              { width: 0.16, height: 0.34, depth: boostVolume.halfDepth * 2 + 0.32 },
              scene!,
            ));
            edge.position.set(
              boostVolume.x + side * (boostVolume.halfWidth + 0.08),
              0.25,
              boostVolume.z,
            );
            edge.material = materials.boost;
          }
          for (const z of [boostVolume.z - boostVolume.halfDepth, boostVolume.z + boostVolume.halfDepth]) {
            const beacon = place(MeshBuilder.CreateCylinder(
              `${hole.id}-boost-beacon-${z}`,
              { height: 2.2, diameter: 0.16, tessellation: 10 },
              scene!,
            ));
            beacon.position.set(boostVolume.x - boostVolume.halfWidth - 0.1, 1.1, z);
            beacon.material = materials.violet;
          }

          }

          if (hole.breach) {
            const volume = hole.breach;
            const barWidth = 0.17;
            const height = volume.maxY - volume.minY;
            for (const x of [volume.x - volume.halfWidth, volume.x + volume.halfWidth]) {
              const post = place(MeshBuilder.CreateBox(
                `${hole.id}-gate-post-${x}`,
                { width: barWidth, height, depth: volume.halfDepth * 2 },
                scene!,
              ));
              post.position.set(x, volume.minY + height / 2, volume.z);
              post.material = hole.requiredTags.includes("breach") ? materials.amber : materials.brick;
            }
            const lintel = place(MeshBuilder.CreateBox(
              `${hole.id}-gate-lintel`,
              { width: volume.halfWidth * 2 + barWidth, height: barWidth, depth: volume.halfDepth * 2 },
              scene!,
            ));
            lintel.position.set(volume.x, volume.maxY, volume.z);
            lintel.material = hole.requiredTags.includes("breach") ? materials.amber : materials.brick;

            for (let row = 0; row < 4; row += 1) {
              const count = row === 3 ? 3 : 4;
              for (let column = 0; column < count; column += 1) {
                const brick = place(MeshBuilder.CreateBox(
                  `${hole.id}-brick-${row}-${column}`,
                  { width: 1.04, height: 1.02, depth: 1.35 },
                  scene!,
                ));
                const rowShift = row % 2 === 0 ? 0 : 0.48;
                brick.position.set(
                  volume.x - 1.65 + column * 1.08 + rowShift,
                  0.54 + row * 1.04,
                  volume.z,
                );
                brick.material = materials.brick;
                brick.rotationQuaternion = Quaternion.Identity();
                brick.receiveShadows = true;
                shadows.addShadowCaster(brick);
                const aggregate = registerAggregate(new PhysicsAggregate(
                  brick,
                  PhysicsShapeType.BOX,
                  { mass: 0.78, friction: 0.64, restitution: 0.14 },
                  scene!,
                ));
                breachBodies.push({ aggregate, mesh: brick });
                // Render-only battens travel with each crate; collision boxes stay unchanged.
                for (const bandY of [-0.32, 0.32]) {
                  const batten = MeshBuilder.CreateBox(`${brick.name}-batten-${bandY}`,
                    { width: 1.03, height: 0.11, depth: 0.055 }, scene!);
                  batten.parent = brick;
                  batten.position.set(0, bandY, -0.70);
                  batten.material = materials.timber;
                }
              }
            }
          }

          if (hole.water) {
            const water = place(MeshBuilder.CreateBox(
              `${hole.id}-water`,
              { width: hole.water.halfWidth * 2, height: 0.08, depth: hole.water.halfDepth * 2 },
              scene!,
            ));
            water.position.set(hole.water.x, 0.08, hole.water.z);
            water.material = materials.water;
          }

          if (!courtyard) {
          for (const bunker of [
            { x: -8.5, z: 87, sx: 2.1, sz: 1.1 },
            { x: 9.5, z: 108, sx: 2.6, sz: 1.25 },
          ]) {
            const sand = place(MeshBuilder.CreateCylinder(
              `${hole.id}-sand-${bunker.x}`,
              { height: 0.075, diameter: 5.1, tessellation: 36 },
              scene!,
            ));
            sand.position.set(bunker.x, 0.075, bunker.z);
            sand.scaling.set(bunker.sx, 1, bunker.sz);
            sand.material = materials.sand;
          }

          const makeTree = (x: number, z: number, scale: number, name: string) => {
            const trunk = place(MeshBuilder.CreateCylinder(
              `${hole.id}-trunk-${name}`,
              { height: 2.3 * scale, diameter: 0.42 * scale, tessellation: 8 },
              scene!,
            ));
            trunk.position.set(x, 1.15 * scale, z);
            trunk.material = materials.bark;
            const crown = place(MeshBuilder.CreatePolyhedron(
              `${hole.id}-crown-${name}`,
              { type: 2, size: 1.5 * scale },
              scene!,
            ));
            crown.position.set(x, 3 * scale, z);
            crown.scaling.y = 1.35;
            crown.material = stableUnitInterval(name) > 0.5 ? materials.leaf : materials.leafLight;
            crown.receiveShadows = true;
            shadows.addShadowCaster(crown);
            shadows.addShadowCaster(trunk);
          };

          const treePattern = [
            [-18, 19, 1.15], [18, 25, 1.05], [-20, 38, 1.3], [21, 52, 1.2],
            [-17, 67, 1.02], [18, 79, 1.25], [-12, hole.courseLength + 4, 1.1],
          ] as const;
          treePattern.forEach(([x, z, scale], index) => makeTree(x, z, scale, String(index)));
          // Low boundary timber gives the strip scale without obstructing any shot.
          for (const side of [-1, 1]) {
            for (let bay = 0; bay < 11; bay += 1) {
              const post = place(MeshBuilder.CreateBox(`${hole.id}-boundary-post-${side}-${bay}`, { width: 0.23, height: 1.35, depth: 0.23 }, scene!));
              post.position.set(side * 26, 0.675, bay * 12 + 4);
              post.material = materials.timber;
              shadows.addShadowCaster(post);
              if (bay < 10) {
                const beam = place(MeshBuilder.CreateBox(`${hole.id}-boundary-rail-${side}-${bay}`, { width: 0.12, height: 0.17, depth: 12 }, scene!));
                beam.position.set(side * 26, 0.98, bay * 12 + 10);
                beam.material = materials.brick;
              }
            }
          }

          for (let index = 0; index < 7; index += 1) {
            const hill = place(MeshBuilder.CreateCylinder(
              `${hole.id}-hill-${index}`,
              {
                height: 5 + (index % 3) * 2,
                diameterTop: 8 + (index % 2) * 3,
                diameterBottom: 15 + (index % 2) * 4,
                tessellation: 7,
              },
              scene!,
            ));
            hill.position.set(-43 + index * 14, 0.5, hole.courseLength + 23 + (index % 2) * 7);
            hill.material = index % 2 === 0 ? materials.rough : materials.fairwayB;
          }

          }

          if (hole.wind.x !== 0 || hole.wind.z !== 0) {
            for (let index = 0; index < 16; index += 1) {
              const mote = place(MeshBuilder.CreateSphere(
                `${hole.id}-dust-${index}`,
                { diameter: 0.1 + (index % 3) * 0.045, segments: 5 },
                scene!,
              ));
              const seed = index / 16;
              mote.position.set(-13 + (index % 8) * 3.7, 0.38 + (index % 4) * 0.18, 18 + seed * 66);
              mote.material = materials.amber;
              dustMotes.push({ mesh: mote, seed });
            }
          }
        };

        const disposeGhost = () => {
          ghostLine?.dispose();
          ghostLine = null;
          if (worldRef.current) worldRef.current.ghostLine = null;
        };

        const makeGhost = (memory: ShotMemory | undefined) => {
          disposeGhost();
          if (!memory || memory.points.length < 2 || memory.holeId !== HOLES[holeIndexRef.current].id) return;
          const attempts = compareRef.current ? [memory, ...(historyRef.current[memory.holeId] ?? []).filter(s => s.projectileId !== memory.projectileId)].slice(0,3) : [memory];
          const lines: Vector3[][] = [];
          const colors: Color4[][] = [];
          for (const shot of attempts) {
            const selected = shot.projectileId === memory.projectileId;
            const color = selected ? new Color4(1, .7, .35, .65) : new Color4(.28, .82, .86, .25);
            const addLine = (points: Vector3[]) => { lines.push(points); colors.push(points.map(() => color)); };
            if (shot.points.length > 1) addLine(shot.points.map(point => point.clone()));
            const kiss = shot.contacts.find(contact => contact.kind === 'first-kiss');
            if (kiss) {
              const { x, z } = kiss.point;
              addLine([new Vector3(x - .6, .35, z), new Vector3(x + .6, .35, z)]);
              addLine([new Vector3(x, .35, z - .6), new Vector3(x, .35, z + .6)]);
            }
          }
          ghostLine = MeshBuilder.CreateLineSystem(
            `ghost-${memory.holeId}-${memory.projectileId}`, { lines, colors }, scene!,
          );
          ghostLine.color = Color3.White();
          ghostLine.alpha = 1;
          ghostLine.isPickable = false;
          ghostLine.isVisible = ghostVisibleRef.current;
          if (worldRef.current) worldRef.current.ghostLine = ghostLine;
        };

        const disposeFlight = () => {
          if (!flight) return;
          flight.aggregate.dispose();
          flight.trail?.dispose();
          for (const mesh of flight.visual.getChildMeshes()) shadows.removeShadowCaster(mesh);
          flight.visual.dispose(false, false);
          flight.bodyMesh.dispose();
          flight = null;
          stopFlightTone();
        };

        const createTheatreRing = (position: Vector3, outcome: Outcome, kind?: EvidenceKind) => {
          const color = kind === "boost"
            ? new Color3(0.75, 0.2, 1)
            : outcome === "wet"
            ? new Color3(0.04, 0.55, 0.72)
            : outcome === "ace" || outcome === "double" || (lineLab && !HOLES[holeIndexRef.current].target && kind === "first-kiss")
              ? new Color3(0.09, 0.8, 0.86)
              : new Color3(1, 0.26, 0.025);
          const material = makeMaterial(`impact-${performance.now()}`, color, color.scale(0.85), 0.2);
          material.alpha = 0.78;
          const ring = MeshBuilder.CreateTorus(
            `impact-ring-${performance.now()}`,
            { diameter: 1.4, thickness: 0.12, tessellation: 36 },
            scene!,
          );
          ring.position.copyFrom(position);
          if (kind?.startsWith("bank")) {
            ring.rotation.z = Math.PI / 2;
            ring.rotation.y = ((HOLES[holeIndexRef.current].banks?.find(bank => bank.id === kind)?.yaw) ?? 0) * Math.PI / 180;
          }
          else if (kind === "breach") ring.rotation.x = Math.PI / 2;
          else if (!kind?.startsWith("step-") && !kind?.startsWith("floor-") && !kind?.startsWith("switch-") && kind !== "sky" && kind !== "mill") ring.position.y = Math.min(position.y, 0.42);
          ring.material = material;
          theatreFx.push({ mesh: ring, material, bornAt: performance.now(), lifetime: 760, growth: 10 });
          if (outcome === "double") {
            const secondMaterial = makeMaterial(
              `double-impact-${performance.now()}`,
              new Color3(1, 0.32, 0.04),
              new Color3(1, 0.16, 0.02),
              0.2,
            );
            secondMaterial.alpha = 0.72;
            const second = MeshBuilder.CreateTorus(
              `double-ring-${performance.now()}`,
              { diameter: 1.05, thickness: 0.1, tessellation: 36 },
              scene!,
            );
            second.position.copyFrom(position);
            second.position.y = 0.54;
            second.material = secondMaterial;
            theatreFx.push({ mesh: second, material: secondMaterial, bornAt: performance.now(), lifetime: 820, growth: 13 });
          }
        };

        const registerDeliveryRoute = (route: DeliveryRoute, at: Vector3) => {
          if (!flight || flight.locked || (!lineLab && HOLES[holeIndexRef.current].id !== 'mill-delivery') || flight.deliveryRoutes.has(route)) return;
          flight.deliveryRoutes.add(route);
          setDeliveryLive([...flight.deliveryRoutes]);
          if (route === 'sky' || route === 'mill') {
            flight.contacts.push({ id: `${flight.projectileId}-${route}`, kind: route, point: at.clone() });
            flight.points.push(at.clone());
            createTheatreRing(at, 'breach', route);
            if (route === 'sky') {
              skyToken?.setEnabled(false);
              tone(660, 990, .2, .05, 'triangle');
            } else { tone(180, 65, .2, .08, 'triangle'); noise(.1, .035); }
          }
        };

        const registerMechanism = (tag: MechanismTag, at: Vector3) => {
          if (!flight || flight.locked || flight.mechanismTags.has(tag)) return false;
          flight.mechanismTags.add(tag);
          if (tag === 'boost') registerDeliveryRoute('skip', at);
          flight.points.push(at.clone());
          flight.contacts.push({
            id: `${flight.projectileId}-${tag}-${flight.contacts.length}`,
            kind: tag,
            point: at.clone(),
          });
          if (tag === "breach") {
            flight.breached = true;
            setMechanismInFlight("BREACH");
          } else {
            setMechanismInFlight(tag.startsWith("step-") ? [...flight.mechanismTags].filter(t => t.startsWith("step-")).map(evidenceLabel).join(" → ") : evidenceLabel(tag));
          }
          impactFocus.copyFrom(at);
          if (tag.startsWith("bank") || tag.startsWith("step-") || tag.startsWith("floor-")) {
            tone(180, 65, 0.2, 0.13, "triangle");
            tone(390, 170, 0.13, 0.04, "sine", 0.018);
            noise(0.11, 0.055);
          } else if (tag.startsWith("switch-")) {
            tone(420, 660, .12, .065, "triangle");
          } else if (tag === "boost") {
            tone(140, 720, 0.3, 0.075, "sine");
            tone(280, 1100, 0.24, 0.035, "triangle", 0.025);
          } else {
            playBreach();
          }
          createTheatreRing(at, "breach", tag);
          return true;
        };

        const triggerBreach = (at: Vector3) => {
          if (!registerMechanism("breach", at)) return false;
          let relaunched = false;
          const hole = HOLES[holeIndexRef.current];
          if (flight && hole.breachRecoveryY !== null) {
            const velocity = flight.aggregate.body.getLinearVelocity();
            const verticalImpulse = verticalRecoveryImpulse(velocity.y, hole.breachRecoveryY);
            if (verticalImpulse > 0) {
              relaunched = true;
              flight.aggregate.body.applyImpulse(
                new Vector3(0, verticalImpulse, 0),
                flight.bodyMesh.position,
              );
            }
          }
          for (const item of breachBodies) {
            const away = item.mesh.position.subtract(at);
            away.y = Math.max(0.45, away.y + 0.9);
            if (away.lengthSquared() < 0.04) away.set(0.2, 1, 0.1);
            away.normalize();
            const impulse = away.scale(1.6 + stableUnitInterval(item.mesh.name) * 1.7);
            item.aggregate.body.applyImpulse(impulse, item.mesh.absolutePosition);
          }
          return relaunched;
        };

        const persistRecords = (next: ProgressRecords) => {
          recordsRef.current = next;
          setRecords(next);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            // Progress is a convenience; a blocked storage area must not block play.
          }
        };

        const captionClaims = () => {
          if(!lineLab||!flight)return;
          const receipt=scoreLine(flight.ledger);setLiveLineTotal(receipt.total);
          const fresh=receipt.awards.filter(a=>!flight!.captioned.has(a.id));
          if(fresh.length){fresh.forEach(a=>flight!.captioned.add(a.id));const captions=fresh.map(a=>`+${a.points} · ${a.label}`);const extra=receipt.secondary-flight.captionedVariety;if(extra>0)captions.push(`+${extra} · VARIETY`);flight.captionedVariety=receipt.secondary;setClaimCaption({text:captions.join(' · '),serial:Date.now()});}
        };
        const rememberFlight = (receipt: string, outcome: Outcome | null = null): ShotMemory => {
          const current = flight!;
          if(lineLab){if(!current.ledger.some(e=>e.kind==='termination'))appendLineEvidence(current.ledger,{kind:'termination',reason:'retry-interrupted'});current.redirectTracker.finish();for(const e of current.redirectTracker.drainDiagnostics())appendLineEvidence(current.ledger,e);}
          if(lineLab){captionClaims();setLineLedger(current.ledger.map(e=>({...e})));setSessionBest(best=>({...best,[HOLES[holeIndexRef.current].id]:Math.max(best[HOLES[holeIndexRef.current].id]??0,scoreLine(current.ledger).total)}));}
          const hole = HOLES[holeIndexRef.current];
          const memory: ShotMemory = {
            ...current.setup,
            ...(courtyardDiverter ? {build:BUILD_ID} : {}),
            ...(lineLab ? {ledger:current.ledger.map(e=>({...e})),lineReceipt:recordLineReceipt(current.ledger)} : {}),
            ...(diverterLab ? {environment:current.environment!,environmentAfter:{floor:floorStateRef.current}} : {}), holeId: hole.id, windId: hole.wind.id, stationId: hole.station?.id ?? "gate", outcome,
            projectileId: current.projectileId, receipt,
            points: current.points.map(point => point.clone()),
            contacts: current.contacts.map(contact => ({ ...contact, point: contact.point.clone() })),
          };
          memoriesRef.current[hole.id] = memory;
          historyRef.current[hole.id] = rememberAttempt(historyRef.current[hole.id] ?? [], memory);
          setHistory(historyRef.current[hole.id]); setLastShot(memory);
          libraryRef.current[hole.id] = collectLine(libraryRef.current[hole.id], memory);
          setWinningLines(libraryRef.current[hole.id].wins);
          try {
            const holes = Object.fromEntries(Object.entries(libraryRef.current).map(([id,shelf]) => [id, {
              recent:shelf.recent.map(packLine), wins:shelf.wins.map(packLine),
            }]));
            window.localStorage.setItem(libraryKey, JSON.stringify({version:1, holes}));
          } catch { /* A full or blocked storage area must not interrupt a shot. */ }
          return memory;
        };

        const lockRuling = (outcome: Outcome, at: Vector3, contactKind?: EvidenceKind, safetyReason?:string) => {
          if (!flight || flight.locked) return;
          const hole = HOLES[holeIndexRef.current];
          flight.locked = true;
          flight.lockedAt = performance.now();
          impactFocus.copyFrom(at);
          flight.points.push(at.clone());
          flight.trail?.dispose();
          flight.trail = MeshBuilder.CreateLines(`ruled-trail-${flight.projectileId}`, { points: flight.points }, scene!);
          flight.trail.color = new Color3(1, 0.48, 0.17);
          flight.trail.alpha = 0.8;
          flight.trail.isPickable = false;
          if (contactKind) {
            flight.contacts.push({
              id: `${flight.projectileId}-${contactKind}-${flight.contacts.length}`,
              kind: contactKind,
              point: at.clone(),
            });
          }
          if(lineLab)appendLineEvidence(flight.ledger,{kind:'termination',reason:safetyReason ?? (contactKind==='first-kiss'?'ground-contact':outcome)});
          if(lineLab) appendLineEvidence(flight.ledger,{kind:'ruling',targetHit:outcome==='ace'||outcome==='double',surface:hole.target?.id ?? 'ground',label:hole.target?.label.toUpperCase() ?? 'LINE ENDED'});
          const receipt = !hole.target ? (safetyReason ?? (contactKind==='first-kiss'?'ground contact':outcome==='oob'?'out of bounds':outcome)).replaceAll('-',' ').toUpperCase() : contactKind === 'first-kiss' ? (diverterLab ? ((outcome === 'ace'||outcome==='double') ? `First physical contact on ${hole.target.label}.` : `First physical contact off ${hole.target.label}.`) : landingReceipt({...hole,target:hole.target}, at)) : safetyReason ? safetyReason.replaceAll('-',' ').toUpperCase() : outcome.toUpperCase();
          rememberFlight(`${[...flight.mechanismTags].map(evidenceLabel).join(" → ")}${flight.mechanismTags.size ? " → " : ""}${receipt}`, safetyReason||!hole.target?null:outcome);
          const tags = [...flight.mechanismTags];
          const shotResult = hole.target ? resultCopy({...hole,target:hole.target}, outcome, at.clone(), tags) : {outcome,headline:'LINE BANKED',detail:`${receipt}. No roost required.`,point:at.clone(),clear:false};
          if (diverterLab && !lineLab) shotResult.detail = (tags.map(evidenceLabel).join(' → ') || 'CARRY') + ' · FLOOR ' + flight.environment!.floor + ' → ' + floorStateRef.current + '. ' + receipt;
          if(safetyReason){shotResult.headline=safetyReason==='dead-ball'?'SHOT SETTLED':'SAFETY STOP';shotResult.detail=`${receipt}. Established line claims retained; no target finish awarded.`;shotResult.clear=false;}
          if (!lineLab && hole.id === 'mill-delivery') {
            const earned = earnedDeliveryRoutes(shotResult.clear, [...flight.deliveryRoutes], flight.touchedSolid, tags);
            if (earned.length) {
              const book = { ...deliveryBookRef.current };
              const fresh = earned.filter(id => !book[id]);
              for (const id of earned) book[id] = { ...flight.setup };
              deliveryBookRef.current = book; setDeliveryBook(book);
              try { window.localStorage.setItem(DELIVERY_BOOK_KEY, JSON.stringify(book)); } catch { /* Local storage is optional. */ }
              shotResult.detail += ` ${earned.map(id => id.toUpperCase()).join(' + ')} route ${fresh.length ? 'collected' : 'repeated'}. ${Object.keys(book).length}/4 routes. Winning line saved.`;
              if (Object.keys(book).length === 4 && fresh.length) shotResult.headline = 'YARD EXPLORER';
            } else if (flight.deliveryRoutes.size) {
              shotResult.detail += ` ${[...flight.deliveryRoutes].join(' + ').toUpperCase()} reached. Land on the bell in this shot to collect the route.`;
            }
          }
          if (contactKind === 'first-kiss') shotResult.detail += ` ${receipt}`;
          flight.pendingResult = shotResult;
          const next = {
            ...recordsRef.current,
            [hole.id]: safetyReason||!hole.target?interruptedRecord(recordsRef.current[hole.id]):mergeHoleRecord(recordsRef.current[hole.id], outcome),
          };
          persistRecords(next);
          createTheatreRing(at, outcome, contactKind);
          if (contactKind === 'first-kiss') {
            const footprintMaterial = makeMaterial(`kiss-footprint-${flight.projectileId}`, new Color3(1, .9, .65), new Color3(.5, .4, .15), .2);
            const footprint = MeshBuilder.CreateTorus(`kiss-footprint-${flight.projectileId}`, { diameter: RAIL_RULES.projectileRadius * 2, thickness: .05, tessellation: 32 }, scene!);
            footprint.position.set(at.x, .35, at.z); footprint.material = footprintMaterial;
            theatreFx.push({ mesh: footprint, material: footprintMaterial, bornAt: performance.now(), lifetime: 600000, growth: 0 });
          }
          stopFlightTone();
          if (outcome === "wet") {
            noise(.65, .1); tone(210, 52, .65, .07);
          } else {
            tone(110, 45, .18, .075, "triangle"); noise(.14, .045);
          }
          setCharge(0);
          chargeRef.current = 0;
          setGamePhase("theatre");
        };

        const updateSetup = (setup: AimSetup) => {
          yawRef.current = clampYaw(setup.yaw);
          elevationRef.current = clampElevation(setup.elevation);
          railRef.current = Math.round(clamp(setup.railIndex, 0, RAIL_RULES.railPositions.length - 1));
          setYaw(yawRef.current);
          setElevation(elevationRef.current);
          setRailIndex(railRef.current);
          updateLauncher();
        };

        const loadHole = (index: number, restore = false) => {
          if (!holeUnlocked(index)) return;
          if(lineLab)floorStateRef.current=floorForAction(floorStateRef.current,'card');
          setClaimCaption(null);
          disposeFlight();
          disposeGhost();
          for (const effect of theatreFx) { effect.mesh.dispose(); effect.material.dispose(); }
          theatreFx = [];
          const hole = HOLES[index];
          holeIndexRef.current = index;
          stationHoleRef.current[hole.station?.id ?? "gate"] = index;
          setHoleIndex(index);
          setResult(null);
          setMechanismInFlight(null);
          setDeliveryLive([]);
          setRecalledPower(null);
          setRetryNotice("");
          setSurvey(false);
          surveyRef.current = false;
          chargeRef.current = 0;
          setCharge(0);
          const memory = memoriesRef.current[hole.id];
          setHistory(historyRef.current[hole.id] ?? []);
          setWinningLines(libraryRef.current[hole.id]?.wins ?? []);
          if (restore && memory) {
            setRecalledPower(memory.charge); selectedPowerRef.current = memory.charge; setSelectedPower(memory.charge);
          }
          const setup = resolveOpeningAddress(hole, addressLabRef.current, { restore, memory });
          updateSetup(setup);
          createCourse(hole);
          updateLauncher();
          makeGhost(memory);
          setLastShot(memory ?? null);
          if(lineLab){setLineLedger(memory?.ledger ?? []);setLiveLineTotal(scoreLine(memory?.ledger ?? []).total);}
          impactFocus.set(hole.target?.x ?? hole.survey.targetX, 0.5, hole.target?.z ?? hole.survey.targetZ);
          setGamePhase("ready");
        };

        const beginCharge = () => {
          if (phaseRef.current !== "ready") return;
          setRetryNotice("");
          chargeStartedAt = performance.now();
          chargeRef.current = 0;
          setCharge(0);
          startChargeTone();
          tone(54, 92, 0.16, 0.025, "triangle");
          setGamePhase("charging");
        };

        const cancelCharge = () => {
          if (phaseRef.current !== "charging") return;
          stopChargeTone();
          chargePointerRef.current = null;
          chargeRef.current = 0;
          setCharge(0);
          setGamePhase("ready");
        };

        const fire = () => {
          if (phaseRef.current !== "charging") return;
          stopChargeTone();
          const setup: ShotSetup = {
            yaw: yawRef.current,
            elevation: elevationRef.current,
            railIndex: railRef.current,
            charge: launchCharge(powerModeRef.current, selectedPowerRef.current, performance.now() - chargeStartedAt),
          };
          const direction = getAimDirection();
          const muzzle = getMuzzle();
          followDirection = getHorizontalDirection();
          const bodyMesh = MeshBuilder.CreateSphere(
            `round-body-${projectileCounter + 1}`,
            { diameter: RAIL_RULES.projectileRadius * 2, segments: 12 },
            scene!,
          );
          bodyMesh.position.copyFrom(muzzle);
          bodyMesh.isVisible = false;
          const aggregate = new PhysicsAggregate(
            bodyMesh,
            PhysicsShapeType.SPHERE,
            {
              mass: RAIL_RULES.projectileMass,
              friction: 0.28,
              restitution: 0.38,
            },
            scene!,
          );

          const visual = new TransformNode(`round-visual-${projectileCounter + 1}`, scene!);
          visual.position.copyFrom(muzzle);
          const shell = MeshBuilder.CreateCylinder(
            `round-shell-${projectileCounter + 1}`,
            { height: 1.7, diameter: 0.63, tessellation: 18 },
            scene!,
          );
          shell.parent = visual;
          shell.rotation.x = Math.PI / 2;
          shell.material = materials.steel;
          shadows.addShadowCaster(shell);
          const nose = MeshBuilder.CreateCylinder(
            `round-nose-${projectileCounter + 1}`,
            { height: 0.58, diameterTop: 0, diameterBottom: 0.63, tessellation: 18 },
            scene!,
          );
          nose.parent = visual;
          nose.position.z = 1.12;
          nose.rotation.x = Math.PI / 2;
          nose.material = materials.amber;
          const band = MeshBuilder.CreateTorus(
            `round-band-${projectileCounter + 1}`,
            { diameter: 0.69, thickness: 0.08, tessellation: 22 },
            scene!,
          );
          band.parent = visual;
          band.position.z = -0.56;
          band.rotation.x = Math.PI / 2;
          band.material = materials.cyan;

          projectileCounter += 1;
          labLanding = null;
          if(lineLab){setLineLedger([]);setLiveLineTotal(0);setClaimCaption(null);}
          flight = {
            ledger:[],redirectTracker:createRedirectTracker(),sawMillTracker:createSawMillTracker(),captioned:new Set(),captionedVariety:0,lifecycle:createLineLifecycle(),
            ...(diverterLab ? {environment:{floor:floorStateRef.current}} : {}),
            aggregate,
            bodyMesh,
            visual,
            points: [muzzle.clone()],
            trail: null,
            previousPhysicsPosition: muzzle.clone(),
            physicsElapsed: 0,
            launchedAt: performance.now(),
            lastTrailSampleAt: performance.now(),
            setup,
            projectileId: projectileCounter,
            breached: false,
            mechanismTags: new Set<MechanismTag>(),
            deliveryRoutes: new Set<DeliveryRoute>(),
            touchedSolid: false,
            contacts: [],
            locked: false,
            lockedAt: 0,
            pendingResult: null,
          };
          aggregate.body.setCollisionCallbackEnabled(true);
          aggregate.body.getCollisionObservable().add(event => {
            if (!flight || flight.aggregate !== aggregate || flight.locked) return;
            flight.touchedSolid = true;
            const other = event.collider === aggregate.body ? event.collidedAgainst : event.collider;
            if (diverterHandles) {
              if (labLanding) return;
              const contact = diverterHandles.contact(other, event.point, flight.projectileId);
              if(lineLab){
                recordLineContact(flight.ledger,other.transformNode,event.point,contact);
                if(event.point){flight.redirectTracker.contact(redirectFeature(other.transformNode,event.point),other.transformNode.name,event.point);flight.sawMillTracker.contact(redirectFeature(other.transformNode,event.point),other.transformNode.name,event.point);}
              }
              if (contact?.kind === 'landing') labLanding = contact;
              else if (contact) registerMechanism(contact.kind, contact.point);
              if (!courtyardDiverter) return;
            }
            if (courtyardDiverter && other.transformNode.metadata?.yardBank && event.point) registerMechanism(other.transformNode.metadata.yardBank, event.point);
            const step = cascadeContactTag(other.transformNode.metadata?.cascadeStep, event.point);
            if (step) registerMechanism(step, (event.point ?? bodyMesh.position).clone());
            if (other.transformNode.metadata?.deliveryRoute === 'mill') {
              const point = (event.point ?? bodyMesh.position).clone();
              if (HOLES[holeIndexRef.current].id === 'mill-delivery') registerDeliveryRoute('mill', point);
              else if (!flight.contacts.some(c => c.kind === 'mill')) flight.contacts.push({id:`${flight.projectileId}-mill`, kind:'mill', point});
            }
          });
          setResult(null);
          setMechanismInFlight(null);
          setDeliveryLive([]);
          setRecalledPower(null);
          setSurvey(false);
          surveyRef.current = false;
          playLaunch(setup.charge);
          startFlightTone();
          aggregate.body.applyImpulse(
            direction.scale(chargeToSpeed(setup.charge) * RAIL_RULES.projectileMass),
            bodyMesh.position,
          );
          setGamePhase("flight");
        };

        const retry = () => {
          const phase = phaseRef.current;
          if (!['ready', 'charging', 'flight', 'theatre', 'result'].includes(phase)) return;
          let interrupted = false;
          if (flight && !flight.locked) {
            flight.points.push(flight.bodyMesh.position.clone());
            rememberFlight('Interrupted · no landing ruling');
            const id = HOLES[holeIndexRef.current].id;
            persistRecords({ ...recordsRef.current, [id]: interruptedRecord(recordsRef.current[id]) });
            interrupted = true;
          }
          cancelCharge(); chargePointerRef.current = null;
          if (diverterLab) floorStateRef.current = floorForAction(floorStateRef.current, 'retry');
          loadHole(holeIndexRef.current, true);
          // A retry is immediate; do not spend another second flying the camera home.
          const direction = getHorizontalDirection();
          const rail = stationRailPosition(railRef.current, HOLES[holeIndexRef.current].station);
          const origin = new Vector3(rail.x, .4, rail.z);
          camera.position.copyFrom(origin.subtract(direction.scale(15)).add(new Vector3(0, 7.4, 0)));
          cameraTarget.copyFrom(origin.add(direction.scale(34)).add(new Vector3(0, 3.2, 0)));
          camera.setTarget(cameraTarget);
          setRetryNotice((diverterLab && !lineLab ? 'FLOOR ' + floorStateRef.current + ' preserved. ' : '') + (interrupted ? 'Shot interrupted. Aim and power remembered; no landing awarded.' : 'Last setup restored. Adjust and fire when ready.'));
        };

        const resetRound = (restore = false) => {
          if (diverterLab) {
            if (phaseRef.current === 'booting' || phaseRef.current === 'error') return;
            retry(); floorStateRef.current = floorForAction(floorStateRef.current, 'reset');
            setFloorState(floorStateRef.current); loadHole(lineLab?holeIndexRef.current:0, false);
            setRetryNotice(lineLab?'Card reset. Saved lines kept.':'Card reset. FLOOR A restored. Saved lines kept.'); return;
          }
          if (phaseRef.current !== "ready" && phaseRef.current !== "result") return;
          loadHole(holeIndexRef.current, restore);
        };

        const nudgeYaw = (amount: number) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          yawRef.current = clampYaw(yawRef.current + amount);
          setYaw(yawRef.current);
          updateLauncher();
        };

        const nudgeElevation = (amount: number) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          elevationRef.current = clampElevation(elevationRef.current + amount);
          setElevation(elevationRef.current);
          updateLauncher();
        };

        const moveRail = (direction: number) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          railRef.current = shiftRail(railRef.current, direction);
          setRailIndex(railRef.current);
          updateLauncher();
        };

        const restoreLine = () => {
          if (phaseRef.current !== "ready") return;
          const memory = memoriesRef.current[HOLES[holeIndexRef.current].id];
          if (!memory) return;
          if (diverterLab) {
            floorStateRef.current = floorForAction(floorStateRef.current, 'recall', memory.environment);
            diverterHandles?.setState(floorStateRef.current); setFloorState(floorStateRef.current);
            setRetryNotice(lineLab?'Recall restored aim and power. Recorded dock state is inactive in this score yard.':'Recall restored FLOOR ' + floorStateRef.current + ', aim and power marker.');
          }
          updateSetup(memory);
          setRecalledPower(memory.charge); selectedPowerRef.current = memory.charge; setSelectedPower(memory.charge);
        };

        const recallAttempt = (id: number) => {
          if (phaseRef.current !== 'ready' && phaseRef.current !== 'result') return;
          const holeId = HOLES[holeIndexRef.current].id;
          const memory = [...(historyRef.current[holeId] ?? []), ...(libraryRef.current[holeId]?.wins ?? [])].find(item => item.projectileId === id);
          if (!memory) return;
          memoriesRef.current[holeId] = memory;
          if (diverterLab) {
            floorStateRef.current = floorForAction(floorStateRef.current, 'recall', memory.environment);
            setFloorState(floorStateRef.current);
          }
          loadHole(holeIndexRef.current, true);
          if (diverterLab) setRetryNotice(lineLab?'Recall restored aim and power. Recorded dock state is inactive in this score yard.':'Recall restored FLOOR ' + floorStateRef.current + ', aim and power marker.');
        };

        const toggleSurvey = () => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          surveyRef.current = !surveyRef.current;
          setSurvey(surveyRef.current);
        };

        const selectHole = (index: number) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "result") return;
          loadHole(index, false);
        };

        const nextHole = () => {
          if (phaseRef.current !== "result" && phaseRef.current !== "ready") return;
          const next = Math.min(HOLES.length - 1, holeIndexRef.current + 1);
          if (next === holeIndexRef.current) {
            loadHole(0, false);
            return;
          }
          loadHole(next, false);
        };

        const recallRoute = (id: DeliveryRoute) => {
          if (!courtyard || (phaseRef.current !== 'ready' && phaseRef.current !== 'result')) return;
          const setup = deliveryBookRef.current[id];
          if (!setup) return;
          loadHole(0); updateSetup(setup); disposeGhost(); setLastShot(null);
          setRecalledPower(setup.charge); selectedPowerRef.current = setup.charge; setSelectedPower(setup.charge);
        };

        actionsRef.current = {
          selectStation: (id) => {
            if (phaseRef.current !== "ready" && phaseRef.current !== "result") return;
            const index = stationHoleRef.current[id];
            if (index !== undefined) loadHole(index, true);
          },
          retry, recallAttempt,
          compareAttempts: () => makeGhost(memoriesRef.current[HOLES[holeIndexRef.current].id]),
          recallRoute,
          beginCharge,
          release: fire,
          cancelCharge,
          reset: resetRound,
          shiftRail: moveRail,
          nudgeYaw,
          nudgeElevation,
          restoreLine,
          toggleSurvey,
          selectHole,
          nextHole,
        };

        const onPointerDown = (event: PointerEvent) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          if (dragPointer !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
          event.preventDefault();
          dragPointer = event.pointerId;
          dragX = event.clientX;
          dragY = event.clientY;
          try {
            canvas.setPointerCapture(event.pointerId);
          } catch {
            // Drag remains available while the pointer stays over the canvas.
          }
        };

        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerId !== dragPointer) return;
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          event.preventDefault();
          const sensitivity = event.pointerType === "touch" ? 0.11 : 0.075;
          const dx = event.clientX - dragX;
          const dy = event.clientY - dragY;
          dragX = event.clientX;
          dragY = event.clientY;
          yawRef.current = clampYaw(yawRef.current + dx * sensitivity);
          elevationRef.current = clampElevation(elevationRef.current - dy * sensitivity);
          setYaw(yawRef.current);
          setElevation(elevationRef.current);
          updateLauncher();
        };

        const onPointerUp = (event: PointerEvent) => {
          if (event.pointerId === dragPointer) dragPointer = null;
        };

        const clearAimDrag = () => { dragPointer = null; };
        window.addEventListener("blur", clearAimDrag);
        const preventContext = (event: MouseEvent) => event.preventDefault();
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("lostpointercapture", onPointerUp);
        canvas.addEventListener("contextmenu", preventContext);

        scene.onBeforePhysicsObservable.add(() => {
          if (!flight || flight.locked || phaseRef.current !== "flight") return;
          if(lineLab){flight.redirectTracker.beginStep(flight.aggregate.body.getLinearVelocity(),flight.physicsElapsed);flight.sawMillTracker.beginStep(flight.aggregate.body.getLinearVelocity(),flight.physicsElapsed);}
          const hole = HOLES[holeIndexRef.current];
          if (hole.wind.x === 0 && hole.wind.z === 0) return;
          const force = new Vector3(
            hole.wind.x * RAIL_RULES.projectileMass,
            0,
            hole.wind.z * RAIL_RULES.projectileMass,
          );
          flight.aggregate.body.applyForce(force, flight.bodyMesh.position);
        });

        scene.onAfterPhysicsObservable.add(() => {
          if (!flight || flight.locked || phaseRef.current !== "flight") return;
          flight.physicsElapsed += 1 / 120;
          const hole = HOLES[holeIndexRef.current];
          const previous = flight.previousPhysicsPosition;
          const current = flight.bodyMesh.position.clone();
          if(lineLab){
            const redirect=flight.redirectTracker.endStep(current,flight.aggregate.body.getLinearVelocity(),flight.physicsElapsed);
            if(redirect)appendLineEvidence(flight.ledger,redirect);
            const relationship=flight.sawMillTracker.endStep(current,flight.aggregate.body.getLinearVelocity(),flight.physicsElapsed);if(relationship)appendLineEvidence(flight.ledger,relationship);
            for(const e of flight.redirectTracker.drainDiagnostics())appendLineEvidence(flight.ledger,e);
          }
          if (diverterHandles) {
            const changed = diverterHandles.flush();
            if (changed) { floorStateRef.current = changed; setFloorState(changed); }
            if (labLanding) {
              const contact = labLanding; labLanding = null;
              const point = contact.point.add(new Vector3(0, RAIL_RULES.projectileRadius, 0));
              lockRuling(hole.target ? classifyChallengeRuling({hole:{...hole,target:hole.target},targetHit:contact.targetHit === true,tags:[...flight.mechanismTags]}) : 'miss', point, 'first-kiss');
            } else if(lineLab){
              const end=flight.lifecycle.step(current,flight.aggregate.body.getLinearVelocity(),flight.physicsElapsed);
              if(end)lockRuling(end==='oob'?'oob':'miss',end==='invalid-physics'?previous:current,undefined,end==='oob'?undefined:end);
            } else if (Math.abs(current.x)>(courtyardDiverter ? 50 : 32) || current.z>(courtyardDiverter ? 198 : 124) || current.z< -15 || current.y< -8 || flight.physicsElapsed>13) {
              lockRuling('oob',current);
            }
            if (!courtyardDiverter) {
              if (flight && !flight.locked) flight.previousPhysicsPosition.copyFrom(current);
              return;
            }
            if (flight.locked) return;
          }
          const previousLike = { x: previous.x, y: previous.y, z: previous.z };
          const currentLike = { x: current.x, y: current.y, z: current.z };
          const events = (lineLab?collectLineStepEvents:collectDeliveryStepEvents)(previousLike, currentLike, hole, [...flight.mechanismTags], [...flight.deliveryRoutes]);
          for (const event of events) {
            if (courtyardDiverter && (event.kind === "first-kiss" || event.kind.startsWith("bank"))) continue;
            const point = new Vector3(event.point.x, event.point.y, event.point.z);
            if (event.kind === "sky") { if(lineLab) appendLineEvidence(flight.ledger,{kind:'token',surface:'sky',point:{...event.point}}); registerDeliveryRoute("sky", point); continue; }
            if (event.kind === "wet") {
              lockRuling("wet", point, "wet");
              break;
            }
            if (event.kind === "first-kiss" && hole.target) {
              const outcome = classifyChallengeRuling({ hole:{...hole,target:hole.target}, targetHit: isAceLanding({...hole,target:hole.target}, event.point), tags: [...flight.mechanismTags] });
              lockRuling(outcome, point, "first-kiss");
              break;
            }
            if (event.kind === "bank" || event.kind === "bank-a" || event.kind === "bank-b") {
              registerMechanism(event.kind, point);
            } else if (event.kind === "boost") {
              const velocity = flight.aggregate.body.getLinearVelocity();
              if (velocity.y < 0 && registerMechanism("boost", point)) {
                if(lineLab) appendLineEvidence(flight.ledger,{kind:'pad-activation',surface:'skip-pad',point:{...event.point}});
                const kick = padImpulse(velocity, hole);
                flight.aggregate.body.applyImpulse(
                  new Vector3(kick.x, kick.y, kick.z),
                  flight.bodyMesh.position,
                );
                break;
              }
            } else if (triggerBreach(point)) {
              break;
            }
          }

          captionClaims();
          if (!flight.locked && !lineLab && hole.target) {
            const outOfBounds =
              Math.abs(current.x) > (hole.courseWidth ? hole.courseWidth / 2 : 45) ||
              current.z > hole.courseLength + 24 ||
              current.z < -15 ||
              current.y < -8 ||
              flight.physicsElapsed > 13;
            if (outOfBounds) {
              lockRuling(
                classifyChallengeRuling({
                  hole:{...hole,target:hole.target},
                  targetHit: false,
                  tags: [...flight.mechanismTags],
                  outOfBounds: true,
                }),
                current,
              );
            }
          }

          if (flight && !flight.locked) flight.previousPhysicsPosition.copyFrom(current);
        });

        if (courtyard && !lineLab) {
          try {
            const book = readDeliveryBook(readStoredJson(DELIVERY_BOOK_KEY), readStoredJson(LEGACY_DELIVERY_BOOK_KEY));
            deliveryBookRef.current = book; setDeliveryBook(book);
            try { window.localStorage.setItem(DELIVERY_BOOK_KEY, JSON.stringify(book)); } catch { /* Read-only saves still work. */ }
          } catch { /* Start an empty route book if browser storage is unavailable. */ }
        }
        try {
          const loaded = normalizeShotLibrary(readStoredJson(libraryKey), HOLES, {environmentRequired:diverterLab});
          const hydrate = (line: SavedLine): ShotMemory => ({...line,
            points:line.points.map(p => new Vector3(p.x,p.y,p.z)),
            contacts:line.contacts.map(c => ({...c, point:new Vector3(c.point.x,c.point.y,c.point.z)})),
          });
          for (const [id,shelf] of Object.entries(loaded)) {
            const recent = shelf.recent.map(hydrate), wins = shelf.wins.map(hydrate);
            libraryRef.current[id] = {recent,wins}; historyRef.current[id] = recent;
            memoriesRef.current[id] = recent[0] ?? wins[0];
            for (const line of [...recent,...wins]) projectileCounter = Math.max(projectileCounter,line.projectileId);
          }
        } catch { /* Malformed or unavailable storage starts an empty collection. */ }
        const saved = loadProgress(HOLES, STORAGE_KEY);
        recordsRef.current = saved;
        setRecords(saved);
        const resumeIndex = chooseResumeHole(saved, HOLES);
        const startIndex = sharedStart ? Math.max(0,HOLES.findIndex(h=>h.id===sharedStart!.card)) : resolveSessionStartHoleIndex(addressLabRef.current, resumeIndex);
        const startHole = HOLES[startIndex];
        createCourse(startHole);
        holeIndexRef.current = startIndex;
        setHoleIndex(startIndex);
        updateSetup(sharedStart?.setup ?? resolveOpeningAddress(startHole, addressLabRef.current));
        if(sharedStart){powerModeRef.current="set";setPowerMode("set");selectedPowerRef.current=sharedStart.setup.charge;setSelectedPower(sharedStart.setup.charge);setRecalledPower(sharedStart.setup.charge);}
        impactFocus.set(startHole.target?.x ?? startHole.survey.targetX, 0.5, startHole.target?.z ?? startHole.survey.targetZ);
        const remembered = memoriesRef.current[startHole.id];
        setHistory(historyRef.current[startHole.id] ?? []);
        setWinningLines(libraryRef.current[startHole.id]?.wins ?? []);
        setLastShot(remembered ?? null); makeGhost(remembered);
        if(lineLab){setLineLedger(remembered?.ledger ?? []);setLiveLineTotal(scoreLine(remembered?.ledger ?? []).total);}

        engine.runRenderLoop(() => {
          if (!scene || disposed) return;
          const now = performance.now();
          const deltaSeconds = Math.min(0.04, engine!.getDeltaTime() / 1000);

          if (mutedRef.current) {
            stopChargeTone();
            stopFlightTone();
          }

          if (phaseRef.current === "charging") {
            const nextCharge = launchCharge(powerModeRef.current, selectedPowerRef.current, now - chargeStartedAt);
            chargeRef.current = nextCharge;
            if (chargeTone && audioContext) {
              chargeTone.oscillator.frequency.setTargetAtTime(62 + nextCharge * 330, audioContext.currentTime, 0.025);
              chargeTone.gain.gain.setTargetAtTime(0.022 + nextCharge * 0.035, audioContext.currentTime, 0.025);
            }
            if (now - lastRenderUiAt > 24) {
              setCharge(nextCharge);
              lastRenderUiAt = now;
            }
          }

          const recoilAge = flight ? (now - flight.launchedAt) / 1000 : 10;
          const recoil = recoilAge < 0.5 ? Math.sin(Math.min(1, recoilAge / 0.075) * Math.PI / 2) * Math.exp(-recoilAge * 10) : 0;
          elevationPivot.position.z = -recoil * 0.48;
          elevationPivot.position.y = -recoil * 0.055;
          const hole = HOLES[holeIndexRef.current];
          const stationRail = stationRailPosition(railRef.current, hole.station);
          const launcherPosition = new Vector3(stationRail.x, 0.4, stationRail.z);
          const horizontalAim = getHorizontalDirection();
          const addressPosition = launcherPosition.subtract(horizontalAim.scale(15)).add(new Vector3(0, 7.4, 0));
          const addressTarget = launcherPosition.add(horizontalAim.scale(34)).add(new Vector3(0, 3.2, 0));
          let desiredCameraPosition = addressPosition;
          let desiredCameraTarget = addressTarget;

          if (surveyRef.current && (phaseRef.current === "ready" || phaseRef.current === "charging")) {
            desiredCameraPosition = new Vector3(hole.survey.x, hole.survey.y, hole.survey.z);
            desiredCameraTarget = new Vector3(
              hole.survey.targetX,
              hole.survey.targetY,
              hole.survey.targetZ,
            );
          }

          if (flight) {
            const position = flight.locked && flight.pendingResult ? flight.pendingResult.point : flight.bodyMesh.position;
            const velocity = flight.aggregate.body.getLinearVelocity();
            flight.visual.position.copyFrom(position);
            if (!flight.locked && velocity.lengthSquared() > 0.02) {
              const horizontalSpeed = Math.max(0.001, Math.hypot(velocity.x, velocity.z));
              flight.visual.rotation.y = Math.atan2(velocity.x, velocity.z);
              flight.visual.rotation.x = -Math.atan2(velocity.y, horizontalSpeed);
            }

            if (flightTone && audioContext && !flight.locked) {
              flightTone.oscillator.frequency.setTargetAtTime(
                72 + Math.min(180, velocity.length() * 2.7),
                audioContext.currentTime,
                0.04,
              );
            }

            if (!flight.locked && now - flight.lastTrailSampleAt > 42) {
              flight.points.push(position.clone());
              flight.lastTrailSampleAt = now;
              if (flight.points.length % 3 === 0) {
                flight.trail?.dispose();
                flight.trail = MeshBuilder.CreateLines(
                  `live-trail-${flight.projectileId}`,
                  { points: flight.points },
                  scene,
                );
                flight.trail.color = new Color3(1, 0.26, 0.025);
                flight.trail.alpha = 0.72;
                flight.trail.isPickable = false;
              }
            }

            const age = now - flight.launchedAt;
            if (!flight.locked) {
              const horizontalVelocity = new Vector3(velocity.x, 0, velocity.z);
              const travelDirection = horizontalVelocity.lengthSquared() > 0.01
                ? horizontalVelocity.normalize()
                : horizontalAim;
              followDirection = Vector3.Lerp(followDirection, travelDirection, 1 - Math.exp(-deltaSeconds * 5)).normalize();
              let followTarget = position.add(followDirection.scale(7)).add(new Vector3(0, 1.2, 0));
              let followPosition = position.subtract(followDirection.scale(12)).add(new Vector3(0, 5.5, 0));
              const destinationDistance = hole.target ? Math.hypot(position.x - hole.target.x, position.z - hole.target.z) : Infinity;
              if (hole.target && velocity.y < 0 && destinationDistance < 24) {
                const green = new Vector3(hole.target.x, 0.75, hole.target.z);
                const focus = Vector3.Lerp(position, green, 0.48);
                const landingBlend = clamp((24 - destinationDistance) / 18, 0, 1);
                const easedBlend = landingBlend * landingBlend * (3 - 2 * landingBlend);
                followTarget = Vector3.Lerp(followTarget, focus.add(new Vector3(0, 1.2, 0)), easedBlend);
                followPosition = Vector3.Lerp(followPosition, focus.subtract(followDirection.scale(18)).add(new Vector3(followDirection.z * 13, 9.2, -followDirection.x * 13)), easedBlend);
              }
              if (age <= 120) {
                desiredCameraPosition = addressPosition;
                desiredCameraTarget = addressTarget;
              } else {
                const blend = clamp((age - 120) / 240, 0, 1);
                desiredCameraPosition = Vector3.Lerp(addressPosition, followPosition, blend);
                desiredCameraTarget = Vector3.Lerp(addressTarget, followTarget, blend);
              }
            } else {
              desiredCameraTarget = impactFocus.add(new Vector3(0, 1.1, 0));
              desiredCameraPosition = impactFocus.add(new Vector3(9.5, 7.4, -12.5));
            }

            if (
              phaseRef.current === "theatre" &&
              flight.locked &&
              flight.pendingResult &&
              now - flight.lockedAt >= RAIL_RULES.theatreMilliseconds
            ) {
              playRuling(flight.pendingResult.outcome);
              setResult(flight.pendingResult);
              setGamePhase("result");
            }
          }

          if (flagPennant) {
            const windStrength = Math.hypot(hole.wind.x, hole.wind.z);
            flagPennant.rotation.z = Math.sin(now * 0.006) * (0.025 + windStrength * 0.035);
            flagPennant.scaling.x = 1 + Math.sin(now * 0.009) * (0.015 + windStrength * 0.02);
          }

          if (dustMotes.length) {
            for (const mote of dustMotes) {
              mote.mesh.position.x += hole.wind.x * deltaSeconds * (1.35 + mote.seed);
              mote.mesh.position.z += hole.wind.z * deltaSeconds * (1.35 + mote.seed);
              mote.mesh.position.y = 0.5 + Math.sin(now * 0.0025 + mote.seed * 12) * 0.22;
              if (mote.mesh.position.x > 18) mote.mesh.position.x = -18;
              if (mote.mesh.position.x < -18) mote.mesh.position.x = 18;
            }
          }

          theatreFx = theatreFx.filter((effect) => {
            const age = now - effect.bornAt;
            if (age >= effect.lifetime) {
              effect.mesh.dispose();
              effect.material.dispose();
              return false;
            }
            const progress = age / effect.lifetime;
            effect.mesh.scaling.setAll(1 + progress * effect.growth);
            effect.material.alpha = (1 - progress) * 0.78;
            return true;
          });

          const cameraEase = 1 - Math.pow(0.001, deltaSeconds);
          camera.position = Vector3.Lerp(camera.position, desiredCameraPosition, cameraEase);
          cameraTarget = Vector3.Lerp(cameraTarget, desiredCameraTarget, cameraEase);
          camera.setTarget(cameraTarget);
          camera.getViewMatrix();
          camera.getProjectionMatrix();
          const viewProjection = camera.getTransformationMatrix();

          const renderWidth = engine!.getRenderWidth();
          const renderHeight = engine!.getRenderHeight();
          const labelViewport = camera.viewport.toGlobal(renderWidth, renderHeight);
          const projectLabel = (element: HTMLDivElement | null, marker: Vector3 | null) => {
            if (!element) return;
            if (!marker) { element.dataset.visible = "false"; return; }
            const projected = Vector3.Project(marker, identityMatrix, viewProjection, labelViewport);
            const visible = (phaseRef.current === "ready" || phaseRef.current === "charging") && projected.z > 0 && projected.z < 1 && projected.x > 0 && projected.x < renderWidth && projected.y > 0 && projected.y < renderHeight;
            element.dataset.visible = String(visible);
            const screenX = projected.x / renderWidth * canvas.clientWidth;
            const halfWidth = element.offsetWidth / 2;
            const labelX = clamp(screenX, halfWidth + 8, canvas.clientWidth - halfWidth - 8);
            element.style.left = `${labelX}px`;
            element.style.top = `${projected.y / renderHeight * 100}%`;
            element.style.setProperty("--pin-offset", `${screenX - labelX}px`);
          };
          projectLabel(destinationRef.current,
            hole.target ? new Vector3(hole.target.x, (hole.target.beaconHeight ?? 6.4 * Math.max(1, hole.target.z / 80)) + 0.8, hole.target.z) : null);
          projectLabel(switchLabelRef.current, diverterLab ? new Vector3((courtyardDiverter ? YARD_DIVERTER_SWITCH : DIVERTER_SWITCH).x,7,(courtyardDiverter ? YARD_DIVERTER_SWITCH : DIVERTER_SWITCH).z) : null);
          projectLabel(floorLabelRef.current, diverterLab ? new Vector3((courtyardDiverter ? YARD_DIVERTER_FLOOR.x - YARD_DIVERTER_FLOOR.width/2 : DIVERTER_FLOOR.x),6,(courtyardDiverter ? YARD_DIVERTER_FLOOR : DIVERTER_FLOOR).z) : null);
          const mechanism = hole.requiredTags[0];
          const bank = hole.banks?.[0] ?? RANGE_MECHANISMS.bank;
          const pad = RANGE_MECHANISMS.boost;
          projectLabel(mechanismRef.current, mechanism?.startsWith("bank")
            ? new Vector3(bank.x + bank.halfWidth, courtyard ? 10 : 4.5, courtyard ? bank.z : bank.z - bank.halfDepth + 13)
            : mechanism === "boost" ? new Vector3(pad.x, 1.5, pad.z)
            : mechanism === "breach" && hole.breach ? new Vector3(hole.breach.x, hole.breach.maxY, hole.breach.z)
            : null);
          const secondBank = hole.requiredTags.length > 1 ? hole.banks?.[1] : null;
          projectLabel(secondBankRef.current, secondBank ? new Vector3(secondBank.x, 10, secondBank.z) : null);
          const sharedPad = withSharedYardPad(hole).boost;
          projectLabel(deliveryPadRef.current, sharedPad ? new Vector3(sharedPad.x, 2.4, sharedPad.z) : null);
          projectLabel(skyLabelRef.current, (lineLab || hole.id === 'mill-delivery') ? new Vector3(SKY_TOKEN.x, SKY_TOKEN.y - SKY_TOKEN.radius, SKY_TOKEN.z) : null);
          for (const step of CASCADE_STEPS) {
            projectLabel(cascadeLabelRefs.current[step.id] ?? null, hole.id === 'lumber-cascade' ? new Vector3(step.x, step.top+1, step.z) : null);
          }
          const evidenceMemory = memoriesRef.current[hole.id];
          if (evidenceMemory?.contacts.length) {
            const renderWidth = engine!.getRenderWidth();
            const renderHeight = engine!.getRenderHeight();
            const viewport = camera.viewport.toGlobal(renderWidth, renderHeight);
            for (const contact of evidenceMemory.contacts) {
              const element = evidenceRefs.current[contact.id];
              if (!element) continue;
              const projected = Vector3.Project(
                contact.point,
                identityMatrix,
                viewProjection,
                viewport,
              );
              const visible =
                projected.z >= 0 &&
                projected.z <= 1 &&
                projected.x >= 0 &&
                projected.x <= renderWidth &&
                projected.y >= 0 &&
                projected.y <= renderHeight;
              element.dataset.visible = visible ? "true" : "false";
              element.style.left = `${(projected.x / renderWidth) * 100}%`;
              element.style.top = `${(projected.y / renderHeight) * 100}%`;
            }
          }
          scene.render();
        });

        const onResize = () => {
          engine?.resize();
          const portrait = window.innerWidth < window.innerHeight;
          camera.fovMode = portrait ? Camera.FOVMODE_HORIZONTAL_FIXED : Camera.FOVMODE_VERTICAL_FIXED;
          camera.fov = portrait ? 0.92 : 0.69;
        };
        window.addEventListener("resize", onResize);
        onResize();

        setBootMessage("Range authority online");
        setGamePhase("ready");

        return () => {
          window.removeEventListener("resize", onResize);
          window.removeEventListener("blur", clearAimDrag);
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("lostpointercapture", onPointerUp);
          canvas.removeEventListener("contextmenu", preventContext);
        };
      } catch (error) {
        console.error(error);
        setBootMessage(error instanceof Error && /WebGL not supported/i.test(error.message)
          ? "3D graphics are unavailable in this browser. Try a browser with WebGL enabled."
          : "The range failed to arm. Reload to try again.");
        setGamePhase("error");
      }
    };

    let removeListeners: (() => void) | undefined;
    void initialize().then((cleanup) => {
      removeListeners = cleanup;
    });

    return () => {
      disposed = true;
      removeListeners?.();
      actionsRef.current = {};
      worldRef.current = null;
      audioMasterRef.current = null;
      audioContext?.close().catch(() => undefined);
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  const copyLineLink = async (saved?:ShotMemory) => {
    try{
      const card=HOLES[holeIndexRef.current];
      const setup=saved ?? {railIndex:railRef.current,yaw:yawRef.current,elevation:elevationRef.current,charge:selectedPowerRef.current};
      const encoded=encodeShareLine({v:1,build:saved?.build ?? (saved?'unknown':BUILD_ID),world:'timber-courtyard',route:lineLab?'/lab/lines':'/lab/courtyard-diverter',card:saved?.holeId ?? card.id,station:saved?.stationId ?? card.station?.id ?? 'gate',rail:setup.railIndex,yaw:setup.yaw,elevation:setup.elevation,speed:chargeToSpeed(setup.charge),environment:saved?.environment ?? {floor:floorStateRef.current}});
      const url=new URL(lineLab?'/lab/lines':'/lab/courtyard-diverter',window.location.origin);url.hash='line='+encoded;
      setShareLink(url.href);
      try{await navigator.clipboard.writeText(url.href);setShareNotice(lineLab?'Line link copied. It restores setup without firing; legacy dock state is inactive here.':'Line link copied. It restores setup and starting state; it never fires.');}
      catch{setShareNotice('Clipboard unavailable. Copy the line link below.');}
    }catch{setShareNotice('This saved line is missing valid setup or environment evidence.');}
  };
  const hole = HOLES[holeIndex];
  const labChip = hole.id === "timber-bank" ? addressLabChipLabel(addressLabMode) : null;
  const record = records[hole.id] ?? EMPTY_RECORD;
  const attempt = phase === "theatre" || phase === "result"
    ? Math.max(1, record.attempts)
    : record.attempts + 1;
  const canAim = phase === "ready" || phase === "charging";
  const shownPower = powerMode === "set" && phase === "ready" ? selectedPower : charge;
  const previousMarker = recalledPower ?? lastShot?.charge ?? null;

  const beginButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (phaseRef.current !== "ready" || chargePointerRef.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    chargePointerRef.current = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Release still works while the pointer remains over the control.
    }
    actionsRef.current.beginCharge?.();
  };

  const releaseButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (chargePointerRef.current !== event.pointerId) return;
    chargePointerRef.current = null;
    actionsRef.current.release?.();
  };

  const cancelButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (chargePointerRef.current !== event.pointerId) return;
    chargePointerRef.current = null;
    actionsRef.current.cancelCharge?.();
  };

  const beginButtonKeyCharge = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((event.code !== "Space" && event.code !== "Enter") || chargePointerRef.current !== null) return;
    event.preventDefault();
    if (!event.repeat) actionsRef.current.beginCharge?.();
  };

  const releaseButtonKeyCharge = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((event.code !== "Space" && event.code !== "Enter") || chargePointerRef.current !== null) return;
    event.preventDefault();
    actionsRef.current.release?.();
  };

  const outcomeClass = result ? (lineLab&&!hole.target?"result-line":`result-${result.outcome}`) : "";
  const nextHoleAvailable = holeIndex < HOLES.length - 1 && holeUnlocked(holeIndex + 1);
  const resultNeedsTrick = Boolean(
    result && hole.target && hole.requiredTags.length > 0 && result.outcome !== "double",
  );
  const resultCanAdvance = Boolean(result?.clear);

  return (
    <main className="rail-golf-shell manners-shell" data-phase={phase}>
      <small className="build-identity" title={'Build ' + BUILD_ID}>BUILD {BUILD_ID}</small>
      {diverterLab && !lineLab && <>
        <div className="floor-state-chip" role="status">FLOOR {floorState} · {courtyardDiverter ? 'LOADING DOCK' : FLOOR_STATES[floorState].label}</div>
        <div ref={switchLabelRef} className="destination-label" data-color={floorState === 'A' ? 'amber' : 'violet'} data-visible="false"><strong>SHOOT SWITCH · {floorState} → {floorState === 'A' ? 'B' : 'A'}</strong></div>
        <div ref={floorLabelRef} className="destination-label" data-color={floorState === 'A' ? 'amber' : 'violet'} data-visible="false"><strong>FLOOR {floorState}{!courtyardDiverter && (' · ' + FLOOR_STATES[floorState].label)}</strong></div>
      </>}
      {lineLab && !['flight','charging','theatre'].includes(phase) && <LineReceipt ledger={lineLedger} shot={lastShot ?? undefined} />}
      {lineLab && claimCaption && <div key={claimCaption.serial} className="line-claim-caption" role="status">{claimCaption.text}</div>}
      <canvas
        ref={canvasRef}
        className="rail-canvas"
        aria-label={`${hole.name}. Drag to aim yaw and elevation, then hold the fire control to charge.`}
      />

      <header className="hud-top manners-hud">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">RG</span>
          <div>
            <p className="eyebrow">Havok leisure authority</p>
            <h1>Rail Golf</h1>
          </div>
        </div>
        <div className="course-readout" aria-label="Current trick information">
          <div>
            <span>CARD</span>
            <strong>{hole.number}</strong>
          </div>
          <div>
            <span>ATTEMPT</span>
            <strong>{String(attempt).padStart(2, "0")}</strong>
          </div>
          <div className={lineLab?'line-score-readout':undefined}>
            <span>{lineLab?'LINE':'WIND'}</span>
            <strong className={lineLab?'line-hud-total':undefined} title={lineLab?'NON-CANONICAL PLACEHOLDER score':undefined}>{lineLab?liveLineTotal:hole.wind.speedLabel}</strong>
          </div>
        </div>
      </header>

      <nav className="manners-scorecard" aria-label={diverterLab ? "Experimental lab" : courtyard ? "Timber Courtyard challenges" : "Practice Range lessons"}>
        {HOLES.map((item, index) => {
          const itemRecord = records[item.id];
          const unlocked = holeUnlocked(index);
          const stamp = itemRecord?.perfect
            ? "STAMPED"
            : itemRecord?.cleared
              ? "TARGET"
              : itemRecord?.hasBreach
                ? "MECH"
                : unlocked
                  ? "OPEN"
                  : "LOCKED";
          return (
            <button
              key={item.id}
              type="button"
              data-active={index === holeIndex}
              data-locked={!unlocked}
              onClick={() => actionsRef.current.selectHole?.(index)}
              disabled={!unlocked || phase === "flight" || phase === "theatre" || phase === "charging"}
              aria-label={`${item.number} ${item.name}, ${stamp}`}
              aria-current={index === holeIndex ? "step" : undefined}
            >
              <b>{item.number}</b>
              <span>{item.shortName}</span>
              <small>{stamp}</small>
              {item.requiredTags.length ? <i aria-label={`Optional stamp: ${item.requiredTags.map(evidenceLabel).join(" then ")}`}><em data-earned={itemRecord?.perfect}>◆</em></i> : null}
            </button>
          );
        })}
      </nav>

      <aside className="hole-brief manners-brief">
        <p className="eyebrow">{lineLab ? hole.station?.label : diverterLab ? "Experimental mill bay" : courtyard ? hole.station?.label ?? "Timber Courtyard" : "Practice Range"} · {hole.number} / {String(HOLES.length).padStart(2, "0")}</p>
        <strong>{hole.name}</strong>
        <span>{lineLab?(hole.target?`Explore a line. Land on ${hole.target.label}, or discover another claim. Scores are provisional.`:hole.instruction):hole.instruction}</span>
        {lineLab && !hole.target && <strong className="line-session-best">SESSION BEST LINE · {sessionBest[hole.id]??0}</strong>}
        <Button
          type="button"
          variant="outline"
          className="survey-chip manners-survey"
          onClick={() => actionsRef.current.toggleSurvey?.()}
          disabled={!canAim}
          aria-pressed={survey}
        >
          <Map /> {survey ? "Address view" : "Survey hole"}
        </Button>

        {canAim && <a className="courtyard-link" href={courtyard ? "/practice" : "/"}>{courtyard ? "← Practice range" : "Explore the timber yard →"}</a>}
        {canAim && !courtyard && !diverterLab && <><a className="courtyard-link" href="/lab/diverter">Diverter Floor lab →</a><a className="courtyard-link" href="/lab/courtyard-diverter">Mill Diverter lab →</a><a className="courtyard-link" href="/lab/lines">Line receipt lab →</a></>}
      </aside>

      {courtyardDiverter && shareNotice && <div className="share-line-notice" role="status">{shareNotice}</div>}
      {labChip ? (
        <div className="address-lab-chip" role="status">{labChip}</div>
      ) : null}

      {hole.target && <div ref={destinationRef} className="destination-label" data-visible="false" data-color={hole.target.material} aria-hidden={!canAim}>
        <span>{hole.requiredTags.length ? `${hole.requiredTags.length + 1} · ` : ""}LAND HERE · {Math.round(hole.target.z)} m</span>
        <strong>{hole.target.label}</strong>
      </div>}

      <div ref={mechanismRef} className="destination-label mechanism-label" data-visible="false"
        data-color={hole.requiredTags[0] === "boost" ? "boost" : "amber"} aria-hidden={!canAim || !hole.requiredTags.length}>
        <strong>1 · {hole.requiredTags[0]?.startsWith("bank") ? (courtyard ? "BANK A · THEN B" : "BANK HERE") : hole.requiredTags[0] === "boost" ? "BOUNCE PAD" : "BREAK THROUGH"}</strong>
      </div>

      {courtyard && <div ref={secondBankRef} className="destination-label mechanism-label" data-visible="false" data-color="amber" aria-hidden={!canAim || !hole.requiredTags.length}><strong>2 · BANK B</strong></div>}

      {courtyard && <div ref={deliveryPadRef} className="destination-label mechanism-label" data-visible="false" data-color="boost" aria-hidden={!canAim}><strong>{courtyardDiverter ? "SKIP PAD" : "OPTIONAL · SKIP PAD"}</strong></div>}
      {lineLab && <div ref={skyLabelRef} className="destination-label mechanism-label" data-visible="false" data-color="amber"><strong>SKY TOKEN</strong></div>}
      {!lineLab && hole.id === 'mill-delivery' && <>
        <div ref={skyLabelRef} className="destination-label mechanism-label" data-visible="false" data-color="amber" aria-hidden={!canAim}><strong>GOLD SKY TOKEN</strong></div>
        {(canAim || phase === 'result') && <section className="delivery-book" aria-label="Delivery route collection">
          <strong>{Object.keys(deliveryBook).length === 4 ? 'YARD EXPLORER' : 'ROUTE BOOK'} · {Object.keys(deliveryBook).length}/4</strong>
          <div className="delivery-route-tabs">{DELIVERY_ROUTES.map(route => <button key={route.id} type="button" aria-pressed={routeFocus === route.id} onClick={() => setRouteFocus(route.id)} data-earned={Boolean(deliveryBook[route.id])}>
            {deliveryBook[route.id] ? '✓ ' : '○ '}{route.label}
          </button>)}</div>
          <p>{DELIVERY_ROUTES.find(route => route.id === routeFocus)?.hint}</p>
          {deliveryBook[routeFocus] && <Button variant="outline" size="sm" disabled={phase === 'charging'} onClick={() => actionsRef.current.recallRoute?.(routeFocus)}>Recall winning line · {displayPercent(deliveryBook[routeFocus]!.charge)}</Button>}
          {recalledPower !== null && <small>Line recalled. {powerMode === "set" ? "Saved power selected." : `Charge to the ${displayPercent(recalledPower)} marker.`}</small>}
        </section>}
        {deliveryLive.length > 0 && phase === 'flight' && <div className="delivery-progress" role="status">{deliveryLive.join(' + ').toUpperCase()} REACHED · LAND TO COLLECT</div>}
      </>}

      {hole.id === 'lumber-cascade' && <>
        {CASCADE_STEPS.map((step, index) => <div key={step.id} ref={node => { cascadeLabelRefs.current[step.id] = node; }} className="destination-label cascade-label" data-color="amber" data-visible="false"><strong>TREAD {index+1}</strong></div>)}
      </>}

      <section className="aim-console manners-console" aria-label="Rail shot controls">
        <details className="shot-tools">
          <summary>Shot tools & saved lines · {powerMode === 'hold' ? 'timed charge' : `set power ${displayPercent(selectedPower)}`}</summary>
          <div className="shot-tools-body">
      {courtyard && (!courtyardDiverter || lineLab) && <nav className="station-picker" aria-label="Launcher station">
        {Object.values(STATIONS).map(station => <button type="button" key={station.id} aria-pressed={hole.station?.id === station.id}
          disabled={(phase !== 'ready' && phase !== 'result') || !holeUnlocked(station.id === 'gate' ? 0 : station.id === 'saw' ? 3 : 2)}
          onClick={() => actionsRef.current.selectStation?.(station.id)}>{station.label}{station.id === 'lumber' && !holeUnlocked(2) ? ' · locked' : ''}</button>)}
      </nav>}
            {diverterLab && !lineLab && <>
              <small>FLOOR {floorState} · {courtyardDiverter ? 'LOADING DOCK' : FLOOR_STATES[floorState].label}. {courtyardDiverter?'Switch at Lumber Walk':'Switch'} changes once per shot. Cards, stations and Retry keep the state. Recall restores the recorded starting state.</small>
              <button type="button" disabled={phase === 'booting' || phase === 'error'} onClick={() => actionsRef.current.reset?.(false)}>Reset Card · restore FLOOR A</button>
            </>}
            <label>Power control <select value={powerMode} disabled={phase !== 'ready'} onChange={event => {
              const mode = event.target.value as 'hold' | 'set'; powerModeRef.current = mode; setPowerMode(mode);
            }}><option value="hold">Timed hold</option><option value="set">Set power</option></select></label>
            {powerMode === 'set' && <label>Power {displayPercent(selectedPower)}<input type="range" min="0" max="100" step="0.5" aria-label="Set launch power" value={selectedPower * 100} disabled={phase !== 'ready'} onChange={event => {
              const value = Number(event.target.value) / 100; selectedPowerRef.current = value; setSelectedPower(value);
            }} /></label>}
            <label><input type="checkbox" checked={compare} disabled={phase !== 'ready'} onChange={event => {
              compareRef.current = event.target.checked; setCompare(event.target.checked); actionsRef.current.compareAttempts?.();
            }} /> Compare three trails · selected amber, others cyan (Previous Line on)</label>
            <small>Gentle start · 80% in 2 seconds · full power in 3. Aim ±70°; loft 5–85°.</small>
            {courtyardDiverter && <section className="share-line-tools" aria-label="Share a line">
              {lastShot && <button type="button" onClick={()=>copyLineLink(lastShot)}>Copy selected line link</button>}
              <button type="button" disabled={phase!=='ready'||powerMode!=='set'} onClick={()=>copyLineLink()}>Copy current Set Power setup</button>
              <small>Links restore exact launch speed and aim without firing. {lineLab?"Legacy dock state is retained as provenance but is inactive here.":"Starting dock state is restored."}</small>
              {shareLink && <input aria-label="Line link" readOnly value={shareLink} onFocus={event=>event.currentTarget.select()} />}
            </section>}
            <strong>Winning lines · {winningLines.length}/6 families</strong>
            <small>Saved on this browser. Recall restores aim, power marker and the recorded trail; you still fire.</small>
            {winningLines.map(shot => <button type="button" key={`win-${shot.projectileId}`} aria-pressed={lastShot?.projectileId === shot.projectileId} disabled={phase !== 'ready'} onClick={() => actionsRef.current.recallAttempt?.(shot.projectileId)}>
              {!lineLab && shot.environment && ('FLOOR ' + shot.environment.floor + ' → ' + shot.environmentAfter?.floor + ' · ')}{shot.outcome === 'double' ? 'STAMP' : 'CLEAR'} · {shot.contacts.filter(c => c.kind !== 'first-kiss' && c.kind !== 'wet').map(c => evidenceLabel(c.kind)).join(' → ') || 'CARRY'} · rail {shot.railIndex + 1} · {displayPercent(shot.charge)}
            </button>)}
            {!winningLines.length && <small>Land here to save a line. Different contact sequences earn their own entry; the six latest families are kept.</small>}
            <strong>Recent attempts</strong>
            {history.map(shot => <button type="button" key={shot.projectileId} aria-pressed={lastShot?.projectileId === shot.projectileId} disabled={phase !== 'ready'} onClick={() => actionsRef.current.recallAttempt?.(shot.projectileId)}>
              #{shot.projectileId} · {!lineLab && shot.environment && ('FLOOR ' + shot.environment.floor + ' → ' + shot.environmentAfter?.floor + ' · ')}rail {shot.railIndex + 1} · {shot.yaw.toFixed(1)}° / {shot.elevation.toFixed(1)}° · {displayPercent(shot.charge)} — {shot.receipt}
            </button>)}
            {!history.length && <small>Your last three attempts are saved here, including interrupted shots.</small>}
          </div>
        </details>
        <div className="aim-metrics downrange-metrics">
          <div className="metric-block">
            <span>YAW</span>
            <strong>{yaw >= 0 ? "+" : ""}{yaw.toFixed(1)}°</strong>
          </div>
          <div className="metric-block">
            <span>ELEV</span>
            <strong>{elevation.toFixed(1)}°</strong>
          </div>
          <div className="metric-block">
            <span>RAIL</span>
            <strong>{railIndex + 1} / 3</strong>
          </div>
          <div className="metric-block power-number">
            <span>POWER</span>
            <strong>{displayPercent(shownPower)}</strong>
          </div>
        </div>

        <div
          className="power-track"
          role="progressbar"
          aria-label="Launch power"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shownPower * 100)}
          aria-valuetext={displayPercent(shownPower)}
        >
          <div className="power-fill" style={{ width: `${shownPower * 100}%` }} />
          {previousMarker !== null ? (
            <div
              className="last-power-marker"
              style={{ left: `${previousMarker * 100}%` }}
              title={`${recalledPower !== null ? "Saved route" : "Last shot"} ${displayPercent(previousMarker)}`}
            />
          ) : null}
        </div>

        <div className="manners-control-grid">
          <div className="rail-controls" aria-label="Launcher rail">
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="rail-shift"
              onClick={() => actionsRef.current.shiftRail?.(-1)}
              disabled={!canAim || railIndex === 0}
              aria-label="Move launcher left"
            >
              <ChevronLeft />
            </Button>
            <span>RAIL</span>
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="rail-shift"
              onClick={() => actionsRef.current.shiftRail?.(1)}
              disabled={!canAim || railIndex === RAIL_RULES.railPositions.length - 1}
              aria-label="Move launcher right"
            >
              <ChevronRight />
            </Button>
          </div>

          <Button
            type="button"
            className="fire-control manners-fire"
            onPointerDown={beginButtonCharge}
            onPointerUp={releaseButtonCharge}
            onPointerCancel={cancelButtonCharge}
            onLostPointerCapture={cancelButtonCharge}
            onKeyDown={beginButtonKeyCharge}
            onKeyUp={releaseButtonKeyCharge}
            onBlur={() => actionsRef.current.cancelCharge?.()}
            disabled={!canAim}
          >
            <Crosshair />
            <span>{powerMode === "set" ? (phase === "charging" ? "RELEASE TO FIRE" : `FIRE AT ${displayPercent(selectedPower)}`) : phase === "charging" ? "RELEASE ROUND" : "HOLD TO CHARGE"}</span>
          </Button>

          <div className="aim-nudges" aria-label="Fine aim controls">
            <button type="button" onClick={() => actionsRef.current.nudgeElevation?.(0.5)} disabled={!canAim} aria-label="Raise elevation">
              <ChevronUp />
            </button>
            <button type="button" onClick={() => actionsRef.current.nudgeYaw?.(-0.5)} disabled={!canAim} aria-label="Aim left">
              <ChevronLeft />
            </button>
            <button type="button" onClick={() => actionsRef.current.nudgeYaw?.(0.5)} disabled={!canAim} aria-label="Aim right">
              <ChevronRight />
            </button>
            <button type="button" onClick={() => actionsRef.current.nudgeElevation?.(-0.5)} disabled={!canAim} aria-label="Lower elevation">
              <ChevronDown />
            </button>
          </div>
        </div>

        <p className="control-hint">
          <span className="desktop-control-hint">
            Drag the course to aim · hold only the orange control for power · the short muzzle spine is direction, never a landing prediction
          </span>
          <span className="mobile-control-hint">Drag to aim · {powerMode === "hold" ? "hold orange to charge" : "release orange to fire"}</span>
        </p>
      </section>

      <aside className="utility-panel" aria-label="Range options">
        <Label className="utility-row" htmlFor="manners-ghost-toggle">
          <span><Eye /> Previous line</span>
          <Switch
            id="manners-ghost-toggle"
            checked={ghostVisible}
            onCheckedChange={setGhostVisible}
            aria-label="Show previous trajectory for this hole"
          />
        </Label>
        <Label className="utility-row" htmlFor="manners-sound-toggle">
          <span>{muted ? <VolumeX /> : <Volume2 />} Range audio</span>
          <Switch
            id="manners-sound-toggle"
            checked={!muted}
            onCheckedChange={(checked) => setMuted(!checked)}
            aria-label="Enable range audio"
          />
        </Label>
        <Button
          type="button"
          variant="ghost"
          className="utility-button"
          onClick={() => actionsRef.current.reset?.(false)}
          disabled={phase !== "ready"}
        >
          <RotateCcw /> {diverterLab ? (lineLab?"Reset Card":"Reset Card · FLOOR A") : "Reset address"}
        </Button>
      </aside>

      <div className="mobile-utility-panel" aria-label="Mobile range options">
        <Label htmlFor="mobile-manners-ghost">
          <Eye />
          <Switch
            id="mobile-manners-ghost"
            size="sm"
            checked={ghostVisible}
            onCheckedChange={setGhostVisible}
            aria-label="Show previous trajectory"
          />
        </Label>
        <Label htmlFor="mobile-manners-sound">
          {muted ? <VolumeX /> : <Volume2 />}
          <Switch
            id="mobile-manners-sound"
            size="sm"
            checked={!muted}
            onCheckedChange={(checked) => setMuted(!checked)}
            aria-label="Enable range audio"
          />
        </Label>
      </div>

      {lastShot && phase === "ready" ? (
        <button className="last-line-chip" onClick={() => actionsRef.current.restoreLine?.()} type="button">
          LAST Y{lastShot.yaw >= 0 ? "+" : ""}{lastShot.yaw.toFixed(1)}° · E{lastShot.elevation.toFixed(1)}° · {displayPercent(lastShot.charge)}
          <span>{diverterLab && !lineLab ? ("restore FLOOR " + lastShot.environment?.floor + ", aim and power") : "restore aim and power"}</span>
        </button>
      ) : null}

      {phase === "booting" || phase === "error" ? (
        <div className="boot-screen" role="status">
          <div className="boot-reticle" aria-hidden="true" />
          <p className="eyebrow">Rail Golf / Mechanism Range</p>
          <strong>{bootMessage}</strong>
          {phase === "booting" ? <span>One shared Havok session</span> : null}
        </div>
      ) : null}

      {(phase === 'flight' || phase === 'theatre' || phase === 'result') && <button type="button" className="quick-retry" onClick={() => actionsRef.current.retry?.()}>
        <RotateCcw size={16} /> {phase === 'flight' ? 'Retry now' : 'Retry shot'} <kbd>R</kbd>
      </button>}
      {retryNotice && phase === 'ready' && <div className="retry-notice" role="status">{retryNotice}</div>}

      {phase === "flight" ? (
        <div className="flight-status" role="status">ROUND DOWNRANGE</div>
      ) : null}

      {phase === "theatre" ? (
        <div className="flight-status theatre-status" role="status">RULING LOCKED</div>
      ) : null}

      {mechanismInFlight && !(hole.id === "mill-delivery" && deliveryLive.length > 0) && (phase === "flight" || phase === "theatre") ? (
        <div className="breach-status" role="status">
          {mechanismInFlight} REGISTERED · {phase === "flight" ? (hole.target?"TARGET STILL LIVE":"LINE STILL LIVE") : "RULING LOCKED"}
        </div>
      ) : null}

      {lastShot?.contacts.length ? (
        <div className="shot-evidence-layer" aria-hidden="true">
          {lastShot.contacts.map((contact) => (
            <span
              key={contact.id}
              ref={(element) => {
                evidenceRefs.current[contact.id] = element;
              }}
              data-kind={contact.kind}
              data-visible="false"
            >
              {evidenceLabel(contact.kind)}
            </span>
          ))}
        </div>
      ) : null}

      {hole.wind.x !== 0 || hole.wind.z !== 0 ? (
        <div className="wind-witness" aria-label={`Constant wind ${hole.wind.speedLabel}`}>
          <Wind /> <span>CONSTANT</span> <strong>{hole.wind.label}</strong>
        </div>
      ) : null}

      {result && phase === "result" ? (
        <section
          ref={resultCardRef}
          className={`result-card manners-result ${outcomeClass}`}
          role="dialog"
          aria-labelledby="range-result-heading"
          aria-describedby="range-result-detail"
          tabIndex={-1}
        >
          <p className="eyebrow">{lineLab?"Line receipt · NON-CANONICAL":"Mechanism Range ruling"}</p>
          <h2 id="range-result-heading">{result.headline}</h2>
          <p id="range-result-detail">{result.detail}</p>
          {hole.target && hole.requiredTags.length > 0 && result.outcome !== "double" ? (
            <div className="perfect-callout"><Flag /> Stamp requires {hole.requiredTags.map(evidenceLabel).join(" → ")} → {hole.target.label} in one shot.</div>
          ) : null}
          <div
            className="result-actions manners-result-actions"
            data-count={resultCanAdvance ? "three" : "two"}
          >
            {resultCanAdvance ? (
              nextHoleAvailable ? (
                <Button type="button" onClick={() => actionsRef.current.nextHole?.()}>
                  Next card <ChevronRight />
                </Button>
              ) : (
                <Button type="button" onClick={() => actionsRef.current.selectHole?.(0)}>
                  Replay range
                </Button>
              )
            ) : (
              <Button type="button" onClick={() => actionsRef.current.reset?.(true)}>
                <Crosshair /> {resultNeedsTrick ? "Hunt from last line" : "Adjust last line"}
              </Button>
            )}
            {resultCanAdvance ? (
              <Button type="button" variant="outline" onClick={() => actionsRef.current.reset?.(true)}>
                {resultNeedsTrick ? "Hunt the stamp" : "Replay this line"}
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={() => actionsRef.current.reset?.(false)}>
              <RotateCcw /> Reset card
            </Button>
          </div>
        </section>
      ) : null}

      {phase === "ready" || phase === "charging" ? (
        <div className="portrait-notice" role="note">
          <span>Landscape gives the director more fairway.</span>
        </div>
      ) : null}
    </main>
  );
}
