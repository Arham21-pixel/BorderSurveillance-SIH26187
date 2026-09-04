import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Radio } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b10] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-[#3dd6c6]/20 border-t-[#3dd6c6] animate-spin" />
          <Radio className="w-6 h-6 text-[#3dd6c6] absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="font-mono text-sm font-bold tracking-widest text-[#3dd6c6] uppercase">
          SENTINEL SECURE GATEWAY
        </div>
        <div className="text-xs text-[#8fa3b8] font-mono mt-2">
          Verifying security clearance and cryptographic session token...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
