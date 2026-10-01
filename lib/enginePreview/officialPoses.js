/**
 * Authored idle→end COCO-17 poses for official V4 movements.
 * Used by the heuristics lab and smoke tests — not by the live interpreter.
 */

import { FLEX_POSE } from './flexPoses.js';

function kp(name, x, y) {
  return { name, x, y, score: 1 };
}

/** Floor profile convention: head on the right, feet on the left. */
function flipProfileX(pts) {
  return pts.map((p) => kp(p.name, 1 - p.x, p.y));
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

/**
 * Standing toe-touch / trunk flexion, side view.
 * Knees stay straight. depth=0 upright, depth=1 trunk inclined, wrists at the ankles.
 */
export function backFlexibilityPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.2),
        kp('left_shoulder', 0.38, 0.22),
        kp('right_shoulder', 0.62, 0.22),
        kp('left_elbow', 0.34, 0.4),
        kp('right_elbow', 0.66, 0.4),
        kp('left_wrist', 0.36, 0.56),
        kp('right_wrist', 0.64, 0.56),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.43, 0.68),
        kp('right_knee', 0.57, 0.68),
        kp('left_ankle', 0.44, 0.88),
        kp('right_ankle', 0.56, 0.88),
      ]
    : [
        ...profHead(0.48, 0.22),
        kp('left_shoulder', 0.48, 0.22),
        kp('right_shoulder', 0.498, 0.216),
        kp('left_elbow', 0.485, 0.38),
        kp('right_elbow', 0.505, 0.376),
        kp('left_wrist', 0.49, 0.54),
        kp('right_wrist', 0.51, 0.536),
        kp('left_hip', 0.478, 0.48),
        kp('right_hip', 0.496, 0.478),
        kp('left_knee', 0.482, 0.68),
        kp('right_knee', 0.498, 0.678),
        kp('left_ankle', 0.48, 0.88),
        kp('right_ankle', 0.496, 0.878),
      ];
  const end = face
    ? [
        ...faceHead(0.42),
        kp('left_shoulder', 0.36, 0.48),
        kp('right_shoulder', 0.64, 0.48),
        kp('left_elbow', 0.36, 0.66),
        kp('right_elbow', 0.64, 0.66),
        kp('left_wrist', 0.36, 0.86),
        kp('right_wrist', 0.64, 0.86),
        kp('left_hip', 0.42, 0.52),
        kp('right_hip', 0.58, 0.52),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.44, 0.88),
        kp('right_ankle', 0.56, 0.88),
      ]
    : [
        ...profHead(0.7, 0.5),
        kp('left_shoulder', 0.7, 0.52),
        kp('right_shoulder', 0.716, 0.516),
        kp('left_elbow', 0.7, 0.7),
        kp('right_elbow', 0.716, 0.696),
        kp('left_wrist', 0.7, 0.9),
        kp('right_wrist', 0.716, 0.896),
        kp('left_hip', 0.478, 0.48),
        kp('right_hip', 0.496, 0.478),
        kp('left_knee', 0.482, 0.68),
        kp('right_knee', 0.498, 0.678),
        kp('left_ankle', 0.48, 0.88),
        kp('right_ankle', 0.496, 0.878),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Hip hinge, not a squat: knees stay open, torso toward horizontal, hips back. */
export function deadliftPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.32, 0.4),
        kp('right_elbow', 0.68, 0.4),
        kp('left_wrist', 0.3, 0.56),
        kp('right_wrist', 0.7, 0.56),
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
        kp('left_elbow', 0.5, 0.38),
        kp('right_elbow', 0.53, 0.37),
        kp('left_wrist', 0.51, 0.54),
        kp('right_wrist', 0.54, 0.53),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.51, 0.68),
        kp('right_knee', 0.525, 0.68),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.5),
        kp('left_shoulder', 0.32, 0.5),
        kp('right_shoulder', 0.68, 0.5),
        kp('left_elbow', 0.38, 0.68),
        kp('right_elbow', 0.62, 0.68),
        kp('left_wrist', 0.43, 0.83),
        kp('right_wrist', 0.57, 0.83),
        kp('left_hip', 0.42, 0.58),
        kp('right_hip', 0.58, 0.58),
        kp('left_knee', 0.44, 0.74),
        kp('right_knee', 0.56, 0.74),
        kp('left_ankle', 0.44, 0.88),
        kp('right_ankle', 0.56, 0.88),
      ]
    : [
        ...profHead(0.62, 0.4),
        kp('left_shoulder', 0.62, 0.4),
        kp('right_shoulder', 0.64, 0.395),
        kp('left_elbow', 0.56, 0.62),
        kp('right_elbow', 0.58, 0.61),
        kp('left_wrist', 0.5, 0.82),
        kp('right_wrist', 0.52, 0.81),
        kp('left_hip', 0.46, 0.54),
        kp('right_hip', 0.48, 0.54),
        kp('left_knee', 0.52, 0.7),
        kp('right_knee', 0.535, 0.7),
        kp('left_ankle', 0.5, 0.88),
        kp('right_ankle', 0.515, 0.88),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Elbow flexion, upper arms pinned. Face curl toward camera (wrists drift inward). */
export function curlPose(view, depth = 0, narrow = false) {
  const face = view !== 'profile';
  const topWx = narrow ? 0.38 : 0.42;
  const idle = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.3, 0.4),
        kp('right_elbow', 0.7, 0.4),
        kp('left_wrist', 0.34, 0.58),
        kp('right_wrist', 0.66, 0.58),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.5, 0.4),
        kp('right_elbow', 0.53, 0.39),
        kp('left_wrist', 0.51, 0.58),
        kp('right_wrist', 0.54, 0.57),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.3, 0.38),
        kp('right_elbow', 0.7, 0.38),
        kp('left_wrist', topWx, narrow ? 0.32 : 0.22),
        kp('right_wrist', 1 - topWx, narrow ? 0.32 : 0.22),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.5, 0.38),
        kp('right_elbow', 0.53, 0.37),
        kp('left_wrist', narrow ? 0.52 : 0.62, narrow ? 0.3 : 0.22),
        kp('right_wrist', narrow ? 0.545 : 0.64, narrow ? 0.29 : 0.21),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

