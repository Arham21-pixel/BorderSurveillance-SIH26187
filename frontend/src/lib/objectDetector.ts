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
    const model = await cocoSsd.load({ base: "mobilenet_v2" }).catch(() => cocoSsd.load({ base: "lite_mobilenet_v2" }));
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

export async function detectFromVideo(video: HTMLVideoElement): Promise<Detection[]> {
  if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return [];
  const model = await loadObjectDetector();
  const preds = await model.detect(video, 12);
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const out: Detection[] = [];

  for (const pred of preds) {
    const isPerson = pred.class === "person";
    const isAnimal = ANIMAL_LABELS.has(pred.class);
    if (!isPerson && !isAnimal) continue;
    if (isPerson && pred.score < 0.36) continue;
    if (isAnimal && pred.score < 0.35) continue;

    const [x, y, w, h] = pred.bbox;
    const x1 = clamp01(x / vw);
    const y1 = clamp01(y / vh);
    const x2 = clamp01((x + w) / vw);
    const y2 = clamp01((y + h) / vh);
    if ((x2 - x1) * (y2 - y1) < 0.0012) continue;

    out.push({
      label: isAnimal ? "animal" : "person",
      confidence: pred.score,
      bbox: { x1, y1, x2, y2 },
    });
  }

  return out;
}
