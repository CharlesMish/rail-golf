export const RAIL_RULES = Object.freeze({
  gravity: 12,
  minYaw: -16,
  maxYaw: 16,
  minElevation: 20,
  maxElevation: 68,
  minSpeed: 22,
  maxSpeed: 43,
  chargeSeconds: 1.55,
  projectileMass: 1.5,
  projectileRadius: 0.43,
  landingHeight: 0.92,
  muzzleLength: 5.18,
  railPositions: Object.freeze([-4, 0, 4]),
  theatreMilliseconds: 760,
});

const calm = Object.freeze({ id: "calm", x: 0, z: 0, label: "CALM", speedLabel: "CALM" });

export const RANGE_TARGETS = Object.freeze([
  Object.freeze({ id: "cyan", label: "CYAN SEAT", x: 7, z: 46, radius: 3.6, material: "cyan" }),
  Object.freeze({ id: "amber", label: "AMBER ROOST", x: 6.5, z: 79, radius: 3.4, material: "amber" }),
  Object.freeze({ id: "violet", label: "VIOLET CROWN", x: -6.5, z: 101, radius: 3.8, material: "violet" }),
  Object.freeze({ id: "far", label: "FAR BELL", x: 4, z: 120, radius: 4.1, material: "lime" }),
]);

export const RANGE_MECHANISMS = Object.freeze({
  breach: Object.freeze({
    x: 7.5, z: 66, halfWidth: 2.4, halfDepth: 1.25, minY: 0.25, maxY: 6.4,
  }),
  bank: Object.freeze({
    x: -10.5, z: 54, halfWidth: 0.75, halfDepth: 10, minY: 0.15, maxY: 8.4,
  }),
  boost: Object.freeze({
    x: -3.8, z: 62, halfWidth: 4.5, halfDepth: 4.7, minY: 0.2, maxY: 1.45,
  }),
});

// Hand-authored one-stroke solutions used for regression and course tuning.
export const REFERENCE_SHOTS = Object.freeze({
  "open-seat": Object.freeze({ railIndex: 1, yaw: 8.6, elevation: 20, charge: 0.2 }),
  "timber-bank": Object.freeze({ railIndex: 2, yaw: -14.7, elevation: 36, charge: 0.21 }),
  "hot-skip": Object.freeze({ railIndex: 0, yaw: -2, elevation: 64, charge: 0.3 }),
  "ruckus-line": Object.freeze({ railIndex: 2, yaw: 1.2, elevation: 20, charge: 0.59 }),
});

const sharedRange = Object.freeze({
  courseLength: 132,
  breach: RANGE_MECHANISMS.breach,
  breachRecoveryY: null,
  water: null,
  wind: calm,
  fairwayCenters: Object.freeze([0, 0, -0.2, -0.6, -0.8, -0.5, 0, 0.8, 0.2, -1.5, -2.2, -1, 1.8]),
  survey: Object.freeze({ x: 26, y: 34, z: 56, targetX: 0, targetY: 1.8, targetZ: 75 }),
});

