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

function clamp(n: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, n));
}

export function resolveFence(fence: FenceLine | null | undefined): FenceLine {
  return fence ?? DEFAULT_FENCE;
}

export function fencesToMonitor(custom?: FenceLine | null): FenceLine[] {
  if (custom) return [custom];
  return [DEFAULT_FENCE, CLIMB_FENCE];
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

export function fenceFromDrag(x0: number, y0: number, x1: number, y1: number): FenceLine {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.035) {
    const x = clamp(x0, 0.04, 0.96);
    return { ax: x, ay: 0.04, bx: x, by: 0.96 };
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
