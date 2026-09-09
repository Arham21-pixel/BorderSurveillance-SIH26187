import type { Detection } from "../types/detection";

const ANIMAL_LABELS = new Set([
  "bird",
  "cat",
  "dog",
  "horse",
  "sheep",
  "cow",
  "elephant",
  "bear",
  "zebra",
  "giraffe",
]);

const TF_SOURCES = ["/vendor/tf.min.js", "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js"];
const COCO_SOURCES = [
  "/vendor/coco-ssd.min.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js",
];

export type DetectorStatus = "idle" | "loading" | "ready" | "error";

type CocoModel = {
  detect: (
    img: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
    maxNumBoxes?: number,
  ) => Promise<Array<{ bbox: [number, number, number, number]; class: string; score: number }>>;
};

type TfGlobal = {
  setBackend: (name: string) => Promise<unknown>;
  ready: () => Promise<void>;
};

type CocoGlobal = {
  load: (config?: { base?: string }) => Promise<CocoModel>;
};

declare global {
  interface Window {
    tf?: TfGlobal;
    cocoSsd?: CocoGlobal;
  }
}

let loadPromise: Promise<CocoModel> | null = null;
let status: DetectorStatus = "idle";
let lastError: string | null = null;

const visionOwner = new Map<string, string>();

export function getDetectorStatus(): DetectorStatus {
  return status;
}

export function getDetectorError(): string | null {
  return lastError;
}

export function resetObjectDetector() {
  lastError = null;
}

export function claimVision(cameraId: string, ownerKey: string): boolean {
  const current = visionOwner.get(cameraId);
  const isMain = ownerKey.endsWith(":main");
  if (!current || current === ownerKey) {
    visionOwner.set(cameraId, ownerKey);
    return true;
  }
  if (isMain && current.endsWith(":tile")) {
    visionOwner.set(cameraId, ownerKey);
    return true;
  }
  return false;
}

export function isVisionOwner(cameraId: string, ownerKey: string): boolean {
  return visionOwner.get(cameraId) === ownerKey;
}

export function releaseVision(cameraId: string, ownerKey: string) {
  if (visionOwner.get(cameraId) === ownerKey) visionOwner.delete(cameraId);
}

function loadScript(src: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-netra-lib="${src}"]`);
  if (existing) {
    if (existing.dataset.ready === "1") return Promise.resolve();
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.async = false;
    el.dataset.netraLib = src;
    el.onload = () => {
      el.dataset.ready = "1";
      resolve();
    };
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function loadFirstAvailable(urls: string[]) {
  let last: unknown;
  for (const url of urls) {
    try {
      await loadScript(url);
      return;
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Failed to load detector script");
}

export async function loadObjectDetector(): Promise<CocoModel> {
  if (loadPromise) return loadPromise;
  status = "loading";
  lastError = null;
  loadPromise = (async () => {
    if (!window.tf) await loadFirstAvailable(TF_SOURCES);
    const tf = window.tf;
    if (!tf) throw new Error("TensorFlow.js did not initialize");
    try {
      await tf.setBackend("webgl");
    } catch {
      await tf.setBackend("cpu");
    }
    await tf.ready();
    if (!window.cocoSsd) await loadFirstAvailable(COCO_SOURCES);
    const cocoSsd = window.cocoSsd;
    if (!cocoSsd) throw new Error("COCO-SSD did not initialize");
    const model = await cocoSsd.load({ base: "lite_mobilenet_v2" }).catch(() => cocoSsd.load({ base: "mobilenet_v2" }));
    status = "ready";
    return model;
  })().catch((err: unknown) => {
    status = "error";
    loadPromise = null;
    lastError = err instanceof Error ? err.message : "Detector failed to load";
    throw err;
  });
  return loadPromise;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function boxIou(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = Math.max(0, a.x2 - a.x1) * Math.max(0, a.y2 - a.y1);
  const areaB = Math.max(0, b.x2 - b.x1) * Math.max(0, b.y2 - b.y1);
  const union = areaA + areaB - inter;
  return union <= 0 ? 0 : inter / union;
}

function containedMostly(
  inner: { x1: number; y1: number; x2: number; y2: number },
  outer: { x1: number; y1: number; x2: number; y2: number },
) {
  const x1 = Math.max(inner.x1, outer.x1);
  const y1 = Math.max(inner.y1, outer.y1);
  const x2 = Math.min(inner.x2, outer.x2);
  const y2 = Math.min(inner.y2, outer.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const innerArea = Math.max(0.0001, (inner.x2 - inner.x1) * (inner.y2 - inner.y1));
  return inter / innerArea >= 0.65;
}

/** Drop duplicate / nested person boxes (common on IR and grainy night footage). */
function suppressDuplicates(dets: Detection[]): Detection[] {
  const ranked = [...dets].sort((a, b) => b.confidence - a.confidence);
  const keep: Detection[] = [];
  for (const det of ranked) {
    const dup = keep.some((other) => {
      if (other.label !== det.label) return false;
      if (boxIou(other.bbox, det.bbox) >= 0.35) return true;
      if (containedMostly(det.bbox, other.bbox) || containedMostly(other.bbox, det.bbox)) return true;
      const c1x = (other.bbox.x1 + other.bbox.x2) / 2;
      const c1y = (other.bbox.y1 + other.bbox.y2) / 2;
      const c2x = (det.bbox.x1 + det.bbox.x2) / 2;
      const c2y = (det.bbox.y1 + det.bbox.y2) / 2;
      return Math.hypot(c1x - c2x, c1y - c2y) < 0.05;
    });
    if (!dup) keep.push(det);
  }
  return keep;
}

const detectScratch = typeof document !== "undefined" ? document.createElement("canvas") : null;

export type DetectOpts = {
  maxWidth?: number;
  maxBoxes?: number;
  personMin?: number;
};

export async function detectFromVideo(video: HTMLVideoElement, opts?: DetectOpts): Promise<Detection[]> {
  if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return [];
  const model = await loadObjectDetector();
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const maxW = opts?.maxWidth ?? 416;
  const maxBoxes = opts?.maxBoxes ?? 10;
  const personMin = opts?.personMin ?? 0.4;
  const dw = Math.min(maxW, vw);
  const dh = Math.max(1, Math.round((vh / Math.max(vw, 1)) * dw));
  let input: HTMLVideoElement | HTMLCanvasElement = video;
  let iw = vw;
  let ih = vh;
  if (detectScratch && vw > maxW) {
    detectScratch.width = dw;
    detectScratch.height = dh;
    const ctx = detectScratch.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, dw, dh);
      input = detectScratch;
      iw = dw;
      ih = dh;
    }
  }
  const preds = await model.detect(input, maxBoxes);
  const out: Detection[] = [];

  for (const pred of preds) {
    const isPerson = pred.class === "person";
    const isAnimal = ANIMAL_LABELS.has(pred.class);
    if (!isPerson && !isAnimal) continue;
    if (isPerson && pred.score < personMin) continue;
    if (isAnimal && pred.score < 0.38) continue;

    const [x, y, w, h] = pred.bbox;
    const x1 = clamp01(x / iw);
    const y1 = clamp01(y / ih);
    const x2 = clamp01((x + w) / iw);
    const y2 = clamp01((y + h) / ih);
    if ((x2 - x1) * (y2 - y1) < 0.0008) continue;

    out.push({
      label: isAnimal ? "animal" : "person",
      confidence: pred.score,
      bbox: { x1, y1, x2, y2 },
    });
  }

  return suppressDuplicates(out);
}
