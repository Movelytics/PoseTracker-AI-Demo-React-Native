export const ENGINE_V4_VERSION = '4.0.0';

export const GRADE_BANDS = [
  ['A', 90],
  ['B', 80],
  ['C', 70],
  ['D', 60],
  ['E', 40],
];

export function gradeOf(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return 'F';
  for (const [g, min] of GRADE_BANDS) {
    if (s >= min) return g;
  }
  return 'F';
}

const ORDER = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };

export function gradeMeetsMin(grade, minGrade) {
  if (!minGrade) return true;
  return (ORDER[grade] ?? 0) >= (ORDER[String(minGrade).toUpperCase()] ?? 0);
}

/** Map metric onto 0–100. If ideal < worst (ratios), smaller is better. */
export function depthScore(value, ideal, worst) {
  if (value == null || !Number.isFinite(value)) return null;
  if (ideal === worst) return 100;
  const t = (value - ideal) / (worst - ideal);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(100 - clamped * 100);
}