export const HOLES = Object.freeze([
  Object.freeze({
    ...sharedRange,
    id: "open-seat",
    number: "01",
    shortName: "SEAT",
    name: "Open Seat",
    kicker: "Mechanism Range",
    parLabel: "Direct",
    instruction: "Hold orange to charge. Put the first bounce on the near cyan disk.",
    target: RANGE_TARGETS[0],
    requiredTags: Object.freeze([]),
    perfectAvailable: false,
    defaultShot: Object.freeze({ railIndex: 1, yaw: 8.6, elevation: 20 }),
  }),
  Object.freeze({
    ...sharedRange,
    id: "timber-bank",
    number: "02",
    shortName: "BANK",
    name: "Timber Bank",
    kicker: "Mechanism Range",
    parLabel: "Bank / Seat",
    instruction: "Strike the tall timber wall, then seat the same rail on the amber disk.",
    target: RANGE_TARGETS[1],
    requiredTags: Object.freeze(["bank"]),
    perfectAvailable: true,
    defaultShot: Object.freeze({ railIndex: 2, yaw: -14.7, elevation: 36 }),
  }),
  Object.freeze({
    ...sharedRange,
    id: "hot-skip",
    number: "03",
    shortName: "SKIP",
    name: "Hot Skip",
    kicker: "Mechanism Range",
    parLabel: "Boost / Seat",
    instruction: "Touch the glowing launch pad; its powered second arc must find violet.",
    target: RANGE_TARGETS[2],
    requiredTags: Object.freeze(["boost"]),
    perfectAvailable: true,
    defaultShot: Object.freeze({ railIndex: 0, yaw: -2, elevation: 64 }),
  }),
  Object.freeze({
    ...sharedRange,
    id: "ruckus-line",
    number: "04",
    shortName: "RUCKUS",
    name: "Ruckus Line",
    kicker: "Mechanism Range",
    parLabel: "Breach / Bell",
    instruction: "Punch the amber crate gate; its blast lifts the same rail toward the far green bell.",
    target: RANGE_TARGETS[3],
    requiredTags: Object.freeze(["breach"]),
    breachRecoveryY: 8,
    perfectAvailable: true,
    defaultShot: Object.freeze({ railIndex: 2, yaw: 1.2, elevation: 20 }),
  }),
]);

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function stableUnitInterval(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function clampYaw(value) {
  return clamp(value, RAIL_RULES.minYaw, RAIL_RULES.maxYaw);
}

export function clampElevation(value) {
  return clamp(value, RAIL_RULES.minElevation, RAIL_RULES.maxElevation);
}

export function chargeToSpeed(charge) {
  return RAIL_RULES.minSpeed +
    (RAIL_RULES.maxSpeed - RAIL_RULES.minSpeed) * clamp(charge, 0, 1);
}

export function verticalRecoveryImpulse(currentYVelocity, targetYVelocity, mass = RAIL_RULES.projectileMass) {
  if (!Number.isFinite(targetYVelocity) || !Number.isFinite(currentYVelocity) || !Number.isFinite(mass)) return 0;
  return Math.max(0, targetYVelocity - currentYVelocity) * Math.max(0, mass);
}

export function directionFromAim(yawDegrees, elevationDegrees) {
  const yaw = (yawDegrees * Math.PI) / 180;
  const elevation = (elevationDegrees * Math.PI) / 180;
  const horizontal = Math.cos(elevation);
  return {
    x: Math.sin(yaw) * horizontal,
    y: Math.sin(elevation),
    z: Math.cos(yaw) * horizontal,
  };
}

export function muzzleFromShot(shot) {
  const direction = directionFromAim(shot.yaw, shot.elevation);
  return {
    x: RAIL_RULES.railPositions[shot.railIndex] + direction.x * RAIL_RULES.muzzleLength,
    y: 1.55 + direction.y * RAIL_RULES.muzzleLength,
    z: direction.z * RAIL_RULES.muzzleLength,
  };
}

export function shiftRail(index, direction) {
  return Math.round(clamp(index + direction, 0, RAIL_RULES.railPositions.length - 1));
}

export function pointInsideAabb(point, box) {
  return (
    point.x >= box.x - box.halfWidth &&
    point.x <= box.x + box.halfWidth &&
    point.y >= box.minY &&
    point.y <= box.maxY &&
    point.z >= box.z - box.halfDepth &&
    point.z <= box.z + box.halfDepth
  );
}

export function segmentAabbIntersection(start, end, box) {
  const minimum = {
    x: box.x - box.halfWidth,
    y: box.minY,
    z: box.z - box.halfDepth,
  };
  const maximum = {
    x: box.x + box.halfWidth,
    y: box.maxY,
    z: box.z + box.halfDepth,
  };
  let enter = 0;
  let exit = 1;

  for (const axis of ["x", "y", "z"]) {
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-9) {
      if (start[axis] < minimum[axis] || start[axis] > maximum[axis]) return null;
      continue;
    }
    const inverse = 1 / delta;
    let near = (minimum[axis] - start[axis]) * inverse;
    let far = (maximum[axis] - start[axis]) * inverse;
    if (near > far) [near, far] = [far, near];
    enter = Math.max(enter, near);
    exit = Math.min(exit, far);
    if (enter > exit) return null;
  }

  return enter >= 0 && enter <= 1 ? enter : null;
}

