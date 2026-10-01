/**
 * Authored idle→hold COCO-17 poses for V4 flexibility holds.
 * Lab + smoke only. Live matching uses catalog metrics (Flexifit angle triplets).
 */

function kp(name, x, y) {
  return { name, x, y, score: 1 };
}

function mixMaps(from, to, t) {
  const u = Math.max(0, Math.min(1, Number(t) || 0));
  const out = new Map();
  const keys = new Set([...from.keys(), ...to.keys()]);
  for (const k of keys) {
    const a = from.get(k) || to.get(k);
    const b = to.get(k) || from.get(k);
    out.set(k, {
      name: k,
      x: a.x + (b.x - a.x) * u,
      y: a.y + (b.y - a.y) * u,
      score: 1,
    });
  }
  return out;
}

function swapSides(points, mirrorX) {
  const out = new Map();
  for (const [name, p] of points) {
    let n = name;
    if (name.startsWith('left_')) n = `right_${name.slice(5)}`;
    else if (name.startsWith('right_')) n = `left_${name.slice(6)}`;
    out.set(n, { name: n, x: mirrorX ? 1 - p.x : p.x, y: p.y, score: p.score ?? 1 });
  }
  return out;
}

function faceHead(sy) {
  return [
    kp('nose', 0.5, sy - 0.105),
    kp('left_eye', 0.46, sy - 0.117),
    kp('right_eye', 0.54, sy - 0.117),
    kp('left_ear', 0.43, sy - 0.105),
    kp('right_ear', 0.57, sy - 0.105),
  ];
}

function profHead(sx, sy) {
  return [
    kp('nose', sx + 0.08, sy - 0.11),
    kp('left_eye', sx + 0.1, sy - 0.12),
    kp('right_eye', sx + 0.07, sy - 0.12),
    kp('left_ear', sx + 0.04, sy - 0.11),
    kp('right_ear', sx + 0.11, sy - 0.11),
  ];
}

function standingIdle(view) {
  const face = view !== 'profile';
  const pts = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.3, 0.37),
        kp('right_elbow', 0.7, 0.37),
        kp('left_wrist', 0.28, 0.51),
        kp('right_wrist', 0.72, 0.51),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.43, 0.68),
        kp('right_knee', 0.57, 0.68),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.47, 0.37),
        kp('right_elbow', 0.53, 0.36),
        kp('left_wrist', 0.46, 0.5),
        kp('right_wrist', 0.545, 0.49),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.51, 0.68),
        kp('right_knee', 0.525, 0.68),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  return new Map(pts.map((p) => [p.name, p]));
}

function mixEnd(view, endFace, endProf, depth, side) {
  const face = view !== 'profile';
  const idle = standingIdle(view);
  let endM = new Map((face ? endFace : endProf).map((p) => [p.name, p]));
  if (side === 'right') endM = swapSides(endM, face);
  return mixMaps(idle, endM, depth);
}

/** Seated middle split — hips low, ankles wide, torso upright. */
export function flexFacialSplitPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.42),
      kp('left_shoulder', 0.36, 0.42),
      kp('right_shoulder', 0.64, 0.42),
      kp('left_elbow', 0.28, 0.52),
      kp('right_elbow', 0.72, 0.52),
      kp('left_wrist', 0.22, 0.62),
      kp('right_wrist', 0.78, 0.62),
      kp('left_hip', 0.42, 0.68),
      kp('right_hip', 0.58, 0.68),
      kp('left_knee', 0.22, 0.7),
      kp('right_knee', 0.78, 0.7),
      kp('left_ankle', 0.08, 0.72),
      kp('right_ankle', 0.92, 0.72),
    ],
    [
      ...profHead(0.5, 0.42),
      kp('left_shoulder', 0.5, 0.42),
      kp('right_shoulder', 0.52, 0.415),
      kp('left_elbow', 0.48, 0.52),
      kp('right_elbow', 0.54, 0.51),
      kp('left_wrist', 0.46, 0.62),
      kp('right_wrist', 0.56, 0.61),
      kp('left_hip', 0.5, 0.68),
      kp('right_hip', 0.52, 0.68),
      kp('left_knee', 0.38, 0.7),
      kp('right_knee', 0.64, 0.7),
      kp('left_ankle', 0.28, 0.72),
      kp('right_ankle', 0.72, 0.72),
    ],
    depth,
  );
}

