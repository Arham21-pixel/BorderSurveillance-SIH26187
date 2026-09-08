import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Shield,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
  Radio,
  UserCheck
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useAuth } from "../hooks/useAuth";
import { formatTime } from "../utils/formatters";

interface TopBarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export default function TopBar({ onToggleSidebar, isSidebarOpen }: TopBarProps) {
  const alerts = useAlerts();
  const cameras = useCameras();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const openAlerts = alerts.filter((a) => a.status === "open");
  const onlineCameras = cameras.filter((c) => c.status === "online").length;

  // Live system clock (IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-[#080D11]/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Left: Mobile menu toggle + System Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <Radio className="w-3.5 h-3.5 text-[#20D5C5] animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">
              NETRA<span className="text-[#20D5C5] ml-0.5">AI</span>
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#39D98A]/10 border border-[#39D98A]/20 text-[#39D98A] text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#39D98A] animate-ping" />
            <span>Online</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300 font-mono text-[10px]">
              {onlineCameras}/{cameras.length || 3} Cams Active
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-medium ml-1">
            <Shield className="w-3.5 h-3.5 text-[#20D5C5]" />
            <span>Sector: Northern Command (Ladakh)</span>
          </div>
        </div>
      </div>

      {/* Right: Clock + Notification Bell + User Profile + Logout */}
      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* System Time */}
        <div className="hidden md:flex flex-col text-right font-mono pr-1">
          <span className="text-xs text-slate-200 font-medium tracking-wider">
            {currentTime} <span className="text-[10px] text-[#20D5C5] font-semibold">IST</span>
          </span>
          <span className="text-[10px] text-slate-500">
            {new Date().toISOString().split("T")[0]}
          </span>
        </div>

        <div className="h-5 w-[1px] bg-white/[0.08] hidden md:block" />

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.15] hover:bg-white/[0.06] transition-all"
            title="Active Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {openAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/40">
                {openAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#101820] border border-white/[0.1] shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3.5 bg-[#141E28] border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#20D5C5]" />
                  <span className="text-xs font-semibold text-white tracking-wide">
                    Incident Alerts Queue
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-mono font-medium border border-rose-500/20">
                  {openAlerts.length} Open
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04]">
                {openAlerts.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-[#39D98A]" />
                    <span>Sector perimeter clear. No active alerts.</span>
                  </div>
                ) : (
                  openAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/alerts");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                            alert.severity === "high" || alert.severity === "critical"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : alert.severity === "medium"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-[#39D98A]/10 text-[#39D98A] border-[#39D98A]/20"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 mt-1 line-clamp-1">
                        {alert.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {alert.camera_id} · {alert.description}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-[#0C141C] border-t border-white/[0.06] text-center">
                <Link
                  to="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-[#20D5C5] hover:text-[#39D98A] transition-colors"
                >
                  Open Full Alert Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Current User Profile Pill */}
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#20D5C5]/20 to-[#39D98A]/20 border border-[#20D5C5]/30 flex items-center justify-center text-xs font-semibold text-[#20D5C5]">
            {user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "OP"}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-medium text-slate-200 leading-tight">
              {user?.name || user?.email || "Capt. V. Sharma"}
            </span>
            <span className="text-[10px] text-[#20D5C5] font-mono flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5" />
              {user?.role ? user.role.toUpperCase() : "OPERATOR #402"}
            </span>
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-all"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#101820] border border-white/[0.1] rounded-2xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-white">End Sentinel Session</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Confirm operator shift handoff? All telemetry and alert queues will continue recording to the central surveillance log.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/20 transition-colors"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
