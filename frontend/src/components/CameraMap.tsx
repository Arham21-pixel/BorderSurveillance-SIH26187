import type { Camera } from "../types/camera";

export default function CameraMap({ cameras }: { cameras: Camera[] }) {
  return (
    <div className="map">
      {cameras.map((camera, index) => (
        <span
          key={camera.id}
          className="pin"
          title={camera.name}
          style={{ left: `${20 + index * 22}%`, top: `${30 + (index % 2) * 18}%` }}
        />
      ))}
    </div>
  );
}
