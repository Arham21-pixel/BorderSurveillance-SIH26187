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
      <div className="min-h-screen bg-[#071011] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-[#19D3C5]/20 border-t-[#19D3C5] animate-spin" />
          <Radio className="w-6 h-6 text-[#19D3C5] absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="font-mono text-sm font-bold tracking-widest text-[#19D3C5] uppercase">
          NETRA OPERATOR ACCESS
        </div>
        <div className="text-xs text-[#8B9AA3] font-mono mt-2">
          Verifying operator session...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
