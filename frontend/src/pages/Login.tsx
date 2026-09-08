import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";

/* ──────────────────────────────────────────────────────────────
   NETRA  ◉  OPERATOR AUTHENTICATION
   Clean, realistic AI CCTV surveillance command login UI
────────────────────────────────────────────────────────────── */

export default function Login() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail]         = useState("operator@sentinel.in");
  const [password, setPassword]   = useState("sentinel2026");
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState(false);
  const [connError, setConnError] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConnError(false);
    const { error: authErr } = await login(email, password);
    if (!authErr) {
      setSuccess(true);
      setTimeout(() => navigate(from, { replace: true }), 900);
    } else if (authErr.toLowerCase().includes("fetch") || authErr.toLowerCase().includes("network")) {
      setConnError(true);
    } else {
      setError(authErr);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030604] text-white flex items-center justify-center p-3 sm:p-6 lg:p-10 relative overflow-hidden select-none font-sans">
      
      {/* ── FULL-SCREEN BACKGROUND VIDEO ── */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-0 pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4"
          type="video/mp4"
        />
      </video>

      {/* Dark Ambient Mask to ensure maximum text & glass card clarity */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[2px] z-[1] pointer-events-none" />

      {/* ── AMBIENT BACKGROUND GLOWS ── */}
      <div className="pointer-events-none absolute inset-0 z-[2]">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-950/20 rounded-full blur-[200px]" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-teal-950/25 rounded-full blur-[220px]" />
      </div>

      {/* ── MAIN DUAL-PANEL CARD ── */}
      <div className="relative z-10 w-full max-w-6xl rounded-[2rem] sm:rounded-[2.5rem] bg-[#09100c]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.98),0_0_60px_rgba(20,60,35,0.2)] overflow-hidden">
        
        {/* Subtle Isometric Wireframe Grid at bottom-left */}
        <div className="pointer-events-none absolute bottom-0 left-0 w-full sm:w-2/3 h-80 z-0 opacity-25 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="isoFade" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
                <stop offset="60%" stopColor="#10b981" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Isometric diamond grid mesh */}
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={`iso-1-${i}`}
                x1={-100 + i * 40}
                y1={300}
                x2={300 + i * 40}
                y2={0}
                stroke="url(#isoFade)"
                strokeWidth="0.8"
              />
            ))}
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={`iso-2-${i}`}
                x1={-100 + i * 40}
                y1={0}
                x2={300 + i * 40}
                y2={300}
                stroke="url(#isoFade)"
                strokeWidth="0.8"
              />
            ))}
          </svg>
        </div>

        {/* ── GRID CONTAINER: LEFT AUTH + RIGHT ARCH ── */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 min-h-[640px] lg:min-h-[700px]">
          
          {/* ══════════ LEFT COLUMN: AUTH FORM ══════════ */}
          <div className="lg:col-span-6 p-6 sm:p-10 lg:p-14 flex flex-col justify-between">
            
            {/* Top Brand Header */}
            <div>
              <div className="flex items-center gap-3 mb-8">
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
                <span className="ml-1 px-2 py-0.5 rounded text-[9px] font-mono tracking-widest uppercase bg-emerald-950/60 border border-emerald-600/30 text-emerald-400">
                  AI SURVEILLANCE
                </span>
              </div>

              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-medium tracking-tight text-[#edf4ee] leading-[1.18] mb-4">
                Intelligent vision for <br />
                <span className="text-white font-semibold">border surveillance</span>
              </h1>

              {/* Subtitle matching PRD */}
              <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed mb-6">
                AI-powered CCTV analytics, behaviour-aware tracking, and contextual risk scoring.
              </p>

              {/* Operator Access Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-600/25 mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-emerald-300 font-medium">
                  OPERATOR ACCESS
                </span>
              </div>

              {/* Error Banner */}
              {error && !connError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <div>
                    <span className="font-mono font-bold uppercase tracking-wider text-[11px]">AUTHENTICATION FAILED</span>
                    <p className="text-[11px] text-rose-300/80 mt-0.5">Check Operator ID or Password</p>
                  </div>
                </div>
              )}

              {/* Connection Error Banner */}
              {connError && (
                <div className="mb-4 p-3 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 shrink-0 text-amber-400" />
                    <span className="font-mono font-bold uppercase tracking-wider text-[11px]">COMMAND SYSTEM UNAVAILABLE</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setConnError(false); setError(null); }}
                    className="underline text-[11px] hover:text-amber-200 font-mono"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Success Banner */}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                  </span>
                  <span className="font-mono font-bold uppercase tracking-wider text-[11px]">
                    ACCESS GRANTED — Launching Console...
                  </span>
                </div>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5 max-w-md">
                {/* Operator ID Field */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 tracking-wider uppercase">
                    Operator ID
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="username"
                    placeholder="operator@sentinel.in"
                    className="w-full px-4 py-3 rounded-xl bg-[#0f1712] border border-white/[0.09] text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1.5 tracking-wider uppercase">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-[#0f1712] border border-white/[0.09] text-sm text-zinc-100 placeholder-zinc-500 font-mono tracking-widest focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-emerald-400 transition-colors p-1"
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sage Green Pill Button */}
                <button
                  type="submit"
                  disabled={isLoading || success}
                  className="w-full mt-2 py-3.5 px-5 rounded-xl bg-[#98b890] hover:bg-[#a6c89e] active:bg-[#8ba883] text-[#0d1c10] font-semibold text-sm tracking-wide shadow-[0_4px_24px_rgba(152,184,144,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#0d1c10]/30 border-t-[#0d1c10] rounded-full animate-spin" />
                      <span>AUTHENTICATING...</span>
                    </>
                  ) : success ? (
                    <span>ACCESS GRANTED</span>
                  ) : (
                    <span>Continue with credentials</span>
                  )}
                </button>

                {/* Access Policy Notice */}
                <p className="text-[11px] text-zinc-400 text-center font-sans mt-2">
                  By continuing, you agree to the operator access policy.
                </p>
              </form>
            </div>

            {/* Bottom Status Card */}
            <div className="mt-8 pt-4">
              <div className="max-w-md px-4 py-3 rounded-2xl bg-black/40 border border-white/[0.07] flex items-center justify-between font-mono text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                  </span>
                  <span className="text-[11px] text-zinc-300 font-medium">SECURE OPERATOR ACCESS</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-[#142318] border border-emerald-600/30 text-[10px] text-emerald-300 font-bold tracking-wider">
                  NETRA // SYS
                </span>
              </div>
            </div>
          </div>

          {/* ══════════ RIGHT COLUMN: ARCH PORTAL VIEWPORT ══════════ */}
          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex items-center justify-center relative">
            
            {/* The Roman Arch Container */}
            <div className="relative w-full max-w-[480px] h-[520px] sm:h-[580px] lg:h-[620px] rounded-t-full rounded-b-3xl overflow-hidden border border-white/[0.12] shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_0_40px_rgba(0,0,0,0.6)] bg-black">
              
              {/* Autoplaying HD Earth/Space Video */}
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover scale-105 pointer-events-none"
              >
                <source
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4"
                  type="video/mp4"
                />
              </video>

              {/* Ambient Dark Gradient Vignette inside Arch */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* ── TACTICAL RETICLE & CELESTIAL OVERLAY ── */}
              <div className="absolute inset-0 pointer-events-none">
                
                {/* Center Crosshair Hairlines */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[1px] h-full bg-white/30" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-white/30" />
                </div>

                {/* Central Targeting Square Box */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-white/50 bg-white/[0.02]">
                  {/* Corner notches */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-emerald-400" />
                </div>

                {/* Sweeping Orbit / Trajectory Arc Line */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 600" fill="none" preserveAspectRatio="none">
                  {/* Outer sweeping trajectory arc */}
                  <path
                    d="M 60 580 C 100 400 200 300 380 120"
                    stroke="rgba(255, 255, 255, 0.6)"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                  />
                  {/* Inner trajectory curve */}
                  <path
                    d="M 40 560 C 120 420 180 280 340 180"
                    stroke="rgba(52, 211, 153, 0.45)"
                    strokeWidth="1"
                  />
                  {/* Glowing data points on the arc */}
                  <circle cx="200" cy="300" r="3" fill="#34d399" />
                  <circle cx="340" cy="180" r="2" fill="#ffffff" />
                </svg>

                {/* Bottom Center Status Pill */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 font-mono text-[10px] text-emerald-300 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>DEMO SECTOR ACTIVE</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
