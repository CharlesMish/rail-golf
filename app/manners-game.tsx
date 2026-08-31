"use client";

import { useEffect, useRef, useState } from "react";
import {
  Color3,
  Color4,
  Camera,
  DirectionalLight,
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
  HOLES,
  RANGE_MECHANISMS,
  RANGE_TARGETS,
  RAIL_RULES,
  chargeToSpeed,
  clamp,
  clampElevation,
  clampYaw,
  classifyChallengeRuling,
  directionFromAim,
  formatMiss,
  isAceLanding,
  landingIntersection,
  mergeHoleRecord,
  normalizeHoleRecord,
  pointOnSegment,
  segmentSphereAabbIntersection,
  shiftRail,
  stableUnitInterval,
  verticalRecoveryImpulse,
} from "@/lib/rail-golf-v02";
import type { Hole, HoleRecord, MechanismTag, Outcome, ShotSetup } from "@/lib/rail-golf-v02";

type Phase = "booting" | "ready" | "charging" | "flight" | "theatre" | "result" | "error";

type ProgressRecords = Record<string, HoleRecord | undefined>;
type AimSetup = Pick<ShotSetup, "railIndex" | "yaw" | "elevation">;
type EvidenceKind = MechanismTag | "first-kiss" | "wet";

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
  holeId: string;
  windId: string;
  projectileId: number;
  points: Vector3[];
  contacts: ShotContact[];
};

type FlightState = {
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
};

type LiveTone = {
  oscillator: OscillatorNode;
  gain: GainNode;
};

const STORAGE_KEY = "rail-golf-mechanism-range-v03";

const EMPTY_RECORD: HoleRecord = {
  attempts: 0,
  bestOutcome: null,
  hasAce: false,
  hasBreach: false,
  perfect: false,
  cleared: false,
};

function displayPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function evidenceLabel(kind: EvidenceKind) {
  if (kind === "first-kiss") return "FIRST KISS";
  if (kind === "bank") return "TIMBER BANK";
  if (kind === "boost") return "HOT SKIP";
  if (kind === "wet") return "WET";
  return "BREACH";
}

function loadProgress(): ProgressRecords {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

function chooseResumeHole(records: ProgressRecords) {
  const firstUnstamped = HOLES.findIndex((hole) => !records[hole.id]?.perfect && !records[hole.id]?.cleared);
  return firstUnstamped < 0 ? 0 : firstUnstamped;
}

function holeUnlocked(index: number) {
  return index >= 0 && index < HOLES.length;
}

function resultCopy(hole: Hole, outcome: Outcome, point: Vector3, tags: MechanismTag[] = []): ShotResult {
  const tagReceipt = tags.length ? tags.map((tag) => tag.toUpperCase()).join(" + ") : "DIRECT";
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
        ? `${hole.target.label} registered, but this card still asks for ${hole.requiredTags.join(" + ").toUpperCase()} first.`
        : `First contact landed on ${hole.target.label}. Direct line recorded.`,
      point,
      clear: true,
    };
  }
  if (outcome === "breach") {
    return {
      outcome,
      headline: "MECHANISM REGISTERED",
      detail: `${tagReceipt} fired, but the rail missed ${hole.target.label}. The live trail keeps the evidence.`,
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
    headline: "NO RULING",
    detail: `${formatMiss(hole, point)}. The live trail is now your survey instrument.`,
    point,
    clear: false,
  };
}

