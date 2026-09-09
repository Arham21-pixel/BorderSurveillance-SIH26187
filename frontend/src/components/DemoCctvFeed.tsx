import { useEffect, useRef, useState } from "react";
import type { DemoScenario } from "../lib/demoScenarios";
import { detectionsAt, SCENARIO_META } from "../lib/demoScenarios";
import type { Detection } from "../types/detection";
import {
  analyzeCamera,
  getTrackPath,
  resetCameraAnalyzer,
  type BehaviorCue,
} from "../lib/behaviorEngine";
import { captureSnapshot, frameLuminance, isNightScene } from "../lib/evidenceCapture";
import {
  claimVision,
  detectFromVideo,
  getDetectorError,
  isVisionOwner,
  loadObjectDetector,
  releaseVision,
} from "../lib/objectDetector";
import { DEFAULT_FENCE, fenceFromDrag, fencesToMonitor, type FenceLine } from "../lib/fence";

interface DemoCctvFeedProps {
  scenario: DemoScenario;
  cameraId: string;
  cameraName: string;
  videoUrl?: string | null;
  analyzing?: boolean;
  compact?: boolean;
  showBoxes?: boolean;
  showZone?: boolean;
  monitorFence?: boolean;
  fence?: FenceLine | null;
  onPlaceFence?: (fence: FenceLine) => void;
  detections?: Detection[];
  threat?: DemoScenario | null;
  onTick?: (progress: number, detections: Detection[], meta?: TickMeta) => void;
}

export type TickMeta = {
  vision: boolean;
  threat: DemoScenario | null;
  cues: BehaviorCue[];
  activeKeys?: string[];
  night?: boolean;
  luminance?: number;
  snapshot?: string | null;
};

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const cx = x + w / 2;
  const headR = Math.max(4, w * 0.22);
  const headY = y + headR + 2;
  ctx.fillStyle = "rgba(18, 22, 24, 0.95)";
  ctx.strokeStyle = "rgba(80, 96, 104, 0.8)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, headY + headR);
  ctx.lineTo(cx, y + h * 0.58);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.38);
  ctx.lineTo(x + w * 0.12, y + h * 0.52);
  ctx.moveTo(cx, y + h * 0.38);
  ctx.lineTo(x + w * 0.88, y + h * 0.52);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, y + h * 0.58);
  ctx.lineTo(x + w * 0.2, y + h);
  ctx.moveTo(cx, y + h * 0.58);
  ctx.lineTo(x + w * 0.8, y + h);
  ctx.stroke();
}

function drawAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = "rgba(28, 24, 18, 0.92)";
  ctx.strokeStyle = "rgba(110, 96, 70, 0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x + w * 0.5, y + h * 0.45, w * 0.38, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + w * 0.12, y + h * 0.38, w * 0.14, h * 0.2, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const legs = [0.28, 0.42, 0.58, 0.72];
  ctx.beginPath();
  for (const lx of legs) {
    ctx.moveTo(x + w * lx, y + h * 0.55);
    ctx.lineTo(x + w * lx - 2, y + h);
  }
  ctx.stroke();
}

function paintScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scenario: DemoScenario,
  cameraId: string,
  progress: number,
  analyzing: boolean,
) {
  const night = scenario === "night";
  const g = ctx.createLinearGradient(0, 0, 0, h);
  if (night) {
    g.addColorStop(0, "#07080c");
    g.addColorStop(0.45, "#12100e");
    g.addColorStop(1, "#0a0806");
  } else {
    g.addColorStop(0, "#0a1418");
    g.addColorStop(0.45, "#102018");
    g.addColorStop(1, "#0b1210");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = night ? "#16120e" : "#1a2a22";
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  if (night) {
    ctx.fillStyle = "rgba(255, 90, 30, 0.12)";
    ctx.fillRect(0, 0, w, h);
  }

  if (scenario === "border-crossing") {
    ctx.fillStyle = "rgba(255, 77, 103, 0.12)";
    ctx.fillRect(w * 0.52, h * 0.18, w * 0.48, h * 0.7);
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "rgba(255, 77, 103, 0.7)";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.52, h * 0.18, w * 0.48, h * 0.7);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 77, 103, 0.85)";
    ctx.font = "11px JetBrains Mono, monospace";
    ctx.fillText("RESTRICTED ZONE A", w * 0.55, h * 0.16);
  }

  const dets = detectionsAt(scenario, progress);
  for (const det of dets) {
    const x = det.bbox.x1 * w;
    const y = det.bbox.y1 * h;
    const bw = (det.bbox.x2 - det.bbox.x1) * w;
    const bh = (det.bbox.y2 - det.bbox.y1) * h;
    if (det.label === "animal") drawAnimal(ctx, x, y, bw, bh);
    else drawPerson(ctx, x, y, bw, bh);
  }

  if (analyzing) {
    for (const det of dets) {
      const x = det.bbox.x1 * w;
      const y = det.bbox.y1 * h;
      const bw = (det.bbox.x2 - det.bbox.x1) * w;
      const bh = (det.bbox.y2 - det.bbox.y1) * h;
      ctx.strokeStyle = night ? "#FF6B35" : "#26E5E5";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = "rgba(7, 16, 20, 0.85)";
      ctx.fillRect(x, y - 16, 108, 15);
      ctx.fillStyle = night ? "#FF922E" : "#26E5E5";
      ctx.font = "10px JetBrains Mono, monospace";
      ctx.fillText(`ID #${det.track_id}  ${det.label}  ${(det.confidence * 100).toFixed(0)}%`, x + 4, y - 5);
    }
  }

  ctx.fillStyle = "rgba(0,0,0,0.12)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  ctx.fillStyle = "rgba(22, 214, 196, 0.85)";
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.fillText(`${cameraId}  REC`, 10, 18);
  const clock = new Date().toISOString().replace("T", " ").slice(0, 19);
  ctx.fillText(clock, w - 168, 18);
  if (night) {
    ctx.fillStyle = "#FF922E";
    ctx.fillText("NIGHT · FALSE-COLOR ASSIST", 10, h - 12);
  }
}

const thermalScratch =
  typeof document !== "undefined" ? document.createElement("canvas") : null;

function drawThermalAssist(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  ox: number,
  oy: number,
  dw: number,
  dh: number,
) {
  if (!thermalScratch || !video.videoWidth) return;
  const tw = 120;
  const th = 68;
  thermalScratch.width = tw;
  thermalScratch.height = th;
  const tctx = thermalScratch.getContext("2d", { willReadFrequently: true });
  if (!tctx) return;
  tctx.drawImage(video, 0, 0, tw, th);
  const img = tctx.getImageData(0, 0, tw, th);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    let r = 0;
    let g = 0;
    let b = 40;
    if (y < 50) {
      r = y * 1.4;
      g = 0;
      b = 50 + y;
    } else if (y < 130) {
      r = 40 + (y - 50) * 2.4;
      g = (y - 50) * 0.7;
      b = 30;
    } else {
      r = 255;
      g = Math.min(255, 90 + (y - 130) * 2.2);
      b = 20;
    }
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 150;
  }
  tctx.putImageData(img, 0, 0);
  ctx.drawImage(thermalScratch, ox, oy, dw, dh);
}

