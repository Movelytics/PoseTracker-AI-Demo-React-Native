// @ts-nocheck
/**
 * Movement previews for the demo slider.
 * Same playback as the heuristics lab (labPose + V4 catalog). Jumps are a short coded cycle.
 */
import {
  depthForPlayback,
  isAlternatingRep,
  isAnimatedHold,
  isSplitMovement,
  lungePlaybackClock,
  resolveLabView,
  sideLungeKneelPose,
  standingPose,
  synthesizeBreathPose,
  synthesizeHoldPose,
  synthesizeLabPose,
  synthesizeOrbitPose,
  synthesizeReachPose,
  synthesizeSplitPose,
} from "./enginePreview/labPose.js";
import { balancePose } from "./enginePreview/officialPoses.js";

import back_flexibility_test from "./enginePreview/catalog/back_flexibility_test.json";
import balance_leg from "./enginePreview/catalog/balance_leg.json";
import balance_leg_left from "./enginePreview/catalog/balance_leg_left.json";
import balance_leg_right from "./enginePreview/catalog/balance_leg_right.json";
import bicep_curl from "./enginePreview/catalog/bicep_curl.json";
import bow from "./enginePreview/catalog/bow.json";
import bridge from "./enginePreview/catalog/bridge.json";
import calf_raise from "./enginePreview/catalog/calf_raise.json";
import camel from "./enginePreview/catalog/camel.json";
import chair_forward_fold from "./enginePreview/catalog/chair_forward_fold.json";
import chair_side_stretch from "./enginePreview/catalog/chair_side_stretch.json";
import closing from "./enginePreview/catalog/closing.json";
import cobra from "./enginePreview/catalog/cobra.json";
import deadlift from "./enginePreview/catalog/deadlift.json";
import facial_split from "./enginePreview/catalog/facial_split.json";
import foot_to_hand from "./enginePreview/catalog/foot_to_hand.json";
import glute_bridge from "./enginePreview/catalog/glute_bridge.json";
import hammer_curl from "./enginePreview/catalog/hammer_curl.json";
import high_knees from "./enginePreview/catalog/high_knees.json";
import i from "./enginePreview/catalog/i.json";
import jumping_jack from "./enginePreview/catalog/jumping_jack.json";
import king_pigeon from "./enginePreview/catalog/king_pigeon.json";
import lateral_raise from "./enginePreview/catalog/lateral_raise.json";
import leg_raise from "./enginePreview/catalog/leg_raise.json";
import low_impact_jack from "./enginePreview/catalog/low_impact_jack.json";
import lunge from "./enginePreview/catalog/lunge.json";
import mountain_climber from "./enginePreview/catalog/mountain_climber.json";
import needle from "./enginePreview/catalog/needle.json";
import pancake from "./enginePreview/catalog/pancake.json";
import plank from "./enginePreview/catalog/plank.json";
import push_up from "./enginePreview/catalog/push_up.json";
import shoulder_deep_breath from "./enginePreview/catalog/shoulder_deep_breath.json";
import shoulder_press from "./enginePreview/catalog/shoulder_press.json";
import shoulder_roll from "./enginePreview/catalog/shoulder_roll.json";
import side_lunge from "./enginePreview/catalog/side_lunge.json";
import split from "./enginePreview/catalog/split.json";
import squat from "./enginePreview/catalog/squat.json";
import tiger from "./enginePreview/catalog/tiger.json";
import tricep_dip from "./enginePreview/catalog/tricep_dip.json";
import wall_sit from "./enginePreview/catalog/wall_sit.json";

const MOVEMENTS = {
  back_flexibility_test,
  balance_leg,
  balance_leg_left,
  balance_leg_right,
  bicep_curl,
  bow,
  bridge,
  calf_raise,
  camel,
  chair_forward_fold,
  chair_side_stretch,
  closing,
  cobra,
  deadlift,
  facial_split,
  foot_to_hand,
  glute_bridge,
  hammer_curl,
  high_knees,
  i,
  jumping_jack,
  king_pigeon,
  lateral_raise,
  leg_raise,
  low_impact_jack,
  lunge,
  mountain_climber,
  needle,
  pancake,
  plank,
  push_up,
  shoulder_deep_breath,
  shoulder_press,
  shoulder_roll,
  side_lunge,
  split,
  squat,
  tiger,
  tricep_dip,
  wall_sit,
};

const SEATED = new Set([
  "chair_forward_fold",
  "chair_side_stretch",
  "shoulder_roll",
  "shoulder_deep_breath",
]);

