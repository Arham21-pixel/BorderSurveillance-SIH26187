import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export default function Login() {
  const { login, isLoading, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("operator@sentinel.in");
  const [password, setPassword] = useState("sentinel2026");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const { error } = await login(email, password);
    if (error) {
      setErrorMessage(error);
    } else {
      navigate(from, { replace: true });
    }
  };

  const fillDemoCredentials = () => {
    setEmail("operator@sentinel.in");
    setPassword("sentinel2026");
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#060b08] text-[#e8eef5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-40 w-[600px] h-[600px] bg-emerald-950/35 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-24 right-0 w-[700px] h-[700px] bg-emerald-900/25 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute top-10 right-1/4 w-[400px] h-[400px] bg-lime-950/20 rounded-full blur-[130px] pointer-events-none" />

      {/* Futuristic Telemetry Wave Graph matching reference design */}
      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
        <svg
          className="w-full h-full opacity-90"
          viewBox="0 0 1440 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Luminous Gradient Fill under curve */}
            <linearGradient id="waveFill" x1="720" y1="200" x2="720" y2="900" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.22" />
              <stop offset="35%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="70%" stopColor="#065f46" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
            </linearGradient>

            {/* Glowing Stroke Filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="16" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Shaded Area under the wave */}
          <path
            d="M -100 900 L -100 800 Q 150 780 240 760 T 430 820 T 700 710 T 1020 220 T 1200 240 T 1540 100 L 1540 900 Z"
            fill="url(#waveFill)"
          />

          {/* Secondary ambient wave */}
          <path
            d="M -100 850 Q 200 760 380 830 T 760 670 T 1060 270 T 1500 130"
            stroke="#10b981"
            strokeWidth="1.5"
            strokeOpacity="0.3"
            fill="none"
          />

          {/* Primary glowing stroke */}
          <path
            d="M -100 880 Q 150 790 240 765 T 430 820 T 700 710 T 1020 220 T 1200 240 T 1540 100"
            stroke="#a3e635"
            strokeWidth="2.5"
            strokeOpacity="0.85"
            filter="url(#neonGlow)"
            fill="none"
          />
        </svg>

        {/* Left Telemetry Peak & Metric Node */}
        <div className="absolute left-[14%] sm:left-[17%] bottom-[12%] sm:bottom-[15%] flex flex-col items-center pointer-events-none">
          <span className="text-[11px] font-mono tracking-wider text-emerald-300/70 mb-1 drop-shadow">
            0.83641
          </span>
          <div className="relative flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-emerald-400/30 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#ffffff] relative z-10" />
          </div>
        </div>

        {/* Right Telemetry Peak & Metric Node */}
        <div className="absolute right-[22%] sm:right-[26%] top-[20%] sm:top-[22%] flex flex-col items-center pointer-events-none">
          <span className="text-[11px] font-mono tracking-wider text-emerald-300/70 mb-1 drop-shadow">
            0.87590
          </span>
          <div className="relative flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-emerald-400/30 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#ffffff] relative z-10" />
          </div>
        </div>
      </div>

      {/* Main Container with Tablet Bezel Illusion */}
      <div className="relative z-10 w-full max-w-[430px] px-2">
        {/* Sleek Dark Glass Card */}
        <div className="relative backdrop-blur-2xl bg-[#09110d]/90 border border-white/10 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.08)] p-7 sm:p-9">
          {/* Subtle Top Inner Edge Highlight */}
          <div className="absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

          {/* Header section: ◉ NETRA / SECURE OPERATOR ACCESS */}
          <div className="text-center mb-6">
            {/* ◉ Tactical Iris / Radar Icon */}
            <div className="inline-flex items-center justify-center mb-2">
              <div className="relative flex items-center justify-center">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 animate-ping absolute" />
                <div className="w-7 h-7 rounded-full bg-emerald-950 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                  <span className="text-emerald-400 text-sm font-bold">◉</span>
                </div>
              </div>
            </div>

            {/* NETRA Title */}
            <h1 className="text-2xl sm:text-[26px] font-bold tracking-[0.2em] text-white uppercase mt-1">
              NETRA
            </h1>

            {/* SECURE OPERATOR ACCESS Subtitle */}
            <div className="text-[11px] sm:text-xs font-mono font-medium tracking-[0.18em] text-emerald-400/90 uppercase mt-1">
              SECURE OPERATOR ACCESS
            </div>
          </div>

          {/* Quick preset credentials buttons */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-[11px] font-medium text-zinc-300 hover:text-white transition-all shadow-sm active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Operator Fill</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("commander@sentinel.in");
                setPassword("sentinel2026");
                setErrorMessage(null);
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 text-[11px] font-medium text-zinc-300 hover:text-white transition-all shadow-sm active:scale-[0.98]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Commander Fill</span>
            </button>
          </div>

          {/* Error Notification Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-semibold">Authentication Failed</div>
                <div className="text-[11px] text-rose-300/80 mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Operator ID Field */}
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 tracking-wide">
                Operator ID
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@sentinel.in"
                className="w-full px-4 py-3 rounded-xl bg-[#111915]/90 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-mono font-medium text-zinc-300 mb-1.5 tracking-wide">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[#111915]/90 border border-white/10 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors p-1 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* [ AUTHENTICATE ] Vibrant Emerald Green Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#00874e] hover:bg-[#009b59] active:bg-[#007442] text-white font-bold text-xs uppercase tracking-[0.18em] transition-all shadow-[0_0_24px_rgba(0,135,78,0.45)] hover:shadow-[0_0_32px_rgba(0,155,89,0.6)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] font-mono"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <span>[ AUTHENTICATE ]</span>
              )}
            </button>
          </form>

          {/* Footer inside card: ● SECURE CONNECTION \n NETRA // COMMAND SYSTEM */}
          <div className="mt-6 pt-4 border-t border-white/[0.07] text-center space-y-1.5 font-mono">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span>● SECURE CONNECTION</span>
            </div>
            <div className="text-[11px] text-zinc-400 tracking-[0.2em] uppercase">
              NETRA // COMMAND SYSTEM
            </div>
            <div className="text-[10px] text-zinc-500 pt-1">
              {isDemoMode ? "OFFLINE DEMO EVALUATION · 256-BIT ENCRYPTION" : "SUPABASE CLOUD AUTH · 256-BIT ENCRYPTION"}
            </div>
          </div>
        </div>

        {/* Outer Rim Emerald Glow simulating tablet reflection from reference */}
        <div className="h-2 w-3/4 mx-auto bg-emerald-500/25 blur-lg rounded-full mt-1" />
      </div>
    </div>
  );
}

