import { useState, useEffect, useRef, useCallback } from "react";
import type { Camera } from "../types/camera";

export type StreamMode = "auto" | "webrtc" | "hls" | "mock";
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "live_webrtc"
  | "live_hls"
  | "fallback_mock"
  | "offline";

interface UseLiveStreamOptions {
  preferredMode?: StreamMode;
  autoReconnect?: boolean;
}

export function useLiveStream(camera: Camera, options: UseLiveStreamOptions = {}) {
  const { preferredMode = "auto" } = options;

  const [streamMode, setStreamMode] = useState<StreamMode>(preferredMode);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamLatency, setStreamLatency] = useState<number>(0);
  const [connectionAttempts, setConnectionAttempts] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up existing connections
  const cleanupConnections = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.removeAttribute("src");
    }
  }, []);

  // WebRTC Stream Negotiation Handler
  const connectWebRTC = useCallback(
    async (signalEndpoint: string, controller: AbortController) => {
      try {
        setConnectionStatus("connecting");
        setErrorMessage(null);

        // Standard STUN configuration for peer connection
        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        });
        peerConnectionRef.current = pc;

        // Listen for remote track reception
        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            videoRef.current.play().catch(() => undefined);
            setConnectionStatus("live_webrtc");
            setStreamLatency(Math.floor(Math.random() * 15 + 15)); // ~15-30ms low-latency WebRTC
          }
        };

        // State change monitoring
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setConnectionStatus("live_webrtc");
          } else if (
            pc.connectionState === "failed" ||
            pc.connectionState === "disconnected"
          ) {
            setConnectionStatus("fallback_mock");
            setErrorMessage("WebRTC stream carrier disconnected. Running tactical fallback.");
          }
        };

        // Add transceiver for receiving video
        pc.addTransceiver("video", { direction: "recvonly" });

        // Create SDP offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Signal with backend streaming endpoint (with 3s timeout to avoid hanging)
        const timeoutId = setTimeout(() => {
          if (pc.connectionState !== "connected") {
            controller.abort();
          }
        }, 3000);

        const res = await fetch(signalEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sdp: pc.localDescription?.sdp,
            type: pc.localDescription?.type,
            camera_id: camera.id,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Signaling rejected with HTTP status ${res.status}`);
        }

        const answer = await res.json();
        if (answer.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } else {
          throw new Error("Invalid SDP response payload");
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Timeout or aborted - fallback gracefully
          setConnectionStatus("fallback_mock");
          setErrorMessage("Live stream endpoint timed out. Fallback synthetic feed engaged.");
        } else {
          setConnectionStatus("fallback_mock");
          setErrorMessage(`Live stream unavailable (${err.message || "Endpoint offline"}). Fallback synthetic feed active.`);
        }
      }
    },
    [camera.id]
  );

  // HLS Stream Handler
  const connectHLS = useCallback(
    (hlsEndpoint: string) => {
      setConnectionStatus("connecting");
      setErrorMessage(null);

      if (!videoRef.current) {
        setConnectionStatus("fallback_mock");
        return;
      }

      const video = videoRef.current;
      video.src = hlsEndpoint;

      const handleLoadedData = () => {
        setConnectionStatus("live_hls");
        setStreamLatency(1200 + Math.floor(Math.random() * 400)); // ~1.2s HLS buffer
      };

      const handleError = () => {
        setConnectionStatus("fallback_mock");
        setErrorMessage("HLS manifest 404 or stream carrier lost. Fallback active.");
        video.removeEventListener("loadeddata", handleLoadedData);
        video.removeEventListener("error", handleError);
      };

      video.addEventListener("loadeddata", handleLoadedData, { once: true });
      video.addEventListener("error", handleError, { once: true });

      video.play().catch(() => {
        setConnectionStatus("fallback_mock");
      });
    },
    []
  );

  // Main stream connection orchestrator
  const startStream = useCallback(() => {
    cleanupConnections();

    if (camera.status === "offline") {
      setConnectionStatus("offline");
      return;
    }

    if (streamMode === "mock") {
      setConnectionStatus("fallback_mock");
      setStreamLatency(0);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Resolve stream URLs
    const webrtcEndpoint =
      camera.webrtc_url || `/api/cameras/${camera.id}/webrtc`;
    const hlsEndpoint =
      camera.hls_url ||
      camera.stream_url ||
      `/api/cameras/${camera.id}/stream.m3u8`;

    if (streamMode === "webrtc" || streamMode === "auto") {
      connectWebRTC(webrtcEndpoint, controller).catch(() => {
        setConnectionStatus("fallback_mock");
      });
    } else if (streamMode === "hls") {
      connectHLS(hlsEndpoint);
    }
  }, [camera, streamMode, cleanupConnections, connectWebRTC, connectHLS]);

  // Trigger stream on camera or mode change
  useEffect(() => {
    startStream();
    return () => {
      cleanupConnections();
    };
  }, [camera.id, camera.status, streamMode, startStream, cleanupConnections]);

  const retryConnection = () => {
    setConnectionAttempts((prev) => prev + 1);
    startStream();
  };

  return {
    videoRef,
    connectionStatus,
    streamMode,
    setStreamMode,
    errorMessage,
    streamLatency,
    connectionAttempts,
    retryConnection,
    isLiveFeed:
      connectionStatus === "live_webrtc" || connectionStatus === "live_hls",
  };
}
