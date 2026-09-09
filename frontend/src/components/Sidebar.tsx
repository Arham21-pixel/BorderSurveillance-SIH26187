import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Video,
  ShieldAlert,
  FileSearch,
  Map as MapIcon,
  BarChart3,
  X,
  Cpu,
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { useAuth } from "../hooks/useAuth";
import NetraLogo from "./NetraLogo";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cameras", label: "Live Cameras", icon: Video },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert, showBadge: true },
  { to: "/evidence", label: "Evidence", icon: FileSearch },
  { to: "/map", label: "Sector Map", icon: MapIcon },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const alerts = useAlerts();
  const { user } = useAuth();
  const openAlertsCount = alerts.filter((a) => a.status === "open").length;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-[232px] bg-[#070B12]/80 backdrop-blur-xl border-r border-netra-accent/15 p-3.5 flex flex-col z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-1.5 pt-1 pb-4 border-b border-netra-accent/12">
          <NetraLogo compact />
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-netra-muted hover:text-netra-text hover:bg-white/[0.05] transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="mt-4 flex-1 flex flex-col gap-0.5" aria-label="Main Navigation">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-2 py-2 rounded-xl text-[13px] font-medium transition-colors ${
                    isActive
                      ? "bg-netra-accent/10 text-netra-text"
                      : "text-netra-muted hover:bg-white/[0.03] hover:text-netra-text"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-netra-accent text-netra-bg shadow-[0_0_18px_-2px_rgba(38,229,229,0.85)]"
                            : "bg-white/[0.04] text-netra-muted group-hover:text-netra-text border border-white/[0.06]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.showBadge && openAlertsCount > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full bg-netra-critical/20 text-netra-critical border border-netra-critical/30 flex items-center justify-center">
                        {openAlertsCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-3 border-t border-netra-accent/12">
          <div className="n-card-2 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-netra-muted flex items-center gap-1.5">
                <Cpu className="w-3 h-3 text-netra-accent" />
                AI Analytics Engine
              </span>
              <span className="text-[9px] font-semibold text-netra-normal">Active</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-netra-muted2">
              <span>Detect</span>
              <span className="text-right text-netra-text">On-device</span>
              <span>Track</span>
              <span className="text-right text-netra-text">Active</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-netra-card2 border border-netra-line flex items-center justify-center text-[10px] font-semibold text-netra-accent">
              {user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "OP"}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-netra-text truncate">
                {user?.name || "Operator"}
              </div>
              <div className="text-[10px] text-netra-muted truncate">
                {user?.role || "Operator"}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