function clonePose(points) {
  const out = new Map();
  for (const [name, p] of points) {
    out.set(name, { ...p });
  }
  return out;
}

function jumpPose(t) {
  const points = clonePose(standingPose("face"));
  const x = ((Number(t) || 0) % 1 + 1) % 1;
  let lift = 0;
  let bend = 0;
  if (x < 0.18) {
    bend = 0;
  } else if (x < 0.38) {
    bend = (x - 0.18) / 0.2;
  } else if (x < 0.72) {
    const u = (x - 0.38) / 0.34;
    lift = Math.sin(Math.min(1, u) * Math.PI) * 0.14;
    bend = u < 0.2 ? 1 - u / 0.2 : 0;
  } else {
    bend = Math.sin(((x - 0.72) / 0.28) * Math.PI) * 0.45;
  }
  for (const p of points.values()) {
    p.y -= lift;
  }
  const hipDrop = bend * 0.08;
  const kneeDrop = bend * 0.02;
  for (const name of [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
  ]) {
    const p = points.get(name);
    if (p) p.y += hipDrop;
  }
  const lk = points.get("left_knee");
  const rk = points.get("right_knee");
  if (lk) {
    lk.y += kneeDrop;
    lk.x -= bend * 0.03;
  }
  if (rk) {
    rk.y += kneeDrop;
    rk.x += bend * 0.03;
  }
  return points;
}

function figureKind(movement) {
  return movement?.placement?.silhouette === "upper" ? "upper" : "full";
}

function easeHold(t) {
  const x = ((Number(t) || 0) % 1 + 1) % 1;
  if (x < 0.22) return x / 0.22;
  if (x < 0.72) return 1;
  return Math.max(0, 1 - (x - 0.72) / 0.28);
}

function lungeDrop(t) {
  const x = Math.max(0, Math.min(1, Number(t) || 0));
  if (x <= 0.18) return 0;
  if (x <= 0.52) return (x - 0.18) / 0.34;
  if (x <= 0.72) return 1;
  return Math.max(0, 1 - (x - 0.72) / 0.28);
}

export function hasPlacementGuide(id) {
  return Boolean(MOVEMENTS[id]?.cycle?.guide);
}

/** Seconds for one loop. 0 means a still pose. */
export function playbackPeriod(id) {
  if (id === "jump_analysis" || id === "air_time_jump") return 2.4;
  const movement = MOVEMENTS[id];
  if (!movement) return 5.2;
  if (movement.type === "duration" && !isAnimatedHold(movement) && !isSplitMovement(movement)) {
    return 0;
  }
  return isAlternatingRep(movement) ? 8.8 : 5.2;
}

export function poseFrame(id, t) {
  if (id === "jump_analysis" || id === "air_time_jump") {
    return { points: jumpPose(t), view: "face", kind: "full", chair: false };
  }
  if (id === "side_lunge") {
    const clock = lungePlaybackClock(t);
    return {
      points: sideLungeKneelPose("face", lungeDrop(clock.t), clock.side),
      view: "face",
      kind: "full",
      chair: false,
    };
  }
  if (id === "balance_leg_left" || id === "balance_leg_right") {
    const freeLeg = id === "balance_leg_left" ? "right" : "left";
    return { points: balancePose("face", easeHold(t), freeLeg), view: "face", kind: "full", chair: false };
  }
  const movement = MOVEMENTS[id];
  if (!movement) {
    return { points: standingPose("face"), view: "face", kind: "full", chair: false };
  }
  const view = resolveLabView(movement, "face");
  const cycleKind = movement.cycle?.kind;
  const isHold = movement.type === "duration" && !isAnimatedHold(movement);
  let points;
  if (isSplitMovement(movement)) points = synthesizeSplitPose(movement, t);
  else if (isHold) points = synthesizeHoldPose(movement, t, view);
  else if (cycleKind === "orbit") points = synthesizeOrbitPose(movement, t, "A", "internal");
  else if (cycleKind === "breath") points = synthesizeBreathPose(movement, t, "A");
  else if (cycleKind === "side_reach") points = synthesizeReachPose(movement, t);
  else {
    const depth = depthForPlayback(movement, view, t, "A");
    points = synthesizeLabPose(movement, view, depth, t);
  }
  const seated = SEATED.has(id) || movement.placement?.silhouette === "seated";
  return {
    points: points && points.size ? points : standingPose(view),
    view,
    kind: figureKind(movement),
    chair: seated,
  };
}
