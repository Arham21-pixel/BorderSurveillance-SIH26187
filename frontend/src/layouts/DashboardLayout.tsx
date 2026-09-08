import { ReactNode, useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

interface DashboardLayoutProps {
  children?: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080D11] text-[#F1F5F9] flex relative selection:bg-[#20D5C5]/25 selection:text-[#20D5C5]">
      {/* Subtle top ambient radial lighting matching Dribbble reference */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[380px] bg-gradient-to-b from-[#20D5C5]/[0.045] via-[#39D98A]/[0.02] to-transparent rounded-full blur-3xl pointer-events-none z-0"
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
