"use client";

import { useEffect, useRef, useState } from "react";
import {
  Engine, Scene, Vector3, Color3, Color4, FreeCamera, HemisphericLight, DirectionalLight,
  ShadowGenerator, MeshBuilder, StandardMaterial, Matrix, HavokPlugin,
  type LinesMesh, type Mesh,
} from "@babylonjs/core";
import HavokPhysics from "@babylonjs/havok";
import { BUILD_ID } from "@/lib/build-identity";
import { COURTYARD_HOLES } from "@/lib/courtyard";
import { RAIL_RULES, clampElevation, clampYaw, chargeFromHold } from "@/lib/rail-golf-v02";
import { stationAim, stationMuzzle, stationRailPosition } from "@/lib/stations";
import {
  LINES_KEY, SESSION_KEY, isLatch, resolveArm, runApproachRecovery, shotRecord, yardChanged,
  type ApproachPose, type AimSetup,
} from "@/lib/approach-prop";
import {
  createContactBook, flightSettled, launchApproachBall, mountApproachYard, observeFlightStep,
  type ApproachYard,
} from "@/lib/approach-prop-scene";
import demo from "@/lib/approach-prop-demo.json";
import styles from "./approach-prop-lab.module.css";

type StationId = "lumber" | "gate" | "gallery";
type Phase = "booting" | "ready" | "charging" | "flight" | "result" | "replay";
type LineMemory = {
  charge: number;
  setup: AimSetup;
  propAtAddress: ApproachPose | null;
  points: number[][];
};
type ShotRow = ReturnType<typeof shotRecord>;

const STATIONS: { id: StationId; label: string; hole: (typeof COURTYARD_HOLES)[number] }[] = [
  { id: "lumber", label: "Lumber Walk", hole: COURTYARD_HOLES[2] },
  { id: "gate", label: "Yard Gate", hole: COURTYARD_HOLES[0] },
  { id: "gallery", label: "Switchback Gallery", hole: COURTYARD_HOLES[1] },
];

const OPENING: AimSetup = { railIndex: 1, yaw: 0, elevation: 30, charge: 0.5 };

function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function contactLine(contacts: string[], skipped: boolean) {
  const names: string[] = contacts.map(key => key === "step-a" ? "Tread 1" : key === "step-b" ? "Tread 2" : key === "step-c" ? "Tread 3" : key === "prop" ? "staged piece" : "").filter(Boolean);
  if (skipped) names.push("Skip pad");
  return names.length ? `Touched ${names.join(", ")}.` : "No named contact.";
}

