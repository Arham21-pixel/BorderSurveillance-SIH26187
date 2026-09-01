import DetectionOverlay from "./DetectionOverlay";

export default function CameraFeed({ title = "North Fence 01" }: { title?: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{title}</strong>
        <span className="badge online">live</span>
      </div>
      <div className="feed">
        <DetectionOverlay />
      </div>
    </div>
  );
}