export function hammerCurlPose(view, depth = 0) {
  if (view === 'profile') return curlPose(view, depth, false);
  const idle = [
    ...faceHead(0.205),
    kp('left_shoulder', 0.36, 0.205),
    kp('right_shoulder', 0.64, 0.205),
    kp('left_elbow', 0.36, 0.4),
    kp('right_elbow', 0.64, 0.4),
    kp('left_wrist', 0.36, 0.58),
    kp('right_wrist', 0.64, 0.58),
    kp('left_hip', 0.42, 0.5),
    kp('right_hip', 0.58, 0.5),
    kp('left_knee', 0.43, 0.7),
    kp('right_knee', 0.57, 0.7),
    kp('left_ankle', 0.43, 0.88),
    kp('right_ankle', 0.57, 0.88),
  ];
  const end = [
    ...faceHead(0.205),
    kp('left_shoulder', 0.36, 0.205),
    kp('right_shoulder', 0.64, 0.205),
    kp('left_elbow', 0.36, 0.4),
    kp('right_elbow', 0.64, 0.4),
    kp('left_wrist', 0.36, 0.3),
    kp('right_wrist', 0.64, 0.3),
    kp('left_hip', 0.42, 0.5),
    kp('right_hip', 0.58, 0.5),
    kp('left_knee', 0.43, 0.7),
    kp('right_knee', 0.57, 0.7),
    kp('left_ankle', 0.43, 0.88),
    kp('right_ankle', 0.57, 0.88),
  ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Bench dip: hands behind hips, legs forward, elbows to ~90°. */
export function dipPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.28),
        kp('left_shoulder', 0.38, 0.34),
        kp('right_shoulder', 0.62, 0.34),
        kp('left_elbow', 0.3, 0.42),
        kp('right_elbow', 0.7, 0.42),
        kp('left_wrist', 0.28, 0.5),
        kp('right_wrist', 0.72, 0.5),
        kp('left_hip', 0.4, 0.5),
        kp('right_hip', 0.6, 0.5),
        kp('left_knee', 0.36, 0.68),
        kp('right_knee', 0.64, 0.68),
        kp('left_ankle', 0.32, 0.86),
        kp('right_ankle', 0.68, 0.86),
      ]
    : [
        ...profHead(0.46, 0.26),
        kp('left_shoulder', 0.48, 0.32),
        kp('right_shoulder', 0.5, 0.315),
        kp('left_elbow', 0.4, 0.4),
        kp('right_elbow', 0.42, 0.395),
        kp('left_wrist', 0.32, 0.52),
        kp('right_wrist', 0.34, 0.515),
        kp('left_hip', 0.5, 0.5),
        kp('right_hip', 0.52, 0.5),
        kp('left_knee', 0.66, 0.56),
        kp('right_knee', 0.68, 0.56),
        kp('left_ankle', 0.8, 0.7),
        kp('right_ankle', 0.82, 0.7),
      ];
  const end = face
    ? [
        ...faceHead(0.4),
        kp('left_shoulder', 0.38, 0.5),
        kp('right_shoulder', 0.62, 0.5),
        kp('left_elbow', 0.24, 0.5),
        kp('right_elbow', 0.76, 0.5),
        kp('left_wrist', 0.24, 0.64),
        kp('right_wrist', 0.76, 0.64),
        kp('left_hip', 0.4, 0.62),
        kp('right_hip', 0.6, 0.62),
        kp('left_knee', 0.36, 0.72),
        kp('right_knee', 0.64, 0.72),
        kp('left_ankle', 0.32, 0.86),
        kp('right_ankle', 0.68, 0.86),
      ]
    : [
        ...profHead(0.48, 0.4),
        kp('left_shoulder', 0.52, 0.5),
        kp('right_shoulder', 0.54, 0.495),
        kp('left_elbow', 0.32, 0.4),
        kp('right_elbow', 0.34, 0.395),
        kp('left_wrist', 0.32, 0.52),
        kp('right_wrist', 0.34, 0.515),
        kp('left_hip', 0.54, 0.64),
        kp('right_hip', 0.56, 0.64),
        kp('left_knee', 0.68, 0.62),
        kp('right_knee', 0.7, 0.62),
        kp('left_ankle', 0.8, 0.7),
        kp('right_ankle', 0.82, 0.7),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Rack at the shoulders → vertical overhead lockout. */
export function pressPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.22),
        kp('left_shoulder', 0.36, 0.26),
        kp('right_shoulder', 0.64, 0.26),
        kp('left_elbow', 0.24, 0.34),
        kp('right_elbow', 0.76, 0.34),
        kp('left_wrist', 0.34, 0.24),
        kp('right_wrist', 0.66, 0.24),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.24),
        kp('left_shoulder', 0.49, 0.26),
        kp('right_shoulder', 0.515, 0.255),
        kp('left_elbow', 0.56, 0.34),
        kp('right_elbow', 0.58, 0.335),
        kp('left_wrist', 0.5, 0.24),
        kp('right_wrist', 0.52, 0.235),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.22),
        kp('left_shoulder', 0.36, 0.26),
        kp('right_shoulder', 0.64, 0.26),
        kp('left_elbow', 0.34, 0.14),
        kp('right_elbow', 0.66, 0.14),
        kp('left_wrist', 0.35, 0.04),
        kp('right_wrist', 0.65, 0.04),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.24),
        kp('left_shoulder', 0.49, 0.26),
        kp('right_shoulder', 0.515, 0.255),
        kp('left_elbow', 0.5, 0.14),
        kp('right_elbow', 0.52, 0.135),
        kp('left_wrist', 0.5, 0.04),
        kp('right_wrist', 0.52, 0.035),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Abduction to a T: elbows stay long, wrists stop at shoulder height — not a press. */
