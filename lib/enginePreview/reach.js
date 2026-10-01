/**
 * Seated side stretch — sit tall, then reach one hand high and across.
 *
 * Screen (mirrored webcam): right wrist → top-LEFT rect (DROITE);
 * left wrist → top-RIGHT rect (GAUCHE). Both stay visible.
 *
 * Corner rectangles stay pinned top-left / top-right (selfie). They stay
 * small until the wrist is at max side extension and stable in x. Then they
 * grow toward the (smoothed) hand. Wrist keypoints flicker at the top of a
 * reach — we hold the last good point, smooth x/y, and once the side
 * extension has plateaued the box keeps growing through jitter until contact.
 * back and flash green with a check for 1s. During a reach, only the moving
 * side is required — the opposite shoulder/arm may leave the frame. Count
 * when that wrist has been in its rect, then the torso is upright with both
 * shoulders visible again.
 */
import { getPoint } from './view.js';
import { createScaleGuard } from './faceScale.js';

const PATH_SAMPLES = 16;
const REST_LOCK_FRAMES = 5;
const TRAIL_MAX = 56;
const HANG_MIN = 0.1;
const RAISED_ELBOW = 0.045;
const MAX_ZONE_W = 0.4;
const MAX_ZONE_H = 0.3;
const GROW_PER_SEC = 0.34;
const STABLE_X_MS = 380;
const STABLE_X_EPS = 0.045;
const SMOOTH_TAU = 0.08;
const HOLD_MS = 220;
const CONFIRM_MS = 1000;

function copyPt(p) {
  return p ? { x: p.x, y: p.y } : null;
}

