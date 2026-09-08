import { useEffect, useState } from "react";
import { fetchCameras } from "../services/api";
import type { Camera } from "../types/camera";

const DEMO_CAMERAS: Camera[] = [
  {
    id: "DEMO-01",
    name: "Demo Camera 01",
    source: "demo-feed-a",
    sector: "Demo Sector A",
    status: "online",
    latitude: 23.3501,
    longitude: 78.1025,
  },
  {
    id: "DEMO-02",
    name: "Demo Camera 02",
    source: "demo-feed-b",
    sector: "Demo Sector B",
    status: "offline",
    latitude: 23.3612,
    longitude: 78.1148,
  },
  {
    id: "DEMO-03",
    name: "Demo Camera 03",
    source: "demo-feed-c",
    sector: "Demo Sector C",
    status: "offline",
    latitude: 23.3394,
    longitude: 78.0912,
  },
];

export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCameras()
      .then((data) => {
        if (mounted) {
          setCameras(data && data.length > 0 ? data : DEMO_CAMERAS);
        }
      })
      .catch(() => {
        if (mounted) {
          setCameras(DEMO_CAMERAS);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return cameras;
}
