import { useCameras } from "../hooks/useCameras";
import CameraFeed from "../components/CameraFeed";

export default function Cameras() {
  const cameras = useCameras();
  return (
    <section>
      <h1>Cameras</h1>
      <p className="sub">Registered border sectors and stream sources.</p>
      <div className="grid two">
        <div className="card"><CameraFeed title={cameras[0]?.name ?? "Primary feed"} /></div>
        <div className="card">
          <table>
            <thead><tr><th>Name</th><th>Sector</th><th>Status</th></tr></thead>
            <tbody>
              {cameras.map((camera) => (
                <tr key={camera.id}>
                  <td>{camera.name}</td>
                  <td>{camera.sector}</td>
                  <td><span className={`badge ${camera.status}`}>{camera.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
