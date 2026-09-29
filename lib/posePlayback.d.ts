export type PosePoint = { name: string; x: number; y: number; score?: number };
export type PoseMap = Map<string, PosePoint>;

export type PoseFrame = {
  points: PoseMap;
  view: "face" | "profile" | "back";
  kind: "upper" | "full";
  chair: boolean;
};

export function hasPlacementGuide(id: string): boolean;
export function playbackPeriod(id: string): number;
export function poseFrame(id: string, t: number): PoseFrame;
