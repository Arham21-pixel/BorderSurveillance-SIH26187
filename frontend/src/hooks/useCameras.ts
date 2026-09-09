import { useEffect, useState } from "react";
import { fetchCameras } from "../services/api";
import type { Camera } from "../types/camera";
import { DEMO_CAMERA_FLEET } from "../lib/demoScenarios";
import { useDemoSessionOptional } from "../contexts/DemoSessionContext";

export function useCameras() {
  const session = useDemoSessionOptional();
  const [cameras, setCameras] = useState<Camera[]>(DEMO_CAMERA_FLEET);

  useEffect(() => {
    if (session) return;
    let mounted = true;
    fetchCameras()
      .then((data) => {
        if (mounted) setCameras(data && data.length > 0 ? data : DEMO_CAMERA_FLEET);
      })
      .catch(() => {
        if (mounted) setCameras(DEMO_CAMERA_FLEET);
      });
    return () => {
      mounted = false;
    };
  }, [session]);

  return session ? session.cameras : cameras;
}