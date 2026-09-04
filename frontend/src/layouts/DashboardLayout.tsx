import { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="shell">
      <Sidebar />
      <div className="flex flex-col min-h-screen overflow-hidden">
        <header className="h-14 border-b border-[#243140] bg-[#0c141c]/80 backdrop-blur px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/30">
              DEFCON 4 · MONITORING
            </span>
            <span className="text-xs text-[#8fa3b8] font-mono hidden sm:inline">
              SECTOR: NORTHERN COMMAND (LADAKH)
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-[#8fa3b8]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3dd6c6] animate-pulse" />
              <span className="text-[#e8eef5]">SYS ONLINE</span>
            </div>
            <span className="hidden md:inline">OP-ID: SENTINEL-01</span>
          </div>
        </header>
        <main className="content flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
