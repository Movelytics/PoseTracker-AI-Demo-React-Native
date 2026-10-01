import { getPoint } from './view.js';

export function angleBetween(a, b, c) {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBa = Math.hypot(ba.x, ba.y) || 1e-6;
  const magBc = Math.hypot(bc.x, bc.y) || 1e-6;
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Flexifit `calculateAngle` — oriented 0–360°, not the interior 0–180° angle. */
export function orientedAngle(a, b, c) {
  const angle =
    (Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function mirrorName(name) {
  if (name.startsWith('left_')) return `right_${name.slice(5)}`;
  if (name.startsWith('right_')) return `left_${name.slice(6)}`;
  return name;
}

function resolvePoints(points, names, side) {
  if (side !== 'best') {
    const mapped = names.map((n) => {
      if (side === 'right') return n.startsWith('left_') ? mirrorName(n) : n;
      return n;
    });
    const pts = mapped.map((n) => getPoint(points, n));
    if (pts.some((p) => !p)) return null;
    return pts;
  }
  const left = names.map((n) => getPoint(points, n.startsWith('right_') ? mirrorName(n) : n));
  const right = names.map((n) => getPoint(points, n.startsWith('left_') ? mirrorName(n) : n));
  const score = (pts) =>
    pts && pts.every(Boolean) ? pts.reduce((s, p) => s + (p.score ?? 1), 0) : -1;
  const sl = score(left);
  const sr = score(right);
  if (sl < 0 && sr < 0) return null;
  return sl >= sr ? left : right;
}

function computeOne(def, points, acc) {
  if (def.kind === 'min_of') {
    const vals = (def.of || []).map((id) => acc[id]).filter((v) => v != null);
    return vals.length ? Math.min(...vals) : null;
  }
  if (def.kind === 'max_of') {
    const vals = (def.of || []).map((id) => acc[id]).filter((v) => v != null);
    return vals.length ? Math.max(...vals) : null;
  }
  if (def.kind === 'mean_of') {
    const vals = (def.of || []).map((id) => acc[id]).filter((v) => v != null);
    if (!vals.length) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }
  if (def.kind === 'linear_map') {
    const src = Array.isArray(def.of) ? def.of[0] : def.of;
    const v = acc[src];
    if (v == null || !Number.isFinite(v)) return null;
    const [a0, a1] = def.from || [0, 1];
    const [b0, b1] = def.to || [0, 100];
    if (a1 === a0) return b1;
    const t = (v - a0) / (a1 - a0);
    const c = Math.max(0, Math.min(1, t));
    return b0 + c * (b1 - b0);
  }
  if (def.kind === 'coalesce') {
    for (const id of def.of || []) {
      if (acc[id] != null) return acc[id];
    }
    return null;
  }
  if (def.kind === 'abs_diff') {
    const [a, b] = def.of || [];
    if (acc[a] == null || acc[b] == null) return null;
    return Math.abs(acc[a] - acc[b]);
  }
  if (def.kind === 'segment_ratio') {
    const pts = resolvePoints(points, def.points, def.side || 'left');
    if (!pts || pts.length !== 3) return null;
    const [a, b, c] = pts;
    const denom = Math.hypot(b.x - a.x, b.y - a.y);
    if (denom < 1e-6) return null;
    return Math.hypot(c.x - a.x, c.y - a.y) / denom;
  }
  if (def.kind === 'segment_ratio_y') {
    const pts = resolvePoints(points, def.points, def.side || 'left');
    if (!pts || pts.length !== 3) return null;
    const [hip, knee, ankle] = pts;
    const denom = ankle.y - knee.y;
    if (Math.abs(denom) < 1e-6) return null;
    return (knee.y - hip.y) / denom;
  }
  if (def.kind === 'angle3') {
    const pts = resolvePoints(points, def.points, def.side || 'best');
    if (!pts || pts.length !== 3) return null;
    return angleBetween(pts[0], pts[1], pts[2]);
  }
  if (def.kind === 'oriented_angle3') {
    const pts = resolvePoints(points, def.points, def.side || 'left');
    if (!pts || pts.length !== 3) return null;
    return orientedAngle(pts[0], pts[1], pts[2]);
  }
  if (def.kind === 'obtuse_angle3') {
    const pts = resolvePoints(points, def.points, def.side || 'left');
    if (!pts || pts.length !== 3) return null;
    const interior = angleBetween(pts[0], pts[1], pts[2]);
    if (interior == null) return null;
    return Math.max(interior, 180 - interior);
  }
  if (def.kind === 'alignment_horizontal') {
    const pts = resolvePoints(points, def.points, def.side || 'best');
    if (!pts || pts.length !== 2) return null;
    const [a, b] = pts;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    return 1 - Math.min(1, Math.abs(b.y - a.y) / len);
  }
  if (def.kind === 'alignment_vertical') {
    const pts = resolvePoints(points, def.points, def.side || 'best');
    if (!pts || pts.length !== 2) return null;
    const [a, b] = pts;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1e-6;
    return 1 - Math.min(1, Math.abs(b.x - a.x) / len);
  }
  if (def.kind === 'relative_y') {
    const a = getPoint(points, def.a);
    const b = getPoint(points, def.b);
    if (!a || !b) return null;
    return a.y - b.y;
  }
  if (def.kind === 'abs_dx') {
    const a = getPoint(points, def.a);
    const b = getPoint(points, def.b);
    if (!a || !b) return null;
    return Math.abs(a.x - b.x);
  }
  if (def.kind === 'tilt_from_vertical') {
    const pts = resolvePoints(points, def.points, def.side || 'left');
    if (!pts || pts.length !== 2) return null;
    const [a, b] = pts;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return (Math.atan2(Math.abs(dx), Math.abs(dy) || 1e-6) * 180) / Math.PI;
  }
  if (def.kind === 'norm_y') {
    const a = getPoint(points, def.a);
    const ra = getPoint(points, def.ref_a);
    const rb = getPoint(points, def.ref_b);
    if (!a || !ra || !rb) return null;
    const ref = Math.hypot(rb.x - ra.x, rb.y - ra.y);
    if (ref < 1e-6) return null;
    return a.y / ref;
  }
  if (def.kind === 'norm_dy') {
    const a = getPoint(points, def.a);
    const b = getPoint(points, def.b);
    const ra = getPoint(points, def.ref_a);
    const rb = getPoint(points, def.ref_b);
    if (!a || !b || !ra || !rb) return null;
    const ref = Math.hypot(rb.x - ra.x, rb.y - ra.y);
    if (ref < 1e-6) return null;
    return Math.abs(a.y - b.y) / ref;
  }
  if (def.kind === 'norm_rel_y') {
    const a = getPoint(points, def.a);
    const b = getPoint(points, def.b);
    const ra = getPoint(points, def.ref_a);
    const rb = getPoint(points, def.ref_b);
    if (!a || !b || !ra || !rb) return null;
    const ref = Math.hypot(rb.x - ra.x, rb.y - ra.y);
    if (ref < 1e-6) return null;
    return (a.y - b.y) / ref;
  }
  if (def.kind === 'norm_dx') {
    const a = getPoint(points, def.a);
    const b = getPoint(points, def.b);
    const ra = getPoint(points, def.ref_a);
    const rb = getPoint(points, def.ref_b);
    if (!a || !b || !ra || !rb) return null;
    const ref = Math.hypot(rb.x - ra.x, rb.y - ra.y);
    if (ref < 1e-6) return null;
    return Math.abs(a.x - b.x) / ref;
  }
  return null;
}

/** Evaluate catalog metrics in order (derived metrics last). */
export function computeMetrics(metricDefs, points) {
  const acc = {};
  for (const def of metricDefs || []) {
    acc[def.id] = computeOne(def, points, acc);
  }
  return acc;
}

export function evalWhen(when, metrics) {
  if (!when) return false;
  if (when.all) return when.all.every((w) => evalWhen(w, metrics));
  if (when.any) return when.any.some((w) => evalWhen(w, metrics));
  const v = metrics[when.metric];
  if (when.op === 'exists') return v != null;
  if (v == null) return false;
  switch (when.op) {
    case 'gte':
      return v >= when.value;
    case 'lte':
      return v <= when.value;
    case 'gt':
      return v > when.value;
    case 'lt':
      return v < when.value;
    default:
      return false;
  }
}

export function pickPhase(viewSpec, metrics) {
  if (!viewSpec) return null;
  for (const name of viewSpec.phase_order || []) {
    const phase = viewSpec.phases[name];
    if (phase && evalWhen(phase.when, metrics)) return name;
  }
  return null;
}
