import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  Lock,
  Mail,
  AlertCircle,
  KeyRound,
  Radio,
  CheckCircle2,
  Cpu
} from "lucide-react";

export default function Login() {
  const { login, isLoading, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("operator@sentinel.in");
  const [password, setPassword] = useState("sentinel2026");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

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
    <div className="min-h-screen bg-[#070b10] text-[#e8eef5] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Tactical Grid and Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(61,214,198,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10182015_1px,transparent_1px),linear-gradient(to_bottom,#10182015_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-[#101820]/95 border border-[#243140] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
        {/* Header with Emblem */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#16202b] border border-[#3dd6c6]/40 mb-4 shadow-lg shadow-[#3dd6c6]/10">
            <img src="/src/assets/logo.svg" alt="Sentinel Logo" className="w-9 h-9" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#14321c] border border-[#5ad67a]/30 text-[#5ad67a] text-[10px] font-mono font-bold tracking-wider uppercase mb-2">
            <Radio className="w-3 h-3 animate-pulse" />
            SECURE C2 GATEWAY · DEFCON 4
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
            BORDER AI SENTINEL
          </h1>
          <p className="text-xs text-[#8fa3b8] mt-1 font-mono">
            Northern Command (Ladakh Sector) · Operator Authentication
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-[#3a1515] border border-[#ff5a5a]/50 text-[#ff5a5a] text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Authentication Failed</div>
              <div className="text-[11px] text-[#ff5a5a]/80 mt-0.5">{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-[#8fa3b8] uppercase tracking-wider mb-1.5">
              Operator Email / Call-Sign
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8fa3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@sentinel.in"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] placeholder-[#8fa3b8]/40 focus:outline-none focus:border-[#3dd6c6] focus:ring-1 focus:ring-[#3dd6c6] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-semibold text-[#8fa3b8] uppercase tracking-wider">
                Security Access Cipher
              </label>
              <span className="text-[10px] text-[#3dd6c6] font-mono">256-BIT ENCRYPTED</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8fa3b8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] placeholder-[#8fa3b8]/40 focus:outline-none focus:border-[#3dd6c6] focus:ring-1 focus:ring-[#3dd6c6] transition-all font-mono"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-lg bg-[#3dd6c6] text-[#06221f] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#3dd6c6]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#3dd6c6]/20"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-[#06221f]/30 border-t-[#06221f] rounded-full animate-spin" />
                <span>Verifying Biometric Hash...</span>
              </>
            ) : (
              <>
                <KeyRound className="w-4 h-4" />
                <span>Authorize & Access C2 Console</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Quick-Fill / Info Card */}
        <div className="mt-6 pt-5 border-t border-[#243140]/60">
          <div className="flex items-center justify-between text-[11px] text-[#8fa3b8] mb-3">
            <span className="flex items-center gap-1.5 font-mono">
              <Cpu className="w-3.5 h-3.5 text-[#3dd6c6]" />
              {isDemoMode ? "OFFLINE DEMO EVALUATION" : "SUPABASE CLOUD AUTH"}
            </span>
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="text-[10px] font-mono text-[#3dd6c6] hover:underline flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Quick Fill Demo
            </button>
          </div>

          <div className="p-2.5 rounded-lg bg-[#0c141c] border border-[#243140] text-[11px] text-[#8fa3b8] font-mono space-y-1">
            <div className="flex justify-between">
              <span>Demo User:</span>
              <span className="text-[#e8eef5]">operator@sentinel.in</span>
            </div>
            <div className="flex justify-between">
              <span>Default Cipher:</span>
              <span className="text-[#e8eef5]">sentinel2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Classification Notice */}
      <div className="mt-8 text-center text-[10px] font-mono text-[#8fa3b8]/60 max-w-sm">
        RESTRICTED NATIONAL SECURITY SYSTEM · AUTHORIZED ACCESS ONLY
        <div className="mt-1">SMART INDIA HACKATHON 2024 · SIH 26187</div>
      </div>
    </div>
  );
}
