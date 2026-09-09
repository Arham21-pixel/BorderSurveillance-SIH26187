export type FenceLine = {
  ax: number;
  ay: number;
  bx: number;
  by: number;
};

/** Default IB fence: vertical midline for left–right walk-across. */
export const DEFAULT_FENCE: FenceLine = { ax: 0.5, ay: 0.04, bx: 0.5, by: 0.96 };

/** Horizontal line for climb-over clips (person going over the wire). */
export const CLIMB_FENCE: FenceLine = { ax: 0.06, ay: 0.5, bx: 0.94, by: 0.5 };

/** Lower wire — many fence clips put the chain-link in the bottom half of the frame. */
export const CLIMB_FENCE_LOW: FenceLine = { ax: 0.06, ay: 0.68, bx: 0.94, by: 0.68 };

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

export function resolveFence(fence: FenceLine | null | undefined): FenceLine {
  return fence ?? DEFAULT_FENCE;
}

export function fencesToMonitor(custom?: FenceLine | null, video?: HTMLVideoElement | null): FenceLine[] {
  if (custom) return [custom];
  const vw = video?.videoWidth ?? 0;
  const vh = video?.videoHeight ?? 0;
  if (vh > vw * 1.12) return [];
  return [DEFAULT_FENCE, CLIMB_FENCE, CLIMB_FENCE_LOW];
}

export function isMostlyVertical(f: FenceLine) {
  return Math.abs(f.bx - f.ax) <= Math.abs(f.by - f.ay);
}

/** Signed side of an infinite line. Opposite signs ⇒ the two points straddle the fence. */
export function lineSide(px: number, py: number, f: FenceLine) {
  return (f.bx - f.ax) * (py - f.ay) - (f.by - f.ay) * (px - f.ax);
}

export function pointCrossedFence(
  a: { x: number; y: number },
  b: { x: number; y: number },
  f: FenceLine,
) {
  const s0 = lineSide(a.x, a.y, f);
  const s1 = lineSide(b.x, b.y, f);
  if (s0 === 0 || s1 === 0) return false;
  return s0 > 0 !== s1 > 0;
}

export function bboxStraddlesFence(
  bbox: { x1: number; y1: number; x2: number; y2: number },
  f: FenceLine,
) {
  const corners = [
    { x: bbox.x1, y: bbox.y1 },
    { x: bbox.x2, y: bbox.y1 },
    { x: bbox.x2, y: bbox.y2 },
    { x: bbox.x1, y: bbox.y2 },
  ];
  let pos = false;
  let neg = false;
  for (const c of corners) {
    const s = lineSide(c.x, c.y, f);
    if (s > 0) pos = true;
    if (s < 0) neg = true;
  }
  return pos && neg;
}

export function pointToSegmentDistance(px: number, py: number, f: FenceLine) {
  const dx = f.bx - f.ax;
  const dy = f.by - f.ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - f.ax) * dx + (py - f.ay) * dy) / len2));
  return Math.hypot(px - (f.ax + t * dx), py - (f.ay + t * dy));
}

/** Person is on / overlapping the fence — including already mid-climb when first detected. */
export function bboxNearFence(
  bbox: { x1: number; y1: number; x2: number; y2: number },
  f: FenceLine,
  band = 0.12,
) {
  if (bboxStraddlesFence(bbox, f)) return true;
  const cx = (bbox.x1 + bbox.x2) / 2;
  const cy = (bbox.y1 + bbox.y2) / 2;
  const pad = isMostlyVertical(f) ? band : Math.max(band, 0.16);
  if (pointToSegmentDistance(cx, cy, f) <= pad) return true;
  if (pointToSegmentDistance(cx, bbox.y2, f) <= pad) return true;
  return false;
}

export function fenceFromDrag(x0: number, y0: number, x1: number, y1: number): FenceLine {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.035) {
    const y = clamp(y0, 0.06, 0.94);
    return { ax: 0.04, ay: y, bx: 0.96, by: y };
  }
  if (Math.abs(dx) >= Math.abs(dy) * 1.2) {
    const y = clamp((y0 + y1) / 2, 0.06, 0.94);
    return { ax: 0.04, ay: y, bx: 0.96, by: y };
  }
  if (Math.abs(dy) >= Math.abs(dx) * 1.2) {
    const x = clamp((x0 + x1) / 2, 0.04, 0.96);
    return { ax: x, ay: 0.04, bx: x, by: 0.96 };
  }
  const len = dist || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    ax: x0 - ux * 1.4,
    ay: y0 - uy * 1.4,
    bx: x1 + ux * 1.4,
    by: y1 + uy * 1.4,
  };
}

const wireScratch = typeof document !== "undefined" ? document.createElement("canvas") : null;

/** Find a dark floor tripwire (phone-demo cable on tiles) and return a horizontal fence. */
export function detectDarkFloorLine(video: HTMLVideoElement): FenceLine | null {
  if (!wireScratch || !video.videoWidth || video.readyState < 2) return null;
  const w = 160;
  const h = 90;
  wireScratch.width = w;
  wireScratch.height = h;
  const ctx = wireScratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const rows = new Array<number>(h).fill(0);
  for (let y = 0; y < h; y++) {
    let sum = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    rows[y] = sum / w;
  }
  const y0 = Math.floor(h * 0.38);
  const y1 = Math.floor(h * 0.94);
  let bestY = -1;
  let best = 8;
  for (let y = y0; y < y1; y++) {
    const prev = rows[Math.max(0, y - 2)];
    const next = rows[Math.min(h - 1, y + 2)];
    const contrast = (prev + next) / 2 - rows[y];
    if (contrast > best) {
      best = contrast;
      bestY = y;
    }
  }
  if (bestY < 0) return null;
  const ay = bestY / Math.max(1, h - 1);
  return { ax: 0.04, ay, bx: 0.96, by: ay };
}
