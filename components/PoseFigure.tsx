import React, { useEffect, useId, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
} from "react-native-svg";
import { playbackPeriod, poseFrame, type PoseMap, type PosePoint } from "../lib/posePlayback";

const FACE = new Set(["nose", "left_eye", "right_eye", "left_ear", "right_ear"]);
const LEG = new Set(["left_knee", "right_knee", "left_ankle", "right_ankle"]);
const BONES: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_hip", "right_hip"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

const PALETTE = {
  body: "#2a3344",
  stroke: "rgba(255,255,255,0.72)",
  skin: "#E6B39D",
  skinStroke: "rgba(255,255,255,0.45)",
  nose: "#c9927a",
  lip: "#b56e68",
  eye: "#1a1520",
  sclera: "#fff8f4",
  bone: "rgba(255,255,255,0.45)",
  boneUsed: "#5eead4",
  joint: "#f8fafc",
  jointRing: "#5eead4",
  chair: "rgba(148,163,184,0.85)",
};

type Pt = { x: number; y: number } | null;
type Hide = { arm: string | null; leg: string | null };

function pt(points: PoseMap, name: string): PosePoint | null {
  return points.get(name) ?? null;
}

function mid(a: Pt, b: Pt): Pt {
  if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return a || b || null;
}

function capsuleD(x1: number, y1: number, x2: number, y2: number, r: number): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return `M ${x1 - r} ${y1} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy * r;
  const py = ux * r;
  return [
    `M ${x1 + px} ${y1 + py}`,
    `L ${x2 + px} ${y2 + py}`,
    `A ${r} ${r} 0 0 1 ${x2 - px} ${y2 - py}`,
    `L ${x1 - px} ${y1 - py}`,
    `A ${r} ${r} 0 0 1 ${x1 + px} ${y1 + py}`,
    "Z",
  ].join(" ");
}

function sideOf(name: string): string | null {
  if (name.startsWith("left_")) return "left";
  if (name.startsWith("right_")) return "right";
  return null;
}

function sideHidden(name: string, hide: Hide): boolean {
  const side = sideOf(name);
  if (!side) return false;
  if (LEG.has(name) || name.endsWith("_hip")) return hide.leg === side;
  return hide.arm === side;
}

function skipBone(a: string, b: string, kind: string, hide: Hide): boolean {
  if (FACE.has(a) || FACE.has(b)) return true;
  if (kind === "upper" && (LEG.has(a) || LEG.has(b))) return true;
  if (sideHidden(a, hide) || sideHidden(b, hide)) return true;
  return false;
}

function skipJoint(name: string, kind: string, hide?: Hide): boolean {
  if (FACE.has(name) || name.startsWith("middle_")) return true;
  if (kind === "upper" && LEG.has(name)) return true;
  if (hide && sideHidden(name, hide)) return true;
  return false;
}

function pairDist(points: PoseMap, a: string, b: string): number {
  const A = pt(points, a);
  const B = pt(points, b);
  if (!A || !B) return Infinity;
  return Math.hypot(A.x - B.x, A.y - B.y);
}

function limbOccluded(points: PoseMap, pairs: Array<[string, string]>): boolean {
  let close = 0;
  let n = 0;
  for (const [a, b] of pairs) {
    const d = pairDist(points, a, b);
    if (!Number.isFinite(d)) continue;
    n += 1;
    if (d < 0.055) close += 1;
  }
  return n > 0 && close / n >= 0.6;
}

function occludedFarSide(points: PoseMap, view: string): Hide {
  if (view !== "profile") return { arm: null, leg: null };
  const nose = pt(points, "nose");
  const ls = pt(points, "left_shoulder");
  const rs = pt(points, "right_shoulder");
  let far = "right";
  if (nose && ls && rs) {
    const dL = Math.hypot(ls.x - nose.x, ls.y - nose.y);
    const dR = Math.hypot(rs.x - nose.x, rs.y - nose.y);
    far = dL >= dR ? "left" : "right";
  }
  return {
    arm: limbOccluded(points, [
      ["left_shoulder", "right_shoulder"],
      ["left_elbow", "right_elbow"],
      ["left_wrist", "right_wrist"],
    ])
      ? far
      : null,
    leg: limbOccluded(points, [
      ["left_hip", "right_hip"],
      ["left_knee", "right_knee"],
      ["left_ankle", "right_ankle"],
    ])
      ? far
      : null,
  };
}

type FrameBox = { minX: number; minY: number; w: number; h: number };
type ContentRect = { minX: number; minY: number; maxX: number; maxY: number };

/** Everything actually painted: capsules, head and chair, not just the joints. */
function paintedExtent(points: PoseMap, view: string, kind: string, chair: boolean): ContentRect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (p: Pt, r: number) => {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(r)) return;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  };
  const growSegment = (a: Pt, b: Pt, r: number) => {
    grow(a, r);
    grow(b, r);
  };
  const hide = occludedFarSide(points, view);
  const ls = pt(points, "left_shoulder");
  const rs = pt(points, "right_shoulder");
  const lh = pt(points, "left_hip");
  const rh = pt(points, "right_hip");
  const shoulder = mid(ls, rs);
  const hip = mid(lh, rh);
  const torsoR = limbRadius(boneLen(shoulder, hip), "torso");
  grow(shoulder, torsoR);
  grow(hip, torsoR);
  if (view !== "profile") growSegment(ls, rs, Math.min(0.03, torsoR * 0.48));
  if (kind !== "upper" && !hide.leg) growSegment(lh, rh, Math.min(0.03, torsoR * 0.48));

  const shells: Array<{ a: Pt; b: Pt; limb: string; side: string }> = [
    { a: ls, b: pt(points, "left_elbow"), limb: "arm", side: "left" },
    { a: pt(points, "left_elbow"), b: pt(points, "left_wrist"), limb: "arm", side: "left" },
    { a: rs, b: pt(points, "right_elbow"), limb: "arm", side: "right" },
    { a: pt(points, "right_elbow"), b: pt(points, "right_wrist"), limb: "arm", side: "right" },
    { a: lh, b: pt(points, "left_knee"), limb: "thigh", side: "left" },
    { a: pt(points, "left_knee"), b: pt(points, "left_ankle"), limb: "shin", side: "left" },
    { a: rh, b: pt(points, "right_knee"), limb: "thigh", side: "right" },
    { a: pt(points, "right_knee"), b: pt(points, "right_ankle"), limb: "shin", side: "right" },
  ];
  for (const seg of shells) {
    if (kind === "upper" && (seg.limb === "thigh" || seg.limb === "shin")) continue;
    if (seg.limb === "arm" && hide.arm === seg.side) continue;
    if ((seg.limb === "thigh" || seg.limb === "shin") && hide.leg === seg.side) continue;
    growSegment(seg.a, seg.b, limbRadius(boneLen(seg.a, seg.b), seg.limb));
  }
  const nose = pt(points, "nose");
  if (nose) {
    growSegment(nose, shoulder, limbRadius(boneLen(nose, shoulder), "neck"));
    grow(nose, headRadius(points) * 1.22);
  }
  if (chair && hip) {
    const ankle = mid(pt(points, "left_ankle"), pt(points, "right_ankle"));
    const floorY = (ankle?.y ?? hip.y) + 0.04;
    const backTop = shoulder ? shoulder.y - 0.05 : hip.y - 0.2;
    grow({ x: hip.x - 0.11, y: backTop }, 0.02);
    grow({ x: hip.x + 0.11, y: floorY }, 0.02);
  }
  return { minX, minY, maxX, maxY };
}

/** Union of the whole cycle, so the body stays put while the limbs move. */
const contentCache = new Map<string, ContentRect>();

function contentRectFor(exerciseId: string): ContentRect {
  const cached = contentCache.get(exerciseId);
  if (cached) return cached;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const steps = 16;
  for (let i = 0; i < steps; i += 1) {
    const frame = poseFrame(exerciseId, i / steps);
    const extent = paintedExtent(frame.points, frame.view, frame.kind, frame.chair);
    if (!Number.isFinite(extent.minX)) continue;
    minX = Math.min(minX, extent.minX);
    minY = Math.min(minY, extent.minY);
    maxX = Math.max(maxX, extent.maxX);
    maxY = Math.max(maxY, extent.maxY);
  }
  const safety = 0.012;
  const rect = Number.isFinite(minX)
    ? { minX: minX - safety, minY: minY - safety, maxX: maxX + safety, maxY: maxY + safety }
    : { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  contentCache.set(exerciseId, rect);
  return rect;
}

/**
 * View box with the same aspect as the stage, content centered inside it.
 * A tight box is pinned to the top-left of the stage (glute bridge climbs out,
 * hammer curl sits under the left chevron).
 */
function frameBoxFor(exerciseId: string, width: number, height: number): FrameBox {
  const rect = contentRectFor(exerciseId);
  const contentW = Math.max(0.08, rect.maxX - rect.minX);
  const contentH = Math.max(0.08, rect.maxY - rect.minY);
  const cx = (rect.minX + rect.maxX) / 2;
  const cy = (rect.minY + rect.maxY) / 2;
  const viewAspect = width / Math.max(1, height);
  const contentAspect = contentW / contentH;
  const viewW = contentAspect > viewAspect ? contentW : contentH * viewAspect;
  const viewH = contentAspect > viewAspect ? contentW / viewAspect : contentH;
  return { minX: cx - viewW / 2, minY: cy - viewH / 2, w: viewW, h: viewH };
}

function limbRadius(len: number, kind: string): number {
  if (kind === "torso") return Math.max(0.048, Math.min(0.085, len * 0.22));
  if (kind === "thigh") return Math.max(0.032, Math.min(0.05, len * 0.16));
  if (kind === "shin") return Math.max(0.026, Math.min(0.04, len * 0.14));
  if (kind === "arm") return Math.max(0.022, Math.min(0.034, len * 0.16));
  if (kind === "neck") return Math.max(0.018, Math.min(0.028, len * 0.28));
  return 0.028;
}

function boneLen(a: Pt, b: Pt): number {
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function profileFaceSign(points: PoseMap): number {
  const nose = pt(points, "nose");
  const shoulders = mid(pt(points, "left_shoulder"), pt(points, "right_shoulder"));
  if (!nose || !shoulders) return 1;
  return nose.x >= shoulders.x - 0.01 ? 1 : -1;
}

function headRadius(points: PoseMap): number {
  const nose = pt(points, "nose");
  if (!nose) return 0.045;
  const ear = pt(points, "left_ear") || pt(points, "right_ear");
  if (ear) return Math.max(0.038, Math.hypot(nose.x - ear.x, nose.y - ear.y) + 0.016);
  const sh = mid(pt(points, "left_shoulder"), pt(points, "right_shoulder"));
  if (sh) return Math.max(0.038, boneLen(nose, sh) * 0.42);
  return 0.045;
}

function Capsule({ a, b, r }: { a: Pt; b: Pt; r: number }) {
  if (!a || !b) return null;
  return (
    <Path
      d={capsuleD(a.x, a.y, b.x, b.y, r)}
      fill={PALETTE.body}
      stroke={PALETTE.stroke}
      strokeWidth={r * 0.12}
    />
  );
}

function Head({
  cx,
  cy,
  r,
  view,
  faceSign,
  clipId,
}: {
  cx: number;
  cy: number;
  r: number;
  view: string;
  faceSign: number;
  clipId: string;
}) {
  const sw = r * 0.055;
  if (view === "profile") {
    const s = faceSign;
    const eyeX = cx + s * r * 0.88;
    const eyeY = cy - r * 0.18;
    const rimX = cx + s * r;
    const tipX = cx + s * (r + r * 0.2);
    const mouthAng = 0.5;
    const mx = cx + s * r * Math.cos(mouthAng);
    const my = cy + r * Math.sin(mouthAng);
    return (
      <G>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={cx} cy={cy} r={r} />
          </ClipPath>
        </Defs>
        <Circle cx={cx} cy={cy} r={r} fill={PALETTE.skin} />
        <G clipPath={`url(#${clipId})`}>
          <Ellipse cx={eyeX} cy={eyeY} rx={r * 0.16} ry={r * 0.13} fill={PALETTE.sclera} stroke={PALETTE.eye} strokeWidth={r * 0.028} />
          <Circle cx={eyeX + s * r * 0.02} cy={eyeY} r={r * 0.06} fill={PALETTE.eye} />
          <Path
            d={`M ${mx - s * r * 0.24} ${my - r * 0.03} Q ${mx} ${my + r * 0.12} ${mx + s * r * 0.24} ${my - r * 0.03}`}
            fill="none"
            stroke={PALETTE.lip}
            strokeWidth={r * 0.05}
            strokeLinecap="round"
          />
        </G>
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={PALETTE.skinStroke} strokeWidth={sw} />
        <Path
          d={`M ${rimX} ${cy - r * 0.07} Q ${tipX} ${cy} ${rimX} ${cy + r * 0.13} Z`}
          fill={PALETTE.nose}
        />
      </G>
    );
  }
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={PALETTE.skin} stroke={PALETTE.skinStroke} strokeWidth={sw} />
      <Ellipse cx={cx - r * 0.28} cy={cy - r * 0.14} rx={r * 0.16} ry={r * 0.13} fill={PALETTE.sclera} stroke={PALETTE.eye} strokeWidth={r * 0.03} />
      <Ellipse cx={cx + r * 0.28} cy={cy - r * 0.14} rx={r * 0.16} ry={r * 0.13} fill={PALETTE.sclera} stroke={PALETTE.eye} strokeWidth={r * 0.03} />
      <Circle cx={cx - r * 0.26} cy={cy - r * 0.14} r={r * 0.07} fill={PALETTE.eye} />
      <Circle cx={cx + r * 0.26} cy={cy - r * 0.14} r={r * 0.07} fill={PALETTE.eye} />
      <Path
        d={`M ${cx - r * 0.055} ${cy + r * 0.1} Q ${cx} ${cy + r * 0.16} ${cx + r * 0.055} ${cy + r * 0.1}`}
        fill="none"
        stroke={PALETTE.nose}
        strokeWidth={r * 0.038}
        strokeLinecap="round"
      />
      <Path
        d={`M ${cx - r * 0.22} ${cy + r * 0.42} Q ${cx} ${cy + r * 0.52} ${cx + r * 0.22} ${cy + r * 0.42}`}
        fill="none"
        stroke={PALETTE.lip}
        strokeWidth={r * 0.05}
        strokeLinecap="round"
      />
    </G>
  );
}