export function segmentSphereAabbIntersection(
  start,
  end,
  box,
  radius = RAIL_RULES.projectileRadius,
) {
  const expansion = Math.max(0, radius) + 1e-4;
  const broadphase = segmentAabbIntersection(start, end, {
    ...box,
    halfWidth: box.halfWidth + expansion,
    halfDepth: box.halfDepth + expansion,
    minY: box.minY - expansion,
    maxY: box.maxY + expansion,
  });
  if (broadphase === null) return null;

  const distanceSquaredAt = (amount) => {
    const point = pointOnSegment(start, end, amount);
    const dx = Math.max(box.x - box.halfWidth - point.x, 0, point.x - (box.x + box.halfWidth));
    const dy = Math.max(box.minY - point.y, 0, point.y - box.maxY);
    const dz = Math.max(box.z - box.halfDepth - point.z, 0, point.z - (box.z + box.halfDepth));
    return dx * dx + dy * dy + dz * dz;
  };

  const radiusSquared = expansion * expansion;
  if (distanceSquaredAt(0) <= radiusSquared) return 0;

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 36; iteration += 1) {
    const first = low + (high - low) / 3;
    const second = high - (high - low) / 3;
    if (distanceSquaredAt(first) <= distanceSquaredAt(second)) high = second;
    else low = first;
  }
  const minimum = (low + high) / 2;
  if (distanceSquaredAt(minimum) > radiusSquared) return null;

  low = 0;
  high = minimum;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const middle = (low + high) / 2;
    if (distanceSquaredAt(middle) <= radiusSquared) high = middle;
    else low = middle;
  }
  return high;
}

export function pointOnSegment(start, end, amount) {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
    z: start.z + (end.z - start.z) * amount,
  };
}

export function landingIntersection(start, end, landingHeight = RAIL_RULES.landingHeight) {
  if (start.y <= landingHeight || end.y > landingHeight || end.y >= start.y) return null;
  const amount = (start.y - landingHeight) / (start.y - end.y);
  return pointOnSegment(start, end, amount);
}

export function isAceLanding(hole, point) {
  return Math.hypot(point.x - hole.target.x, point.z - hole.target.z) <=
    hole.target.radius + RAIL_RULES.projectileRadius;
}

export function tagsMeetChallenge(hole, tags = []) {
  return hole.requiredTags.every((tag) => tags.includes(tag));
}

export function classifyChallengeRuling({ hole, targetHit, tags = [], wet = false, outOfBounds = false }) {
  if (wet) return "wet";
  if (targetHit && hole.requiredTags.length > 0 && tagsMeetChallenge(hole, tags)) return "double";
  if (targetHit) return "ace";
  if (tags.length > 0) return "breach";
  return outOfBounds ? "oob" : "miss";
}

export function classifyRuling({ ace, breached, wet = false, outOfBounds = false }) {
  if (wet) return "wet";
  if (ace && breached) return "double";
  if (ace) return "ace";
  if (breached) return "breach";
  return outOfBounds ? "oob" : "miss";
}

export function rulingRank(outcome) {
  if (outcome === "double") return 3;
  if (outcome === "ace") return 2;
  if (outcome === "breach") return 1;
  return 0;
}

export function isClear(outcome) {
  return outcome === "ace" || outcome === "double";
}

