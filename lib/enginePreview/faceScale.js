/**
 * Face-size scale from COCO-17 (eyes / nose / ears).
 * Image distances grow when the person walks toward the camera and shrink
 * when they recede. Face spans stay put during a real shoulder breath or roll.
 */
import { getPoint } from './view.js';

function hypot(dx, dy) {
  return Math.sqrt(dx * dx + dy * dy);
}

export function faceScale(points) {
  const nose = getPoint(points, 'nose');
  const le = getPoint(points, 'left_eye');
  const re = getPoint(points, 'right_eye');
  const la = getPoint(points, 'left_ear');
  const ra = getPoint(points, 'right_ear');
  const spans = [];
  if (le && re) spans.push(hypot(re.x - le.x, re.y - le.y));
  if (nose && le) spans.push(hypot(le.x - nose.x, le.y - nose.y));
  if (nose && re) spans.push(hypot(re.x - nose.x, re.y - nose.y));
  if (la && ra) spans.push(hypot(ra.x - la.x, ra.y - la.y));
  if (!spans.length) return null;
  return spans.reduce((a, b) => a + b, 0) / spans.length;
}

/** Uniform scale about a point — smoke stand-in for walking toward / away from the camera. */
export function scaleKeypoints(list, factor, cx = 0.5, cy = 0.4) {
  const s = Number(factor);
  return (list || []).map((p) => ({
    ...p,
    x: cx + (p.x - cx) * s,
    y: cy + (p.y - cy) * s,
  }));
}

/**
 * Slow rest face size + a zoom flag when the current size disagrees.
 * `min_lift` catalog values stay in frame units; divide by restScale to compare
 * in face units.
 */
export function createScaleGuard(cycle = {}) {
  const useFace = cycle.scale_anchor === 'face';
  const maxRel = cycle.max_scale_delta ?? 0.1;
  let rest = null;

  return {
    enabled: useFace,
    reset() {
      rest = null;
    },
    sample(points) {
      if (!useFace) {
        return { scale: null, restScale: null, zooming: false, factor: 1 };
      }
      const s = faceScale(points);
      if (s == null || s < 1e-4) {
        return { scale: null, restScale: rest, zooming: false, factor: 1 };
      }
      if (rest == null) rest = s;
      else rest = rest * 0.96 + s * 0.04;
      const factor = s / rest;
      return {
        scale: s,
        restScale: rest,
        zooming: Math.abs(factor - 1) > maxRel,
        factor,
      };
    },
    minNorm(minFrame, restScale, scale) {
      const r = restScale || scale || 1;
      return (minFrame ?? 0) / r;
    },
    toFrame(norm, scale) {
      return (norm ?? 0) * (scale || 1);
    },
  };
}