export function MannersGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const resultCardRef = useRef<HTMLElement>(null);
  const evidenceRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const actionsRef = useRef<Partial<GameActions>>({});
  const worldRef = useRef<WorldHandles | null>(null);
  const phaseRef = useRef<Phase>("booting");
  const holeIndexRef = useRef(0);
  const yawRef = useRef(HOLES[0].defaultShot.yaw);
  const elevationRef = useRef(HOLES[0].defaultShot.elevation);
  const railRef = useRef(HOLES[0].defaultShot.railIndex);
  const chargeRef = useRef(0);
  const surveyRef = useRef(false);
  const mutedRef = useRef(false);
  const ghostVisibleRef = useRef(true);
  const recordsRef = useRef<ProgressRecords>({});
  const memoriesRef = useRef<Record<string, ShotMemory | undefined>>({});

  const [phase, setPhase] = useState<Phase>("booting");
  const [holeIndex, setHoleIndex] = useState(0);
  const [records, setRecords] = useState<ProgressRecords>({});
  const [yaw, setYaw] = useState(HOLES[0].defaultShot.yaw);
  const [elevation, setElevation] = useState(HOLES[0].defaultShot.elevation);
  const [railIndex, setRailIndex] = useState(HOLES[0].defaultShot.railIndex);
  const [charge, setCharge] = useState(0);
  const [survey, setSurvey] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ghostVisible, setGhostVisible] = useState(true);
  const [lastShot, setLastShot] = useState<ShotMemory | null>(null);
  const [mechanismInFlight, setMechanismInFlight] = useState<string | null>(null);
  const [result, setResult] = useState<ShotResult | null>(null);
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
  }, [muted]);

  useEffect(() => {
    if (phase !== "result") return;
    resultCardRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("button, input, select, textarea, a, [role='switch']"));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isInteractiveTarget(event.target)) return;
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
      if (event.code === "KeyR") actionsRef.current.reset?.(false);
      if (event.code === "KeyL") actionsRef.current.restoreLine?.();
      if (event.code === "KeyV") actionsRef.current.toggleSurvey?.();
      if (event.code === "KeyG") setGhostVisible((visible) => !visible);
      if (event.code === "KeyM") setMuted((value) => !value);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (isInteractiveTarget(event.target)) return;
      if (event.code !== "Space") return;
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
        scene.clearColor = new Color4(0.048, 0.09, 0.105, 1);
        scene.fogMode = Scene.FOGMODE_LINEAR;
        scene.fogStart = 94;
        scene.fogEnd = 172;
        scene.fogColor = new Color3(0.048, 0.09, 0.105);
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
        sky.intensity = 0.82;
        sky.diffuse = new Color3(0.58, 0.79, 0.75);
        sky.groundColor = new Color3(0.075, 0.11, 0.07);

        const sun = new DirectionalLight("range-sun", new Vector3(-0.42, -0.85, 0.35), scene);
        sun.position = new Vector3(38, 54, -34);
        sun.intensity = 2;
        sun.diffuse = new Color3(1, 0.77, 0.51);
        const shadows = new ShadowGenerator(1024, sun);
        shadows.useBlurExponentialShadowMap = true;
        shadows.blurKernel = 18;
        shadows.bias = 0.001;

        const glow = new GlowLayer("range-glow", scene, { blurKernelSize: 32 });
        glow.intensity = 0.48;

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
          fairwayA: makeMaterial("fairway-a", new Color3(0.105, 0.31, 0.165)),
          fairwayB: makeMaterial("fairway-b", new Color3(0.075, 0.255, 0.135)),
          green: makeMaterial("green", new Color3(0.075, 0.37, 0.18)),
          steel: makeMaterial("steel", new Color3(0.29, 0.35, 0.34), new Color3(0.02, 0.025, 0.024), 0.24),
          machine: makeMaterial("machine", new Color3(0.085, 0.13, 0.135), new Color3(0.006, 0.01, 0.01), 0.35),
          cyan: makeMaterial("cyan", new Color3(0.025, 0.4, 0.44), new Color3(0.045, 0.82, 0.92), 0.18),
          amber: makeMaterial("amber", new Color3(0.46, 0.17, 0.035), new Color3(1, 0.27, 0.025), 0.2),
          violet: makeMaterial("violet", new Color3(0.28, 0.08, 0.42), new Color3(0.72, 0.2, 1), 0.18),
          lime: makeMaterial("lime", new Color3(0.16, 0.4, 0.08), new Color3(0.48, 1, 0.16), 0.18),
          boost: makeMaterial("boost", new Color3(0.42, 0.04, 0.22), new Color3(1, 0.08, 0.52), 0.14),
          hot: makeMaterial("hot", new Color3(0.39, 0.045, 0.012), new Color3(1, 0.075, 0.012), 0.14),
          brick: makeMaterial("brick", new Color3(0.26, 0.18, 0.095), new Color3(0.014, 0.007, 0.002)),
          bark: makeMaterial("bark", new Color3(0.16, 0.09, 0.045)),
          leaf: makeMaterial("leaf", new Color3(0.035, 0.18, 0.085)),
          sand: makeMaterial("sand", new Color3(0.47, 0.39, 0.23)),
          water: makeMaterial("water", new Color3(0.025, 0.22, 0.28), new Color3(0.01, 0.1, 0.15), 0.2),
        };
        materials.water.alpha = 0.82;

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
        let courseAggregates: PhysicsAggregate[] = [];
        let breachBodies: DynamicBody[] = [];
        let dustMotes: DustMote[] = [];
        let flagPennant: Mesh | null = null;
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

        worldRef.current = { ghostLine };

        const ensureAudio = () => {
          if (!audioContext) audioContext = new AudioContext();
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
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(now);
          oscillator.stop(now + duration + 0.03);
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
          source.connect(gain).connect(context.destination);
          source.start(context.currentTime + delay);
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
          oscillator.connect(gain).connect(context.destination);
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
          oscillator.connect(gain).connect(context.destination);
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
          stopFlightTone();
          if (outcome === "wet") {
            noise(0.86, 0.13);
            tone(210, 52, 0.84, 0.09, "sine");
            return;
          }
          if (outcome === "double") {
            tone(164, 656, 0.62, 0.09, "triangle");
            tone(246, 984, 0.72, 0.065, "triangle", 0.08);
            noise(0.46, 0.16);
            return;
          }
          if (outcome === "ace") {
            tone(196, 392, 0.38, 0.075, "triangle");
            tone(294, 588, 0.5, 0.055, "triangle", 0.12);
            noise(0.3, 0.085);
            return;
          }
          if (outcome === "breach") {
            tone(84, 31, 0.66, 0.2, "sawtooth");
            noise(0.62, 0.16);
            return;
          }
          tone(74, 35, 0.42, 0.12, "sine");
          noise(0.28, 0.075);
        };

        const getAimDirection = () => {
          const raw = directionFromAim(yawRef.current, elevationRef.current);
          return new Vector3(raw.x, raw.y, raw.z);
        };

        const getHorizontalDirection = () => {
          const yawRadians = (yawRef.current * Math.PI) / 180;
          return new Vector3(Math.sin(yawRadians), 0, Math.cos(yawRadians));
        };

        const getMuzzle = () => {
          const origin = new Vector3(RAIL_RULES.railPositions[railRef.current], 1.55, 0);
          return origin.add(getAimDirection().scale(RAIL_RULES.muzzleLength));
        };

        const updateLauncher = () => {
          launcher.position.x = RAIL_RULES.railPositions[railRef.current];
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
          for (const aggregate of courseAggregates) aggregate.dispose();
          courseAggregates = [];
          breachBodies = [];
          dustMotes = [];
          flagPennant = null;
          courseRoot?.dispose(false, false);
          courseRoot = null;
        };

        const registerAggregate = (aggregate: PhysicsAggregate) => {
          courseAggregates.push(aggregate);
          return aggregate;
        };

        const createCourse = (hole: Hole) => {
          disposeCourse();
          courseRoot = new TransformNode(`course-${hole.id}`, scene!);

          const place = <T extends Mesh>(mesh: T) => {
            mesh.parent = courseRoot;
            return mesh;
          };

          const rough = place(MeshBuilder.CreateBox(
            `${hole.id}-rough`,
            { width: 64, height: 1, depth: hole.courseLength + 42 },
            scene!,
          ));
          rough.position.set(0, -0.5, (hole.courseLength + 8) / 2);
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
          tee.material = materials.steel;
          tee.receiveShadows = true;
          registerAggregate(new PhysicsAggregate(
            tee,
            PhysicsShapeType.BOX,
            { mass: 0, friction: 0.9, restitution: 0.06 },
            scene!,
          ));

          for (const rangeTarget of RANGE_TARGETS) {
            const active = rangeTarget.id === hole.target.id;
            const targetMaterial = materials[rangeTarget.material];
            const green = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-green`,
              { height: 0.12, diameter: rangeTarget.radius * 2 + 4.4, tessellation: 64 },
              scene!,
            ));
            green.position.set(rangeTarget.x, 0.07, rangeTarget.z);
            green.material = materials.green;
            green.receiveShadows = true;

            const target = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-target`,
              { height: active ? 0.22 : 0.16, diameter: rangeTarget.radius * 2, tessellation: 64 },
              scene!,
            ));
            target.position.set(rangeTarget.x, active ? 0.2 : 0.16, rangeTarget.z);
            target.material = targetMaterial;
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
                diameter: rangeTarget.radius * 2 + (active ? 0.58 : 0.28),
                thickness: active ? 0.19 : 0.08,
                tessellation: 64,
              },
              scene!,
            ));
            ring.position.set(rangeTarget.x, active ? 0.36 : 0.28, rangeTarget.z);
            ring.material = targetMaterial;

            const pin = place(MeshBuilder.CreateCylinder(
              `${hole.id}-${rangeTarget.id}-pin`,
              { height: active ? 6.4 : 4.5, diameter: active ? 0.18 : 0.11, tessellation: 12 },
              scene!,
            ));
            pin.position.set(rangeTarget.x, active ? 3.25 : 2.3, rangeTarget.z + 1.25);
            pin.material = active ? targetMaterial : materials.steel;
            const beacon = place(MeshBuilder.CreateSphere(
              `${hole.id}-${rangeTarget.id}-beacon`,
              { diameter: active ? 0.72 : 0.36 },
              scene!,
            ));
            beacon.position.set(rangeTarget.x, active ? 6.45 : 4.55, rangeTarget.z + 1.25);
            beacon.material = targetMaterial;
            if (active) flagPennant = beacon;
          }

          const railBed = place(MeshBuilder.CreateBox(
            `${hole.id}-rail-bed`,
            { width: 11.2, height: 0.2, depth: 2.6 },
            scene!,
          ));
          railBed.position.set(0, 0.47, 0);
          railBed.material = materials.steel;

          for (let railIndex = 0; railIndex < RAIL_RULES.railPositions.length; railIndex += 1) {
            const rail = place(MeshBuilder.CreateBox(
              `${hole.id}-rail-${railIndex}`,
              { width: 0.16, height: 0.08, depth: 6.1 },
              scene!,
            ));
            rail.position.set(RAIL_RULES.railPositions[railIndex], 0.61, 0.2);
            rail.material = railIndex === railRef.current ? materials.cyan : materials.steel;
          }

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
          bankFace.material = materials.bark;
          bankFace.receiveShadows = true;
          shadows.addShadowCaster(bankFace);
          registerAggregate(new PhysicsAggregate(
            bankFace,
            PhysicsShapeType.BOX,
            { mass: 0, friction: 0.18, restitution: 0.86 },
            scene!,
          ));
          for (let brace = -4; brace <= 4; brace += 1) {
            const timber = place(MeshBuilder.CreateBox(
              `${hole.id}-bank-timber-${brace}`,
              { width: 1.06, height: 8.8, depth: 0.24 },
              scene!,
            ));
            timber.position.set(bankVolume.x - 0.82, 4.4, bankVolume.z + brace * 2.15);
            timber.material = brace % 2 === 0 ? materials.brick : materials.bark;
          }
          const bankSign = place(MeshBuilder.CreateBox(
            `${hole.id}-bank-sign`,
            { width: 0.18, height: 1.25, depth: 5.4 },
            scene!,
          ));
          bankSign.position.set(bankVolume.x + 0.82, 7.2, bankVolume.z);
          bankSign.material = materials.amber;

          const boostVolume = RANGE_MECHANISMS.boost;
          const boostPad = place(MeshBuilder.CreateBox(
            `${hole.id}-boost-pad`,
            { width: boostVolume.halfWidth * 2, height: 0.24, depth: boostVolume.halfDepth * 2 },
            scene!,
          ));
          boostPad.position.set(boostVolume.x, 0.15, boostVolume.z);
          boostPad.material = materials.boost;
          for (let stripe = -2; stripe <= 2; stripe += 1) {
            const boostStripe = place(MeshBuilder.CreateBox(
              `${hole.id}-boost-stripe-${stripe}`,
              { width: 0.3, height: 0.1, depth: boostVolume.halfDepth * 1.72 },
              scene!,
            ));
            boostStripe.position.set(boostVolume.x + stripe * 1.45, 0.33, boostVolume.z);
            boostStripe.material = stripe % 2 === 0 ? materials.lime : materials.violet;
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
              post.material = materials.amber;
            }
            const lintel = place(MeshBuilder.CreateBox(
              `${hole.id}-gate-lintel`,
              { width: volume.halfWidth * 2 + barWidth, height: barWidth, depth: volume.halfDepth * 2 },
              scene!,
            ));
            lintel.position.set(volume.x, volume.maxY, volume.z);
            lintel.material = materials.amber;

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
            crown.material = materials.leaf;
          };

          const treePattern = [
            [-18, 19, 1.15], [18, 25, 1.05], [-20, 38, 1.3], [21, 52, 1.2],
            [-17, 67, 1.02], [18, 79, 1.25], [-12, hole.courseLength + 4, 1.1],
          ] as const;
          treePattern.forEach(([x, z, scale], index) => makeTree(x, z, scale, String(index)));

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

          if (hole.wind.id !== "calm") {
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
          ghostLine = MeshBuilder.CreateLines(
            `ghost-${memory.holeId}-${memory.projectileId}`,
            { points: memory.points.map((point) => point.clone()) },
            scene!,
          );
          ghostLine.color = new Color3(0.28, 0.82, 0.86);
          ghostLine.alpha = 0.34;
          ghostLine.isPickable = false;
          ghostLine.isVisible = ghostVisibleRef.current;
          if (worldRef.current) worldRef.current.ghostLine = ghostLine;
        };

        const disposeFlight = () => {
          if (!flight) return;
          flight.aggregate.dispose();
          flight.trail?.dispose();
          flight.visual.dispose(false, false);
          flight.bodyMesh.dispose();
          flight = null;
          stopFlightTone();
        };

        const createTheatreRing = (position: Vector3, outcome: Outcome) => {
          const color = outcome === "wet"
            ? new Color3(0.04, 0.55, 0.72)
            : outcome === "ace" || outcome === "double"
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
          ring.rotation.x = Math.PI / 2;
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
            second.position.copyFrom(position).addInPlace(new Vector3(0, 0.12, 0));
            second.rotation.x = Math.PI / 2;
            second.material = secondMaterial;
            theatreFx.push({ mesh: second, material: secondMaterial, bornAt: performance.now(), lifetime: 820, growth: 13 });
          }
        };

        const registerMechanism = (tag: MechanismTag, at: Vector3) => {
          if (!flight || flight.locked || flight.mechanismTags.has(tag)) return false;
          flight.mechanismTags.add(tag);
          flight.contacts.push({
            id: `${flight.projectileId}-${tag}-${flight.contacts.length}`,
            kind: tag,
            point: at.clone(),
          });
          if (tag === "breach") {
            flight.breached = true;
            setMechanismInFlight("BREACH");
          } else {
            setMechanismInFlight(tag === "bank" ? "TIMBER BANK" : "HOT SKIP");
          }
          impactFocus.copyFrom(at);
          playBreach();
          createTheatreRing(at, "breach");
          return true;
        };

        const triggerBreach = (at: Vector3) => {
          if (!registerMechanism("breach", at)) return;
          const hole = HOLES[holeIndexRef.current];
          if (flight && hole.breachRecoveryY !== null) {
            const velocity = flight.aggregate.body.getLinearVelocity();
            const verticalImpulse = verticalRecoveryImpulse(velocity.y, hole.breachRecoveryY);
            if (verticalImpulse > 0) {
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

        const lockRuling = (outcome: Outcome, at: Vector3, contactKind?: EvidenceKind) => {
          if (!flight || flight.locked) return;
          const hole = HOLES[holeIndexRef.current];
          flight.locked = true;
          flight.lockedAt = performance.now();
          impactFocus.copyFrom(at);
          flight.points.push(at.clone());
          if (contactKind) {
            flight.contacts.push({
              id: `${flight.projectileId}-${contactKind}-${flight.contacts.length}`,
              kind: contactKind,
              point: at.clone(),
            });
          }
          const memory: ShotMemory = {
            ...flight.setup,
            holeId: hole.id,
            windId: hole.wind.id,
            projectileId: flight.projectileId,
            points: flight.points.map((point) => point.clone()),
            contacts: flight.contacts.map((contact) => ({
              ...contact,
              point: contact.point.clone(),
            })),
          };
          memoriesRef.current[hole.id] = memory;
          setLastShot(memory);
          const tags = [...flight.mechanismTags];
          const shotResult = resultCopy(hole, outcome, at.clone(), tags);
          flight.pendingResult = shotResult;
          const next = {
            ...recordsRef.current,
            [hole.id]: mergeHoleRecord(recordsRef.current[hole.id], outcome),
          };
          persistRecords(next);
          createTheatreRing(at, outcome);
          playRuling(outcome);
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
          disposeFlight();
          disposeGhost();
          const hole = HOLES[index];
          holeIndexRef.current = index;
          setHoleIndex(index);
          setResult(null);
          setMechanismInFlight(null);
          setSurvey(false);
          surveyRef.current = false;
          chargeRef.current = 0;
          setCharge(0);
          const memory = memoriesRef.current[hole.id];
          const setup = restore && memory ? memory : hole.defaultShot;
          updateSetup(setup);
          createCourse(hole);
          updateLauncher();
          makeGhost(memory);
          setLastShot(memory ?? null);
          impactFocus.set(hole.target.x, 0.5, hole.target.z);
          setGamePhase("ready");
        };

        const beginCharge = () => {
          if (phaseRef.current !== "ready") return;
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
            charge: chargeRef.current,
          };
          const direction = getAimDirection();
          const muzzle = getMuzzle();
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
          shell.material = materials.hot;
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
          flight = {
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
            contacts: [],
            locked: false,
            lockedAt: 0,
            pendingResult: null,
          };
          setResult(null);
          setMechanismInFlight(null);
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

        const resetRound = (restore = false) => {
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
          updateSetup(memory);
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

        actionsRef.current = {
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
          if (event.pointerType === "mouse" && event.button !== 0) return;
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

        const preventContext = (event: MouseEvent) => event.preventDefault();
        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("contextmenu", preventContext);

        scene.onBeforePhysicsObservable.add(() => {
          if (!flight || flight.locked || phaseRef.current !== "flight") return;
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
          const previousLike = { x: previous.x, y: previous.y, z: previous.z };
          const currentLike = { x: current.x, y: current.y, z: current.z };
          let boostedThisStep = false;

          if (!flight.mechanismTags.has("bank")) {
            const amount = segmentSphereAabbIntersection(previousLike, currentLike, RANGE_MECHANISMS.bank);
            if (amount !== null) {
              const point = pointOnSegment(previousLike, currentLike, amount);
              registerMechanism("bank", new Vector3(point.x, point.y, point.z));
            }
          }

          if (!flight.mechanismTags.has("boost")) {
            const amount = segmentSphereAabbIntersection(previousLike, currentLike, RANGE_MECHANISMS.boost);
            const velocity = flight.aggregate.body.getLinearVelocity();
            if (amount !== null && velocity.y < 0) {
              const point = pointOnSegment(previousLike, currentLike, amount);
              if (registerMechanism("boost", new Vector3(point.x, Math.max(0.3, point.y), point.z))) {
                const verticalKick = Math.max(0, 15 - velocity.y) * RAIL_RULES.projectileMass;
                flight.aggregate.body.applyImpulse(
                  new Vector3(0, verticalKick, 4.8 * RAIL_RULES.projectileMass),
                  flight.bodyMesh.position,
                );
                boostedThisStep = true;
              }
            }
          }

          if (!flight.breached && hole.breach) {
            const amount = segmentSphereAabbIntersection(previousLike, currentLike, hole.breach);
            if (amount !== null) {
              const point = pointOnSegment(previousLike, currentLike, amount);
              triggerBreach(new Vector3(point.x, point.y, point.z));
            }
          }

          if (!flight.locked && hole.water) {
            const amount = segmentSphereAabbIntersection(previousLike, currentLike, hole.water);
            if (amount !== null) {
              const point = pointOnSegment(previousLike, currentLike, amount);
              lockRuling("wet", new Vector3(point.x, Math.max(0.14, point.y), point.z), "wet");
            }
          }

          if (!flight.locked && !boostedThisStep) {
            const landing = landingIntersection(previousLike, currentLike);
            if (landing) {
              const targetHit = isAceLanding(hole, landing);
              const outcome = classifyChallengeRuling({
                hole,
                targetHit,
                tags: [...flight.mechanismTags],
              });
              lockRuling(outcome, new Vector3(landing.x, landing.y, landing.z), "first-kiss");
            }
          }

          if (!flight.locked) {
            const outOfBounds =
              Math.abs(current.x) > 45 ||
              current.z > hole.courseLength + 24 ||
              current.z < -15 ||
              current.y < -8 ||
              flight.physicsElapsed > 13;
            if (outOfBounds) {
              lockRuling(
                classifyChallengeRuling({
                  hole,
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

        const saved = loadProgress();
        recordsRef.current = saved;
        setRecords(saved);
        const resumeIndex = chooseResumeHole(saved);
        createCourse(HOLES[resumeIndex]);
        holeIndexRef.current = resumeIndex;
        setHoleIndex(resumeIndex);
        updateSetup(HOLES[resumeIndex].defaultShot);
        impactFocus.set(HOLES[resumeIndex].target.x, 0.5, HOLES[resumeIndex].target.z);

        engine.runRenderLoop(() => {
          if (!scene || disposed) return;
          const now = performance.now();
          const deltaSeconds = Math.min(0.04, engine!.getDeltaTime() / 1000);

          if (mutedRef.current) {
            stopChargeTone();
            stopFlightTone();
          }

          if (phaseRef.current === "charging") {
            const nextCharge = clamp(
              (now - chargeStartedAt) / (RAIL_RULES.chargeSeconds * 1000),
              0,
              1,
            );
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

          const hole = HOLES[holeIndexRef.current];
          const launcherPosition = new Vector3(RAIL_RULES.railPositions[railRef.current], 0.4, 0);
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
            const position = flight.bodyMesh.position;
            const velocity = flight.aggregate.body.getLinearVelocity();
            flight.visual.position.copyFrom(position);
            if (velocity.lengthSquared() > 0.02) {
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
              let followTarget = position.add(travelDirection.scale(9)).add(new Vector3(0, 1.2, 0));
              let followPosition = position.subtract(travelDirection.scale(12)).add(new Vector3(0, 5.5, 0));
              if (velocity.y < 0 && position.z > Math.max(12, hole.target.z - 24)) {
                const green = new Vector3(hole.target.x, 0.75, hole.target.z);
                const focus = Vector3.Lerp(position, green, 0.48);
                followTarget = focus.add(new Vector3(0, 1.2, 0));
                followPosition = focus.add(new Vector3(13, 9.2, -18));
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
                scene.getTransformMatrix(),
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
          canvas.removeEventListener("pointerdown", onPointerDown);
          canvas.removeEventListener("pointermove", onPointerMove);
          canvas.removeEventListener("pointerup", onPointerUp);
          canvas.removeEventListener("pointercancel", onPointerUp);
          canvas.removeEventListener("contextmenu", preventContext);
        };
      } catch (error) {
        console.error(error);
        setBootMessage("The range failed to arm. Reload to try again.");
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
      audioContext?.close().catch(() => undefined);
      scene?.dispose();
      engine?.dispose();
    };
  }, []);

  const hole = HOLES[holeIndex];
  const record = records[hole.id] ?? EMPTY_RECORD;
  const attempt = phase === "theatre" || phase === "result"
    ? Math.max(1, record.attempts)
    : record.attempts + 1;
  const canAim = phase === "ready" || phase === "charging";
  const previousMarker = lastShot?.charge ?? null;

  const beginButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Release still works while the pointer remains over the control.
    }
    actionsRef.current.beginCharge?.();
  };

  const releaseButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    actionsRef.current.release?.();
  };

  const cancelButtonCharge = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    actionsRef.current.cancelCharge?.();
  };

  const beginButtonKeyCharge = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    if (!event.repeat) actionsRef.current.beginCharge?.();
  };

  const releaseButtonKeyCharge = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    actionsRef.current.release?.();
  };

  const outcomeClass = result ? `result-${result.outcome}` : "";
  const nextHoleAvailable = holeIndex < HOLES.length - 1 && holeUnlocked(holeIndex + 1);
  const resultNeedsTrick = Boolean(
    result && hole.requiredTags.length > 0 && result.outcome !== "double",
  );
  const resultCanAdvance = Boolean(result?.clear);

  return (
    <main className="rail-golf-shell manners-shell">
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
          <div>
            <span>WIND</span>
            <strong>{hole.wind.speedLabel}</strong>
          </div>
        </div>
      </header>

      <nav className="manners-scorecard" aria-label="Mechanism Range trick cards">
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
              {item.requiredTags.length ? <i aria-label={`Requires ${item.requiredTags.join(" and ")}`}><em data-earned={itemRecord?.perfect}>◆</em></i> : null}
            </button>
          );
        })}
      </nav>

      <aside className="hole-brief manners-brief">
        <p className="eyebrow">{hole.kicker}</p>
        <strong>{hole.name}</strong>
        <span>{hole.instruction}</span>
      </aside>

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

      <section className="aim-console manners-console" aria-label="Rail shot controls">
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
            <strong>{displayPercent(charge)}</strong>
          </div>
        </div>

        <div
          className="power-track"
          role="progressbar"
          aria-label="Launch power"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(charge * 100)}
          aria-valuetext={displayPercent(charge)}
        >
          <div className="power-fill" style={{ width: `${charge * 100}%` }} />
          {previousMarker !== null && ghostVisible ? (
            <div
              className="last-power-marker"
              style={{ left: `${previousMarker * 100}%` }}
              title={`Last shot ${displayPercent(previousMarker)}`}
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
            onKeyDown={beginButtonKeyCharge}
            onKeyUp={releaseButtonKeyCharge}
            onBlur={() => actionsRef.current.cancelCharge?.()}
            disabled={!canAim}
          >
            <Crosshair />
            <span>{phase === "charging" ? "RELEASE ROUND" : "HOLD TO CHARGE"}</span>
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
          <span className="mobile-control-hint">Drag to aim · hold orange to charge</span>
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
          <RotateCcw /> Reset address
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
          <span>restore exact setup</span>
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

      {phase === "flight" ? (
        <div className="flight-status" role="status">ROUND DOWNRANGE</div>
      ) : null}

      {phase === "theatre" ? (
        <div className="flight-status theatre-status" role="status">RULING LOCKED</div>
      ) : null}

      {mechanismInFlight && (phase === "flight" || phase === "theatre") ? (
        <div className="breach-status" role="status">
          {mechanismInFlight} REGISTERED · {phase === "flight" ? "TARGET STILL LIVE" : "RULING LOCKED"}
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

      {hole.wind.id !== "calm" ? (
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
          <p className="eyebrow">Mechanism Range ruling</p>
          <h2 id="range-result-heading">{result.headline}</h2>
          <p id="range-result-detail">{result.detail}</p>
          {hole.requiredTags.length > 0 && result.outcome !== "double" ? (
            <div className="perfect-callout"><Flag /> Stamp requires {hole.requiredTags.join(" + ").toUpperCase()} → {hole.target.label} in one shot.</div>
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