export function lateralPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.22),
        kp('right_shoulder', 0.64, 0.22),
        kp('left_elbow', 0.3, 0.42),
        kp('right_elbow', 0.7, 0.42),
        kp('left_wrist', 0.28, 0.6),
        kp('right_wrist', 0.72, 0.6),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.22),
        kp('right_shoulder', 0.515, 0.215),
        kp('left_elbow', 0.5, 0.42),
        kp('right_elbow', 0.53, 0.41),
        kp('left_wrist', 0.51, 0.6),
        kp('right_wrist', 0.54, 0.59),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.22),
        kp('right_shoulder', 0.64, 0.22),
        kp('left_elbow', 0.16, 0.24),
        kp('right_elbow', 0.84, 0.24),
        kp('left_wrist', 0.04, 0.22),
        kp('right_wrist', 0.96, 0.22),
        kp('left_hip', 0.42, 0.5),
        kp('right_hip', 0.58, 0.5),
        kp('left_knee', 0.43, 0.7),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.22),
        kp('right_shoulder', 0.515, 0.215),
        kp('left_elbow', 0.62, 0.24),
        kp('right_elbow', 0.64, 0.235),
        kp('left_wrist', 0.74, 0.22),
        kp('right_wrist', 0.76, 0.215),
        kp('left_hip', 0.495, 0.5),
        kp('right_hip', 0.515, 0.5),
        kp('left_knee', 0.51, 0.7),
        kp('right_knee', 0.525, 0.7),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Supine, knees bent; hips lift to a shoulder–hip–knee line. */