function dist(a, b) {
  if (!a || !b) return null;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function emaPt(prev, next, alpha) {
  if (!next) return prev || null;
  if (!prev) return { x: next.x, y: next.y };
  return { x: prev.x + (next.x - prev.x) * alpha, y: prev.y + (next.y - prev.y) * alpha };
}

function withCenter(z) {
  return {
    ...z,
    shape: 'rect',
    cx: z.x + z.w / 2,
    cy: z.y + z.h / 2,
    rx: z.w / 2,
    ry: z.h / 2,
  };
}

/**
 * Overlay is scaleX(-1): high engine x = left of the selfie screen.
 * Zones stay flush with the top corners until a stretched miss grows them.
 */
export function defaultReachCorner(side, guide = {}) {
  const w = (guide.rx ?? 0.11) * 2;
  const h = (guide.ry ?? 0.08) * 2;
  const inset = 0.02;
  if (side === 'right') return withCenter({ x: 1 - inset - w, y: inset, w, h, side });
  return withCenter({ x: inset, y: inset, w, h, side });
}

export function inReachZone(p, zone) {
  if (!p || !zone) return false;
  if (zone.w != null && zone.h != null && zone.x != null) {
    return p.x >= zone.x && p.x <= zone.x + zone.w && p.y >= zone.y && p.y <= zone.y + zone.h;
  }
  const dx = (p.x - zone.cx) / (zone.rx || 0.07);
  const dy = (p.y - zone.cy) / (zone.ry || 0.07);
  return dx * dx + dy * dy <= 1;
}

/** Palm / fingers sit past the wrist along the forearm. */
export function handPoint(elbow, wrist) {
  if (!wrist) return null;
  if (!elbow) return { x: wrist.x, y: wrist.y };
  const dx = wrist.x - elbow.x;
  const dy = wrist.y - elbow.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return { x: wrist.x, y: wrist.y };
  const hand = clamp(len * 0.55, 0.035, 0.09);
  return { x: wrist.x + (dx / len) * hand, y: wrist.y + (dy / len) * hand };
}

export function touchesReachZone(wrist, elbow, zone, pad = 0.02) {
  if (!zone) return false;
  const padded =
    zone.w != null
      ? { ...zone, x: zone.x - pad, y: zone.y - pad, w: zone.w + pad * 2, h: zone.h + pad * 2 }
      : zone;
  return inReachZone(wrist, padded) || inReachZone(handPoint(elbow, wrist), padded);
}

export function expandReachZone(zone, p, extra = 0.035, limits = {}) {
  if (!zone || !p) return zone;
  const maxW = limits.maxW ?? MAX_ZONE_W;
  const maxH = limits.maxH ?? MAX_ZONE_H;
  const inset = 0.02;
  let { x, y, w, h, side } = zone;
  if (side === 'right') {
    const right = Math.max(x + w, 1 - inset);
    const grown = right - Math.min(x, p.x - extra);
    w = Math.max(w, Math.min(maxW, grown));
    x = right - w;
  } else {
    const left = Math.min(x, inset);
    const grown = Math.max(x + w, p.x + extra) - left;
    w = Math.max(w, Math.min(maxW, grown));
    x = left;
  }
  y = Math.min(y, inset);
  h = Math.max(h, Math.min(maxH, p.y + extra - y));
  return withCenter({ ...zone, x, y, w, h, side });
}

/** Grow toward the wrist along the remaining gap — width and height together. */
export function growReachZoneStep(zone, p, step = 0.007, extra = 0.02, limits = {}) {
  if (!zone || !p) return zone;
  const target = expandReachZone(zone, p, extra, limits);
  const dw = Math.max(0, target.w - zone.w);
  const dh = Math.max(0, target.h - zone.h);
  const remain = Math.hypot(dw, dh);
  if (remain < 1e-4) return withCenter({ ...zone });
  const t = Math.min(1, step / remain);
  const w = zone.w + dw * t;
  const h = zone.h + dh * t;
  const inset = 0.02;
  let { x, y, side } = zone;
  if (side === 'right') {
    const right = Math.max(zone.x + zone.w, 1 - inset);
    x = right - w;
  } else {
    x = Math.min(zone.x, inset);
  }
  y = Math.min(y, inset);
  return withCenter({ ...zone, x, y, w, h, side });
}

function zoneCaps() {
  return { maxW: MAX_ZONE_W, maxH: MAX_ZONE_H };
}

/** Arm stretched up toward the static corner, but the wrist is still short of it. */
function stretchedMiss(side, wrist, elbow, shoulder, rest, zone) {
  if (!wrist || !shoulder || !zone || inReachZone(wrist, zone)) return false;
  const arm = rest?.armBySide?.[side] || rest?.arm || dist(shoulder, wrist);
  if (!arm) return false;
  if (wrist.y > shoulder.y - arm * 0.12) return false;
  if (elbow && wrist.y > elbow.y) return false;
  const direct = dist(wrist, shoulder);
  const chain = elbow ? dist(shoulder, elbow) + dist(elbow, wrist) : direct;
  const straight = !elbow || (chain > 1e-4 && direct / chain >= 0.86);
  if (direct < arm * 0.78 || !straight) return false;
  if (side === 'right') {
    if (wrist.x < shoulder.x + arm * 0.08) return false;
  } else if (wrist.x > shoulder.x - arm * 0.08) {
    return false;
  }
  const target = { x: zone.cx, y: zone.cy };
  return dist(wrist, target) < dist(shoulder, target) - 0.01;
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function resamplePolyline(pts, samples) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i += 1) {
    const d = dist(pts[i - 1], pts[i]) || 1e-6;
    seg.push(d);
    total += d;
  }
  const path = [];
  for (let i = 0; i <= samples; i += 1) {
    const target = (i / samples) * total;
    let acc = 0;
    let p = pts[pts.length - 1];
    for (let j = 1; j < pts.length; j += 1) {
      const d = seg[j - 1];
      if (acc + d >= target || j === pts.length - 1) {
        p = lerpPt(pts[j - 1], pts[j], Math.max(0, Math.min(1, (target - acc) / d)));
        break;
      }
      acc += d;
    }
    path.push(p);
  }
  return path;
}

/**
 * Hang → wrist above elbow (still outside) → above the crown → far zone.
 * Never crosses the face: the midline is only crossed above the head.
 */
export function reachArcPath(start, end, sh, out, arm, extras = {}) {
  const reach = Math.max(arm || 0.3, 0.18);
  const sx = sh?.x ?? start.x;
  const sy = sh?.y ?? start.y - reach * 0.7;
  const elbow = extras.elbow;
  const nose = extras.nose;
  const faceY = nose?.y ?? 0.14;
  const crownY = clamp(Math.min(end.y, faceY) - 0.07, 0.02, 0.07);
  const elbowY = elbow?.y ?? sy + reach * 0.5;
  const unfold = {
    x: clamp(sx + out * reach * 0.5, 0.03, 0.97),
    y: clamp(elbowY - reach * 0.22, 0.14, 0.4),
  };
  const highOut = {
    x: clamp(sx + out * reach * 0.72, 0.03, 0.97),
    y: crownY,
  };
  const overCrown = {
    x: clamp((highOut.x + end.x) / 2, 0.03, 0.97),
    y: crownY,
  };
  const path = resamplePolyline([start, unfold, highOut, overCrown, end], PATH_SAMPLES);
  return { path, c1: highOut, c2: overCrown };
}

