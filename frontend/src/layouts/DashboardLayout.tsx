import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import { DemoSessionProvider } from "../contexts/DemoSessionContext";

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <DemoSessionProvider>
    <div className="soc-shell min-h-screen bg-netra-bg text-netra-text flex relative selection:bg-netra-accent/25 selection:text-netra-accent">
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(720px 380px at 18% 0%, rgba(38,229,229,0.10), transparent 62%),
            radial-gradient(900px 420px at 82% 8%, rgba(20,90,110,0.18), transparent 58%),
            radial-gradient(700px 500px at 50% 100%, rgba(38,229,229,0.05), transparent 70%),
            linear-gradient(180deg, #070B12 0%, #08141A 55%, #070B12 100%)
          `,
        }}
      />
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.028]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(#26E5E5 1px, transparent 1px), linear-gradient(90deg, #26E5E5 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden z-10">
        <TopBar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-7 max-w-[1680px] w-full mx-auto overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </DemoSessionProvider>
  );
}