export function bridgePose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        kp('nose', 0.5, 0.16),
        kp('left_eye', 0.46, 0.15),
        kp('right_eye', 0.54, 0.15),
        kp('left_ear', 0.43, 0.16),
        kp('right_ear', 0.57, 0.16),
        kp('left_shoulder', 0.34, 0.28),
        kp('right_shoulder', 0.66, 0.28),
        kp('left_elbow', 0.22, 0.36),
        kp('right_elbow', 0.78, 0.36),
        kp('left_wrist', 0.14, 0.46),
        kp('right_wrist', 0.86, 0.46),
        kp('left_hip', 0.4, 0.54),
        kp('right_hip', 0.6, 0.54),
        kp('left_knee', 0.38, 0.4),
        kp('right_knee', 0.62, 0.4),
        kp('left_ankle', 0.4, 0.64),
        kp('right_ankle', 0.6, 0.64),
      ]
    : [
        kp('nose', 0.22, 0.58),
        kp('left_eye', 0.2, 0.57),
        kp('right_eye', 0.23, 0.57),
        kp('left_ear', 0.26, 0.58),
        kp('right_ear', 0.19, 0.58),
        kp('left_shoulder', 0.3, 0.6),
        kp('right_shoulder', 0.32, 0.595),
        kp('left_elbow', 0.28, 0.68),
        kp('right_elbow', 0.3, 0.675),
        kp('left_wrist', 0.26, 0.76),
        kp('right_wrist', 0.28, 0.755),
        kp('left_hip', 0.52, 0.7),
        kp('right_hip', 0.54, 0.7),
        kp('left_knee', 0.7, 0.52),
        kp('right_knee', 0.72, 0.52),
        kp('left_ankle', 0.78, 0.72),
        kp('right_ankle', 0.8, 0.72),
      ];
  const end = face
    ? [
        kp('nose', 0.5, 0.16),
        kp('left_eye', 0.46, 0.15),
        kp('right_eye', 0.54, 0.15),
        kp('left_ear', 0.43, 0.16),
        kp('right_ear', 0.57, 0.16),
        kp('left_shoulder', 0.34, 0.28),
        kp('right_shoulder', 0.66, 0.28),
        kp('left_elbow', 0.22, 0.36),
        kp('right_elbow', 0.78, 0.36),
        kp('left_wrist', 0.14, 0.46),
        kp('right_wrist', 0.86, 0.46),
        kp('left_hip', 0.4, 0.36),
        kp('right_hip', 0.6, 0.36),
        kp('left_knee', 0.38, 0.4),
        kp('right_knee', 0.62, 0.4),
        kp('left_ankle', 0.4, 0.64),
        kp('right_ankle', 0.6, 0.64),
      ]
    : [
        kp('nose', 0.22, 0.52),
        kp('left_eye', 0.2, 0.51),
        kp('right_eye', 0.23, 0.51),
        kp('left_ear', 0.26, 0.52),
        kp('right_ear', 0.19, 0.52),
        kp('left_shoulder', 0.3, 0.54),
        kp('right_shoulder', 0.32, 0.535),
        kp('left_elbow', 0.28, 0.64),
        kp('right_elbow', 0.3, 0.635),
        kp('left_wrist', 0.26, 0.74),
        kp('right_wrist', 0.28, 0.735),
        kp('left_hip', 0.52, 0.5),
        kp('right_hip', 0.54, 0.5),
        kp('left_knee', 0.7, 0.5),
        kp('right_knee', 0.72, 0.5),
        kp('left_ankle', 0.78, 0.72),
        kp('right_ankle', 0.8, 0.72),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/**
 * Calf raise: the whole chain translates up together (heels rise, shins stay
 * long). Profile adds a little ankle-forward travel (plantarflexion) — not a
 * mini-squat where ankles crawl toward the knees.
 */
export function calfPose(view, depth = 0) {
  const face = view !== 'profile';
  const lift = 0.055;
  const ankleFwd = face ? 0 : 0.046;
  const idle = face
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
  const end = idle.map((p) => {
    const x = p.name.endsWith('_ankle') ? p.x + ankleFwd : p.x;
    return kp(p.name, x, p.y - lift);
  });
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/**
 * Profile mountain climber: high plank, then one knee+ankle travel toward the chest.
 * Upper body and the support leg stay planted. `side` is the driving knee.
 * Face keypoints exist only for dumps — the catalog is profile-locked.
 */
export function climberPose(view, depth = 0, side = 'left') {
  const face = view !== 'profile';
  let idle = face
    ? [
        kp('nose', 0.5, 0.36),
        kp('left_eye', 0.46, 0.348),
        kp('right_eye', 0.54, 0.348),
        kp('left_ear', 0.43, 0.36),
        kp('right_ear', 0.57, 0.36),
        kp('left_shoulder', 0.36, 0.46),
        kp('right_shoulder', 0.64, 0.46),
        kp('left_elbow', 0.32, 0.6),
        kp('right_elbow', 0.68, 0.6),
        kp('left_wrist', 0.28, 0.74),
        kp('right_wrist', 0.72, 0.74),
        kp('left_hip', 0.42, 0.58),
        kp('right_hip', 0.58, 0.58),
        kp('left_knee', 0.44, 0.63),
        kp('right_knee', 0.56, 0.63),
        kp('left_ankle', 0.45, 0.68),
        kp('right_ankle', 0.55, 0.68),
      ]
    : [
        kp('nose', 0.18, 0.38),
        kp('left_eye', 0.16, 0.37),
        kp('right_eye', 0.19, 0.365),
        kp('left_ear', 0.22, 0.38),
        kp('right_ear', 0.15, 0.38),
        kp('left_shoulder', 0.28, 0.42),
        kp('right_shoulder', 0.3, 0.415),
        kp('left_elbow', 0.28, 0.57),
        kp('right_elbow', 0.3, 0.565),
        kp('left_wrist', 0.28, 0.72),
        kp('right_wrist', 0.3, 0.715),
        kp('left_hip', 0.5, 0.46),
        kp('right_hip', 0.52, 0.455),
        kp('left_knee', 0.68, 0.52),
        kp('right_knee', 0.7, 0.515),
        kp('left_ankle', 0.84, 0.68),
        kp('right_ankle', 0.86, 0.675),
      ];
  let end = face
    ? idle.map((p) => {
        if (p.name === 'left_knee') return kp(p.name, 0.4, 0.7);
        if (p.name === 'left_ankle') return kp(p.name, 0.38, 0.72);
        return p;
      })
    : idle.map((p) => {
        if (p.name === 'left_knee') return kp(p.name, 0.34, 0.54);
        if (p.name === 'left_ankle') return kp(p.name, 0.4, 0.66);
        return p;
      });
  if (!face) {
    idle = flipProfileX(idle);
    end = flipProfileX(end);
  }
  const idleM = new Map(idle.map((p) => [p.name, p]));
  let endM = new Map(end.map((p) => [p.name, p]));
  if (side === 'right') endM = swapSides(endM, face);
  return mixMaps(idleM, endM, depth);
}

/** Closed stance + arms down → jump-open with arms overhead. */
export function jackPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.34, 0.38),
        kp('right_elbow', 0.66, 0.38),
        kp('left_wrist', 0.4, 0.54),
        kp('right_wrist', 0.6, 0.54),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.45, 0.68),
        kp('right_knee', 0.55, 0.68),
        kp('left_ankle', 0.47, 0.88),
        kp('right_ankle', 0.53, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.47, 0.37),
        kp('right_elbow', 0.53, 0.36),
        kp('left_wrist', 0.46, 0.52),
        kp('right_wrist', 0.545, 0.51),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.51, 0.68),
        kp('right_knee', 0.525, 0.68),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.18),
        kp('left_shoulder', 0.36, 0.2),
        kp('right_shoulder', 0.64, 0.2),
        kp('left_elbow', 0.18, 0.12),
        kp('right_elbow', 0.82, 0.12),
        kp('left_wrist', 0.12, 0.04),
        kp('right_wrist', 0.88, 0.04),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.3, 0.68),
        kp('right_knee', 0.7, 0.68),
        kp('left_ankle', 0.24, 0.88),
        kp('right_ankle', 0.76, 0.88),
      ]
    : [
        ...profHead(0.49, 0.18),
        kp('left_shoulder', 0.49, 0.2),
        kp('right_shoulder', 0.515, 0.195),
        kp('left_elbow', 0.5, 0.12),
        kp('right_elbow', 0.52, 0.115),
        kp('left_wrist', 0.5, 0.04),
        kp('right_wrist', 0.52, 0.035),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.46, 0.68),
        kp('right_knee', 0.56, 0.68),
        kp('left_ankle', 0.44, 0.88),
        kp('right_ankle', 0.58, 0.88),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/**
 * Lying supine on the floor, profile only (head left, feet right).
 * Idle: one horizontal line on the floor — arms along the torso, knees locked.
 * End: hips stay grounded, straight legs rotate to ~90° (ankle above hip).
 */
