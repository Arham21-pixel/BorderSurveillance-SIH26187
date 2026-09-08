/**
 * useVideoSource — manages video source selection and analysis lifecycle.
 *
 * Covers all three input modes:
 *   • mp4   — Demo MP4 selected from a fixed list, analysis triggered via backend
 *   • rtsp  — RTSP URL entered by operator, CONNECT initiates pipeline
 *   • webcam — browser MediaStream preview (analysis delegated to backend later)
 *
 * State machine:
 *   IDLE → (source selected) → READY → (START clicked) → ANALYZING
 *        ← (STOP clicked) ← STOPPED
 *        ← (error) ← ERROR
 */

import { useState, useCallback, useRef, useEffect } from "react";
import {
  startVideoAnalysis,
  stopVideoAnalysis,
  fetchVideoStatus,
  type VideoSourceType,
  type SessionStatusResponse,
} from "../services/api";

// Re-export so consumers can import VideoSourceType from this module
export type { VideoSourceType };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type AnalysisState =
  | "IDLE"
  | "READY"
  | "ANALYZING"
  | "STOPPED"
  | "ERROR"
  | "OFFLINE";

export type DemoMP4 =
  | "walking.mp4"
  | "loitering.mp4"
  | "border crossing.mp4";

export const DEMO_MP4_OPTIONS: { value: DemoMP4; label: string; description: string }[] = [
  {
    value: "walking.mp4",
    label: "walking.mp4",
    description: "Normal movement / tracking demonstration",
  },
  {
    value: "loitering.mp4",
    label: "loitering.mp4",
    description: "Loitering / dwell-time demonstration",
  },
  {
    value: "border crossing.mp4",
    label: "border crossing.mp4",
    description: "Restricted-zone / boundary-crossing demonstration",
  },
];

export interface VideoSourceState {
  // Selection
  sourceType: VideoSourceType;
  mp4File: DemoMP4;
  rtspUrl: string;
  rtspCameraName: string;
  // Analysis lifecycle
  analysisState: AnalysisState;
  sessionId: string | null;
  sessionStatus: SessionStatusResponse | null;
  errorMessage: string | null;
  // Webcam
  webcamStream: MediaStream | null;
  // Helpers
  isDemoMode: boolean;
}