function Chair({ points }: { points: PoseMap }) {
  const hip = mid(pt(points, "left_hip"), pt(points, "right_hip"));
  const ankle = mid(pt(points, "left_ankle"), pt(points, "right_ankle"));
  const sh = mid(pt(points, "left_shoulder"), pt(points, "right_shoulder"));
  if (!hip || !ankle) return null;
  const w = 0.2;
  const seatY = hip.y + 0.015;
  const floorY = ankle.y + 0.02;
  const backTop = sh ? sh.y - 0.04 : hip.y - 0.18;
  const x = hip.x - w / 2;
  return (
    <G fill="none" stroke={PALETTE.chair} strokeWidth={0.012} strokeLinecap="round" opacity={0.9}>
      <Rect x={x + 0.01} y={backTop} width={w - 0.02} height={Math.max(0.02, seatY - backTop)} rx={0.03} />
      <Rect x={x} y={seatY} width={w} height={0.045} rx={0.018} />
      <Line x1={hip.x} y1={seatY + 0.045} x2={hip.x} y2={floorY - 0.02} />
      <Ellipse cx={hip.x} cy={floorY} rx={0.035} ry={0.016} />
    </G>
  );
}

function FigureSvg({
  points,
  view,
  kind,
  chair,
  box,
  width,
  height,
}: {
  points: PoseMap;
  view: string;
  kind: string;
  chair: boolean;
  box: FrameBox;
  width: number;
  height: number;
}) {
  const clipId = useId().replace(/:/g, "");
  const hide = occludedFarSide(points, view);
  const ls = pt(points, "left_shoulder");
  const rs = pt(points, "right_shoulder");
  const lh = pt(points, "left_hip");
  const rh = pt(points, "right_hip");
  const nose = pt(points, "nose");
  const shoulder = mid(ls, rs);
  const hip = mid(lh, rh);
  const headR = headRadius(points);
  const faceSign = profileFaceSign(points);
  const torsoLen = boneLen(shoulder, hip);
  const shoulderSpan = boneLen(ls, rs);
  const torsoR = limbRadius(torsoLen, "torso");
  const chestR =
    view === "profile" ? torsoR : Math.min(0.052, Math.max(torsoR * 0.78, shoulderSpan * 0.15 || 0));
  const girdleR = Math.min(0.03, chestR * 0.48);
  const padR = Math.min(0.03, chestR * 0.52);
  const strokeScale = Math.max(box.w, box.h);

  const shells = [
    { a: ls, b: pt(points, "left_elbow"), limb: "arm", side: "left" },
    { a: pt(points, "left_elbow"), b: pt(points, "left_wrist"), limb: "arm", side: "left" },
    { a: rs, b: pt(points, "right_elbow"), limb: "arm", side: "right" },
    { a: pt(points, "right_elbow"), b: pt(points, "right_wrist"), limb: "arm", side: "right" },
    { a: lh, b: pt(points, "left_knee"), limb: "thigh", side: "left" },
    { a: pt(points, "left_knee"), b: pt(points, "left_ankle"), limb: "shin", side: "left" },
    { a: rh, b: pt(points, "right_knee"), limb: "thigh", side: "right" },
    { a: pt(points, "right_knee"), b: pt(points, "right_ankle"), limb: "shin", side: "right" },
  ];

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`${box.minX} ${box.minY} ${box.w} ${box.h}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {chair ? <Chair points={points} /> : null}
      {view !== "profile" && ls && rs ? <Capsule a={ls} b={rs} r={girdleR} /> : null}
      {lh && rh && kind !== "upper" && !hide.leg ? <Capsule a={lh} b={rh} r={girdleR} /> : null}
      <Capsule a={shoulder} b={hip} r={chestR} />
      {shells.map((seg, i) => {
        if (kind === "upper" && (seg.limb === "thigh" || seg.limb === "shin")) return null;
        if (seg.limb === "arm" && hide.arm === seg.side) return null;
        if ((seg.limb === "thigh" || seg.limb === "shin") && hide.leg === seg.side) return null;
        const r = limbRadius(boneLen(seg.a, seg.b), seg.limb);
        return <Capsule key={`shell-${i}`} a={seg.a} b={seg.b} r={r} />;
      })}
      {[
        [ls, hide.arm === "left" ? 0 : padR],
        [rs, hide.arm === "right" ? 0 : padR],
        [lh, kind === "upper" || hide.leg === "left" ? 0 : padR],
        [rh, kind === "upper" || hide.leg === "right" ? 0 : padR],
      ].map((entry, i) => {
        const p = entry[0] as Pt;
        const r = entry[1] as number;
        if (!p || !r) return null;
        return <Circle key={`pad-${i}`} cx={p.x} cy={p.y} r={r} fill={PALETTE.body} />;
      })}
      {nose && shoulder ? (
        <Path
          d={capsuleD(nose.x, nose.y, shoulder.x, shoulder.y, limbRadius(boneLen(nose, shoulder), "neck"))}
          fill={PALETTE.skin}
          stroke={PALETTE.skinStroke}
          strokeWidth={0.004}
        />
      ) : null}
      {nose ? (
        <Head cx={nose.x} cy={nose.y} r={headR} view={view} faceSign={faceSign} clipId={clipId} />
      ) : null}
      {BONES.map(([aName, bName]) => {
        if (skipBone(aName, bName, kind, hide)) return null;
        const a = pt(points, aName);
        const b = pt(points, bName);
        if (!a || !b) return null;
        return (
          <Line
            key={`${aName}-${bName}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={PALETTE.boneUsed}
            strokeWidth={strokeScale * 0.007}
            strokeLinecap="round"
            opacity={0.9}
          />
        );
      })}
    </Svg>
  );
}

export default function PoseFigure({
  exerciseId,
  still = false,
}: {
  exerciseId: string;
  /** Idle start pose, used as the camera silhouette. */
  still?: boolean;
}) {
  const [t, setT] = useState(0.08);
  const [layout, setLayout] = useState({ w: 0, h: 0 });
  const period = still ? 0 : playbackPeriod(exerciseId);

  useEffect(() => {
    setT(0.08);
  }, [exerciseId]);

  useEffect(() => {
    if (!period) return undefined;
    let raf = 0;
    let last = performance.now();
    let current = 0.08;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      current = (current + dt / period) % 1;
      setT(current);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [exerciseId, period]);

  const frame = poseFrame(exerciseId, still ? 0 : t);
  if (!frame.points || frame.points.size === 0) return null;
  const ready = layout.w > 1 && layout.h > 1;
  const box = ready ? frameBoxFor(exerciseId, layout.w, layout.h) : null;

  return (
    <View
      style={styles.fill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout((prev) =>
          Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }
        );
      }}
    >
      {box ? (
        <FigureSvg
          points={frame.points}
          view={frame.view}
          kind={frame.kind}
          chair={frame.chair}
          box={box}
          width={layout.w}
          height={layout.h}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, width: "100%", overflow: "hidden" },
});