/** Pancake: seated straddle, torso folded toward the floor. */
export function flexPancakePose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.58),
      kp('left_shoulder', 0.34, 0.58),
      kp('right_shoulder', 0.66, 0.58),
      kp('left_elbow', 0.24, 0.64),
      kp('right_elbow', 0.76, 0.64),
      kp('left_wrist', 0.16, 0.7),
      kp('right_wrist', 0.84, 0.7),
      kp('left_hip', 0.42, 0.66),
      kp('right_hip', 0.58, 0.66),
      kp('left_knee', 0.22, 0.68),
      kp('right_knee', 0.78, 0.68),
      kp('left_ankle', 0.08, 0.72),
      kp('right_ankle', 0.92, 0.72),
    ],
    [
      ...profHead(0.62, 0.7),
      kp('left_shoulder', 0.62, 0.7),
      kp('right_shoulder', 0.64, 0.695),
      kp('left_elbow', 0.7, 0.72),
      kp('right_elbow', 0.72, 0.715),
      kp('left_wrist', 0.78, 0.74),
      kp('right_wrist', 0.8, 0.735),
      kp('left_hip', 0.48, 0.7),
      kp('right_hip', 0.5, 0.7),
      kp('left_knee', 0.62, 0.72),
      kp('right_knee', 0.64, 0.72),
      kp('left_ankle', 0.76, 0.74),
      kp('right_ankle', 0.78, 0.74),
    ],
    depth,
  );
}

/** Pike / closing: legs together, torso folded toward the shins. */
export function flexClosingPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.62),
      kp('left_shoulder', 0.38, 0.62),
      kp('right_shoulder', 0.62, 0.62),
      kp('left_elbow', 0.32, 0.7),
      kp('right_elbow', 0.68, 0.7),
      kp('left_wrist', 0.3, 0.78),
      kp('right_wrist', 0.7, 0.78),
      kp('left_hip', 0.44, 0.66),
      kp('right_hip', 0.56, 0.66),
      kp('left_knee', 0.45, 0.68),
      kp('right_knee', 0.55, 0.68),
      kp('left_ankle', 0.45, 0.72),
      kp('right_ankle', 0.55, 0.72),
    ],
    [
      ...profHead(0.66, 0.7),
      kp('left_shoulder', 0.66, 0.7),
      kp('right_shoulder', 0.68, 0.695),
      kp('left_elbow', 0.72, 0.72),
      kp('right_elbow', 0.74, 0.715),
      kp('left_wrist', 0.78, 0.74),
      kp('right_wrist', 0.8, 0.735),
      kp('left_hip', 0.48, 0.7),
      kp('right_hip', 0.5, 0.7),
      kp('left_knee', 0.58, 0.72),
      kp('right_knee', 0.595, 0.72),
      kp('left_ankle', 0.7, 0.74),
      kp('right_ankle', 0.712, 0.74),
    ],
    depth,
  );
}

/** Wheel / bridge: feet and hands on the floor, hips the highest point. */
export function flexWheelPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.42),
      kp('left_shoulder', 0.28, 0.52),
      kp('right_shoulder', 0.72, 0.52),
      kp('left_elbow', 0.22, 0.68),
      kp('right_elbow', 0.78, 0.68),
      kp('left_wrist', 0.2, 0.84),
      kp('right_wrist', 0.8, 0.84),
      kp('left_hip', 0.4, 0.32),
      kp('right_hip', 0.6, 0.32),
      kp('left_knee', 0.42, 0.52),
      kp('right_knee', 0.58, 0.52),
      kp('left_ankle', 0.44, 0.84),
      kp('right_ankle', 0.56, 0.84),
    ],
    [
      ...profHead(0.36, 0.52),
      kp('left_shoulder', 0.36, 0.52),
      kp('right_shoulder', 0.38, 0.515),
      kp('left_elbow', 0.3, 0.68),
      kp('right_elbow', 0.32, 0.675),
      kp('left_wrist', 0.26, 0.84),
      kp('right_wrist', 0.28, 0.835),
      kp('left_hip', 0.5, 0.3),
      kp('right_hip', 0.52, 0.3),
      kp('left_knee', 0.62, 0.5),
      kp('right_knee', 0.64, 0.5),
      kp('left_ankle', 0.7, 0.84),
      kp('right_ankle', 0.72, 0.84),
    ],
    depth,
  );
}