export function legRaisePose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = face
    ? [
        kp('nose', 0.5, 0.14),
        kp('left_eye', 0.46, 0.13),
        kp('right_eye', 0.54, 0.13),
        kp('left_ear', 0.43, 0.14),
        kp('right_ear', 0.57, 0.14),
        kp('left_shoulder', 0.34, 0.26),
        kp('right_shoulder', 0.66, 0.26),
        kp('left_elbow', 0.22, 0.32),
        kp('right_elbow', 0.78, 0.32),
        kp('left_wrist', 0.14, 0.4),
        kp('right_wrist', 0.86, 0.4),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.4, 0.68),
        kp('right_knee', 0.6, 0.68),
        kp('left_ankle', 0.38, 0.88),
        kp('right_ankle', 0.62, 0.88),
      ]
    : [
        kp('nose', 0.14, 0.62),
        kp('left_eye', 0.125, 0.605),
        kp('right_eye', 0.155, 0.6),
        kp('left_ear', 0.2, 0.64),
        kp('right_ear', 0.12, 0.645),
        kp('left_shoulder', 0.26, 0.7),
        kp('right_shoulder', 0.28, 0.705),
        kp('left_elbow', 0.38, 0.74),
        kp('right_elbow', 0.4, 0.745),
        kp('left_wrist', 0.48, 0.74),
        kp('right_wrist', 0.5, 0.745),
        kp('left_hip', 0.5, 0.72),
        kp('right_hip', 0.52, 0.725),
        kp('left_knee', 0.68, 0.72),
        kp('right_knee', 0.7, 0.725),
        kp('left_ankle', 0.86, 0.72),
        kp('right_ankle', 0.88, 0.725),
      ];
  const end = face
    ? [
        kp('nose', 0.5, 0.14),
        kp('left_eye', 0.46, 0.13),
        kp('right_eye', 0.54, 0.13),
        kp('left_ear', 0.43, 0.14),
        kp('right_ear', 0.57, 0.14),
        kp('left_shoulder', 0.34, 0.26),
        kp('right_shoulder', 0.66, 0.26),
        kp('left_elbow', 0.22, 0.32),
        kp('right_elbow', 0.78, 0.32),
        kp('left_wrist', 0.14, 0.4),
        kp('right_wrist', 0.86, 0.4),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.41, 0.32),
        kp('right_knee', 0.59, 0.32),
        kp('left_ankle', 0.4, 0.16),
        kp('right_ankle', 0.6, 0.16),
      ]
    : [
        kp('nose', 0.14, 0.62),
        kp('left_eye', 0.125, 0.605),
        kp('right_eye', 0.155, 0.6),
        kp('left_ear', 0.2, 0.64),
        kp('right_ear', 0.12, 0.645),
        kp('left_shoulder', 0.26, 0.7),
        kp('right_shoulder', 0.28, 0.705),
        kp('left_elbow', 0.38, 0.74),
        kp('right_elbow', 0.4, 0.745),
        kp('left_wrist', 0.48, 0.74),
        kp('right_wrist', 0.5, 0.745),
        kp('left_hip', 0.5, 0.72),
        kp('right_hip', 0.52, 0.725),
        kp('left_knee', 0.5, 0.54),
        kp('right_knee', 0.52, 0.545),
        kp('left_ankle', 0.5, 0.36),
        kp('right_ankle', 0.52, 0.365),
      ];
  return mixMaps(new Map(idle.map((p) => [p.name, p])), new Map(end.map((p) => [p.name, p])), depth);
}

