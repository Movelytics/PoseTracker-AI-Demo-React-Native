/**
 * Canonical 2D poses for the internal heuristics lab (not used at runtime).
 * Identity / camera-approach filters are intentionally ignored here.
 */
import { computeMetrics, evalWhen, pickPhase } from './metrics.js';
import { GRADE_BANDS, depthScore, gradeOf } from './grade.js';
import { snapshotReachRest, buildReachGeometry, reachArcPath } from './reach.js';
import { OFFICIAL_POSE } from './officialPoses.js';

export const COCO17 = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

export const COCO_BONES = [
  ['nose', 'left_eye'],
  ['nose', 'right_eye'],
  ['left_eye', 'left_ear'],
  ['right_eye', 'right_ear'],
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
];

export const GRADE_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Representative score at the centre of each band (F = below E). */
const GRADE_SCORE = { A: 95, B: 85, C: 75, D: 65, E: 50, F: 18 };

const UPPER = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
];

function kp(name, x, y) {
  return { name, x, y, score: 1 };
}

function cloneMap(src) {
  const out = new Map();
  for (const [k, v] of src) out.set(k, { name: v.name, x: v.x, y: v.y, score: v.score ?? 1 });
  return out;
}

/** Keep the rear shin length on profile lunges — the foot goes back, the tibia does not compress. */
function preserveRearShin(from, mixed, view, side) {
  if (view !== 'profile') return mixed;
  const kneeName = `${side}_knee`;
  const ankleName = `${side}_ankle`;
  const k0 = from.get(kneeName);
  const a0 = from.get(ankleName);
  const k = mixed.get(kneeName);
  const a = mixed.get(ankleName);
  if (!k0 || !a0 || !k || !a) return mixed;
  const len = Math.hypot(a0.x - k0.x, a0.y - k0.y);
  if (!(len > 0.04)) return mixed;
  let dx = a.x - k.x;
  let dy = a.y - k.y;
  let cur = Math.hypot(dx, dy);
  if (cur < 1e-4) {
    dx = -len;
    dy = 0;
    cur = len;
  }
  const s = len / cur;
  mixed.set(ankleName, { name: a.name, x: k.x + dx * s, y: k.y + dy * s, score: a.score ?? 1 });
  return mixed;
}

function mixMaps(from, to, t) {
  const out = new Map();
  const keys = new Set([...from.keys(), ...to.keys()]);
  for (const k of keys) {
    const a = from.get(k) || to.get(k);
    const b = to.get(k) || from.get(k);
    out.set(k, {
      name: k,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      score: 1,
    });
  }
  return out;
}

function stampMidHip(points) {
  const lh = points.get('left_hip');
  const rh = points.get('right_hip');
  if (!lh || !rh) return points;
  setPoint(points, 'middle_hip', (lh.x + rh.x) / 2, (lh.y + rh.y) / 2);
  return points;
}

export function isSplitMovement(movement) {
  return movement?.id === 'split' || movement?.id === 'facial_split';
}

const FLEX_HOLD_IDS = new Set([
  'split',
  'facial_split',
  'pancake',
  'closing',
  'bridge',
  'cobra',
  'bow',
  'tiger',
  'camel',
  'king_pigeon',
  'foot_to_hand',
  'i',
  'needle',
]);

/** Flexibility holds: lab shows the final stretch, not an idle→hold mix. */
export function isFlexHold(movement) {
  return FLEX_HOLD_IDS.has(movement?.id);
}

/** Closed → 180° hold → close. Peak is a straight ankle–hip–ankle line. */
function splitOpenAmount(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  if (x <= 0.42) return smoothstep(x / 0.42);
  if (x <= 0.62) return 1;
  return 1 - smoothstep((x - 0.62) / 0.38);
}

function frontSplitOpen() {
  const points = standingPose('profile');
  const y = 0.72;
  setPoint(points, 'left_ankle', 0.08, y);
  setPoint(points, 'left_knee', 0.28, y);
  setPoint(points, 'left_hip', 0.48, y);
  setPoint(points, 'right_hip', 0.52, y);
  setPoint(points, 'right_knee', 0.72, y);
  setPoint(points, 'right_ankle', 0.92, y);
  setPoint(points, 'left_shoulder', 0.49, 0.36);
  setPoint(points, 'right_shoulder', 0.515, 0.34);
  setPoint(points, 'left_elbow', 0.42, 0.5);
  setPoint(points, 'right_elbow', 0.58, 0.48);
  setPoint(points, 'left_wrist', 0.34, 0.64);
  setPoint(points, 'right_wrist', 0.66, 0.64);
  setPoint(points, 'nose', 0.53, 0.14);
  setPoint(points, 'left_eye', 0.54, 0.12);
  setPoint(points, 'right_eye', 0.52, 0.12);
  setPoint(points, 'left_ear', 0.5, 0.14);
  setPoint(points, 'right_ear', 0.55, 0.14);
  return stampMidHip(points);
}

function facialSplitOpen() {
  const points = standingPose('face');
  const y = 0.72;
  setPoint(points, 'left_ankle', 0.08, y);
  setPoint(points, 'left_knee', 0.26, y);
  setPoint(points, 'left_hip', 0.46, y);
  setPoint(points, 'right_hip', 0.54, y);
  setPoint(points, 'right_knee', 0.74, y);
  setPoint(points, 'right_ankle', 0.92, y);
  setPoint(points, 'left_shoulder', 0.38, 0.34);
  setPoint(points, 'right_shoulder', 0.62, 0.34);
  setPoint(points, 'left_elbow', 0.28, 0.48);
  setPoint(points, 'right_elbow', 0.72, 0.48);
  setPoint(points, 'left_wrist', 0.2, 0.6);
  setPoint(points, 'right_wrist', 0.8, 0.6);
  setPoint(points, 'nose', 0.5, 0.12);
  setPoint(points, 'left_eye', 0.46, 0.1);
  setPoint(points, 'right_eye', 0.54, 0.1);
  setPoint(points, 'left_ear', 0.42, 0.12);
  setPoint(points, 'right_ear', 0.58, 0.12);
  return stampMidHip(points);
}

export function synthesizeSplitPose(movement, t) {
  const facial = movement?.id === 'facial_split';
  const closed = stampMidHip(standingPose(facial ? 'face' : 'profile'));
  const open = facial ? facialSplitOpen() : frontSplitOpen();
  return stampMidHip(mixMaps(closed, open, splitOpenAmount(t)));
}