/** Cobra: prone, hips on the floor, chest lifted, legs long. */
export function flexCobraPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.42),
      kp('left_shoulder', 0.34, 0.48),
      kp('right_shoulder', 0.66, 0.48),
      kp('left_elbow', 0.3, 0.64),
      kp('right_elbow', 0.7, 0.64),
      kp('left_wrist', 0.28, 0.78),
      kp('right_wrist', 0.72, 0.78),
      kp('left_hip', 0.42, 0.74),
      kp('right_hip', 0.58, 0.74),
      kp('left_knee', 0.43, 0.78),
      kp('right_knee', 0.57, 0.78),
      kp('left_ankle', 0.44, 0.84),
      kp('right_ankle', 0.56, 0.84),
    ],
    [
      ...profHead(0.32, 0.46),
      kp('left_shoulder', 0.34, 0.52),
      kp('right_shoulder', 0.36, 0.515),
      kp('left_elbow', 0.3, 0.66),
      kp('right_elbow', 0.32, 0.655),
      kp('left_wrist', 0.28, 0.8),
      kp('right_wrist', 0.3, 0.795),
      kp('left_hip', 0.52, 0.76),
      kp('right_hip', 0.54, 0.76),
      kp('left_knee', 0.66, 0.78),
      kp('right_knee', 0.68, 0.78),
      kp('left_ankle', 0.78, 0.82),
      kp('right_ankle', 0.8, 0.82),
    ],
    depth,
  );
}

/** Bow (Dhanurasana): hips on the mat; thigh–torso opening at the hip is ~144°. */
export function flexBowPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.52),
      kp('left_shoulder', 0.3, 0.58),
      kp('right_shoulder', 0.7, 0.58),
      kp('left_elbow', 0.22, 0.42),
      kp('right_elbow', 0.78, 0.42),
      kp('left_wrist', 0.26, 0.4),
      kp('right_wrist', 0.74, 0.4),
      kp('left_hip', 0.42, 0.78),
      kp('right_hip', 0.58, 0.78),
      kp('left_knee', 0.22, 0.68),
      kp('right_knee', 0.78, 0.68),
      kp('left_ankle', 0.26, 0.4),
      kp('right_ankle', 0.74, 0.4),
    ],
    [
      kp('nose', 0.9, 0.54),
      kp('left_eye', 0.92, 0.53),
      kp('right_eye', 0.89, 0.525),
      kp('left_ear', 0.86, 0.54),
      kp('right_ear', 0.93, 0.53),
      kp('left_shoulder', 0.8, 0.68),
      kp('right_shoulder', 0.82, 0.675),
      kp('left_elbow', 0.58, 0.52),
      kp('right_elbow', 0.6, 0.515),
      kp('left_wrist', 0.32, 0.41),
      kp('right_wrist', 0.34, 0.405),
      kp('left_hip', 0.5, 0.8),
      kp('right_hip', 0.52, 0.8),
      kp('left_knee', 0.16, 0.69),
      kp('right_knee', 0.18, 0.69),
      kp('left_ankle', 0.32, 0.41),
      kp('right_ankle', 0.34, 0.405),
    ],
    depth,
  );
}

/** Tiger: quad stretch — one ankle pulled toward the hip/shoulder. */
export function flexTigerPose(view, depth = 0, side = 'left') {
  return mixEnd(
    view,
    [
      ...faceHead(0.4),
      kp('left_shoulder', 0.34, 0.46),
      kp('right_shoulder', 0.66, 0.46),
      kp('left_elbow', 0.26, 0.4),
      kp('right_elbow', 0.7, 0.5),
      kp('left_wrist', 0.3, 0.34),
      kp('right_wrist', 0.74, 0.62),
      kp('left_hip', 0.42, 0.64),
      kp('right_hip', 0.58, 0.7),
      kp('left_knee', 0.32, 0.5),
      kp('right_knee', 0.58, 0.78),
      kp('left_ankle', 0.38, 0.34),
      kp('right_ankle', 0.58, 0.86),
    ],
    [
      ...profHead(0.34, 0.44),
      kp('left_shoulder', 0.36, 0.5),
      kp('right_shoulder', 0.38, 0.495),
      kp('left_elbow', 0.32, 0.4),
      kp('right_elbow', 0.4, 0.6),
      kp('left_wrist', 0.44, 0.38),
      kp('right_wrist', 0.46, 0.74),
      kp('left_hip', 0.5, 0.64),
      kp('right_hip', 0.52, 0.7),
      kp('left_knee', 0.58, 0.54),
      kp('right_knee', 0.62, 0.78),
      kp('left_ankle', 0.5, 0.4),
      kp('right_ankle', 0.7, 0.86),
    ],
    depth,
    side,
  );
}