/** Step-jack: one foot out, both arms raise. `side` is the stepping foot. */
export function lowJackPose(view, depth = 0, side = 'left') {
  const face = view !== 'profile';
  const idle = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.34, 0.38),
        kp('right_elbow', 0.66, 0.38),
        kp('left_wrist', 0.4, 0.54),
        kp('right_wrist', 0.6, 0.54),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.43, 0.68),
        kp('right_knee', 0.57, 0.68),
        kp('left_ankle', 0.45, 0.88),
        kp('right_ankle', 0.55, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.47, 0.37),
        kp('right_elbow', 0.53, 0.36),
        kp('left_wrist', 0.46, 0.52),
        kp('right_wrist', 0.545, 0.51),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.51, 0.68),
        kp('right_knee', 0.525, 0.68),
        kp('left_ankle', 0.505, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const end = face
    ? [
        ...faceHead(0.2),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.2, 0.14),
        kp('right_elbow', 0.8, 0.14),
        kp('left_wrist', 0.16, 0.06),
        kp('right_wrist', 0.84, 0.06),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.28, 0.68),
        kp('right_knee', 0.55, 0.68),
        kp('left_ankle', 0.22, 0.88),
        kp('right_ankle', 0.55, 0.88),
      ]
    : [
        ...profHead(0.49, 0.2),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.5, 0.14),
        kp('right_elbow', 0.52, 0.135),
        kp('left_wrist', 0.5, 0.06),
        kp('right_wrist', 0.52, 0.055),
        kp('left_hip', 0.495, 0.48),
        kp('right_hip', 0.515, 0.48),
        kp('left_knee', 0.44, 0.68),
        kp('right_knee', 0.525, 0.68),
        kp('left_ankle', 0.4, 0.88),
        kp('right_ankle', 0.518, 0.88),
      ];
  const idleM = new Map(idle.map((p) => [p.name, p]));
  let endM = new Map(end.map((p) => [p.name, p]));
  if (side === 'right') endM = swapSides(endM, face);
  return mixMaps(idleM, endM, depth);
}

