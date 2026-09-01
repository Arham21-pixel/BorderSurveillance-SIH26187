import { useEffect, useState } from "react";
import { fetchCameras } from "../services/api";
import type { Camera } from "../types/camera";

export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  useEffect(() => {
    fetchCameras().then(setCameras).catch(() => {
      setCameras([
        { id: "cam-north-01", name: "North Fence 01", source: "0", sector: "north", status: "online" },
        { id: "cam-west-02", name: "River Crossing 02", source: "file", sector: "west", status: "online" },
        { id: "cam-east-03", name: "Ridge Watch 03", source: "rtsp", sector: "east", status: "offline" },
      ]);
    });
  }, []);
  return cameras;
}
