import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  ShieldAlert,
  FileSearch,
  Map as MapIcon,
  BarChart3,
  X,
  Shield
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cameras", label: "Live Cameras", icon: Video },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, showBadge: true },
  { to: "/evidence", label: "Evidence", icon: FileSearch },
  { to: "/map", label: "Map", icon: MapIcon },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const alerts = useAlerts();
  const openAlertsCount = alerts.filter((a) => a.status === "open").length;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-gradient-to-b from-[#0c141c] to-[#070b10] border-r border-[#243140] p-4 flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand / Title */}
        <div className="flex items-center justify-between pb-4 border-b border-[#243140]/60">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="/src/assets/logo.svg" alt="Sentinel Logo" className="w-8 h-8" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5ad67a] ring-2 ring-[#0c141c]" />
            </div>
            <div>
              <div className="font-bold tracking-wider text-xs text-[#3dd6c6] uppercase">
                BORDER AI SENTINEL
              </div>
              <div className="text-[10px] text-[#8fa3b8] font-mono tracking-tight">
                SIH 26187 · C2 CONSOLE
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1 rounded-lg text-[#8fa3b8] hover:text-[#e8eef5] hover:bg-[#16202b]"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="mt-6 flex-1 flex flex-col justify-between">
          <nav className="flex flex-col gap-1.5" aria-label="Main Navigation">
            <div className="px-3 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8fa3b8]/60">
              Operations
            </div>

            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? "bg-[#16202b] text-[#3dd6c6] border border-[#3dd6c6]/30 shadow-sm font-semibold"
                        : "text-[#8fa3b8] hover:bg-[#101820] hover:text-[#e8eef5]"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>

                  {item.showBadge && openAlertsCount > 0 && (
                    <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#ff5a5a] text-white">
                      {openAlertsCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Telemetry & Status Badge */}
          <div className="pt-4 border-t border-[#243140]/60 mt-auto">
            <div className="p-3 rounded-lg bg-[#101820] border border-[#243140] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#8fa3b8] flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-[#3dd6c6]" />
                  Threat Engine
                </span>
                <span className="text-[10px] font-mono font-bold text-[#5ad67a] px-1.5 py-0.2 rounded bg-[#14321c]">
                  ACTIVE
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#8fa3b8]">
                <span>INFERENCE CONF</span>
                <span className="text-[#e8eef5]">YOLOv8 + B-SORT</span>
              </div>
            </div>

            <div className="mt-3 px-1 flex items-center justify-between text-[10px] font-mono text-[#8fa3b8]/60">
              <span>BUILD v0.1.0</span>
              <span>DEFENSE AI LABS</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
