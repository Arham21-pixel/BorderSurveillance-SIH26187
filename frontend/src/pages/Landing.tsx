import { useNavigate } from "react-router-dom";
import {
  Download,
  Wand2,
  BookOpen,
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden font-sans text-white bg-black select-none">
      {/* Background: Full-screen autoplaying, looping, muted video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Ambient Mask to ensure maximum text & glass clarity */}
      <div className="fixed inset-0 bg-black/40 z-[1] pointer-events-none" />

      {/* Main Two-Panel Split Layout */}
      <main className="relative z-10 flex flex-col lg:flex-row min-h-screen w-full">
        {/* ================= LEFT PANEL ================= */}
        <div className="w-full lg:w-[52%] relative p-4 lg:p-6 flex flex-col justify-between">
          {/* Liquid Glass Strong Overlay for Left Panel */}
          <div className="absolute inset-4 lg:inset-6 rounded-3xl liquid-glass-strong -z-10 pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-between min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-3rem)] p-4 sm:p-6 lg:p-8">
            {/* Nav: Brand */}
            <header className="flex items-center justify-between gap-4">
              {/* Logo (32x32) + "netra" text */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:scale-105 transition-transform">
                  <svg
                    viewBox="0 0 32 32"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-white"
                  >
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
                    <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.8" />
                    <circle cx="16" cy="16" r="4" fill="currentColor" />
                    <path d="M16 2V6M16 26V30M2 16H6M26 16H30" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
                  </svg>
                </div>
                <span className="font-semibold text-2xl tracking-tighter text-white">
                  netra
                </span>
              </div>
            </header>

            {/* Hero Center Section (flex-1, centered) */}
            <section className="flex-1 flex flex-col justify-center items-start text-left my-8 lg:my-0 max-w-xl">
              {/* Logo Emblem (80x80) */}
              <div className="w-20 h-20 rounded-3xl liquid-glass flex items-center justify-center mb-6 hover:scale-105 transition-transform shadow-2xl">
                <svg
                  viewBox="0 0 80 80"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 text-white"
                >
                  <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                  <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" />
                  <circle cx="40" cy="40" r="14" stroke="currentColor" strokeWidth="2" strokeOpacity="0.9" />
                  <circle cx="40" cy="40" r="6" fill="currentColor" />
                  <path d="M40 4V12M40 68V76M4 40H12M68 40H76" stroke="currentColor" strokeWidth="2" strokeOpacity="0.7" />
                  <path d="M14.5 14.5L20 20M60 60L65.5 65.5M14.5 65.5L20 60M60 20L65.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
                </svg>
              </div>

              {/* Main Headline with Source Serif 4 italic accent */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-medium tracking-[-0.05em] text-white leading-[1.05] mb-4">
                Intelligent vision <br />
                <span className="font-serif italic text-white/80">
                  for border surveillance
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-white/70 max-w-lg mb-8 leading-relaxed font-sans">
                AI-powered CCTV analytics, behaviour-aware tracking, and contextual risk scoring.
              </p>

              {/* Primary CTA Button: Sole Entry Point to Auth/Command Dashboard */}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="liquid-glass-strong rounded-full px-7 py-4 flex items-center gap-3.5 hover:scale-105 active:scale-95 transition-transform group text-sm font-medium text-white shadow-2xl mb-8"
              >
                <span className="tracking-tight">Enter Command Center</span>
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <Download className="w-3.5 h-3.5 text-white" />
                </div>
              </button>

              {/* Three Pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 hover:scale-105 transition-transform">
                  Intelligent Video Analytics
                </span>
                <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 hover:scale-105 transition-transform">
                  Contextual Risk Engine
                </span>
                <span className="liquid-glass rounded-full px-4 py-1.5 text-xs text-white/80 hover:scale-105 transition-transform">
                  Evidence Management
                </span>
              </div>
            </section>

            {/* Bottom Quote & Doctrine Attribution */}
            <footer className="w-full pt-6 border-t border-white/10">
              <span className="text-[11px] tracking-widest uppercase text-white/50 block font-medium mb-1.5">
                TACTICAL DOCTRINE
              </span>
              <p className="text-sm text-white/90 leading-relaxed mb-3">
                "We engineered an <span className="font-serif italic text-white/70">intelligent surveillance layer</span> with explainable, operator-reviewable alerts."
              </p>
              <div className="flex items-center gap-3 w-full text-[11px] text-white/50 tracking-wider font-mono">
                <div className="flex-1 h-[1px] bg-white/15" />
                <span>SIH 26187 • BORDER SURVEILLANCE</span>
                <div className="flex-1 h-[1px] bg-white/15" />
              </div>
            </footer>
          </div>
        </div>

        {/* ================= RIGHT PANEL (Desktop Only) ================= */}
        <div className="w-full lg:w-[48%] hidden lg:flex flex-col justify-between p-6 relative">
          {/* Top spacer */}
          <div />

          {/* Center-Right Intelligence Card */}
          <div className="self-end my-auto w-64 p-5 rounded-3xl liquid-glass space-y-2 hover:scale-105 transition-transform shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-widest uppercase text-white/50 font-mono">
                TELEMETRY GRID
              </span>
              <div className="w-2 h-2 rounded-full bg-white/80 animate-pulse" />
            </div>
            <h3 className="text-sm font-semibold text-white tracking-tight">
              AI Video Analytics
            </h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Object tracking with ByteTrack, loitering duration counters, and geofenced perimeter intrusion detection.
            </p>
          </div>

          {/* Bottom Feature Section: Outer liquid-glass container with rounded-[2.5rem] */}
          <div className="mt-auto liquid-glass rounded-[2.5rem] p-5 space-y-4 shadow-2xl">
            {/* Two Side-by-Side Cards */}
            <div className="grid grid-cols-2 gap-3.5">
              {/* Card 1: Neural Processing */}
              <div className="liquid-glass rounded-3xl p-4 space-y-2 hover:scale-105 transition-transform">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs font-semibold text-white">
                  Neural Inference
                </div>
                <p className="text-[11px] text-white/60 leading-snug">
                  Lightweight YOLO detection + CPU-first processing.
                </p>
              </div>

              {/* Card 2: Forensic Archive */}
              <div className="liquid-glass rounded-3xl p-4 space-y-2 hover:scale-105 transition-transform">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs font-semibold text-white">
                  Evidence Management
                </div>
                <p className="text-[11px] text-white/60 leading-snug">
                  Snapshots, clips & event metadata.
                </p>
              </div>
            </div>

            {/* Bottom Card: CCTV Thumbnail + Description */}
            <div className="liquid-glass rounded-3xl p-4 flex items-center justify-between gap-4 hover:scale-105 transition-transform">
              {/* Thumbnail (96x64) */}
              <div className="w-24 h-16 rounded-2xl bg-white/5 border-none relative overflow-hidden shrink-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                <svg
                  viewBox="0 0 96 64"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-full opacity-60"
                >
                  <line x1="0" y1="32" x2="96" y2="32" stroke="white" strokeWidth="0.5" strokeDasharray="3 3" />
                  <line x1="48" y1="0" x2="48" y2="64" stroke="white" strokeWidth="0.5" strokeDasharray="3 3" />
                  <circle cx="48" cy="32" r="20" stroke="white" strokeWidth="1" strokeOpacity="0.5" />
                  <circle cx="48" cy="32" r="10" stroke="white" strokeWidth="1" strokeOpacity="0.8" />
                  <circle cx="56" cy="24" r="2.5" fill="white" />
                  <rect x="52" y="20" width="8" height="8" stroke="white" strokeWidth="0.8" />
                </svg>
                <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/60 text-[8px] font-mono text-white/80">
                  REC
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  Contextual Risk Scoring
                </div>
                <p className="text-[11px] text-white/60 line-clamp-2 mt-0.5 leading-snug">
                  Multi-signal fusion scoring, zone penetration alert triggers, and operator-assisted alert triage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
