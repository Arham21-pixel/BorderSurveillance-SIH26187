import type { Detection } from "../types/detection";

export function frameLuminance(video: HTMLVideoElement): number {
  if (!video.videoWidth || video.readyState < 2) return 0.5;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 36;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0.5;
  ctx.drawImage(video, 0, 0, 64, 36);
  const data = ctx.getImageData(0, 0, 64, 36).data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / (data.length / 4) / 255;
}

export function isNightScene(luminance: number) {
  return luminance < 0.38;
}

export function captureSnapshot(
  source: HTMLVideoElement | HTMLCanvasElement,
  dets: Detection[] = [],
): string | null {
  const w = "videoWidth" in source ? source.videoWidth : source.width;
  const h = "videoHeight" in source ? source.videoHeight : source.height;
  if (!w || !h) return null;
  const c = document.createElement("canvas");
  c.width = Math.min(w, 960);
  c.height = Math.round((c.width / w) * h);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, c.width, c.height);
  for (const det of dets) {
    const x = det.bbox.x1 * c.width;
    const y = det.bbox.y1 * c.height;
    const bw = (det.bbox.x2 - det.bbox.x1) * c.width;
    const bh = (det.bbox.y2 - det.bbox.y1) * c.height;
    ctx.strokeStyle = det.label === "animal" ? "#FFB020" : "#26E5E5";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = "rgba(7,16,20,0.85)";
    ctx.fillRect(x, Math.max(0, y - 18), 132, 16);
    ctx.fillStyle = det.label === "animal" ? "#FFB020" : "#26E5E5";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText(`#${det.track_id ?? "—"} ${det.label}`, x + 4, Math.max(12, y - 6));
  }
  try {
    return c.toDataURL("image/jpeg", 0.72);
  } catch {
    return null;
  }
}
