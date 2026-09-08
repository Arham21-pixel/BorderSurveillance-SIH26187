import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  ShieldAlert,
  FileSearch,
  Map as MapIcon,
  BarChart3,
  X,
  Shield,
  Radio
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#0A1015]/95 backdrop-blur-xl border-r border-white/[0.07] p-4 flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] px-2 pt-1">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#20D5C5]/20 to-[#39D98A]/10 border border-[#20D5C5]/30">
              <Shield className="w-4 h-4 text-[#20D5C5]" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#39D98A] ring-2 ring-[#0A1015] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white">
                  NETRA
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-[#20D5C5]/10 text-[#20D5C5] border border-[#20D5C5]/20">
                  AI
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-tight">
                BORDER SENTINEL · SIH26187
              </div>
            </div>
          </div>

          {/* Close button on mobile */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="mt-5 flex-1 flex flex-col justify-between">
          <nav className="flex flex-col gap-1" aria-label="Main Navigation">
            <div className="px-3 pb-2 text-[10px] font-mono font-medium uppercase tracking-wider text-slate-500">
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
                    `group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-[#20D5C5]/10 text-[#20D5C5] border border-[#20D5C5]/20 shadow-[0_0_15px_-3px_rgba(32,213,197,0.15)] font-semibold"
                        : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200 border border-transparent"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    <span>{item.label}</span>
                  </div>

                  {item.showBadge && openAlertsCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {openAlertsCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Telemetry & Status Badge */}
          <div className="pt-4 border-t border-white/[0.06] mt-auto">
            <div className="p-3 rounded-xl bg-[#101820] border border-white/[0.06] flex flex-col gap-2 shadow-inner">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <Radio className="w-3 h-3 text-[#20D5C5]" />
                  Threat Engine
                </span>
                <span className="text-[10px] font-mono font-semibold text-[#39D98A] px-2 py-0.5 rounded-full bg-[#39D98A]/10 border border-[#39D98A]/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#39D98A] animate-ping" />
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>INFERENCE CONF</span>
                <span className="text-slate-200 font-medium">YOLOv8 + B-SORT</span>
              </div>
            </div>

            <div className="mt-3 px-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>BUILD v0.1.0</span>
              <span>DEFENSE AI LABS</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
