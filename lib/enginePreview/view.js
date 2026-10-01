/** @typedef {'face' | 'profile_left' | 'profile_right' | 'unknown'} View */

const MIN_SCORE = 0.3;
const SWITCH_FRAMES = 8;

function rawPoint(points, name) {
  const p = points.get(name);
  if (!p || p.x == null || p.y == null) return null;
  if ((p.score ?? 1) < MIN_SCORE) return null;
  return p;
}

/**
 * COCO-17 plus Flexifit aliases: `middle_*` (midpoint), `upper_*` / `lower_*`
 * (smaller / larger image Y of the left/right pair).
 */
export function getPoint(points, name) {
  if (name.startsWith('middle_')) {
    const part = name.slice(7);
    const left = rawPoint(points, `left_${part}`);
    const right = rawPoint(points, `right_${part}`);
    if (left && right) {
      return {
        x: (left.x + right.x) / 2,
        y: (left.y + right.y) / 2,
        score: Math.min(left.score ?? 1, right.score ?? 1),
      };
    }
    return left || right || null;
  }
  if (name.startsWith('upper_') || name.startsWith('lower_')) {
    const part = name.slice(6);
    const left = rawPoint(points, `left_${part}`);
    const right = rawPoint(points, `right_${part}`);
    if (!left) return right;
    if (!right) return left;
    const preferUpper = name.startsWith('upper_');
    return left.y < right.y === preferUpper ? left : right;
  }
  return rawPoint(points, name);
}

/**
 * Face vs profile from shoulder/hip span; profile side from nose vs hip midpoint.
 * @param {Map<string, {x:number,y:number,score?:number}>} points
 * @returns {View}
 */
export function detectViewRaw(points) {
  const ls = getPoint(points, 'left_shoulder');
  const rs = getPoint(points, 'right_shoulder');
  const lh = getPoint(points, 'left_hip');
  const rh = getPoint(points, 'right_hip');
  if (!ls || !rs) return 'unknown';
  if (!lh || !rh) {
    const shoulderWidth = Math.abs(rs.x - ls.x);
    const stacked = Math.abs(rs.y - ls.y) > shoulderWidth * 0.55;
    if (stacked || shoulderWidth < 0.12) return 'unknown';
    return 'face';
  }

  const shoulderWidth = Math.abs(rs.x - ls.x);
  const hipWidth = Math.abs(rh.x - lh.x);
  const midSh = { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 };
  const midHip = { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 };
  // Use along-body length so a floor plank (horizontal torso) still reads
  // as profile when the shoulders stack, not as a tiny vertical torso.
  const torsoLen =
    Math.hypot(midSh.x - midHip.x, midSh.y - midHip.y) || 1e-6;
  // Side-on: shoulders stack, width << torso length.
  const stacked = Math.max(shoulderWidth, hipWidth) / torsoLen < 0.5;

  const horizontalSpan = shoulderWidth + hipWidth;
  const verticalSpan = Math.abs(rs.y - ls.y) + Math.abs(rh.y - lh.y);
  const faceLike = !stacked && horizontalSpan > verticalSpan;
  if (faceLike) return 'face';

  const nose = getPoint(points, 'nose');
  const hipMidX = (lh.x + rh.x) / 2;
  if (!nose) return 'profile_left';
  return nose.x < hipMidX ? 'profile_left' : 'profile_right';
}

export function viewFamily(view) {
  if (view === 'face') return 'face';
  if (view === 'profile_left' || view === 'profile_right') return 'profile';
  return 'unknown';
}

/**
 * Upper-body face-on: both shoulders + nose, decent width, not stacked in Y.
 * Desk crops often invent hips and flip the global detector to profile.
 */
export function isFaceUpper(points) {
  const ls = getPoint(points, 'left_shoulder');
  const rs = getPoint(points, 'right_shoulder');
  const nose = getPoint(points, 'nose');
  if (!ls || !rs || !nose) return false;
  const w = Math.abs(rs.x - ls.x);
  if (w < 0.1) return false;
  if (Math.abs(rs.y - ls.y) > w * 0.65) return false;
  return true;
}

/**
 * Seated face-on: both feet planted, knees and shoulders visible.
 * Head may be down between the legs (nose optional). Used when a fold
 * confuses the global view detector.
 */
export function isFacePlanted(points) {
  const ls = getPoint(points, 'left_shoulder');
  const rs = getPoint(points, 'right_shoulder');
  const lk = getPoint(points, 'left_knee');
  const rk = getPoint(points, 'right_knee');
  const la = getPoint(points, 'left_ankle');
  const ra = getPoint(points, 'right_ankle');
  if (!ls || !rs || !lk || !rk || !la || !ra) return false;
  if (Math.abs(rk.x - lk.x) < 0.1) return false;
  if (Math.abs(rs.x - ls.x) < 0.06) return false;
  if (!(lk.y < la.y - 0.04) || !(rk.y < ra.y - 0.04)) return false;
  return true;
}

export function createViewTracker() {
  /** @type {View} */
  let current = 'unknown';
  /** @type {View} */
  let candidate = 'unknown';
  let streak = 0;
  let frozen = false;

  return {
    setFrozen(v) {
      frozen = v;
    },
    /**
     * @param {Map<string, any>} points
     * @returns {View}
     */
    update(points) {
      const raw = detectViewRaw(points);
      if (frozen && current !== 'unknown') return current;
      if (raw === current) {
        candidate = raw;
        streak = 0;
        return current;
      }
      if (raw === candidate) streak += 1;
      else {
        candidate = raw;
        streak = 1;
      }
      if (current === 'unknown' || streak >= SWITCH_FRAMES) {
        current = raw;
        streak = 0;
      }
      return current;
    },
    get() {
      return current;
    },
    reset() {
      current = 'unknown';
      candidate = 'unknown';
      streak = 0;
      frozen = false;
    },
  };
}

/**
 * @param {View} view
 * @param {'auto'|'require_face'|'require_profile'} lock
 * @param {'any'|'left'|'right'} [profileSide]
 */
export function lockSatisfied(view, lock, profileSide = 'any') {
  const fam = viewFamily(view);
  if (lock === 'auto') return fam === 'face' || fam === 'profile';
  if (lock === 'require_face') return fam === 'face';
  if (lock === 'require_profile') {
    if (fam !== 'profile') return false;
    if (profileSide === 'left') return view === 'profile_left';
    if (profileSide === 'right') return view === 'profile_right';
    return true;
  }
  return false;
}

/**
 * Host overlay key — matches V2/V3 `direction` on posture events.
 * @returns {'in-frame'|'face-camera'|'profile-camera'|''}
 */
export function directionForHost(view, lock, inBox, lockOk) {
  if (!inBox) return '';
  if (lock === 'require_face' && viewFamily(view) !== 'face') return 'face-camera';
  if (lock === 'require_profile' && viewFamily(view) !== 'profile') return 'profile-camera';
  if (lockOk) return 'in-frame';
  return '';
}
