import { NavLink } from "react-router-dom";
import { LayoutDashboard, Video, ShieldAlert, Activity, BarChart3 } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cameras", label: "Cameras", icon: Video },
  { to: "/alerts", label: "Alerts", icon: ShieldAlert },
  { to: "/events", label: "Events", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand flex items-center gap-3">
        <img src="/src/assets/logo.svg" alt="Sentinel Logo" className="w-7 h-7" />
        <div>
          BORDER AI SENTINEL
          <small>SIH 26187 · operator console</small>
        </div>
      </div>
      <nav className="nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon className="w-4 h-4" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="mt-auto pt-6 border-t border-[#243140] text-xs text-[#8fa3b8]">
        <div className="font-mono text-[11px] text-[#3dd6c6]">SENTINEL v0.1.0</div>
        <div className="text-[10px] mt-1 text-[#8fa3b8]/70">FASTAPI + AI PIPELINE</div>
      </div>
    </aside>
  );
}