function letterbox(cw: number, ch: number, vw: number, vh: number) {
  const scale = Math.min(cw / Math.max(vw, 1), ch / Math.max(vh, 1));
  const dw = vw * scale;
  const dh = vh * scale;
  return { ox: (cw - dw) / 2, oy: (ch - dh) / 2, dw, dh };
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function drawChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  fontPx: number,
) {
  ctx.font = `${fontPx}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  const padX = 5;
  const h = fontPx + 6;
  const w = Math.ceil(ctx.measureText(text).width) + padX * 2;
  ctx.fillStyle = "rgba(7,16,20,0.82)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillText(text, x + padX, y + fontPx + 1);
  return { w, h };
}

function drawVideoOverlay(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  video: HTMLVideoElement,
  dets: Detection[],
  opts: {
    showBoxes: boolean;
    showZone: boolean;
    threat: DemoScenario | null;
    analyzing: boolean;
    night?: boolean;
    cameraId?: string;
    thermal?: boolean;
    fence?: FenceLine;
    fences?: FenceLine[];
  },
) {
  ctx.clearRect(0, 0, cw, ch);
  const box = letterbox(cw, ch, video.videoWidth || cw, video.videoHeight || ch);
  const { ox, oy, dw, dh } = box;
  const fontPx = 9;
  const stroke = 1.5;

  if (opts.night && opts.thermal) {
    drawThermalAssist(ctx, video, ox, oy, dw, dh);
  }

  ctx.strokeStyle = "rgba(22, 214, 196, 0.7)";
  ctx.lineWidth = 1;
  const tick = 8;
  ctx.beginPath();
  ctx.moveTo(ox, oy + tick); ctx.lineTo(ox, oy); ctx.lineTo(ox + tick, oy);
  ctx.moveTo(ox + dw - tick, oy); ctx.lineTo(ox + dw, oy); ctx.lineTo(ox + dw, oy + tick);
  ctx.moveTo(ox, oy + dh - tick); ctx.lineTo(ox, oy + dh); ctx.lineTo(ox + tick, oy + dh);
  ctx.moveTo(ox + dw - tick, oy + dh); ctx.lineTo(ox + dw, oy + dh); ctx.lineTo(ox + dw, oy + dh - tick);
  ctx.stroke();

  if (opts.showZone && opts.analyzing) {
    const lines = opts.fences?.length ? opts.fences : opts.fence ? [opts.fence] : [DEFAULT_FENCE];
    for (const fence of lines) {
      const x1 = ox + fence.ax * dw;
      const y1 = oy + fence.ay * dh;
      const x2 = ox + fence.bx * dw;
      const y2 = oy + fence.by * dh;
      ctx.strokeStyle = "rgba(255, 77, 103, 0.9)";
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      drawChip(ctx, midX + 6, midY - 8, "FENCE", "#FF4D67", fontPx);
    }
  }

  if (opts.showBoxes && opts.analyzing) {
    if (opts.cameraId) {
      for (const det of dets) {
        const trail = getTrackPath(opts.cameraId, det.track_id);
        if (trail.length < 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = det.label === "animal" ? "rgba(255,176,32,0.8)" : "rgba(22,214,196,0.8)";
        ctx.lineWidth = 1.4;
        trail.forEach((p, i) => {
          const x = ox + clamp01(p.x) * dw;
          const y = oy + clamp01(p.y) * dh;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
    for (const det of dets) {
      const x1 = clamp01(det.bbox.x1);
      const y1 = clamp01(det.bbox.y1);
      const x2 = clamp01(det.bbox.x2);
      const y2 = clamp01(det.bbox.y2);
      const x = ox + Math.min(x1, x2) * dw;
      const y = oy + Math.min(y1, y2) * dh;
      const bw = Math.abs(x2 - x1) * dw;
      const bh = Math.abs(y2 - y1) * dh;
      if (bw < 4 || bh < 4) continue;
      const animal = det.label === "animal";
      const heat = Boolean(opts.night);
      ctx.strokeStyle = animal ? "#FFB020" : heat ? "#FF6B35" : "#26E5E5";
      ctx.lineWidth = stroke;
      ctx.strokeRect(x, y, bw, bh);
      const kind = animal ? "animal" : "person";
      const tag = `#${det.track_id ?? "—"} ${kind}`;
      const tagY = y > oy + 14 ? y - 13 : y + 2;
      drawChip(ctx, x, tagY, tag, animal ? "#FFB020" : heat ? "#FF6B35" : "#26E5E5", fontPx);
    }
  }

  if (opts.threat) {
    const animal = opts.threat === "animal";
    const label = animal
      ? "ANIMAL"
      : opts.threat === "night"
        ? "NIGHT"
        : SCENARIO_META[opts.threat].label.toUpperCase();
    const color = opts.threat === "border-crossing" ? "#FF4D67" : animal ? "#FFB020" : "#26E5E5";
    drawChip(ctx, ox + 6, oy + 6, label, color, fontPx);
  }
  if (opts.night) {
    drawChip(ctx, ox + 6, oy + dh - 16, "NIGHT ASSIST", "#FF922E", fontPx);
  }
}