/** Camel: kneeling backbend, thighs stacked over the knees. */
export function flexCamelPose(view, depth = 0) {
  return mixEnd(
    view,
    [
      ...faceHead(0.22),
      kp('left_shoulder', 0.34, 0.28),
      kp('right_shoulder', 0.66, 0.28),
      kp('left_elbow', 0.3, 0.46),
      kp('right_elbow', 0.7, 0.46),
      kp('left_wrist', 0.32, 0.78),
      kp('right_wrist', 0.68, 0.78),
      kp('left_hip', 0.42, 0.5),
      kp('right_hip', 0.58, 0.5),
      kp('left_knee', 0.42, 0.78),
      kp('right_knee', 0.58, 0.78),
      kp('left_ankle', 0.4, 0.86),
      kp('right_ankle', 0.6, 0.86),
    ],
    [
      ...profHead(0.62, 0.22),
      kp('left_shoulder', 0.58, 0.32),
      kp('right_shoulder', 0.6, 0.315),
      kp('left_elbow', 0.58, 0.48),
      kp('right_elbow', 0.6, 0.475),
      kp('left_wrist', 0.52, 0.82),
      kp('right_wrist', 0.54, 0.815),
      kp('left_hip', 0.5, 0.5),
      kp('right_hip', 0.52, 0.5),
      kp('left_knee', 0.5, 0.78),
      kp('right_knee', 0.52, 0.78),
      kp('left_ankle', 0.54, 0.86),
      kp('right_ankle', 0.56, 0.86),
    ],
    depth,
  );
}

/** King pigeon: front shin on the floor, backbend toward the rear foot. */
export function flexPigeonPose(view, depth = 0, side = 'left') {
  return mixEnd(
    view,
    [
      ...faceHead(0.22),
      kp('left_shoulder', 0.36, 0.28),
      kp('right_shoulder', 0.64, 0.28),
      kp('left_elbow', 0.3, 0.22),
      kp('right_elbow', 0.7, 0.4),
      kp('left_wrist', 0.34, 0.18),
      kp('right_wrist', 0.72, 0.52),
      kp('left_hip', 0.4, 0.52),
      kp('right_hip', 0.56, 0.54),
      kp('left_knee', 0.26, 0.58),
      kp('right_knee', 0.62, 0.78),
      kp('left_ankle', 0.46, 0.62),
      kp('right_ankle', 0.64, 0.88),
    ],
    [
      ...profHead(0.56, 0.22),
      kp('left_shoulder', 0.56, 0.3),
      kp('right_shoulder', 0.58, 0.295),
      kp('left_elbow', 0.52, 0.22),
      kp('right_elbow', 0.54, 0.4),
      kp('left_wrist', 0.48, 0.16),
      kp('right_wrist', 0.5, 0.5),
      kp('left_hip', 0.46, 0.52),
      kp('right_hip', 0.5, 0.54),
      kp('left_knee', 0.3, 0.58),
      kp('right_knee', 0.6, 0.78),
      kp('left_ankle', 0.4, 0.64),
      kp('right_ankle', 0.64, 0.88),
    ],
    depth,
    side,
  );
}

/** Foot to hand: stand on one leg, other ankle lifted toward the hands. */
export function flexFootToHandPose(view, depth = 0, side = 'left') {
  return mixEnd(
    view,
    [
      ...faceHead(0.205),
      kp('left_shoulder', 0.36, 0.205),
      kp('right_shoulder', 0.64, 0.205),
      kp('left_elbow', 0.4, 0.16),
      kp('right_elbow', 0.62, 0.28),
      kp('left_wrist', 0.46, 0.12),
      kp('right_wrist', 0.58, 0.36),
      kp('left_hip', 0.42, 0.48),
      kp('right_hip', 0.58, 0.48),
      kp('left_knee', 0.44, 0.3),
      kp('right_knee', 0.57, 0.7),
      kp('left_ankle', 0.5, 0.22),
      kp('right_ankle', 0.57, 0.88),
    ],
    [
      ...profHead(0.5, 0.2),
      kp('left_shoulder', 0.5, 0.21),
      kp('right_shoulder', 0.52, 0.205),
      kp('left_elbow', 0.54, 0.16),
      kp('right_elbow', 0.48, 0.32),
      kp('left_wrist', 0.48, 0.18),
      kp('right_wrist', 0.46, 0.4),
      kp('left_hip', 0.5, 0.48),
      kp('right_hip', 0.52, 0.48),
      kp('left_knee', 0.6, 0.34),
      kp('right_knee', 0.51, 0.7),
      kp('left_ankle', 0.56, 0.2),
      kp('right_ankle', 0.505, 0.88),
    ],
    depth,
    side,
  );
}