export interface VideoSourceActions {
  setSourceType: (t: VideoSourceType) => void;
  setMp4File: (f: DemoMP4) => void;
  setRtspUrl: (url: string) => void;
  setRtspCameraName: (name: string) => void;
  startAnalysis: (cameraId: string) => Promise<void>;
  stopAnalysis: () => Promise<void>;
  connectRtsp: (cameraId: string) => Promise<void>;
  startWebcam: () => Promise<void>;
  stopWebcam: () => void;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVideoSource(): VideoSourceState & VideoSourceActions {
  const [sourceType, setSourceTypeRaw] = useState<VideoSourceType>("mp4");
  const [mp4File, setMp4FileRaw] = useState<DemoMP4>("walking.mp4");
  const [rtspUrl, setRtspUrl] = useState("rtsp://camera-address/stream");
  const [rtspCameraName, setRtspCameraName] = useState("");
  const [analysisState, setAnalysisState] = useState<AnalysisState>("IDLE");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derived: whether we are in demo MP4 mode
  const isDemoMode = sourceType === "mp4";

  // ------------------------------------------------------------------
  // Source type change — reset analysis state
  // ------------------------------------------------------------------
  const setSourceType = useCallback((t: VideoSourceType) => {
    setSourceTypeRaw(t);
    setAnalysisState("IDLE");
    setSessionId(null);
    setSessionStatus(null);
    setErrorMessage(null);
    // Stop any running webcam
    setWebcamStream((prev) => {
      if (prev) prev.getTracks().forEach((tr) => tr.stop());
      return null;
    });
  }, []);

  // Once a source is chosen, flip to READY
  const setMp4File = useCallback((f: DemoMP4) => {
    setMp4FileRaw(f);
    setAnalysisState("READY");
    setErrorMessage(null);
  }, []);

  // Immediately mark READY when source type becomes mp4
  useEffect(() => {
    if (sourceType === "mp4") setAnalysisState("READY");
    else if (sourceType === "rtsp") setAnalysisState("IDLE"); // needs CONNECT first
    else if (sourceType === "webcam") setAnalysisState("IDLE"); // needs START WEBCAM
  }, [sourceType]);

  // ------------------------------------------------------------------
  // Poll session status while ANALYZING
  // ------------------------------------------------------------------
  const startPolling = useCallback((sid: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const s = await fetchVideoStatus(sid);
        setSessionStatus(s);
        if (s.status === "stopped") {
          setAnalysisState("STOPPED");
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
        } else if (s.status === "error") {
          setAnalysisState("ERROR");
          setErrorMessage("Backend pipeline reported an error.");
          clearInterval(pollIntervalRef.current!);
          pollIntervalRef.current = null;
        }
      } catch {
        // backend unreachable — don't crash UI
      }
    }, 3000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  // ------------------------------------------------------------------
  // Start analysis (MP4 or RTSP)
  // ------------------------------------------------------------------
  const startAnalysis = useCallback(
    async (cameraId: string) => {
      setErrorMessage(null);
      setAnalysisState("ANALYZING");

      const sourceReference =
        sourceType === "mp4" ? mp4File : rtspUrl;

      try {
        const res = await startVideoAnalysis({
          source_type: sourceType,
          source_reference: sourceReference,
          camera_id: cameraId,
        });
        setSessionId(res.session_id);
        startPolling(res.session_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to start analysis.";
        setErrorMessage(msg);
        setAnalysisState("ERROR");
      }
    },
    [sourceType, mp4File, rtspUrl, startPolling],
  );

  // ------------------------------------------------------------------
  // Stop analysis
  // ------------------------------------------------------------------
  const stopAnalysis = useCallback(async () => {
    stopPolling();
    if (sessionId) {
      try {
        await stopVideoAnalysis(sessionId);
      } catch {
        // best-effort
      }
    }
    setAnalysisState("STOPPED");
    setSessionId(null);
  }, [sessionId, stopPolling]);

  // ------------------------------------------------------------------
  // RTSP connect (same pipeline, different source type label)
  // ------------------------------------------------------------------
  const connectRtsp = useCallback(
    async (cameraId: string) => {
      setErrorMessage(null);
      setAnalysisState("ANALYZING");
      try {
        const res = await startVideoAnalysis({
          source_type: "rtsp",
          source_reference: rtspUrl,
          camera_id: cameraId,
        });
        setSessionId(res.session_id);
        startPolling(res.session_id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "RTSP connection failed.";
        setErrorMessage("RTSP CONNECTION FAILED — " + msg);
        setAnalysisState("ERROR");
      }
    },
    [rtspUrl, startPolling],
  );

  // ------------------------------------------------------------------
  // Webcam
  // ------------------------------------------------------------------
  const startWebcam = useCallback(async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setWebcamStream(stream);
      setAnalysisState("READY");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera permission denied.";
      setErrorMessage("Webcam error: " + msg);
      setAnalysisState("ERROR");
    }
  }, []);

  const stopWebcam = useCallback(() => {
    setWebcamStream((prev) => {
      if (prev) prev.getTracks().forEach((tr) => tr.stop());
      return null;
    });
    setAnalysisState("IDLE");
    stopPolling();
  }, [stopPolling]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    setAnalysisState("IDLE");
  }, []);

  return {
    // state
    sourceType,
    mp4File,
    rtspUrl,
    rtspCameraName,
    analysisState,
    sessionId,
    sessionStatus,
    errorMessage,
    webcamStream,
    isDemoMode,
    // actions
    setSourceType,
    setMp4File,
    setRtspUrl,
    setRtspCameraName,
    startAnalysis,
    stopAnalysis,
    connectRtsp,
    startWebcam,
    stopWebcam,
    clearError,
  };
}