function shoulderWidth(ls, rs) {
  if (!ls || !rs) return null;
  const w = Math.abs(rs.x - ls.x);
  return w > 1e-4 ? w : null;
}

export function towardDir(side, ls, rs) {
  if (!ls || !rs) return side === 'right' ? -1 : 1;
  if (side === 'right') return Math.sign(ls.x - rs.x) || -1;
  return Math.sign(rs.x - ls.x) || 1;
}

/** Same-side / outward: right stretch → toward the right shoulder. */
export function outwardDir(side, ls, rs) {
  return -towardDir(side, ls, rs);
}

export function estimateArmLength(sh, el, wr, sw) {
  const span = Math.max(sw || 0.28, 1e-4);
  let est = span * 1.05;
  if (sh && el) est = Math.max(dist(sh, el) * 2, 1e-4);
  else if (sh && wr) est = Math.max(dist(sh, wr), 1e-4);
  return clamp(est, span * 0.85, span * 1.4);
}

function angleAt(a, b, c) {
  if (!a || !b || !c) return null;
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const mag = (Math.hypot(ba.x, ba.y) * Math.hypot(bc.x, bc.y)) || 1e-6;
  const cos = Math.max(-1, Math.min(1, (ba.x * bc.x + ba.y * bc.y) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

function elbowHang(sh, el, unit) {
  if (!sh || !el || !unit) return null;
  return (el.y - sh.y) / unit;
}

function distToSeg(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const den = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / den));
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

function meanPathDev(trail, path) {
  if (!trail?.length || !path || path.length < 2) return null;
  let sum = 0;
  for (const p of trail) {
    let best = Infinity;
    for (let i = 0; i < path.length - 1; i += 1) {
      best = Math.min(best, distToSeg(p, path[i], path[i + 1]));
    }
    sum += best;
  }
  return sum / trail.length;
}

function cornerScore(side, w) {
  return (side === 'right' ? w.x : 1 - w.x) + (1 - w.y);
}

function towardCorner(side, w) {
  if (!w) return false;
  if (w.y > 0.34) return false;
  return side === 'right' ? w.x > 0.58 : w.x < 0.42;
}

export function buildReachGeometry(side, rest, guide = {}, calibrated = null) {
  const base = defaultReachCorner(side, guide);
  const pinned = calibrated?.[side];
  const corner = pinned?.w != null ? withCenter({ ...base, ...pinned, side }) : base;
  const end = { x: corner.cx, y: corner.cy };
  const sh = side === 'right' ? rest?.rs : rest?.ls;
  const hangWrist = side === 'right' ? rest?.rw : rest?.lw;
  const arm = rest?.armBySide?.[side] || rest?.arm || rest?.sw * 1.05 || 0.3;
  const start = hangWrist
    ? { x: hangWrist.x, y: hangWrist.y }
    : sh
      ? { x: sh.x, y: sh.y + arm * 0.75 }
      : { x: side === 'right' ? 0.72 : 0.28, y: 0.55 };
  const out = outwardDir(side, rest?.ls, rest?.rs);
  const { path, c1 } = reachArcPath(start, end, sh, out, arm, {
    elbow: side === 'right' ? rest?.re : rest?.le,
    nose: rest?.nose,
  });
  const leanDir = towardDir(side, rest?.ls, rest?.rs);
  return {
    dir: leanDir,
    out,
    arm,
    start,
    mid: c1,
    end,
    path,
    zone: { ...corner },
    from: sh ? { x: sh.x, y: sh.y } : null,
  };
}

export function snapshotReachRest(points, cycle = {}) {
  const nose = getPoint(points, cycle.anchor || 'nose');
  const ls = getPoint(points, 'left_shoulder');
  const rs = getPoint(points, 'right_shoulder');
  const le = getPoint(points, 'left_elbow');
  const re = getPoint(points, 'right_elbow');
  const lw = getPoint(points, 'left_wrist');
  const rw = getPoint(points, 'right_wrist');
  const leye = getPoint(points, 'left_eye');
  const reye = getPoint(points, 'right_eye');
  const sw = shoulderWidth(ls, rs);
  if (!nose || !ls || !rs || !sw) return null;
  const leftArm = estimateArmLength(ls, le, lw, sw);
  const rightArm = estimateArmLength(rs, re, rw, sw);
  return {
    nose: copyPt(nose),
    ls: copyPt(ls),
    rs: copyPt(rs),
    le: copyPt(le),
    re: copyPt(re),
    lw: copyPt(lw),
    rw: copyPt(rw),
    leye: copyPt(leye),
    reye: copyPt(reye),
    sw,
    arm: Math.max(leftArm, rightArm),
    armBySide: { left: leftArm, right: rightArm },
  };
}

function pathFitScore(trail, path, arm) {
  if (!trail || trail.length < 3) return 0.72;
  const dev = meanPathDev(trail, path);
  if (dev == null || !arm) return 0.72;
  return Math.max(0, Math.min(1, 1 - dev / (arm * 0.32)));
}

export function createReachTracker(cycle = {}) {
  const minLift = cycle.min_lift ?? 0.24;
  const minShoulder = cycle.min_shoulder_lift ?? 0.08;
  const minLean = cycle.min_lean ?? 0.1;
  const minTurnMs = (cycle.min_turn_duration ?? 0.5) * 1000;
  const maxHeadDrop = cycle.max_head_drop ?? 0.2;
  const scaleGuard = createScaleGuard(cycle);
  let lastSide = null;
  let turnAt = 0;
  let rest = null;
  let restHold = 0;
  let calibrated = { left: null, right: null };
  let peakWrist = { left: null, right: null };
  let hit = { left: false, right: false };
  let growing = { left: false, right: false };
  let xHist = { left: [], right: [] };
  let bestTowardX = { left: null, right: null };
  let confirmUntil = { left: 0, right: 0 };
  let lastPushAt = 0;
  let lastGood = { left: null, right: null };
  let smoothArm = { left: null, right: null };
  let trail = [];
  let trailSide = null;
  let peakDrop = 0;
  let peakLean = 0;
  let peakSh = 0;
  let publicCount = 0;

  const shrinkSide = (side) => {
    calibrated[side] = null;
    peakWrist[side] = null;
    growing[side] = false;
    xHist[side] = [];
    bestTowardX[side] = null;
    lastGood[side] = null;
    smoothArm[side] = null;
  };

  const reset = () => {
    lastSide = null;
    turnAt = 0;
    rest = null;
    restHold = 0;
    calibrated = { left: null, right: null };
    peakWrist = { left: null, right: null };
    hit = { left: false, right: false };
    growing = { left: false, right: false };
    xHist = { left: [], right: [] };
    bestTowardX = { left: null, right: null };
    confirmUntil = { left: 0, right: 0 };
    lastPushAt = 0;
    lastGood = { left: null, right: null };
    smoothArm = { left: null, right: null };
    trail = [];
    trailSide = null;
    peakDrop = 0;
    peakLean = 0;
    peakSh = 0;
    publicCount = 0;
    scaleGuard.reset();
  };

  return {
    reset,
    push(points, now) {
      const nose = getPoint(points, cycle.anchor || 'nose');
      const ls = getPoint(points, 'left_shoulder');
      const rs = getPoint(points, 'right_shoulder');
      const le = getPoint(points, 'left_elbow');
      const re = getPoint(points, 'right_elbow');
      const lw = getPoint(points, 'left_wrist');
      const rw = getPoint(points, 'right_wrist');
      const sw = shoulderWidth(ls, rs);
      const zoom = scaleGuard.sample(points);

      const markZone = (z) => {
        if (!z) return z;
        return { ...z, ok: now < (confirmUntil[z.side] || 0) };
      };
      const guideFor = (side, extra = {}) => {
        const geomRest = rest || snapshotReachRest(points, cycle);
        const geoR = buildReachGeometry('right', geomRest, cycle.guide, calibrated);
        const geoL = buildReachGeometry('left', geomRest, cycle.guide, calibrated);
        const geo = side === 'left' ? geoL : geoR;
        const wrist = side === 'right' ? rw : lw;
        return {
          kind: 'reach_zone',
          side,
          zone: markZone(geo?.zone || null),
          zones: [markZone(geoR?.zone), markZone(geoL?.zone)].filter(Boolean),
          from: geo?.from || null,
          wrist: wrist ? { keypoint: `${side}_wrist`, x: wrist.x, y: wrist.y } : null,
          anchor: rest?.nose || (nose ? { x: nose.x, y: nose.y } : null),
        };
      };

      const empty = (skip, extra = {}) => ({
        counted: 0,
        publicTurns: publicCount,
        phase: 'idle',
        skip,
        lift: 0,
        side: lastSide,
        metrics: {
          last_side: lastSide,
          face_scale: zoom.scale,
          zoom_factor: zoom.factor,
          ...extra,
        },
        guide: guideFor(trailSide || lastSide || 'right'),
      });

      if (!nose) return empty('anchor');
      if (zoom.zooming) return empty('zoom');

      const unit = rest?.sw || sw || 0.28;
      const leftIdle = !lw || (lw && nose ? (nose.y - lw.y) / unit : 0) < minLift * 0.4;
      const rightIdle = !rw || (rw && nose ? (nose.y - rw.y) / unit : 0) < minLift * 0.4;
      const reaching =
        (rw && !rightIdle) || (hit.right && !ls)
          ? 'right'
          : (lw && !leftIdle) || (hit.left && !rs)
            ? 'left'
            : trailSide;

      if (!rest) {
        if (!ls || !rs || !sw) return empty('anchor');
      } else if (reaching === 'right' && !rs) {
        return empty('anchor');
      } else if (reaching === 'left' && !ls) {
        return empty('anchor');
      } else if (!reaching && !ls && !rs) {
        return empty('anchor');
      }

      const lsUse = ls || rest?.ls;
      const rsUse = rs || rest?.rs;
      const dirR = towardDir('right', rest?.ls || lsUse, rest?.rs || rsUse);
      const dirL = towardDir('left', rest?.ls || lsUse, rest?.rs || rsUse);
      const leftLift = lw && nose && unit ? (nose.y - lw.y) / unit : null;
      const rightLift = rw && nose && unit ? (nose.y - rw.y) / unit : null;
      const shLiftR = ls && rs ? (ls.y - rs.y) / unit : 0;
      const shLiftL = ls && rs ? (rs.y - ls.y) / unit : 0;
      const leanR = rest?.nose ? ((nose.x - rest.nose.x) * dirR) / unit : 0;
      const leanL = rest?.nose ? ((nose.x - rest.nose.x) * dirL) / unit : 0;
      const leftHang = ls && le ? elbowHang(ls, le, unit) : null;
      const rightHang = rs && re ? elbowHang(rs, re, unit) : null;
      const bothShoulders = !!(ls && rs);
      const torsoUpright =
        bothShoulders &&
        Math.abs(shLiftR) < minShoulder * 1.1 &&
        (!rest?.nose || Math.abs(nose.x - rest.nose.x) < (rest.sw || unit) * 0.4);

      if (leftIdle && rightIdle && torsoUpright && bothShoulders) {
        restHold += 1;
        if (!rest && restHold >= REST_LOCK_FRAMES) rest = snapshotReachRest(points, cycle);
        if (!hit.right && !hit.left) {
          shrinkSide('right');
          shrinkSide('left');
        }
      } else {
        restHold = 0;
      }

      const towardX = (side, x) => (side === 'right' ? x : 1 - x);
      const noteWristX = (side, x) => {
        const hist = xHist[side];
        hist.push({ t: now, x });
        xHist[side] = hist.filter((s) => now - s.t <= STABLE_X_MS);
        const toward = towardX(side, x);
        if (bestTowardX[side] == null || toward > bestTowardX[side]) bestTowardX[side] = toward;
      };
      const wristXStable = (side) => {
        const hist = xHist[side];
        if (hist.length < 3) return false;
        if (now - hist[0].t < STABLE_X_MS * 0.75) return false;
        const xs = hist.map((s) => s.x);
        return Math.max(...xs) - Math.min(...xs) <= STABLE_X_EPS;
      };
      const atMaxX = (side, x) =>
        bestTowardX[side] != null && towardX(side, x) >= bestTowardX[side] - STABLE_X_EPS;

      const geomRest = rest || snapshotReachRest(points, cycle);
      const dt = lastPushAt ? clamp((now - lastPushAt) / 1000, 0.016, 0.12) : 1 / 30;
      const alpha = 1 - Math.exp(-dt / SMOOTH_TAU);
      const step = GROW_PER_SEC * dt;

      const holdArm = (side, wrist, el, sh) => {
        if (wrist) {
          lastGood[side] = { wrist: copyPt(wrist), elbow: copyPt(el), sh: copyPt(sh), t: now };
        } else if (lastGood[side] && now - lastGood[side].t <= HOLD_MS) {
          wrist = lastGood[side].wrist;
          el = el || lastGood[side].elbow;
          sh = sh || lastGood[side].sh;
        } else {
          lastGood[side] = null;
          smoothArm[side] = null;
          return { wrist: null, elbow: el, sh };
        }
        const prev = smoothArm[side];
        const sm = {
          wrist: emaPt(prev?.wrist, wrist, alpha),
          elbow: emaPt(prev?.elbow, el, alpha),
          sh: emaPt(prev?.sh, sh, alpha),
        };
        smoothArm[side] = sm;
        return sm;
      };

      const growSide = (side, rawWrist, rawEl, rawSh, idle) => {
        const sm = holdArm(side, rawWrist, rawEl, rawSh);
        const wrist = sm.wrist;
        const el = sm.elbow;
        const sh = sm.sh || rawSh;
        const base = calibrated[side] || defaultReachCorner(side, cycle.guide);
        const target = handPoint(el, wrist) || wrist;
        if (!wrist || touchesReachZone(wrist, el, base) || touchesReachZone(rawWrist, rawEl, base)) {
          xHist[side] = [];
          growing[side] = false;
          return;
        }
        const raised = !idle && (!sh || wrist.y < sh.y + 0.03);
        const miss = stretchedMiss(side, wrist, el, sh, geomRest, base);
        if (growing[side] && raised) {
          noteWristX(side, wrist.x);
          calibrated[side] = growReachZoneStep(base, target, step, 0.02, zoneCaps());
          return;
        }
        if (!miss) {
          growing[side] = false;
          return;
        }
        noteWristX(side, wrist.x);
        const prev = peakWrist[side];
        if (!prev || cornerScore(side, wrist) >= cornerScore(side, prev)) peakWrist[side] = copyPt(wrist);
        if (!wristXStable(side) || !atMaxX(side, wrist.x)) {
          growing[side] = false;
          return;
        }
        growing[side] = true;
        calibrated[side] = growReachZoneStep(base, target, step, 0.02, zoneCaps());
      };
      const leftIdleGrow = !lw || (lw && nose ? (nose.y - (smoothArm.left?.wrist || lw).y) / unit : 0) < minLift * 0.35;
      const rightIdleGrow = !rw || (rw && nose ? (nose.y - (smoothArm.right?.wrist || rw).y) / unit : 0) < minLift * 0.35;
      growSide('right', rw, re, rsUse, rightIdleGrow);
      growSide('left', lw, le, lsUse, leftIdleGrow);
      lastPushAt = now;

      const geoR = buildReachGeometry('right', geomRest, cycle.guide, calibrated);
      const geoL = buildReachGeometry('left', geomRest, cycle.guide, calibrated);
      const rwHit = smoothArm.right?.wrist || rw;
      const reHit = smoothArm.right?.elbow || re;
      const lwHit = smoothArm.left?.wrist || lw;
      const leHit = smoothArm.left?.elbow || le;
      const rightIn = !!(
        geoR &&
        (touchesReachZone(rw, re, geoR.zone) || touchesReachZone(rwHit, reHit, geoR.zone))
      );
      const leftIn = !!(
        geoL &&
        (touchesReachZone(lw, le, geoL.zone) || touchesReachZone(lwHit, leHit, geoL.zone))
      );

      const headDrop = rest?.nose ? (nose.y - rest.nose.y) / unit : 0;
      const rounded = rest?.nose && headDrop > maxHeadDrop;

      if (leftIn && rightIn) return empty('both_arms', { left_lift: leftLift, right_lift: rightLift });

      const oppUp = (side) => {
        const hang = side === 'right' ? leftHang : rightHang;
        if (hang == null) return false;
        return hang < RAISED_ELBOW;
      };

      if (rightIn && !oppUp('right')) {
        if (!hit.right) {
          hit.right = true;
          shrinkSide('right');
          confirmUntil.right = now + CONFIRM_MS;
        }
      }
      if (leftIn && !oppUp('left')) {
        if (!hit.left) {
          hit.left = true;
          shrinkSide('left');
          confirmUntil.left = now + CONFIRM_MS;
        }
      }
      if (rightIn && oppUp('right')) return empty('opp_arm');
      if (leftIn && oppUp('left')) return empty('opp_arm');

      const approaching = rightIn || (rw && !rightIdle) ? 'right' : leftIn || (lw && !leftIdle) ? 'left' : null;
      if (approaching) {
        const w = approaching === 'right' ? rw : lw;
        if (w) {
          const last = trail[trail.length - 1];
          if (trailSide !== approaching) trail = [];
          trailSide = approaching;
          if (!last || Math.hypot(w.x - last.x, w.y - last.y) > 0.004) {
            trail.push({ x: w.x, y: w.y });
            if (trail.length > TRAIL_MAX) trail = trail.slice(-TRAIL_MAX);
          }
        }
        peakLean = Math.max(peakLean, approaching === 'right' ? leanR : leanL);
        peakSh = Math.max(peakSh, approaching === 'right' ? shLiftR : shLiftL);
        peakDrop = Math.max(peakDrop, headDrop);
      } else if (!hit.right && !hit.left) {
        trail = [];
        trailSide = null;
        peakDrop = 0;
        peakLean = 0;
        peakSh = 0;
      }

      const phase = rightIn ? 'reach_right' : leftIn ? 'reach_left' : approaching ? `reach_${approaching}` : 'idle';
      const highlight = approaching || (hit.right ? 'right' : hit.left ? 'left' : 'right');
      const metrics = {
        left_lift: leftLift,
        right_lift: rightLift,
        left_shoulder_lift: shLiftL,
        right_shoulder_lift: shLiftR,
        left_lean: leanL,
        right_lean: leanR,
        left_elbow_hang: leftHang,
        right_elbow_hang: rightHang,
        last_side: lastSide,
        head_drop: headDrop,
        path_samples: trail.length,
        hit_right: hit.right,
        hit_left: hit.left,
        confirm_right: now < confirmUntil.right,
        confirm_left: now < confirmUntil.left,
        calibrated: {
          left: calibrated.left ? { ...calibrated.left } : null,
          right: calibrated.right ? { ...calibrated.right } : null,
        },
        face_scale: zoom.scale,
        zoom_factor: zoom.factor,
      };

      const canCount =
        torsoUpright &&
        bothShoulders &&
        !rightIn &&
        !leftIn &&
        (hit.right || hit.left) &&
        (!turnAt || now - turnAt >= minTurnMs);

      if (!canCount) {
        const skip = (hit.right || hit.left) && rounded
          ? 'round_back'
          : (hit.right || hit.left) && !bothShoulders
            ? 'need_opp_shoulder'
            : hit.right || hit.left
              ? 'need_upright'
              : '';
        return {
          counted: 0,
          publicTurns: publicCount,
          phase,
          skip,
          lift: 0,
          side: lastSide,
          metrics,
          guide: guideFor(highlight),
        };
      }

      const done = hit.right ? 'right' : 'left';
      const geo = done === 'right' ? geoR : geoL;
      const oppHang = done === 'right' ? leftHang : rightHang;
      const pathFit = pathFitScore(trail, geo?.path, geo?.arm || rest?.arm);
      const stretchFit = Math.max(
        0,
        Math.min(
          1,
          0.5 * Math.min(1, peakLean / Math.max(minLean, 1e-4)) +
            0.5 * Math.min(1, peakSh / Math.max(minShoulder, 1e-4)),
        ),
      );
      const hangFit = oppHang == null ? 0.8 : Math.max(0, Math.min(1, oppHang / 0.22));
      const dropPen = Math.max(0, Math.min(1, peakDrop / Math.max(maxHeadDrop, 1e-4)));
      const quality = Math.max(0, Math.min(1, 0.7 * pathFit + 0.18 * stretchFit + 0.12 * hangFit - 0.4 * dropPen));

      publicCount += 1;
      lastSide = done;
      turnAt = now;
      hit.right = false;
      hit.left = false;
      shrinkSide(done);
      const countedTrail = trail;
      trail = [];
      trailSide = null;
      peakDrop = 0;
      peakLean = 0;
      peakSh = 0;
      return {
        counted: 1,
        publicTurns: publicCount,
        phase: 'idle',
        skip: '',
        lift: quality,
        side: done,
        metrics: {
          ...metrics,
          last_side: done,
          path_fit: pathFit,
          stretch_fit: stretchFit,
          hang_fit: hangFit,
          reach_quality: quality,
          hit_right: false,
          hit_left: false,
        },
        guide: guideFor(done, { trail: countedTrail }),
      };
    },
  };
}