export function normalizeHoleRecord(value) {
  if (!value || typeof value !== "object") return null;

  const attempts = Number.isFinite(value.attempts)
    ? Math.max(0, Math.floor(value.attempts))
    : 0;
  const rawOutcome = ["ace", "breach", "double", "wet", "oob", "miss"].includes(value.bestOutcome)
    ? value.bestOutcome
    : null;
  const perfect = value.perfect === true || rawOutcome === "double";
  const hasAce = perfect || value.hasAce === true || rawOutcome === "ace";
  const hasBreach = perfect || value.hasBreach === true || rawOutcome === "breach";
  const bestOutcome = perfect
    ? "double"
    : hasAce
      ? "ace"
      : hasBreach
        ? "breach"
        : rawOutcome;

  return {
    attempts,
    bestOutcome,
    hasAce,
    hasBreach,
    perfect,
    cleared: hasAce,
  };
}

export function mergeHoleRecord(record, outcome) {
  const previous = normalizeHoleRecord(record) ?? {
    attempts: 0,
    bestOutcome: null,
    hasAce: false,
    hasBreach: false,
    perfect: false,
    cleared: false,
  };
  const previousRank = previous.bestOutcome ? rulingRank(previous.bestOutcome) : -1;
  const nextRank = rulingRank(outcome);
  return {
    attempts: previous.attempts + 1,
    bestOutcome: nextRank > previousRank ? outcome : previous.bestOutcome,
    hasAce: previous.hasAce || outcome === "ace" || outcome === "double",
    hasBreach: previous.hasBreach || outcome === "breach" || outcome === "double",
    perfect: previous.perfect || outcome === "double",
    cleared: previous.cleared || isClear(outcome),
  };
}

export function formatMiss(hole, point) {
  const lateral = point.x - hole.target.x;
  const longitudinal = point.z - hole.target.z;
  const parts = [];
  if (Math.abs(longitudinal) >= 0.1) {
    parts.push(`${Math.abs(longitudinal).toFixed(1)} m ${longitudinal < 0 ? "short" : "long"}`);
  }
  if (Math.abs(lateral) >= 0.1) {
    parts.push(`${Math.abs(lateral).toFixed(1)} m ${lateral < 0 ? "left" : "right"}`);
  }
  return parts.length ? parts.join(" · ") : "On the containment line";
}

export function simulateShot(hole, shot, stepSeconds = 1 / 600) {
  const direction = directionFromAim(shot.yaw, shot.elevation);
  const speed = chargeToSpeed(shot.charge);
  let position = muzzleFromShot(shot);
  let velocity = {
    x: direction.x * speed,
    y: direction.y * speed,
    z: direction.z * speed,
  };
  let breached = false;

  for (let elapsed = 0; elapsed < 14; elapsed += stepSeconds) {
    const previous = position;
    velocity = {
      x: velocity.x + hole.wind.x * stepSeconds,
      y: velocity.y - RAIL_RULES.gravity * stepSeconds,
      z: velocity.z + hole.wind.z * stepSeconds,
    };
    position = {
      x: previous.x + velocity.x * stepSeconds,
      y: previous.y + velocity.y * stepSeconds,
      z: previous.z + velocity.z * stepSeconds,
    };

    if (!breached && hole.breach && segmentSphereAabbIntersection(previous, position, hole.breach) !== null) {
      breached = true;
      if (hole.breachRecoveryY !== null) {
        velocity = {
          ...velocity,
          y: Math.max(velocity.y, hole.breachRecoveryY),
        };
      }
    }
    if (hole.water && segmentSphereAabbIntersection(previous, position, hole.water) !== null) {
      return { outcome: "wet", breached, point: position, elapsed };
    }
    const landing = landingIntersection(previous, position);
    if (landing) {
      const ace = isAceLanding(hole, landing);
      return {
        outcome: classifyChallengeRuling({ hole, targetHit: ace, tags: breached ? ["breach"] : [] }),
        breached,
        point: landing,
        elapsed,
      };
    }
    if (Math.abs(position.x) > 45 || position.z > hole.courseLength + 24 || position.z < -15) {
      return { outcome: classifyRuling({ ace: false, breached, outOfBounds: true }), breached, point: position, elapsed };
    }
  }

  return { outcome: classifyRuling({ ace: false, breached, outOfBounds: true }), breached, point: position, elapsed: 14 };
}
