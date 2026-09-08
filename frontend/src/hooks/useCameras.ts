import { useEffect, useState } from "react";
import { fetchCameras } from "../services/api";
import type { Camera } from "../types/camera";

export function useCameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchCameras()
      .then((data) => {
        if (mounted) {
          setCameras(data || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setCameras([]);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return cameras;
}