export default function DemoCctvFeed({
  scenario,
  cameraId,
  videoUrl,
  analyzing = true,
  compact = false,
  showBoxes = true,
  showZone = true,
  monitorFence = false,
  fence = null,
  onPlaceFence,
  detections,
  threat = null,
  onTick,
}: DemoCctvFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;
  const detectionsRef = useRef(detections);
  detectionsRef.current = detections;
  const threatPropRef = useRef(threat);
  threatPropRef.current = threat;
  const analyzingRef = useRef(analyzing);
  analyzingRef.current = analyzing;
  const showBoxesRef = useRef(showBoxes);
  showBoxesRef.current = showBoxes;
  const showZoneRef = useRef(showZone);
  showZoneRef.current = showZone;
  const monitorFenceRef = useRef(monitorFence);
  monitorFenceRef.current = monitorFence;
  const fenceRef = useRef(fence);
  fenceRef.current = fence;
  const onPlaceFenceRef = useRef(onPlaceFence);
  onPlaceFenceRef.current = onPlaceFence;
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;
  const lastEmit = useRef(0);
  const visionDets = useRef<Detection[]>([]);
  const threatRef = useRef<DemoScenario | null>(null);
  const nightRef = useRef(false);
  const lastCanvasSnap = useRef<string | null>(null);
  const lastCanvasSnapAt = useRef(0);
  const pendingCues = useRef<BehaviorCue[]>([]);
  const lastActiveKeys = useRef<string[]>([]);
  const busy = useRef(false);
  const lastDetectAt = useRef(0);
  const overlaySize = useRef({ w: 0, h: 0, dpr: 1 });
  const thermalTick = useRef(0);
  const draggingZone = useRef(false);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const previewFence = useRef<FenceLine | null>(null);
  const visionStateRef = useRef<"off" | "loading" | "ready" | "error">("off");
  const ownerKeyRef = useRef(`${cameraId}:main`);
  ownerKeyRef.current = compact ? `${cameraId}:tile` : `${cameraId}:main`;

  const [visionState, setVisionState] = useState<"off" | "loading" | "ready" | "error">("off");
  const [visionError, setVisionError] = useState<string | null>(null);
  visionStateRef.current = visionState;

  const startDetector = () => {
    setVisionState("loading");
    setVisionError(null);
    loadObjectDetector()
      .then(() => setVisionState("ready"))
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : getDetectorError() ?? "Detector failed";
        const stale = /tensorflow_tfjs|dynamically imported module/i.test(raw);
        setVisionState("error");
        setVisionError(
          stale
            ? "Stale browser cache. Close this tab and open http://localhost:5173 again."
            : raw,
        );
      });
  };

  useEffect(() => {
    if (!compact) return;
    const video = videoRef.current;
    if (!video) return;
    const freeze = () => {
      video.pause();
      if (video.currentTime < 0.05 && Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = Math.min(0.08, video.duration * 0.02);
      }
    };
    video.addEventListener("loadeddata", freeze);
    freeze();
    return () => video.removeEventListener("loadeddata", freeze);
  }, [compact, videoUrl]);

  useEffect(() => {
    if (compact || !videoUrl) return;
    const owner = `${cameraId}:main`;
    const claimed = claimVision(cameraId, owner);
    if (claimed) {
      startDetector();
      resetCameraAnalyzer(cameraId);
    }
    return () => {
      releaseVision(cameraId, owner);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, videoUrl, compact]);

  useEffect(() => {
    if (compact && videoUrl) return undefined;
    let raf = 0;
    const LOOP_MS = 16000;
    let lastPaint = 0;
    let lastOverlay = 0;

    const tick = (now: number) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      let progress = 0;

      if (videoUrl && video && !compact) {
        const claimed = isVisionOwner(cameraId, ownerKeyRef.current);
        if (video.duration && Number.isFinite(video.duration) && video.duration > 0) {
          progress = video.currentTime / video.duration;
        }

        const overlay = overlayRef.current;
        if (overlay && now - lastOverlay > 66) {
          lastOverlay = now;
          const rect = overlay.getBoundingClientRect();
          const cssW = Math.max(1, Math.round(rect.width));
          const cssH = Math.max(1, Math.round(rect.height));
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          if (
            overlaySize.current.w !== cssW ||
            overlaySize.current.h !== cssH ||
            overlaySize.current.dpr !== dpr
          ) {
            overlay.width = Math.round(cssW * dpr);
            overlay.height = Math.round(cssH * dpr);
            overlaySize.current = { w: cssW, h: cssH, dpr };
          }
          const ctx = overlay.getContext("2d");
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            thermalTick.current += 1;
            const dets = claimed ? visionDets.current : detectionsRef.current ?? [];
            const watchFence = monitorFenceRef.current || showZoneRef.current;
            const fenceLines = watchFence
              ? fencesToMonitor(previewFence.current ?? fenceRef.current)
              : [];
            drawVideoOverlay(ctx, cssW, cssH, video, dets, {
              showBoxes: showBoxesRef.current,
              showZone: watchFence,
              threat: claimed ? threatRef.current : threatPropRef.current,
              analyzing: analyzingRef.current,
              night: nightRef.current,
              cameraId: claimed ? cameraId : undefined,
              thermal: nightRef.current && thermalTick.current % 10 === 0,
              fences: fenceLines,
            });
          }
        }

        if (
          claimed &&
          analyzingRef.current &&
          !busy.current &&
          visionStateRef.current === "ready" &&
          !video.paused &&
          now - lastDetectAt.current > 800
        ) {
          busy.current = true;
          lastDetectAt.current = now;
          detectFromVideo(video)
            .then((raw) => {
              const clipIsNight = scenarioRef.current === "night";
              const lum = clipIsNight ? frameLuminance(video) : 1;
              const night = clipIsNight && isNightScene(lum);
              nightRef.current = night;
              const watchFence = monitorFenceRef.current || showZoneRef.current;
              const fenceLines = watchFence
                ? fencesToMonitor(previewFence.current ?? fenceRef.current)
                : [];
              const frame = analyzeCamera(cameraId, raw, performance.now(), {
                night,
                fences: fenceLines,
              });
              visionDets.current = frame.tracks;
              threatRef.current = frame.threat;
              lastActiveKeys.current = frame.activeKeys;
              if (frame.cues.length) {
                const snap = captureSnapshot(video, frame.tracks);
                const t = video.currentTime || 0;
                const dur = Number.isFinite(video.duration) ? video.duration : t + 2;
                for (const cue of frame.cues) {
                  cue.alert.snapshot_url = snap;
                  cue.alert.clip_url = video.currentSrc || video.src || null;
                  cue.alert.clip_start = Math.max(0, t - 4);
                  cue.alert.clip_end = Math.min(dur, t + 2);
                  cue.alert.trajectory_points = getTrackPath(cameraId, cue.alert.track_id);
                  cue.alert.luminance = lum;
                  cue.alert.night = night || Boolean(cue.alert.night);
                }
                pendingCues.current.push(...frame.cues);
              }
            })
            .catch(() => {
              setVisionState("error");
              setVisionError(getDetectorError());
            })
            .finally(() => {
              busy.current = false;
            });
        }

        if (now - lastEmit.current > 280) {
          lastEmit.current = now;
          const cues = pendingCues.current;
          pendingCues.current = [];
          if (claimed) {
            onTickRef.current?.(progress, visionDets.current, {
              vision: true,
              threat: threatRef.current,
              cues,
              activeKeys: lastActiveKeys.current,
              night: nightRef.current,
            });
          }
        }
      } else if (canvas && !videoUrl) {
        if (compact && now - lastPaint < 200) {
          raf = requestAnimationFrame(tick);
          return;
        }
        lastPaint = now;
        const w = compact ? 480 : 960;
        const h = compact ? 270 : 540;
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const ctx = canvas.getContext("2d");
        progress = (now % LOOP_MS) / LOOP_MS;
        if (ctx) {
          paintScene(ctx, w, h, scenarioRef.current, cameraId, progress, analyzingRef.current);
          if (!compact && now - lastCanvasSnapAt.current > 800) {
            lastCanvasSnapAt.current = now;
            try {
              lastCanvasSnap.current = canvas.toDataURL("image/jpeg", 0.62);
            } catch {
              lastCanvasSnap.current = null;
            }
          }
        }
        if (!compact && now - lastEmit.current > 200) {
          lastEmit.current = now;
          onTickRef.current?.(progress, detectionsAt(scenarioRef.current, progress), {
            vision: false,
            threat: scenarioRef.current,
            cues: [],
            snapshot: lastCanvasSnap.current,
          });
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cameraId, videoUrl, compact]);

  const normFromPointer = (e: { clientX: number; clientY: number }) => {
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!overlay || !video) return null;
    const rect = overlay.getBoundingClientRect();
    const box = letterbox(
      rect.width,
      rect.height,
      video.videoWidth || rect.width,
      video.videoHeight || rect.height,
    );
    const nx = (e.clientX - rect.left - box.ox) / box.dw;
    const ny = (e.clientY - rect.top - box.oy) / box.dh;
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return null;
    if (nx < -0.02 || nx > 1.02 || ny < -0.02 || ny > 1.02) return null;
    return { x: Math.max(0, Math.min(1, nx)), y: Math.max(0, Math.min(1, ny)) };
  };

  return (
    <div className="absolute inset-0 bg-[#070B12]">
      {videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-contain bg-[#070B12]"
            autoPlay={!compact}
            muted
            loop={!compact}
            playsInline
            controls={false}
            disablePictureInPicture
            controlsList="nodownload nofullscreen noremoteplayback"
          />
          <canvas
            ref={overlayRef}
            className={`absolute inset-0 w-full h-full ${showZone ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"}`}
            onPointerDown={(e) => {
              if (!showZone) return;
              const p = normFromPointer(e);
              if (!p) return;
              draggingZone.current = true;
              dragStart.current = p;
              previewFence.current = fenceFromDrag(p.x, p.y, p.x, p.y);
              (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!draggingZone.current || !dragStart.current) return;
              const p = normFromPointer(e);
              if (!p) return;
              previewFence.current = fenceFromDrag(dragStart.current.x, dragStart.current.y, p.x, p.y);
            }}
            onPointerUp={() => {
              if (previewFence.current) {
                onPlaceFenceRef.current?.(previewFence.current);
                fenceRef.current = previewFence.current;
              }
              draggingZone.current = false;
              dragStart.current = null;
            }}
            onPointerCancel={() => {
              draggingZone.current = false;
              dragStart.current = null;
            }}
          />
          {visionState === "loading" && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-3 py-1.5 rounded-lg bg-[#070B12]/90 border border-[#26E5E5]/30 text-[11px] font-mono text-[#26E5E5]">
              Loading object detector…
            </div>
          )}
          {visionState === "error" && (
            <button
              type="button"
              onClick={startDetector}
              className="absolute left-3 bottom-12 z-10 max-w-[80%] px-3 py-1.5 rounded-lg bg-[#070B12]/90 border border-rose-500/30 text-[11px] font-mono text-rose-300 text-left"
            >
              Detector unavailable{visionError ? `: ${visionError}` : ""}. Click to retry.
            </button>
          )}
        </>
      ) : (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      )}
    </div>
  );
}
