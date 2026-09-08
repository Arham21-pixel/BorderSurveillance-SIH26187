import { ReactNode, useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#071011] text-[#F4F7F7] flex relative selection:bg-[#19D3C5]/25 selection:text-[#19D3C5]">
      {/* Subtle top ambient radial lighting matching Dribbble reference */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] bg-gradient-to-b from-[#19D3C5]/[0.045] via-[#35D07F]/[0.02] to-transparent rounded-full blur-3xl pointer-events-none z-0"
        aria-hidden="true"
      />

      {/* Sidebar Navigation */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Command Center Column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden z-10">
        {/* Top Navigation Bar */}
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1680px] w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
