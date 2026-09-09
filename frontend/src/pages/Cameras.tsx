import { useMemo, useRef, useState } from "react";
import { useCameras } from "../hooks/useCameras";
import { useAlerts } from "../hooks/useAlerts";
import { useDemoSession } from "../contexts/DemoSessionContext";
import CameraFeed from "../components/CameraFeed";
import DemoCctvFeed from "../components/DemoCctvFeed";
import { SCENARIO_META, type DemoScenario } from "../lib/demoScenarios";
import {
  Video,
  Radio,
  Upload,
  Play,
  Square,
  AlertTriangle,
  Compass,
  FileVideo,
} from "lucide-react";

export default function Cameras() {
  const cameras = useCameras();
  const alerts = useAlerts();
  const session = useDemoSession();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [uploadCameraId, setUploadCameraId] = useState("CAM-01");

  const selectedCamera = useMemo(() => {
    if (selectedCameraId) {
      const found = cameras.find((c) => c.id === selectedCameraId);
      if (found) return found;
    }
    return cameras[0] ?? null;
  }, [cameras, selectedCameraId]);

  const handleUpload = (file: File | undefined) => {
    if (!file) return;
    session.assignUpload(uploadCameraId, file);
    setSelectedCameraId(uploadCameraId);
  };

  const openAlerts = alerts.filter((a) => a.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 pb-5 border-b border-netra-accent/12">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-netra-normal/15 text-netra-normal border border-netra-normal/25">
              <Radio className="w-3 h-3" />
              5 cameras online
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-netra-accent/10 text-netra-accent border border-netra-accent/25">
              <FileVideo className="w-2.5 h-2.5" />
              Recorded clip input
            </span>
          </div>
          <h1 className="n-page-title">Live Cameras</h1>
          <p className="n-page-sub">
            Assign a clip to any of the five cameras. The detector classifies loitering, boundary crossing, group walking, animal, or night/low-light from that video. Evidence and analytics are stored per clip.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {session.analyzing ? (
            <button type="button" onClick={() => session.setAnalyzing(false)} className="n-btn-danger">
              <Square className="w-3.5 h-3.5" />
              Stop analysis
            </button>
          ) : (
            <button type="button" onClick={() => session.setAnalyzing(true)} className="n-btn-primary">
              <Play className="w-3.5 h-3.5" />
              Start analysis
            </button>
          )}
          <div className="px-3 py-2 rounded-xl n-card-2 text-xs">
            <span className="text-netra-high font-mono font-bold">{openAlerts}</span>
            <span className="text-netra-muted ml-1.5">open alerts from feeds</span>
          </div>
        </div>
      </div>

      <div className="n-card p-4 sm:p-5 space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-netra-muted">Upload recorded video</div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs">
            <span className="n-label">Assign to camera</span>
            <select
              value={uploadCameraId}
              onChange={(e) => setUploadCameraId(e.target.value)}
              className="n-select min-w-[160px]"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/*"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button type="button" className="n-btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5" />
            Choose MP4
          </button>
          {session.runtime[uploadCameraId]?.videoUrl && (
            <button type="button" className="n-btn-secondary" onClick={() => session.clearUpload(uploadCameraId)}>
              Clear camera clip
            </button>
          )}
        </div>
        <p className="text-[11px] text-netra-muted">
          Assign an MP4 to a camera. Detection, alerts, snapshot, clip window, trajectory and analytics come from that feed. Night assist is false-color low-light (not a FLIR camera). Tiles are preview-only so the selected camera stays smooth.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8">
          <CameraFeed
            camera={selectedCamera ?? undefined}
            cameras={cameras}
            onSelectCamera={(c) => setSelectedCameraId(c.id)}
            showControls
            analysisState={session.analyzing ? "ANALYZING" : "STOPPED"}
            sourceType="mp4"
            mp4File={selectedCamera ? SCENARIO_META[(selectedCamera.scenario ?? "loitering") as DemoScenario].file : undefined}
          />
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="n-card p-4">
            <div className="text-[13px] font-semibold text-netra-text mb-3">Camera fleet</div>
            <div className="space-y-2">
              {cameras.map((cam) => {
                const scenario = (cam.scenario ?? "loitering") as DemoScenario;
                const camAlerts = alerts.filter((a) => a.camera_id === cam.id && a.status === "open").length;
                const selected = selectedCamera?.id === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => setSelectedCameraId(cam.id)}
                    className={`w-full text-left p-3 rounded-xl border ${
                      selected ? "border-netra-accent/40 bg-netra-card2" : "border-netra-line bg-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-medium text-netra-text">{cam.name}</span>
                      <span className="text-[10px] font-mono text-netra-accent">{cam.id}</span>
                    </div>
                    <div className="text-[11px] text-netra-muted">
                      {cam.videoUrl
                        ? session.runtime[cam.id]?.threat
                          ? `Detected: ${SCENARIO_META[scenario].label}`
                          : "Auto-detecting threat type…"
                        : SCENARIO_META[scenario].description}
                    </div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-netra-muted2">
                      <span className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-netra-accent" />
                        {cam.sector}
                      </span>
                      {camAlerts > 0 && (
                        <span className="text-netra-high flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {camAlerts} alert
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="n-card p-5">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-netra-line">
          <span className="text-[13px] font-semibold text-netra-text flex items-center gap-2">
            <Video className="w-4 h-4 text-netra-accent" />
            Camera grid
          </span>
          <span className="text-[11px] font-mono text-netra-muted">{cameras.length} / {cameras.length} ACTIVE</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {cameras.map((cam) => {
            const scenario = (cam.scenario ?? "loitering") as DemoScenario;
            const selected = selectedCamera?.id === cam.id;
            return (
              <button
                key={cam.id}
                type="button"
                onClick={() => setSelectedCameraId(cam.id)}
                className={`text-left rounded-xl overflow-hidden border ${
                  selected ? "border-netra-accent ring-1 ring-netra-accent" : "border-netra-line"
                }`}
              >
                <div className="px-3 py-2 bg-netra-card2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-netra-text">{cam.name}</span>
                  <span className="font-mono text-netra-muted">
                    {cam.videoUrl
                      ? session.runtime[cam.id]?.threat
                        ? SCENARIO_META[session.runtime[cam.id].threat!].label
                        : "Auto"
                      : SCENARIO_META[scenario].label}
                  </span>
                </div>
                <div className="relative aspect-video bg-netra-bg">
                  <DemoCctvFeed
                    scenario={scenario}
                    cameraId={cam.id}
                    cameraName={cam.name}
                    videoUrl={cam.videoUrl}
                    analyzing={session.analyzing}
                    compact
                    detections={session.runtime[cam.id]?.detections}
                    threat={session.runtime[cam.id]?.threat ?? null}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