function standingBalance(view) {
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

/**
 * Single-leg stance. `side` is the free/swing leg.
 * depth=0 both feet planted; depth=1 knee driven up in front (thigh ~parallel).
 */
export function balancePose(view, depth = 0, side = 'left') {
  const face = view !== 'profile';
  const idle = standingBalance(view);
  const end = face
    ? [
        ...faceHead(0.205),
        kp('left_shoulder', 0.36, 0.205),
        kp('right_shoulder', 0.64, 0.205),
        kp('left_elbow', 0.28, 0.38),
        kp('right_elbow', 0.7, 0.37),
        kp('left_wrist', 0.26, 0.52),
        kp('right_wrist', 0.72, 0.51),
        kp('left_hip', 0.42, 0.48),
        kp('right_hip', 0.58, 0.48),
        kp('left_knee', 0.4, 0.47),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.38, 0.66),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.49, 0.21),
        kp('left_shoulder', 0.49, 0.21),
        kp('right_shoulder', 0.515, 0.205),
        kp('left_elbow', 0.44, 0.34),
        kp('right_elbow', 0.53, 0.36),
        kp('left_wrist', 0.42, 0.46),
        kp('right_wrist', 0.545, 0.49),
        kp('left_hip', 0.5, 0.48),
        kp('right_hip', 0.52, 0.48),
        kp('left_knee', 0.66, 0.48),
        kp('right_knee', 0.51, 0.69),
        kp('left_ankle', 0.66, 0.66),
        kp('right_ankle', 0.505, 0.88),
      ];
  let endM = new Map(end.map((p) => [p.name, p]));
  if (side === 'right') endM = swapSides(endM, face);
  return mixMaps(idle, endM, depth);
}

