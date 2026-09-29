export type FormScore = {
  score?: number;
  avg_score?: number;
  grade?: string;
};

export type JumpMetrics = {
  lastHeightCm?: number;
  lastAirTimeSeconds?: number;
};

export type TrackingMode = "realtime" | "upload";

export type HeightUnit = "cm" | "ft_in";

export function isJumpExercise(key: string | null): boolean {
  return key === "jump_analysis" || key === "air_time_jump";
}

export function requiresUserHeight(key: string | null): boolean {
  return key === "jump_analysis";
}

export function gradeColor(grade: string | undefined): string {
  switch (grade) {
    case "A":
      return "#22c55e";
    case "B":
      return "#3b82f6";
    case "C":
      return "#eab308";
    case "D":
      return "#f97316";
    case "E":
    case "F":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

export function formatReady(ms: number): string {
  const seconds = ms / 1000;
  const shown = seconds < 10 ? seconds.toFixed(1) : String(Math.round(seconds));
  return `Ready in ${shown}s`;
}

export function computeHeightCm(
  unit: HeightUnit,
  cmInput: string,
  feetInput: string,
  inchesInput: string
): number | null {
  if (unit === "cm") {
    const v = parseFloat(cmInput.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return null;
    return v;
  }
  const feet = parseFloat(feetInput.replace(",", "."));
  const inches = parseFloat(inchesInput.replace(",", "."));
  if (!Number.isFinite(feet) || feet < 0) return null;
  if (!Number.isFinite(inches) || inches < 0) return null;
  const totalInches = feet * 12 + inches;
  if (totalInches <= 0) return null;
  return totalInches * 2.54;
}

type AnalysisLike = {
  interpretation?: { text?: string; title?: string };
};

export function analysisSentence(analysis: AnalysisLike | null | undefined): string | null {
  const text = analysis?.interpretation?.text?.trim();
  if (text) return text;
  const title = analysis?.interpretation?.title?.trim();
  return title || null;
}

export function unwrapMessage(raw: string): Record<string, unknown> | null {
  try {
    let data: unknown = JSON.parse(raw);
    if (typeof data === "string") data = JSON.parse(data);
    if (!data || typeof data !== "object") return null;
    return data as Record<string, unknown>;
  } catch {
    return null;
  }
}