/** Yellow arc at the hip: left_ankle → hip → right_ankle. */
export function hipSplitOverlay(points) {
  const la = points.get('left_ankle');
  const ra = points.get('right_ankle');
  const hip =
    points.get('middle_hip') ||
    (() => {
      const lh = points.get('left_hip');
      const rh = points.get('right_hip');
      if (!lh || !rh) return null;
      return { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
    })();
  if (!la || !ra || !hip) return [];
  return [
    {
      id: 'split-hip',
      a: 'left_ankle',
      vertex: 'middle_hip',
      c: 'right_ankle',
      degrees: angleAt(la, hip, ra),
    },
  ];
}

function setPoint(points, name, x, y) {
  const prev = points.get(name);
  points.set(name, { name, x, y, score: prev?.score ?? 1 });
}

function translate(points, names, dx, dy) {
  for (const n of names) {
    const p = points.get(n);
    if (!p) continue;
    setPoint(points, n, p.x + dx, p.y + dy);
  }
}

function rotateAround(p, origin, rad) {
  const dx = p.x - origin.x;
  const dy = p.y - origin.y;
  return {
    x: origin.x + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: origin.y + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function angleAt(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const magBa = Math.hypot(ba.x, ba.y) || 1e-6;
  const magBc = Math.hypot(bc.x, bc.y) || 1e-6;
  const cos = Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function standingPose(view) {
  const face = view !== 'profile';
  const pts = face
    ? [
        kp('nose', 0.5, 0.1),
        kp('left_eye', 0.46, 0.088),
        kp('right_eye', 0.54, 0.088),
        kp('left_ear', 0.43, 0.1),
        kp('right_ear', 0.57, 0.1),
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
        kp('nose', 0.58, 0.1),
        kp('left_eye', 0.6, 0.09),
        kp('right_eye', 0.57, 0.09),
        kp('left_ear', 0.54, 0.1),
        kp('right_ear', 0.61, 0.1),
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

/**
 * Floor push-up. drop=0 high plank (arms extended), drop=1 bottom
 * (shoulders at/below elbows, wrists planted). Face looks at the camera;
 * profile is a side plank. Ankles stay near the wrist floor line.
 */
export function pushUpPlankPose(view, drop = 0) {
  const u = Math.max(0, Math.min(1, Number(drop) || 0));
  const face = view !== 'profile';
  const mix = (a, b) => a + (b - a) * u;
  const pts = face
    ? [
        kp('nose', 0.5, mix(0.36, 0.56)),
        kp('left_eye', 0.46, mix(0.348, 0.548)),
        kp('right_eye', 0.54, mix(0.348, 0.548)),
        kp('left_ear', 0.43, mix(0.36, 0.56)),
        kp('right_ear', 0.57, mix(0.36, 0.56)),
        kp('left_shoulder', 0.36, mix(0.46, 0.66)),
        kp('right_shoulder', 0.64, mix(0.46, 0.66)),
        kp('left_elbow', mix(0.32, 0.22), mix(0.6, 0.62)),
        kp('right_elbow', mix(0.68, 0.78), mix(0.6, 0.62)),
        kp('left_wrist', 0.26, 0.74),
        kp('right_wrist', 0.74, 0.74),
        kp('left_hip', 0.42, mix(0.58, 0.67)),
        kp('right_hip', 0.58, mix(0.58, 0.67)),
        kp('left_knee', 0.44, mix(0.63, 0.675)),
        kp('right_knee', 0.56, mix(0.63, 0.675)),
        kp('left_ankle', 0.45, 0.68),
        kp('right_ankle', 0.55, 0.68),
      ]
    : [
        kp('nose', 0.22, mix(0.42, 0.58)),
        kp('left_eye', 0.2, mix(0.41, 0.57)),
        kp('right_eye', 0.23, mix(0.405, 0.565)),
        kp('left_ear', 0.26, mix(0.42, 0.58)),
        kp('right_ear', 0.19, mix(0.42, 0.58)),
        kp('left_shoulder', 0.3, mix(0.46, 0.655)),
        kp('right_shoulder', 0.32, mix(0.45, 0.645)),
        kp('left_elbow', mix(0.3, 0.42), mix(0.59, 0.64)),
        kp('right_elbow', mix(0.32, 0.44), mix(0.58, 0.63)),
        kp('left_wrist', 0.3, 0.72),
        kp('right_wrist', 0.32, 0.71),
        kp('left_hip', 0.52, mix(0.505, 0.58)),
        kp('right_hip', 0.54, mix(0.495, 0.57)),
        kp('left_knee', 0.68, mix(0.603, 0.58)),
        kp('right_knee', 0.7, mix(0.593, 0.57)),
        kp('left_ankle', 0.84, 0.7),
        kp('right_ankle', 0.86, 0.69),
      ];
  const oriented = face ? pts : pts.map((p) => kp(p.name, 1 - p.x, p.y));
  return new Map(oriented.map((p) => [p.name, p]));
}

/** Forearm plank: elbows under the shoulders on the floor, wrists toward the head (~90°). */
export function forearmPlankPose(view) {
  const points = pushUpPlankPose(view, 0);
  for (const side of ['left', 'right']) {
    const sh = points.get(`${side}_shoulder`);
    const wr = points.get(`${side}_wrist`);
    if (!sh || !wr) continue;
    const floorY = wr.y;
    const towardHead = sh.x >= 0.5 ? 1 : -1;
    points.set(`${side}_elbow`, { name: `${side}_elbow`, x: sh.x, y: floorY, score: 1 });
    points.set(`${side}_wrist`, { name: `${side}_wrist`, x: sh.x + towardHead * 0.12, y: floorY, score: 1 });
  }
  return points;
}

function swapSides(points, mirrorX) {
  const out = new Map();
  for (const [name, p] of points) {
    let n = name;
    if (name.startsWith('left_')) n = `right_${name.slice(5)}`;
    else if (name.startsWith('right_')) n = `left_${name.slice(6)}`;
    const x = mirrorX ? 1 - p.x : p.x;
    out.set(n, { name: n, x, y: p.y, score: p.score ?? 1 });
  }
  return out;
}

/**
 * Split-squat lunge. drop=0 standing, drop=1 both hips down / rear knee toward the floor.
 * `side` is the knee that goes to the ground (same-side or alternating both count).
 */
export function lungeKneelPose(view, drop = 0, side = 'left') {
  const u = Math.max(0, Math.min(1, Number(drop) || 0));
  const high = standingPose(view);
  let low = lungeKneelBottom(view);
  if (side === 'right') low = swapSides(low, true);
  return preserveRearShin(high, mixMaps(high, low, u), view, side);
}

/** `side_lunge` is a catalog alias of `lunge` — same authored pose. */
export function sideLungeKneelPose(view, drop = 0, side = 'left') {
  return lungeKneelPose(view, drop, side);
}

function isLungeFamily(movement) {
  return movement?.id === 'lunge' || movement?.id === 'side_lunge';
}

function isHighKnees(movement) {
  return movement?.id === 'high_knees';
}

function isTwoSidedRep(movement) {
  return (
    isLungeFamily(movement) ||
    isHighKnees(movement) ||
    movement?.id === 'mountain_climber' ||
    movement?.id === 'low_impact_jack' ||
    movement?.id === 'balance_leg' ||
    movement?.id === 'tiger' ||
    movement?.id === 'king_pigeon' ||
    movement?.id === 'foot_to_hand' ||
    movement?.id === 'i' ||
    movement?.id === 'needle'
  );
}

export function isAlternatingRep(movement) {
  return isTwoSidedRep(movement);
}

export function isStaticShapeHold(movement) {
  return movement?.id === 'wall_sit';
}

/** Duration holds that still have an authored idle→hold preview (not the chair-fold silhouette). */
export function isAnimatedHold(movement) {
  return (
    movement?.type === 'duration' &&
    Boolean(OFFICIAL_POSE[movement?.id]) &&
    !isFlexHold(movement) &&
    !isStaticShapeHold(movement)
  );
}

/** Catalog views allowed by `lock`. Locked movements never expose the other camera. */
export function labViews(movement) {
  const available = ['face', 'profile'].filter((v) => movement?.views?.[v]);
  if (movement?.lock === 'require_profile') return available.filter((v) => v === 'profile');
  if (movement?.lock === 'require_face') return available.filter((v) => v === 'face');
  return available;
}

export function resolveLabView(movement, requested) {
  const allowed = labViews(movement);
  if (requested && allowed.includes(requested)) return requested;
  return allowed[0] || requested || 'face';
}

export function hasDualLabViews(movement) {
  return labViews(movement).length > 1;
}

/** One playback loop = left rep then right rep. */
export function lungePlaybackClock(t) {
  const x = ((Number(t) || 0) % 1 + 1) % 1;
  return { side: x < 0.5 ? 'left' : 'right', t: x < 0.5 ? x * 2 : (x - 0.5) * 2 };
}

function lungeFamilyPose(_movement, view, drop = 0, side = 'left') {
  return lungeKneelPose(view, drop, side);
}

/**
 * High knees. lift=0 standing, lift=1 drive `side` knee to hip height (thigh ~parallel).
 * The other leg stays the support. Hips stay high — not a squat or lunge.
 */
export function highKneesPose(view, lift = 0, side = 'left') {
  const u = Math.max(0, Math.min(1, Number(lift) || 0));
  const high = standingPose(view);
  let low = highKneesTop(view);
  if (side === 'right') low = swapSides(low, true);
  return preserveRearShin(high, mixMaps(high, low, u), view, side);
}

function highKneesTop(view) {
  const face = view !== 'profile';
  const pts = face
    ? [
        kp('nose', 0.5, 0.1),
        kp('left_eye', 0.46, 0.088),
        kp('right_eye', 0.54, 0.088),
        kp('left_ear', 0.43, 0.1),
        kp('right_ear', 0.57, 0.1),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.28, 0.42),
        kp('right_elbow', 0.68, 0.3),
        kp('left_wrist', 0.26, 0.54),
        kp('right_wrist', 0.72, 0.2),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.4, 0.47),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.38, 0.65),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        kp('nose', 0.58, 0.1),
        kp('left_eye', 0.6, 0.09),
        kp('right_eye', 0.57, 0.09),
        kp('left_ear', 0.54, 0.1),
        kp('right_ear', 0.61, 0.1),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.44, 0.34),
        kp('right_elbow', 0.56, 0.3),
        kp('left_wrist', 0.42, 0.46),
        kp('right_wrist', 0.6, 0.22),
        kp('left_hip', 0.5, 0.48),
        kp('right_hip', 0.52, 0.48),
        kp('left_knee', 0.66, 0.48),
        kp('right_knee', 0.51, 0.69),
        kp('left_ankle', 0.7, 0.66),
        kp('right_ankle', 0.505, 0.88),
      ];
  return new Map(pts.map((p) => [p.name, p]));
}

function lungeKneelBottom(view) {
  const face = view !== 'profile';
  const pts = face
    ? [
        kp('nose', 0.5, 0.22),
        kp('left_eye', 0.46, 0.208),
        kp('right_eye', 0.54, 0.208),
        kp('left_ear', 0.43, 0.22),
        kp('right_ear', 0.57, 0.22),
        kp('left_shoulder', 0.36, 0.34),
        kp('right_shoulder', 0.62, 0.34),
        kp('left_elbow', 0.32, 0.48),
        kp('right_elbow', 0.66, 0.48),
        kp('left_wrist', 0.3, 0.6),
        kp('right_wrist', 0.68, 0.6),
        kp('left_hip', 0.42, 0.62),
        kp('right_hip', 0.54, 0.62),
        kp('left_knee', 0.44, 0.86),
        kp('right_knee', 0.54, 0.68),
        kp('left_ankle', 0.44, 0.875),
        kp('right_ankle', 0.54, 0.88),
      ]
    : [
        kp('nose', 0.54, 0.24),
        kp('left_eye', 0.56, 0.23),
        kp('right_eye', 0.53, 0.23),
        kp('left_ear', 0.5, 0.24),
        kp('right_ear', 0.57, 0.24),
        kp('left_shoulder', 0.46, 0.36),
        kp('right_shoulder', 0.5, 0.35),
        kp('left_elbow', 0.42, 0.5),
        kp('right_elbow', 0.54, 0.48),
        kp('left_wrist', 0.4, 0.62),
        kp('right_wrist', 0.56, 0.6),
        kp('left_hip', 0.46, 0.62),
        kp('right_hip', 0.52, 0.62),
        // Rear shin stays ~standing length; the foot travels backward so the knee can drop.
        kp('left_knee', 0.36, 0.86),
        kp('right_knee', 0.7, 0.68),
        kp('left_ankle', 0.18, 0.9),
        kp('right_ankle', 0.72, 0.88),
      ];
  return new Map(pts.map((p) => [p.name, p]));
}

function expandPointName(name) {
  if (name.startsWith('left_')) return [name, `right_${name.slice(5)}`];
  if (name.startsWith('right_')) return [name, `left_${name.slice(6)}`];
  return [name];
}

export function collectUsedKeypoints(viewSpec, movement) {
  const used = new Set();
  for (const def of viewSpec?.metrics || []) {
    for (const n of def.points || []) {
      if (def.side === 'best' || def.side === 'right' || def.side === 'left') {
        expandPointName(n).forEach((x) => used.add(x));
      } else {
        used.add(n);
      }
    }
    if (def.a) expandPointName(def.a).forEach((x) => used.add(x));
    if (def.b) expandPointName(def.b).forEach((x) => used.add(x));
    if (def.ref_a) expandPointName(def.ref_a).forEach((x) => used.add(x));
    if (def.ref_b) expandPointName(def.ref_b).forEach((x) => used.add(x));
  }
  if (movement?.cycle?.anchor) used.add(movement.cycle.anchor);
  for (const n of movement?.cycle?.points || []) used.add(n);
  return used;
}

export function collectUsedBones(used) {
  return COCO_BONES.filter(([a, b]) => used.has(a) && used.has(b));
}

export function flattenWhen(when) {
  if (!when) return [];
  if (when.all) return when.all.flatMap((w) => flattenWhen(w));
  if (when.any) {
    return [{ kind: 'any', items: when.any.map((w) => flattenWhen(w)) }];
  }
  return [{ kind: 'pred', metric: when.metric, op: when.op, value: when.value }];
}

export function metricsInWhen(when, acc = new Set()) {
  if (!when) return acc;
  if (when.all) when.all.forEach((w) => metricsInWhen(w, acc));
  else if (when.any) when.any.forEach((w) => metricsInWhen(w, acc));
  else if (when.metric) acc.add(when.metric);
  return acc;
}

export function depthMetricId(movement, view) {
  const g = movement.grade || {};
  return view === 'profile' ? g.depth_metric_profile : g.depth_metric_face;
}

export function depthAnchors(movement, view) {
  const g = movement.grade || {};
  if (view === 'profile') {
    return {
      ideal: g.ideal_profile ?? g.ideal,
      worst: g.worst_profile ?? g.worst,
    };
  }
  return {
    ideal: g.ideal_face ?? g.ideal,
    worst: g.worst_face ?? g.worst,
  };
}

export function gradeDepthValue(movement, view, letter) {
  const { ideal, worst } = depthAnchors(movement, view);
  if (ideal == null || worst == null) return null;
  const score = GRADE_SCORE[letter] ?? 50;
  return ideal + (1 - score / 100) * (worst - ideal);
}

function findDef(defs, id) {
  return (defs || []).find((d) => d.id === id);
}

function resolveChain(def) {
  const names = def.points || [];
  if (def.side === 'right') {
    return names.map((n) => (n.startsWith('left_') ? `right_${n.slice(5)}` : n));
  }
  return names;
}

function applySegmentRatioY(points, def, value) {
  const names = resolveChain(def);
  if (names.length !== 3 || value == null) return;
  const hip = points.get(names[0]);
  const knee = points.get(names[1]);
  const ankle = points.get(names[2]);
  if (!hip || !knee || !ankle) return;
  const shin = ankle.y - knee.y;
  if (Math.abs(shin) < 1e-6) return;
  setPoint(points, names[0], hip.x, knee.y - value * shin);
}

function applyAngle3(points, def, value) {
  const names = resolveChain(def);
  if (names.length !== 3 || value == null) return 0;
  const hip = points.get(names[0]);
  const knee = points.get(names[1]);
  const ankle = points.get(names[2]);
  if (!hip || !knee || !ankle) return 0;
  const current = angleAt(hip, knee, ankle);
  const mag = ((current - value) * Math.PI) / 180;
  const c1 = rotateAround(hip, knee, mag);
  const c2 = rotateAround(hip, knee, -mag);
  const squat = c1.y >= c2.y ? { pose: c1, rad: mag } : { pose: c2, rad: -mag };
  setPoint(points, names[0], squat.pose.x, squat.pose.y);
  return squat.rad;
}

function applyMetricValue(defs, def, points, value, view) {
  if (!def || value == null) return 0;
  if (def.kind === 'min_of' || def.kind === 'max_of' || def.kind === 'mean_of') {
    let rad = 0;
    for (const id of def.of || []) {
      rad = applyMetricValue(defs, findDef(defs, id), points, value, view) || rad;
    }
    return rad;
  }
  if (def.kind === 'coalesce') {
    return applyMetricValue(defs, findDef(defs, def.of?.[0]), points, value, view);
  }
  if (def.kind === 'segment_ratio_y') {
    applySegmentRatioY(points, def, value);
    return 0;
  }
  if (def.kind === 'angle3') {
    return applyAngle3(points, def, value);
  }
  return 0;
}

function followUpperBody(points, beforeHips, afterHips, extraRad, pivot) {
  const dx = (afterHips.x - beforeHips.x) || 0;
  const dy = (afterHips.y - beforeHips.y) || 0;
  translate(points, UPPER, dx, dy);
  if (!extraRad || !pivot) return;
  for (const n of UPPER) {
    const p = points.get(n);
    if (!p) continue;
    const r = rotateAround(p, pivot, extraRad * 0.28);
    setPoint(points, n, r.x, r.y);
  }
}

function hipMid(points) {
  const l = points.get('left_hip');
  const r = points.get('right_hip');
  if (!l || !r) return l || r;
  return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
}

/**
 * Pose whose depth metric equals `depthValue` (ratio or degrees).
 */
export function synthesizeOrbitPose(movement, t, gradeLetter, rotation = 'internal') {
  const points = standingPose('face');
  const lift = gradeDepthValue(movement, 'face', gradeLetter || 'A') ?? 0.05;
  const ry = lift / 2;
  const rx = movement.cycle?.guide?.rx ?? Math.max(0.004, lift * 0.18);
  const ang = (Number(t) || 0) * Math.PI * 2 - Math.PI / 2;
  const inward = rotation !== 'external';
  const shift = (side) => {
    const sh = points.get(`${side}_shoulder`);
    const el = points.get(`${side}_elbow`);
    const wr = points.get(`${side}_wrist`);
    if (!sh) return;
    const flipX = side === 'right' ? (inward ? -1 : 1) : inward ? 1 : -1;
    const nx = sh.x + flipX * rx * Math.cos(ang);
    const ny = sh.y + ry * (Math.sin(ang) - 1);
    const dx = nx - sh.x;
    const dy = ny - sh.y;
    setPoint(points, `${side}_shoulder`, nx, ny);
    if (el) setPoint(points, `${side}_elbow`, el.x + dx, el.y + dy);
    if (wr) setPoint(points, `${side}_wrist`, wr.x + dx, wr.y + dy);
  };
  shift('left');
  shift('right');
  return points;
}

export function orbitGuideRings(movement, points, gradeLetter, rotation = 'internal') {
  const lift = gradeDepthValue(movement, 'face', gradeLetter || 'A') ?? 0.05;
  const ry = movement.cycle?.guide?.ry ?? lift / 2;
  const rx = movement.cycle?.guide?.rx ?? Math.max(0.004, lift * 0.18);
  const rest = standingPose('face');
  const inward = rotation !== 'external';
  return ['left_shoulder', 'right_shoulder'].map((name) => {
    const p = rest.get(name);
    const left = name.startsWith('left_');
    return {
      cx: p.x,
      cy: p.y - ry,
      rx,
      ry,
      sense: left ? (inward ? 1 : -1) : inward ? -1 : 1,
    };
  });
}

/**
 * Face-on deep breath: both shoulders rise toward the ears (inhale) then drop (exhale).
 * t=0 rest, t=0.5 peak inhale, t=1 rest. Slight outward spread at the top = ribcage expansion.
 */
export function synthesizeBreathPose(movement, t, gradeLetter) {
  const points = standingPose('face');
  const lift = gradeDepthValue(movement, 'face', gradeLetter || 'A') ?? 0.05;
  const u = 0.5 - 0.5 * Math.cos((Number(t) || 0) * Math.PI * 2);
  const dy = -lift * u;
  const spread = 0.006 * u;
  for (const side of ['left', 'right']) {
    const sh = points.get(`${side}_shoulder`);
    const el = points.get(`${side}_elbow`);
    const wr = points.get(`${side}_wrist`);
    if (!sh) continue;
    const dx = side === 'left' ? -spread : spread;
    setPoint(points, `${side}_shoulder`, sh.x + dx, sh.y + dy);
    if (el) setPoint(points, `${side}_elbow`, el.x + dx, el.y + dy);
    if (wr) setPoint(points, `${side}_wrist`, wr.x + dx, wr.y + dy);
  }
  return points;
}

/**
 * Face-on chair fold: feet planted, shins vertical, shoulders on the knees.
 * Head/arms are present but unused by the matcher.
 * Splits use a 180° ankle–hip–ankle line instead of the chair silhouette.
 */
export function synthesizeHoldPose(movement, t, view) {
  const resolved = resolveLabView(movement, view);
  if (isSplitMovement(movement)) return synthesizeSplitPose(movement, 0.5);
  if (movement?.id === 'plank') return pushUpPlankPose(resolved, 0);
  const official = OFFICIAL_POSE[movement?.id];
  if (official) {
    const side = t == null || !isTwoSidedRep(movement) ? 'left' : lungePlaybackClock(t).side;
    return official(resolved, 1, side);
  }
  const points = standingPose(resolved);
  const shin = 0.26;
  const ankleY = 0.9;
  const kneeY = ankleY - shin;
  const hipY = kneeY - 0.04;
  const shY = kneeY - 0.12 * shin;
  const side = 0.22 * shin;
  setPoint(points, 'left_ankle', 0.38, ankleY);
  setPoint(points, 'right_ankle', 0.62, ankleY);
  setPoint(points, 'left_knee', 0.38, kneeY);
  setPoint(points, 'right_knee', 0.62, kneeY);
  setPoint(points, 'left_hip', 0.4, hipY);
  setPoint(points, 'right_hip', 0.6, hipY);
  setPoint(points, 'left_shoulder', 0.38 - side, shY);
  setPoint(points, 'right_shoulder', 0.62 + side, shY);
  setPoint(points, 'nose', 0.5, shY + 0.06);
  setPoint(points, 'left_eye', 0.47, shY + 0.05);
  setPoint(points, 'right_eye', 0.53, shY + 0.05);
  setPoint(points, 'left_ear', 0.44, shY + 0.06);
  setPoint(points, 'right_ear', 0.56, shY + 0.06);
  setPoint(points, 'left_elbow', 0.3, shY + 0.1);
  setPoint(points, 'right_elbow', 0.7, shY + 0.1);
  setPoint(points, 'left_wrist', 0.28, shY + 0.2);
  setPoint(points, 'right_wrist', 0.72, shY + 0.2);
  return points;
}

/**
 * Lab skeleton is not overlay-flipped. Live webcam + V4ReachGuide use
 * scaleX(-1), so engine DROITE (cx=0.86) appears top-LEFT on screen.
 * Map engine x → lab x so the preview matches the selfie.
 */
function labReachX(x) {
  return 1 - x;
}

/** Lab is not overlay-flipped: keep the start on the anatomical wrist, only mirror the far zone. */
function labFlipZone(z) {
  if (!z) return z;
  if (z.w != null && z.x != null) {
    const x = 1 - (z.x + z.w);
    return {
      ...z,
      x,
      cx: x + z.w / 2,
      cy: z.cy,
      rx: z.w / 2,
      ry: z.h / 2,
      shape: 'rect',
    };
  }
  return { ...z, cx: labReachX(z.cx) };
}

function labReachGeometry(side, rest, guide) {
  const geo = buildReachGeometry(side, rest, guide);
  if (!geo) return null;
  const zone = labFlipZone(geo.zone);
  const end = { x: zone.cx, y: zone.cy };
  const sh = side === 'right' ? rest.rs : rest.ls;
  const { path } = reachArcPath(geo.start, end, sh, geo.out, geo.arm, {
    elbow: side === 'right' ? rest.re : rest.le,
    nose: rest.nose,
  });
  return {
    ...geo,
    end,
    path,
    zone,
  };
}

/**
 * Seated side stretch: one wrist arcs over the head, then the other.
 * t=0 rest, t=0.25 right peak, t=0.5 rest, t=0.75 left peak, t=1 rest.
 */
export function synthesizeReachPose(movement, t) {
  const points = standingPose('face');
  setPoint(points, 'left_ankle', 0.4, 0.9);
  setPoint(points, 'right_ankle', 0.6, 0.9);
  setPoint(points, 'left_knee', 0.4, 0.7);
  setPoint(points, 'right_knee', 0.6, 0.7);
  setPoint(points, 'left_hip', 0.42, 0.54);
  setPoint(points, 'right_hip', 0.58, 0.54);
  setPoint(points, 'left_shoulder', 0.36, 0.26);
  setPoint(points, 'right_shoulder', 0.64, 0.26);
  setPoint(points, 'nose', 0.5, 0.14);
  setPoint(points, 'left_eye', 0.47, 0.128);
  setPoint(points, 'right_eye', 0.53, 0.128);
  setPoint(points, 'left_ear', 0.44, 0.14);
  setPoint(points, 'right_ear', 0.56, 0.14);
  setPoint(points, 'left_elbow', 0.3, 0.42);
  setPoint(points, 'right_elbow', 0.7, 0.42);
  setPoint(points, 'left_wrist', 0.28, 0.56);
  setPoint(points, 'right_wrist', 0.72, 0.56);

  const rest = snapshotReachRest(points, movement.cycle);
  const x = ((Number(t) || 0) % 1 + 1) % 1;
  const half = x < 0.5 ? x / 0.5 : (x - 0.5) / 0.5;
  const side = x < 0.5 ? 'right' : 'left';
  const other = side === 'right' ? 'left' : 'right';
  const u = 0.5 - 0.5 * Math.cos(half * Math.PI * 2);
  const geo = rest ? labReachGeometry(side, rest, movement.cycle?.guide) : null;
  const toward = geo?.dir ?? (side === 'right' ? -1 : 1);
  const lean = toward * 0.16 * u;
  const headY = 0.14 + 0.02 * u;
  setPoint(points, 'nose', 0.5 + lean, headY);
  setPoint(points, 'left_eye', 0.47 + lean, headY - 0.012);
  setPoint(points, 'right_eye', 0.53 + lean, headY - 0.012);
  setPoint(points, 'left_ear', 0.44 + lean, headY);
  setPoint(points, 'right_ear', 0.56 + lean, headY);
  const sh = points.get(`${side}_shoulder`);
  const osh = points.get(`${other}_shoulder`);
  if (sh) setPoint(points, `${side}_shoulder`, sh.x + lean * 0.4, sh.y - 0.04 * u);
  if (osh) setPoint(points, `${other}_shoulder`, osh.x + lean * 0.75, osh.y + 0.05 * u);
  const sh2 = points.get(`${side}_shoulder`);
  const osh2 = points.get(`${other}_shoulder`);
  if (geo?.path?.length && sh2) {
    const idx = Math.min(geo.path.length - 1, Math.round(u * (geo.path.length - 1)));
    const w = geo.path[idx];
    const out = geo.out || 0;
    const restSh = side === 'right' ? rest.rs : rest.ls;
    const restEl = side === 'right' ? rest.re : rest.le;
    const restWr = side === 'right' ? rest.rw : rest.lw;
    const forearm = restEl && restWr ? Math.hypot(restWr.x - restEl.x, restWr.y - restEl.y) : 0.14;
    const upper = restSh && restEl ? Math.hypot(restEl.x - restSh.x, restEl.y - restSh.y) : 0.16;
    const dx = w.x - sh2.x;
    const dy = w.y - sh2.y;
    const span = Math.hypot(dx, dy) || 1e-6;
    const ux = dx / span;
    const uy = dy / span;
    const hangEl = restEl && restSh
      ? { x: restEl.x + (sh2.x - restSh.x), y: restEl.y + (sh2.y - restSh.y) }
      : { x: sh2.x + out * 0.05, y: sh2.y + 0.16 };
    const along = Math.max(upper * 0.35, span - forearm);
    const stretchEl = { x: sh2.x + ux * along, y: sh2.y + uy * along };
    setPoint(points, `${side}_elbow`, hangEl.x + (stretchEl.x - hangEl.x) * u, hangEl.y + (stretchEl.y - hangEl.y) * u);
    setPoint(points, `${side}_wrist`, w.x, w.y);
  }
  if (osh2) {
    setPoint(points, `${other}_elbow`, osh2.x - toward * 0.06, osh2.y + 0.16);
    setPoint(points, `${other}_wrist`, osh2.x - toward * 0.08, osh2.y + 0.3);
  }
  return points;
}

export function reachGuideZone(movement, points, side = 'right') {
  const rest = snapshotReachRest(points, movement.cycle);
  if (!rest) return [];
  const sides = ['right', 'left'];
  return sides.map((s) => {
    const geo = labReachGeometry(s, rest, movement.cycle?.guide);
    if (!geo?.zone) return null;
    const left = s === 'left';
    return {
      cx: geo.zone.cx,
      cy: geo.zone.cy,
      rx: geo.zone.rx,
      ry: geo.zone.ry,
      x: geo.zone.x,
      y: geo.zone.y,
      w: geo.zone.w,
      h: geo.zone.h,
      shape: geo.zone.shape || 'rect',
      side: s,
      color: left ? '#296CFF' : '#facc15',
      label: left ? 'GAUCHE' : 'DROITE',
      emoji: left ? '\u{1FAF2}' : '\u{1FAF1}',
      sense: geo.out,
    };
  }).filter(Boolean);
}

/**
 * Pose whose depth metric equals the idle (start) value.
 */
export function idleLabPose(movement, view) {
  const resolved = resolveLabView(movement, view);
  if (movement?.id === 'push_up' || movement?.id === 'plank') return pushUpPlankPose(resolved, 0);
  if (isLungeFamily(movement) || isHighKnees(movement)) return standingPose(resolved);
  const official = OFFICIAL_POSE[movement?.id];
  if (official) return official(resolved, 0, 'left');
  return standingPose(resolved);
}

function synthesizeLungePose(movement, view, depthValue, t) {
  const spec = movement?.views?.[view];
  const side = t == null ? 'left' : lungePlaybackClock(t).side;
  const high = lungeFamilyPose(movement, view, 0, side);
  const low = lungeFamilyPose(movement, view, 1, side);
  if (!spec || depthValue == null) return high;
  const metricId = depthMetricId(movement, view);
  if (!metricId) return high;
  const idleV = computeMetrics(spec.metrics, high)[metricId];
  const deepV = computeMetrics(spec.metrics, low)[metricId];
  if (idleV == null || deepV == null || Math.abs(deepV - idleV) < 1e-6) return high;
  const u = (depthValue - idleV) / (deepV - idleV);
  return mixMaps(high, low, Math.max(0, Math.min(1.05, u)));
}

function synthesizeHighKneesPose(movement, view, depthValue, t) {
  return mixPoseToDepth(movement, view, depthValue, t, highKneesPose);
}

function mixPoseToDepth(movement, view, depthValue, t, poseFn) {
  const spec = movement?.views?.[view];
  const side = t == null || !isTwoSidedRep(movement) ? 'left' : lungePlaybackClock(t).side;
  const high = poseFn(view, 0, side);
  const low = poseFn(view, 1, side);
  if (!spec || depthValue == null) return high;
  const metricId = depthMetricId(movement, view);
  if (!metricId) return high;
  const idleV = computeMetrics(spec.metrics, high)[metricId];
  const deepV = computeMetrics(spec.metrics, low)[metricId];
  if (idleV == null || deepV == null || Math.abs(deepV - idleV) < 1e-6) return high;
  const u = (depthValue - idleV) / (deepV - idleV);
  return mixMaps(high, low, Math.max(0, Math.min(1.05, u)));
}

function synthesizeOfficialPose(movement, view, depthValue, t) {
  const fn = OFFICIAL_POSE[movement?.id];
  if (!fn) return null;
  if (isFlexHold(movement) || isStaticShapeHold(movement)) {
    const side = t == null || !isTwoSidedRep(movement) ? 'left' : lungePlaybackClock(t).side;
    return fn(view, 1, side);
  }
  return mixPoseToDepth(movement, view, depthValue, t, fn);
}

function synthesizePushUpPose(movement, view, depthValue) {
  const spec = movement?.views?.[view];
  const high = pushUpPlankPose(view, 0);
  const low = pushUpPlankPose(view, 1);
  if (!spec || depthValue == null) return high;
  const metricId = depthMetricId(movement, view);
  if (!metricId) return high;
  const idleV = computeMetrics(spec.metrics, high)[metricId];
  const deepV = computeMetrics(spec.metrics, low)[metricId];
  if (idleV == null || deepV == null || Math.abs(deepV - idleV) < 1e-6) return high;
  const u = (depthValue - idleV) / (deepV - idleV);
  return mixMaps(high, low, Math.max(0, Math.min(1.05, u)));
}

export function synthesizeLabPose(movement, view, depthValue, t) {
  if (movement?.id === 'push_up') return synthesizePushUpPose(movement, view, depthValue);
  if (isLungeFamily(movement)) return synthesizeLungePose(movement, view, depthValue, t);
  if (isHighKnees(movement)) return synthesizeHighKneesPose(movement, view, depthValue, t);
  const official = synthesizeOfficialPose(movement, view, depthValue, t);
  if (official) return official;
  const spec = movement?.views?.[view];
  const points = standingPose(view);
  if (!spec) return points;
  const metricId = depthMetricId(movement, view);
  const def = findDef(spec.metrics, metricId);
  if (!def || depthValue == null) return points;

  const before = hipMid(points);
  const rad = applyMetricValue(spec.metrics, def, points, depthValue, view);
  const after = hipMid(points);
  followUpperBody(points, before, after, rad, after);

  if (view === 'profile') {
    const pairs = [
      ['left_hip', 'right_hip'],
      ['left_knee', 'right_knee'],
      ['left_ankle', 'right_ankle'],
      ['left_shoulder', 'right_shoulder'],
      ['left_elbow', 'right_elbow'],
      ['left_wrist', 'right_wrist'],
    ];
    for (const [a, b] of pairs) {
      const pa = points.get(a);
      if (!pa) continue;
      setPoint(points, b, pa.x + 0.016, pa.y + 0.004);
    }
  }
  return points;
}

export function standingDepth(movement, view) {
  const spec = movement?.views?.[view];
  if (!spec) return null;
  const id = depthMetricId(movement, view);
  if (!id) return null;
  return computeMetrics(spec.metrics, idleLabPose(movement, view))[id] ?? null;
}

export const PLAYBACK = {
  idle: [0, 0.18],
  eccentric: [0.18, 0.52],
  end_range: [0.52, 0.72],
  return: [0.72, 1],
};

function smoothstep(u) {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

export function depthForPlayback(movement, view, t, gradeLetter) {
  const idle = standingDepth(movement, view);
  const deep = gradeDepthValue(movement, view, gradeLetter || 'A');
  if (idle == null || deep == null) return idle;
  if (movement.type === 'duration') return deep;
  const x = Math.max(0, Math.min(1, isTwoSidedRep(movement) ? lungePlaybackClock(t).t : t));
  if (x <= PLAYBACK.idle[1]) return idle;
  if (x <= PLAYBACK.eccentric[1]) {
    const u = (x - PLAYBACK.eccentric[0]) / (PLAYBACK.eccentric[1] - PLAYBACK.eccentric[0]);
    return idle + (deep - idle) * smoothstep(u);
  }
  if (x <= PLAYBACK.end_range[1]) return deep;
  const u = (x - PLAYBACK.return[0]) / (PLAYBACK.return[1] - PLAYBACK.return[0]);
  return deep + (idle - deep) * smoothstep(u);
}

/**
 * Idle keypoints for the Start pose overlay (lab card + camera mannequin).
 *
 * Same pose as the heuristics lab skeleton animation at playback t = 0.
 * Catalog / official-pose / heuristic edits update this automatically — do not
 * hand-author a second silhouette.
 *
 * Indicative only: live tracking starts when required points are inside the
 * placement box, not when the user matches these joint positions.
 */
export function startPosePoints(movement, view) {
  if (!movement) return standingPose(view || 'face');
  const resolved = resolveLabView(movement, view);
  const cycleKind = movement.cycle?.kind;
  if (movement.type === 'duration' && !isAnimatedHold(movement)) {
    return synthesizeHoldPose(movement, 0, resolved);
  }
  if (cycleKind === 'orbit') return synthesizeOrbitPose(movement, 0, 'A', 'internal');
  if (cycleKind === 'breath') return synthesizeBreathPose(movement, 0, 'A');
  if (cycleKind === 'side_reach') return synthesizeReachPose(movement, 0);
  const depth = depthForPlayback(movement, resolved, 0, 'A');
  return synthesizeLabPose(movement, resolved, depth, 0);
}

export function playbackPhaseAt(t, movement) {
  const x = Math.max(0, Math.min(1, movement && isTwoSidedRep(movement) ? lungePlaybackClock(t).t : t));
  if (x < PLAYBACK.eccentric[0]) return 'idle';
  if (x < PLAYBACK.end_range[0]) return 'eccentric';
  if (x < PLAYBACK.return[0]) return 'end_range';
  return 'return';
}

export function playbackPhases(movement, view) {
  const spec = movement?.views?.[view];
  if (!spec) return [];
  if (movement.type === 'duration') {
    return Object.keys(spec.phases || {});
  }
  if (movement.cycle?.kind === 'breath') {
    const names = Object.keys(spec.phases || {});
    const preferred = ['idle', 'breathing'];
    return [...preferred.filter((p) => names.includes(p)), ...names.filter((n) => !preferred.includes(n))];
  }
  if (movement.cycle?.kind === 'side_reach') {
    const names = Object.keys(spec.phases || {});
    const preferred = ['idle', 'reach_right', 'reach_left'];
    return [...preferred.filter((p) => names.includes(p)), ...names.filter((n) => !preferred.includes(n))];
  }
  const preferred = ['idle', 'eccentric', 'end_range'];
  const names = Object.keys(spec.phases || {});
  return [...preferred.filter((p) => names.includes(p)), ...names.filter((n) => !preferred.includes(n))];
}

export function describePose(movement, view, points) {
  const spec = movement?.views?.[view];
  if (!spec) {
    return { metrics: {}, phase: null, score: null, grade: null };
  }
  const metrics = computeMetrics(spec.metrics, points);
  const phase = pickPhase(spec, metrics);
  const metricId = depthMetricId(movement, view);
  const { ideal, worst } = depthAnchors(movement, view);
  const value = metricId ? metrics[metricId] : null;
  const score = value != null && ideal != null && worst != null ? depthScore(value, ideal, worst) : null;
  return {
    metrics,
    phase,
    score,
    grade: score == null ? null : gradeOf(score),
    depthMetric: metricId,
    depthValue: value,
  };
}

function overlayPoint(points, name) {
  if (name === 'middle_hip' || name?.startsWith('middle_')) {
    const cached = points.get(name);
    if (cached) return cached;
    const part = name === 'middle_hip' ? 'hip' : name.slice(7);
    const left = points.get(`left_${part}`);
    const right = points.get(`right_${part}`);
    if (left && right) return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    return left || right || null;
  }
  return points.get(name);
}

export function angleOverlays(viewSpec, points, view) {
  const out = [];
  for (const def of viewSpec?.metrics || []) {
    if (def.kind !== 'angle3' && def.kind !== 'oriented_angle3' && def.kind !== 'obtuse_angle3') continue;
    if (!def.points || def.points.length !== 3) continue;
    const names = resolveChain(def);
    const a = overlayPoint(points, names[0]);
    const b = overlayPoint(points, names[1]);
    const c = overlayPoint(points, names[2]);
    if (!a || !b || !c) continue;
    const interior = angleAt(a, b, c);
    out.push({
      id: def.id,
      a: names[0],
      vertex: names[1],
      c: names[2],
      degrees: def.kind === 'obtuse_angle3' ? Math.max(interior, 180 - interior) : interior,
      obtuse: def.kind === 'obtuse_angle3',
    });
  }
  if (view === 'profile' && out.length > 1) {
    const stretch = out.find((ov) => ov.id === 'flex_angle');
    if (stretch) return [stretch];
    const elbow = out.find((ov) => ov.id.includes('elbow'));
    const body = out.find((ov) => ov.id === 'body_line');
    if (elbow && body) return [elbow, body];
    const rank = (ov) => {
      if (ov.id.includes('knee') || ov.vertex?.includes('knee')) return 0;
      if (ov.id.includes('hip') || ov.vertex?.includes('hip')) return 1;
      return 2;
    };
    const picked = [];
    const seen = new Set();
    for (const ov of [...out].sort((a, b) => rank(a) - rank(b))) {
      if (seen.has(ov.vertex)) continue;
      seen.add(ov.vertex);
      picked.push(ov);
      if (picked.length >= 2) break;
    }
    return picked.length ? picked : [out[0]];
  }
  return out;
}

export function metricKindLabel(kind) {
  switch (kind) {
    case 'angle3':
      return 'angle';
    case 'obtuse_angle3':
      return 'opening';
    case 'segment_ratio':
      return '2D ratio';
    case 'segment_ratio_y':
      return 'Y ratio';
    case 'relative_y':
      return 'relative Y';
    case 'alignment_horizontal':
      return 'horizontal';
    case 'alignment_vertical':
      return 'vertical';
    case 'min_of':
      return 'min';
    case 'max_of':
      return 'max';
    case 'mean_of':
      return 'mean';
    case 'linear_map':
      return 'score';
    case 'abs_dx':
      return 'Δx';
    case 'tilt_from_vertical':
      return 'tilt°';
    case 'norm_y':
      return 'norm Y';
    case 'norm_dy':
      return 'norm Δy';
    case 'norm_rel_y':
      return 'norm Δy signed';
    case 'norm_dx':
      return 'norm Δx';
    case 'abs_diff':
      return 'Δ';
    case 'coalesce':
      return 'fallback';
    default:
      return kind || '';
  }
}

export { GRADE_BANDS, evalWhen };