function addressFrame(hole: (typeof COURTYARD_HOLES)[number], setup: AimSetup) {
  const rail = stationRailPosition(setup.railIndex, hole.station);
  const yaw = ((setup.yaw + (hole.station?.yaw ?? 0)) * Math.PI) / 180;
  const dir = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const origin = new Vector3(rail.x, 0.4, rail.z);
  return {
    position: origin.subtract(dir.scale(15)).add(new Vector3(0, 7.4, 0)),
    target: origin.add(dir.scale(34)).add(new Vector3(0, 3.2, 0)),
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function ApproachPropLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const planRef = useRef("");
  const actions = useRef<{
    fire: (charge: number) => void;
    recovery: (action: string, stationId?: StationId) => void;
    nudge: (yaw: number, elevation: number) => void;
    shiftRail: (direction: number) => void;
    setCharge: (charge: number) => void;
    recallAt: (index: number) => void;
    stopReplay: () => void;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>("booting");
  const [bootMessage, setBootMessage] = useState("Loading Havok");
  const [station, setStation] = useState<StationId>("lumber");
  const [yaw, setYaw] = useState(OPENING.yaw);
  const [elevation, setElevation] = useState(OPENING.elevation);
  const [rail, setRail] = useState(OPENING.railIndex);
  const [power, setPower] = useState(OPENING.charge);
  const [powerMode, setPowerMode] = useState<"set" | "hold">("set");
  const [plan, setPlan] = useState("");
  const [notice, setNotice] = useState("");
  const [resultText, setResultText] = useState("");
  const [continueOffered, setContinueOffered] = useState(false);
  const [ghostOn, setGhostOn] = useState(true);
  const [history, setHistory] = useState<LineMemory[]>([]);
  const [chargeLabel, setChargeLabel] = useState(OPENING.charge);
  const phaseRef = useRef<Phase>("booting");
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let engine: Engine | null = null;
    const armCode = new URLSearchParams(window.location.search).get("k") ?? "";
    const arm = resolveArm(armCode);
    const saved = readJson<{ shots?: ShotRow[] }>(SESSION_KEY, { shots: [] });
    const shots: ShotRow[] = Array.isArray(saved.shots) ? saved.shots : [];
    const lines = readJson<{ lines?: LineMemory[] }>(LINES_KEY, { lines: [] });
    let lineBook: LineMemory[] = Array.isArray(lines.lines) ? lines.lines : [];
    setHistory(lineBook);
    const identity = Matrix.Identity();
    let yard: ApproachYard | null = null;
    let hole = STATIONS[0].hole;
    let setup: AimSetup = { ...OPENING };
    let memory: LineMemory | null = lineBook[0] ?? null;
    let ghostVisible = true;
    let flight: {
      ball: ReturnType<typeof launchApproachBall>;
      book: ReturnType<typeof createContactBook>;
      previous: { x: number; y: number; z: number };
      steps: number;
      settled: number;
      points: number[][];
      setup: AimSetup;
      before: ApproachPose | null;
      plan: string;
      skipped: boolean;
    } | null = null;
    let aimLine: LinesMesh | null = null;
    let ghostLine: LinesMesh | null = null;
    let marker: Mesh | null = null;
    let replay: { started: number; shot: number; stopped: boolean } | null = null;
    let replayPose: ApproachPose | null = null;

    const persist = () => {
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify({ v: 1, shots }));
        window.localStorage.setItem(LINES_KEY, JSON.stringify({ v: 1, lines: lineBook }));
      } catch { /* a blocked store must not stop the shot */ }
    };
    const publishAim = (next: AimSetup) => {
      setup = next;
      setYaw(next.yaw);
      setElevation(next.elevation);
      setRail(next.railIndex);
      setPower(next.charge);
      setChargeLabel(next.charge);
    };
    const look = () => {
      if (!camera) return;
      const frame = addressFrame(hole, setup);
      camera.position.copyFrom(frame.position);
      cameraTarget.copyFrom(frame.target);
      camera.setTarget(cameraTarget);
    };
    let camera: FreeCamera | null = null;
    const cameraTarget = new Vector3();
    const drawAim = (scene: Scene) => {
      aimLine?.dispose();
      const muzzle = stationMuzzle(setup, hole.station);
      const aim = stationAim(setup, hole.station);
      const from = new Vector3(muzzle.x, muzzle.y, muzzle.z);
      const dir = new Vector3(aim.x, aim.y, aim.z);
      aimLine = MeshBuilder.CreateLines("muzzle-aim-spine", { points: [from.add(dir.scale(0.18)), from.add(dir.scale(3.2))] }, scene);
      aimLine.color = new Color3(0.31, 0.9, 0.94);
      aimLine.isPickable = false;
    };
    const drawGhost = (scene: Scene) => {
      ghostLine?.dispose();
      ghostLine = null;
      const points = memory?.points ?? [];
      if (points.length < 2) return;
      ghostLine = MeshBuilder.CreateLines("recorded-ghost", { points: points.map(point => new Vector3(point[0], point[1], point[2])) }, scene);
      ghostLine.color = new Color3(1, 0.7, 0.35);
      ghostLine.isVisible = ghostVisible;
      ghostLine.isPickable = false;
    };
    const finishFlight = (scene: Scene, interrupted: boolean) => {
      if (!flight) return null;
      const after = yard?.pose() ?? null;
      const lean = after?.lean ?? null;
      const offered = yardChanged(lean);
      const row = shotRecord({
        build: BUILD_ID,
        armCode,
        plan: flight.plan,
        timberBefore: flight.before,
        timberAfter: after,
        latched: isLatch(flight.book.propHit, lean),
        continueOffered: offered,
        continueUsed: false,
        treadContacts: flight.book.contacts.filter(key => key.startsWith("step-")),
        firstGround: flight.book.firstGround,
        setup: flight.setup,
        terminal: { x: flight.ball.mesh.position.x, y: flight.ball.mesh.position.y, z: flight.ball.mesh.position.z },
        at: new Date().toISOString(),
      });
      shots.push(row);
      memory = { charge: flight.setup.charge, setup: flight.setup, propAtAddress: flight.before, points: flight.points };
      lineBook = [memory, ...lineBook].slice(0, 8);
      setHistory(lineBook);
      persist();
      setResultText(interrupted ? "Shot interrupted." : contactLine(flight.book.contacts, flight.skipped || flight.book.routes.includes("skip")));
      setContinueOffered(offered);
      flight.ball.dispose();
      flight = null;
      drawGhost(scene);
      return row;
    };

    const boot = async () => {
      const havok = await HavokPhysics();
      if (disposed) return;
      engine = new Engine(canvas, true, { antialias: true, stencil: true });
      engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.5));
      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.075, 0.115, 0.135, 1);
      scene.fogMode = Scene.FOGMODE_LINEAR;
      scene.fogStart = 105;
      scene.fogEnd = 230;
      scene.fogColor = new Color3(0.075, 0.115, 0.135);
      scene.imageProcessingConfiguration.exposure = 1.05;
      scene.imageProcessingConfiguration.contrast = 1.08;
      scene.enablePhysics(new Vector3(0, -RAIL_RULES.gravity, 0), new HavokPlugin(true, havok));
      const physics = scene.getPhysicsEngine();
      physics?.setTimeStep(1 / 120);
      physics?.setSubTimeStep(1000 / 120);
      camera = new FreeCamera("address", new Vector3(22, 7.8, 169), scene);
      camera.fov = 0.69;
      camera.minZ = 0.1;
      camera.maxZ = 280;
      camera.inputs.clear();
      scene.activeCamera = camera;
      const sky = new HemisphericLight("sky", new Vector3(-0.2, 1, -0.1), scene);
      sky.intensity = 0.9;
      sky.diffuse = new Color3(0.7, 0.81, 0.91);
      sky.groundColor = new Color3(0.075, 0.11, 0.07);
      const sun = new DirectionalLight("sun", new Vector3(-0.42, -0.85, 0.35), scene);
      sun.intensity = 1.65;
      sun.diffuse = new Color3(1, 0.83, 0.62);
      const shadows = new ShadowGenerator(1024, sun);
      const makeMaterial = (name: string, diffuse: Color3, emissive = Color3.Black()) => {
        const material = new StandardMaterial(name, scene);
        material.diffuseColor = diffuse;
        material.emissiveColor = emissive;
        return material;
      };
      const materials = {
        rough: makeMaterial("rough", new Color3(0.045, 0.155, 0.09)),
        timber: makeMaterial("timber", new Color3(0.45, 0.28, 0.12), new Color3(0.08, 0.04, 0.01)),
        brick: makeMaterial("brick", new Color3(0.42, 0.265, 0.13)),
        machine: makeMaterial("machine", new Color3(0.085, 0.13, 0.135)),
        bark: makeMaterial("bark", new Color3(0.16, 0.1, 0.06)),
        sand: makeMaterial("sand", new Color3(0.45, 0.38, 0.22)),
        steel: makeMaterial("steel", new Color3(0.29, 0.35, 0.34)),
        amber: makeMaterial("amber", new Color3(0.46, 0.17, 0.035), new Color3(0.4, 0.12, 0.02)),
        boost: makeMaterial("boost", new Color3(0.42, 0.04, 0.22)),
      };
      const mount = (next: (typeof COURTYARD_HOLES)[number]) => {
        flight?.ball.dispose();
        flight = null;
        yard?.dispose();
        hole = next;
        yard = mountApproachYard(scene, { hole: next, materials, shadows, prop: true, placard: true });
        drawAim(scene);
        look();
      };
      mount(hole);
      marker = MeshBuilder.CreateSphere("recording-marker", { diameter: 0.86, segments: 10 }, scene);
      marker.material = materials.amber;
      marker.isVisible = false;
      marker.isPickable = false;
      scene.onBeforePhysicsObservable.add(() => {
        if (replayPose) yard?.preview(replayPose);
        else yard?.holdIfSleeping();
      });
      scene.onAfterPhysicsObservable.add(() => {
        if (!flight || !yard) return;
        flight.steps += 1;
        const current = observeFlightStep(flight.ball, flight.book, hole, flight.previous);
        if (flight.book.routes.includes("skip")) flight.skipped = true;
        if (flight.steps % 4 === 0) flight.points.push([current.x, current.y, current.z]);
        const state = flightSettled(flight.ball, yard.prop, flight.steps, flight.settled);
        flight.settled = state.settled;
        if (!state.done) return;
        finishFlight(scene, false);
        setPhase("result");
        phaseRef.current = "result";
        setNotice("Shot settled.");
      });
      const deps = () => ({
        memory: () => memory,
        livePose: () => yard?.pose() ?? "standing" as const,
        interrupt: () => { if (flight) finishFlight(scene, true); },
        cancel: () => undefined,
        applyPose: (pose: ApproachPose | "standing") => {
          if (hole.station?.id !== "lumber") return;
          yard?.place(pose, { rebuild: true });
        },
        loadAim: (restore: boolean) => {
          publishAim(restore && memory ? memory.setup : { ...OPENING, elevation: hole.defaultShot?.elevation ?? OPENING.elevation });
          drawAim(scene);
          look();
        },
        exactPower: (value: number) => { setPowerMode("set"); publishAim({ ...setup, charge: value }); },
        noteRestore: () => undefined,
        address: () => {
          if (hole.station?.id === "lumber") yard?.adopt();
          setPhase("ready");
          phaseRef.current = "ready";
          look();
        },
        showGhost: () => {
          ghostVisible = !ghostVisible;
          setGhostOn(ghostVisible);
          if (ghostLine) ghostLine.isVisible = ghostVisible;
        },
        loadStation: (id: string) => {
          const next = STATIONS.find(item => item.id === id) ?? STATIONS[0];
          mount(next.hole);
          setStation(next.id);
          publishAim({ ...OPENING, elevation: next.hole.defaultShot?.elevation ?? OPENING.elevation });
          drawAim(scene);
          setContinueOffered(false);
          setResultText("");
          setNotice(next.id === "lumber" ? "Lumber Walk. The staged timber is standing." : "This station has no staged timber.");
          setPhase("ready");
          phaseRef.current = "ready";
        },
        stationId: "lumber",
      });
      const stopReplay = () => {
        if (replay) replay.stopped = true;
        replay = null;
        replayPose = null;
        if (marker) marker.isVisible = false;
        if (hole.station?.id === "lumber") yard?.place("standing", { rebuild: true });
        setPhase("ready");
        phaseRef.current = "ready";
        setNotice("Recording finished. It was not your shot.");
        look();
      };
      const sampleAt = (shotIndex: number, elapsed: number) => {
        const shot = demo.shots[shotIndex];
        if (!shot) return null;
        let chosen = shot.samples[0];
        for (const sample of shot.samples) {
          if (sample.t <= elapsed) chosen = sample;
          else break;
        }
        return chosen;
      };
      actions.current = {
        fire: (charge: number) => {
          if (!yard || phaseRef.current !== "ready" || replay) return;
          const fired: AimSetup = { ...setup, charge };
          publishAim(fired);
          const book = createContactBook();
          const ball = launchApproachBall(scene, hole, { ...fired, originX: 0 }, (event, body) => book.observe(event, body, yard?.prop ?? null));
          ball.mesh.material = materials.amber;
          const before = yard.pose();
          flight = {
            ball, book, previous: { x: ball.mesh.position.x, y: ball.mesh.position.y, z: ball.mesh.position.z },
            steps: 0, settled: 0, points: [[ball.mesh.position.x, ball.mesh.position.y, ball.mesh.position.z]],
            setup: fired, before, plan: planRef.current, skipped: false,
          };
          setPhase("flight");
          phaseRef.current = "flight";
          setNotice("");
          setContinueOffered(false);
        },
        recovery: (action: string, stationId?: StationId) => {
          const pack = deps();
          if (stationId) pack.stationId = stationId;
          if (action === "continue") {
            const last = shots.at(-1);
            if (last) last.continueUsed = true;
            persist();
          }
          const result = runApproachRecovery(action, pack);
          if (action === "adjust") setNotice(result.accepted ? "Last line restored with its starting state and exact power." : "No saved line.");
          if (action === "retry") setNotice("Last setup restored. The yard was left as it is.");
          if (action === "reset") setNotice("Address reset. The staged timber is standing.");
          if (action === "recall") setNotice(result.accepted ? "Recorded aim, power, and starting yard restored." : "No saved line.");
          if (action === "continue") setNotice("Addressing the yard as the last shot left it.");
          if (action !== "ghost" && action !== "station") {
            setPhase("ready");
            phaseRef.current = "ready";
            setContinueOffered(false);
          }
        },
        nudge: (dyaw: number, delev: number) => {
          if (phaseRef.current !== "ready" && phaseRef.current !== "charging") return;
          publishAim({ ...setup, yaw: clampYaw(setup.yaw + dyaw), elevation: clampElevation(setup.elevation + delev) });
          drawAim(scene);
          look();
        },
        shiftRail: (direction: number) => {
          if (phaseRef.current !== "ready") return;
          publishAim({ ...setup, railIndex: Math.max(0, Math.min(2, setup.railIndex + direction)) });
          drawAim(scene);
          look();
        },
        setCharge: (charge: number) => {
          publishAim({ ...setup, charge });
        },
        recallAt: (index: number) => {
          memory = lineBook[index] ?? memory;
          actions.current?.recovery("recall");
        },
        stopReplay,
      };
      engine.runRenderLoop(() => {
        if (!scene || disposed) return;
        if (replay && !replay.stopped) {
          const elapsed = (performance.now() - replay.started) / 1000;
          const shot = demo.shots[replay.shot];
          const duration = shot?.samples.at(-1)?.t ?? 0;
          if (!shot || elapsed > duration + 0.8) {
            if (replay.shot === 0 && demo.shots[1]) {
              replay = { started: performance.now(), shot: 1, stopped: false };
            } else stopReplay();
          } else {
            const sample = sampleAt(replay.shot, Math.min(elapsed, duration));
            if (sample?.pose) replayPose = sample.pose as ApproachPose;
            if (sample && marker) {
              marker.isVisible = true;
              marker.position.set(sample.ball[0], sample.ball[1], sample.ball[2]);
            }
          }
        }
        camera!.getProjectionMatrix();
        const propPoint = yard?.pose();
        const projected = propPoint ? Vector3.Project(new Vector3(propPoint.x, propPoint.y, propPoint.z), identity, camera!.getTransformationMatrix(), camera!.viewport.toGlobal(engine!.getRenderWidth(), engine!.getRenderHeight())) : null;
        const pin = pinRef.current;
        if (pin) {
          const visible = Boolean(projected && phaseRef.current !== "booting" && projected.z > 0 && projected.z < 1);
          pin.dataset.visible = String(visible && Boolean(yard?.prop));
          if (projected && engine) {
            pin.style.left = `${projected.x / engine.getRenderWidth() * canvas.clientWidth}px`;
            pin.style.top = `${projected.y / engine.getRenderHeight() * canvas.clientHeight}px`;
          }
        }
        scene.render();
      });
      setPhase("ready");
      phaseRef.current = "ready";
      setBootMessage("");
      if (arm === "recording") {
        replay = { started: performance.now(), shot: 0, stopped: false };
        setPhase("replay");
        phaseRef.current = "replay";
        setNotice("Recorded demonstration. It is not your shot.");
      }
      const onResize = () => engine?.resize();
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    };
    let removeResize: (() => void) | undefined;
    boot().then(done => { removeResize = done; }).catch(error => {
      if (!disposed) setBootMessage(error instanceof Error ? error.message : String(error));
    });
    return () => {
      disposed = true;
      removeResize?.();
      flight?.ball.dispose();
      yard?.dispose();
      engine?.dispose();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("textarea, input, select")) return;
      if (event.key === "ArrowLeft") actions.current?.nudge(-0.5, 0);
      if (event.key === "ArrowRight") actions.current?.nudge(0.5, 0);
      if (event.key === "ArrowUp") actions.current?.nudge(0, 0.5);
      if (event.key === "ArrowDown") actions.current?.nudge(0, -0.5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ready = phase === "ready";
  const exportSession = () => {
    const payload = readJson(SESSION_KEY, { v: 1, shots: [] });
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "approach-prop-session.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const beginHold = () => {
    if (powerMode !== "hold" || phase !== "ready") return;
    chargeStarted = performance.now();
    setPhase("charging");
    phaseRef.current = "charging";
  };
  const releaseHold = () => {
    if (phaseRef.current !== "charging") return;
    const charge = chargeFromHold(performance.now() - chargeStarted);
    setChargeLabel(charge);
    actions.current?.fire(charge);
  };

  return <main className={styles.shell} data-lab="approach-prop" data-phase={phase} data-station={station} data-continue={continueOffered ? "offered" : "hidden"} data-build={BUILD_ID}>
    <canvas ref={canvasRef} className={styles.canvas} aria-label="Lumber Walk. Drag to aim. The short line at the muzzle is direction, not a predicted landing."
      onPointerDown={event => {
        if (phase !== "ready" && phase !== "charging") return;
        const target = event.target as HTMLElement;
        target.setPointerCapture?.(event.pointerId);
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }}
      onPointerMove={event => {
        const dragState = drag.current;
        if (!dragState || dragState.id !== event.pointerId) return;
        const dx = event.clientX - dragState.x;
        const dy = event.clientY - dragState.y;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
        actions.current?.nudge(dx * 0.075, -dy * 0.075);
      }}
      onPointerUp={() => { drag.current = null; }}
    />
    <div ref={pinRef} className={styles.pin} data-visible="false"><strong>PROP</strong><small>Staged piece</small></div>
    <small className={styles.build}>BUILD {BUILD_ID}</small>
    <section className={styles.brief}>
      <p className={styles.kicker}>APPROACH PROP</p>
      <h1>{STATIONS.find(item => item.id === station)?.label}</h1>
      <p>{station === "lumber" ? "A staged timber piece stands in the approach. It is a yard piece, not a log." : "This station has no staged timber."}</p>
    </section>
    <div className={styles.readout} aria-label="Aim">
      <div><span>YAW</span>{yaw >= 0 ? "+" : ""}{yaw.toFixed(1)}°</div>
      <div><span>ELEV</span>{elevation.toFixed(1)}°</div>
      <div><span>RAIL</span>{rail + 1} / 3</div>
      <div><span>POWER</span>{percent(phase === "charging" ? chargeLabel : power)}</div>
    </div>
    {phase === "replay" && <div className={styles.banner} role="status">
      <p>Recorded demonstration. It is not your shot.</p>
      <button type="button" onClick={() => actions.current?.stopReplay()}>Stop</button>
    </div>}
    {(phase === "booting" || bootMessage) && phase !== "ready" && phase !== "flight" && phase !== "result" && phase !== "replay" && phase !== "charging" ? <div className={styles.boot} role="status">{bootMessage || "Loading Havok"}</div> : null}
    <details className={styles.tools} open>
      <summary>Shot tools · set power {percent(power)}</summary>
      <label>Power control
        <select value={powerMode} disabled={!ready} onChange={event => setPowerMode(event.target.value as "set" | "hold")}>
          <option value="set">Set power</option>
          <option value="hold">Timed hold</option>
        </select>
      </label>
      {powerMode === "set" && <label>Power {percent(power)}
        <input type="range" min="0" max="100" step="0.5" value={power * 100} disabled={!ready} aria-label="Set launch power" onChange={event => actions.current?.setCharge(Number(event.target.value) / 100)} />
      </label>}
      <label>Plan
        <textarea value={plan} aria-label="Plan" placeholder="What are you trying?" onChange={event => { planRef.current = event.target.value; setPlan(event.target.value); }} />
      </label>
      <div className={styles.stations} aria-label="Station">
        {STATIONS.map(item => <button type="button" key={item.id} aria-pressed={station === item.id} disabled={phase === "flight" || phase === "replay" || phase === "charging"} onClick={() => actions.current?.recovery("station", item.id)}>{item.label}</button>)}
      </div>
      <div className={styles.grid}>
        <button type="button" disabled={!ready && phase !== "charging"} onClick={() => actions.current?.nudge(-0.5, 0)}>Yaw −</button>
        <button type="button" disabled={!ready && phase !== "charging"} onClick={() => actions.current?.nudge(0.5, 0)}>Yaw +</button>
        <button type="button" disabled={!ready && phase !== "charging"} onClick={() => actions.current?.nudge(0, 0.5)}>Elev +</button>
        <button type="button" disabled={!ready && phase !== "charging"} onClick={() => actions.current?.nudge(0, -0.5)}>Elev −</button>
        <button type="button" disabled={!ready} onClick={() => actions.current?.shiftRail(-1)}>Rail −</button>
        <button type="button" disabled={!ready} onClick={() => actions.current?.shiftRail(1)}>Rail +</button>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.fire} disabled={!ready && phase !== "charging"}
          onPointerDown={powerMode === "hold" ? beginHold : undefined}
          onPointerUp={powerMode === "hold" ? releaseHold : undefined}
          onClick={powerMode === "set" ? () => actions.current?.fire(power) : undefined}>
          {powerMode === "set" ? `Fire at ${percent(power)}` : phase === "charging" ? "Release round" : "Hold to charge"}
        </button>
        <button type="button" disabled={phase === "flight" || phase === "replay"} onClick={() => actions.current?.recovery("ghost")}>{ghostOn ? "Hide previous line" : "Show previous line"}</button>
        <button type="button" disabled={!ready || !history.length} onClick={() => actions.current?.recovery("recall")}>Restore</button>
        <button type="button" disabled={phase === "flight" || phase === "replay" || phase === "booting"} onClick={() => actions.current?.recovery("reset")}>Reset address</button>
        <button type="button" onClick={exportSession}>Export session</button>
      </div>
      <p className={styles.notice}>Previous line draws a recorded path. It does not predict the next shot. Set power fires the percent on the slider.</p>
      <div className={styles.history}>
        {history.map((line, index) => <button type="button" key={`${line.setup.yaw}-${line.setup.elevation}-${index}`} disabled={!ready} onClick={() => actions.current?.recallAt(index)}>
          Y{line.setup.yaw.toFixed(1)} E{line.setup.elevation.toFixed(1)} {percent(line.setup.charge)}
        </button>)}
      </div>
    </details>
    {phase === "flight" && <button type="button" className={styles.banner} onClick={() => actions.current?.recovery("retry")}>Retry</button>}
    {phase === "result" && <section className={styles.result} aria-label="Shot result">
      <h2>Shot settled</h2>
      <p>{resultText}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => actions.current?.recovery("adjust")}>Adjust Last Line</button>
        <button type="button" onClick={() => actions.current?.recovery("retry")}>Retry</button>
        {continueOffered && <button type="button" onClick={() => actions.current?.recovery("continue")}>Continue in Changed Yard</button>}
      </div>
      {notice && <p className={styles.notice}>{notice}</p>}
    </section>}
    {notice && phase === "ready" && <p className={`${styles.notice} ${styles.banner}`} role="status">{notice}</p>}
  </main>;
}

const drag = { current: null as { id: number; x: number; y: number } | null };
let chargeStarted = 0;
