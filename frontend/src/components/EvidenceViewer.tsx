import { useEffect, useRef, useState } from "react";
import { FileSearch, ShieldCheck, Image, Video, Route } from "lucide-react";
import type { Alert } from "../types/alert";

type EvidenceTab = "snapshot" | "clip" | "trajectory" | "metadata";

export function hasAlertMedia(alert?: Alert | null) {
  return Boolean(alert?.snapshot_url || alert?.clip_url || (alert?.trajectory_points && alert.trajectory_points.length > 1));
}

export default function EvidenceViewer({
  alert,
  path,
  tab,
  showTabs = false,
}: {
  alert?: Alert | null;
  path?: string | null;
  tab?: EvidenceTab;
  showTabs?: boolean;
}) {
  const [innerTab, setInnerTab] = useState<EvidenceTab>(tab ?? "snapshot");
  const active = showTabs ? innerTab : (tab ?? "snapshot");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapshot = alert?.snapshot_url ?? (path?.startsWith("data:") ? path : null);
  const clipUrl = alert?.clip_url ?? null;
  const points = alert?.trajectory_points ?? [];

  useEffect(() => {
    if (tab) setInnerTab(tab);
  }, [tab]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clipUrl || active !== "clip") return;
    const start = alert?.clip_start ?? 0;
    const end = alert?.clip_end ?? start + 6;
    const onMeta = () => {
      video.currentTime = start;
      video.play().catch(() => undefined);
    };
    const onTime = () => {
      if (video.currentTime >= end) {
        video.pause();
        video.currentTime = start;
      }
    };
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("timeupdate", onTime);
    if (video.readyState >= 1) onMeta();
    return () => {
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("timeupdate", onTime);
    };
  }, [clipUrl, alert?.clip_start, alert?.clip_end, active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || active !== "trajectory") return;
    const w = (canvas.width = 720);
    const h = (canvas.height = 405);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#070B12";
    ctx.fillRect(0, 0, w, h);
    if (snapshot) {
      const img = new window.Image();
      img.onload = () => {
        ctx.globalAlpha = 0.45;
        ctx.drawImage(img, 0, 0, w, h);
        ctx.globalAlpha = 1;
        drawPath(ctx, w, h, points);
      };
      img.src = snapshot;
    } else {
      drawPath(ctx, w, h, points);
    }
  }, [active, snapshot, points]);

  const tabs: { id: EvidenceTab; label: string; icon: typeof Image }[] = [
    { id: "snapshot", label: "Snapshot", icon: Image },
    { id: "clip", label: "Video clip", icon: Video },
    { id: "trajectory", label: "Trajectory", icon: Route },
  ];

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 transition-all">
      {showTabs && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tabs.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setInnerTab(item.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 border ${
                  selected
                    ? "bg-[#26E5E5]/15 text-[#26E5E5] border-[#26E5E5]/30"
                    : "text-slate-400 border-white/[0.08] hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          {active === "clip" ? (
            <Video className="w-3.5 h-3.5 text-[#26E5E5]" />
          ) : active === "trajectory" ? (
            <Route className="w-3.5 h-3.5 text-[#26E5E5]" />
          ) : (
            <Image className="w-3.5 h-3.5 text-[#26E5E5]" />
          )}
          {active === "clip" ? "Event clip" : active === "trajectory" ? "Track trajectory" : "Event snapshot"}
        </span>
        {hasAlertMedia(alert) && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-[#35D07F] border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            From camera frame
          </span>
        )}
      </div>

      {active === "snapshot" && (
        snapshot ? (
          <img
            src={snapshot}
            alt="Alert snapshot"
            className="w-full rounded-lg border border-white/[0.08] max-h-[420px] object-contain bg-[#070B12]"
          />
        ) : (
          <Empty label="Snapshot is captured from the camera frame when the alert fires. Upload a clip, press Start analysis, and wait for a detection." />
        )
      )}

      {active === "clip" && (
        clipUrl ? (
          <div className="space-y-2">
            <video
              ref={videoRef}
              src={clipUrl}
              className="w-full rounded-lg border border-white/[0.08] max-h-[420px] bg-[#070B12]"
              controls
              muted
              playsInline
            />
            <p className="text-[11px] font-mono text-slate-400">
              Window {formatSec(alert?.clip_start)} – {formatSec(alert?.clip_end)}
              {alert?.night ? " · night / low-light" : ""}
              {alert?.object_class ? ` · ${alert.object_class}` : ""}
            </p>
          </div>
        ) : snapshot ? (
          <img
            src={snapshot}
            alt="Clip fallback snapshot"
            className="w-full rounded-lg border border-white/[0.08] max-h-[420px] object-contain bg-[#070B12]"
          />
        ) : (
          <Empty label="A short clip around the event is stored from the uploaded video." />
        )
      )}

      {active === "trajectory" && (
        points.length > 0 || snapshot ? (
          <canvas ref={canvasRef} className="w-full rounded-lg border border-white/[0.08] bg-[#070B12]" />
        ) : (
          <Empty label={alert?.trajectory || "Trajectory is drawn from the tracked path in this event."} />
        )
      )}

      {!["snapshot", "clip", "trajectory"].includes(active) && (
        <p className="text-xs text-slate-400 font-mono break-all flex items-center gap-2">
          <FileSearch className="w-3.5 h-3.5 text-[#26E5E5]" />
          {path ?? alert?.evidence_path ?? "No evidence package yet."}
        </p>
      )}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="min-h-[160px] flex items-center justify-center text-center text-xs text-slate-400 px-6">
      {label}
    </div>
  );
}

function formatSec(n?: number) {
  if (n == null || Number.isNaN(n)) return "0:00";
  const m = Math.floor(n / 60);
  const s = Math.floor(n % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function drawPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  points: { x: number; y: number }[],
) {
  ctx.strokeStyle = "rgba(34, 49, 57, 0.9)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  if (points.length < 2) {
    ctx.fillStyle = "#8B9AA6";
    ctx.font = "12px JetBrains Mono, monospace";
    ctx.fillText("Not enough track samples yet.", 16, 28);
    return;
  }
  ctx.beginPath();
  ctx.strokeStyle = "#26E5E5";
  ctx.lineWidth = 2.5;
  points.forEach((p, i) => {
    const x = p.x * w;
    const y = p.y * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  const start = points[0];
  const end = points[points.length - 1];
  ctx.fillStyle = "#35D07F";
  ctx.beginPath();
  ctx.arc(start.x * w, start.y * h, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FF4D67";
  ctx.beginPath();
  ctx.arc(end.x * w, end.y * h, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#F4F8FA";
  ctx.font = "11px JetBrains Mono, monospace";
  ctx.fillText("START", start.x * w + 8, start.y * h - 8);
  ctx.fillText("NOW", end.x * w + 8, end.y * h - 8);
}