/** Standing I: vertical split — one ankle high, the other planted. */
export function flexStandingIPose(view, depth = 0, side = 'left') {
  return mixEnd(
    view,
    [
      ...faceHead(0.205),
      kp('left_shoulder', 0.36, 0.205),
      kp('right_shoulder', 0.64, 0.205),
      kp('left_elbow', 0.3, 0.14),
      kp('right_elbow', 0.7, 0.37),
      kp('left_wrist', 0.3, 0.06),
      kp('right_wrist', 0.72, 0.51),
      kp('left_hip', 0.46, 0.48),
      kp('right_hip', 0.56, 0.48),
      kp('left_knee', 0.48, 0.26),
      kp('right_knee', 0.56, 0.7),
      kp('left_ankle', 0.5, 0.06),
      kp('right_ankle', 0.56, 0.88),
    ],
    [
      ...profHead(0.5, 0.2),
      kp('left_shoulder', 0.5, 0.21),
      kp('right_shoulder', 0.52, 0.205),
      kp('left_elbow', 0.5, 0.12),
      kp('right_elbow', 0.52, 0.36),
      kp('left_wrist', 0.5, 0.04),
      kp('right_wrist', 0.54, 0.5),
      kp('left_hip', 0.5, 0.48),
      kp('right_hip', 0.52, 0.48),
      kp('left_knee', 0.5, 0.26),
      kp('right_knee', 0.51, 0.7),
      kp('left_ankle', 0.5, 0.06),
      kp('right_ankle', 0.505, 0.88),
    ],
    depth,
    side,
  );
}

/** Needle: standing fold — chest toward the support thigh, other leg lifted. */
export function flexNeedlePose(view, depth = 0, side = 'left') {
  return mixEnd(
    view,
    [
      ...faceHead(0.62),
      kp('left_shoulder', 0.38, 0.62),
      kp('right_shoulder', 0.62, 0.5),
      kp('left_elbow', 0.34, 0.74),
      kp('right_elbow', 0.66, 0.36),
      kp('left_wrist', 0.36, 0.84),
      kp('right_wrist', 0.68, 0.22),
      kp('left_hip', 0.46, 0.52),
      kp('right_hip', 0.56, 0.5),
      kp('left_knee', 0.46, 0.7),
      kp('right_knee', 0.58, 0.28),
      kp('left_ankle', 0.46, 0.88),
      kp('right_ankle', 0.6, 0.08),
    ],
    [
      ...profHead(0.68, 0.72),
      kp('left_shoulder', 0.66, 0.72),
      kp('right_shoulder', 0.68, 0.55),
      kp('left_elbow', 0.7, 0.8),
      kp('right_elbow', 0.62, 0.38),
      kp('left_wrist', 0.68, 0.88),
      kp('right_wrist', 0.58, 0.24),
      kp('left_hip', 0.5, 0.54),
      kp('right_hip', 0.52, 0.5),
      kp('left_knee', 0.54, 0.72),
      kp('right_knee', 0.48, 0.26),
      kp('left_ankle', 0.54, 0.88),
      kp('right_ankle', 0.46, 0.08),
    ],
    depth,
    side,
  );
}

export const FLEX_POSE = {
  pancake: (view, u) => flexPancakePose(view, u),
  closing: (view, u) => flexClosingPose(view, u),
  bridge: (view, u) => flexWheelPose(view, u),
  cobra: (view, u) => flexCobraPose(view, u),
  bow: (view, u) => flexBowPose(view, u),
  tiger: (view, u, side) => flexTigerPose(view, u, side),
  camel: (view, u) => flexCamelPose(view, u),
  king_pigeon: (view, u, side) => flexPigeonPose(view, u, side),
  foot_to_hand: (view, u, side) => flexFootToHandPose(view, u, side),
  i: (view, u, side) => flexStandingIPose(view, u, side),
  needle: (view, u, side) => flexNeedlePose(view, u, side),
};