/**
 * Flamingo / stork: support knee long, free knee bent, heel off the floor.
 * `side` is the free/swing leg.
 */
export function balanceFlamingoPose(view, depth = 0, side = 'left') {
  const face = view !== 'profile';
  const idle = standingBalance(view);
  const end = face
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
        kp('left_knee', 0.32, 0.62),
        kp('right_knee', 0.57, 0.7),
        kp('left_ankle', 0.42, 0.54),
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
        kp('left_hip', 0.5, 0.48),
        kp('right_hip', 0.52, 0.48),
        kp('left_knee', 0.38, 0.65),
        kp('right_knee', 0.51, 0.69),
        kp('left_ankle', 0.25, 0.56),
        kp('right_ankle', 0.505, 0.88),
      ];
  let endM = new Map(end.map((p) => [p.name, p]));
  if (side === 'right') endM = swapSides(endM, face);
  return mixMaps(idle, endM, depth);
}

/**
 * Wall sit. depth=0 standing; depth=1 both chair angles ~90°
 * (thighs parallel, shins and torso vertical).
 */
export function wallSitPose(view, depth = 0) {
  const face = view !== 'profile';
  const idle = standingBalance(view);
  const end = face
    ? [
        ...faceHead(0.28),
        kp('left_shoulder', 0.36, 0.28),
        kp('right_shoulder', 0.64, 0.28),
        kp('left_elbow', 0.3, 0.46),
        kp('right_elbow', 0.7, 0.46),
        kp('left_wrist', 0.28, 0.6),
        kp('right_wrist', 0.72, 0.6),
        kp('left_hip', 0.42, 0.62),
        kp('right_hip', 0.58, 0.62),
        kp('left_knee', 0.43, 0.64),
        kp('right_knee', 0.57, 0.64),
        kp('left_ankle', 0.43, 0.88),
        kp('right_ankle', 0.57, 0.88),
      ]
    : [
        ...profHead(0.4, 0.28),
        kp('left_shoulder', 0.4, 0.28),
        kp('right_shoulder', 0.42, 0.275),
        kp('left_elbow', 0.38, 0.42),
        kp('right_elbow', 0.43, 0.415),
        kp('left_wrist', 0.36, 0.54),
        kp('right_wrist', 0.44, 0.535),
        kp('left_hip', 0.4, 0.52),
        kp('right_hip', 0.42, 0.52),
        kp('left_knee', 0.64, 0.52),
        kp('right_knee', 0.66, 0.52),
        kp('left_ankle', 0.64, 0.78),
        kp('right_ankle', 0.66, 0.78),
      ];
  return mixMaps(idle, new Map(end.map((p) => [p.name, p])), depth);
}

export const OFFICIAL_POSE = {
  deadlift: (view, u) => deadliftPose(view, u),
  back_flexibility_test: (view, u) => backFlexibilityPose(view, u),
  bicep_curl: (view, u) => curlPose(view, u, false),
  hammer_curl: (view, u) => hammerCurlPose(view, u),
  tricep_dip: (view, u) => dipPose(view, u),
  shoulder_press: (view, u) => pressPose(view, u),
  lateral_raise: (view, u) => lateralPose(view, u),
  glute_bridge: (view, u) => bridgePose(view, u),
  calf_raise: (view, u) => calfPose(view, u),
  mountain_climber: (view, u, side) => climberPose(view, u, side),
  jumping_jack: (view, u) => jackPose(view, u),
  leg_raise: (view, u) => legRaisePose(view, u),
  low_impact_jack: (view, u, side) => lowJackPose(view, u, side),
  balance_leg: (view, u, side) => balancePose(view, u, side),
  balance_leg_left: (view, u) => balancePose(view, u, 'right'),
  balance_leg_right: (view, u) => balancePose(view, u, 'left'),
  wall_sit: (view, u) => wallSitPose(view, u),
  ...FLEX_POSE,
};
