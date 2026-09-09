import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X,
} from "lucide-react";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import { useAuth } from "../hooks/useAuth";
import { formatTime } from "../utils/formatters";
import { SECTOR_SHORT_LABEL } from "../lib/constants";
import RiskBadge from "./RiskBadge";

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
  const displayOnlineCameras = cameras.length > 0 ? onlineCameras : 1;
  const displayTotalCameras = cameras.length > 0 ? cameras.length : 5;

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
    <header className="h-14 border-b border-netra-accent/12 bg-[#070B12]/70 backdrop-blur-xl px-4 sm:px-5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-xl bg-white/[0.04] text-netra-muted hover:text-netra-text border border-netra-accent/15 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-netra-normal/10 border border-netra-normal/20">
          <span className="w-1.5 h-1.5 rounded-full bg-netra-normal animate-pulse" />
          <span className="text-[11px] font-semibold text-netra-normal">Online</span>
        </div>

        <div className="hidden sm:flex items-center text-[11px] text-netra-muted">
          <span className="font-mono text-netra-text">{displayOnlineCameras} / {displayTotalCameras}</span>
          <span className="ml-1.5">Cameras Active</span>
        </div>

        <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-netra-accent/10 text-netra-accent border border-netra-accent/25">
          Operations
        </span>

        <span className="hidden xl:inline text-[12px] text-netra-muted truncate">
          {SECTOR_SHORT_LABEL}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex flex-col text-right pr-1">
          <span className="text-[12px] font-mono text-netra-text tracking-wide">
            {currentTime} <span className="text-[10px] text-netra-accent">IST</span>
          </span>
        </div>

        <div className="h-5 w-px bg-netra-line hidden md:block" />

        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-white/[0.04] border border-netra-accent/15 text-netra-muted hover:text-netra-text hover:border-netra-accent/35 transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {openAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-netra-critical text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {openAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 n-card overflow-hidden z-50">
              <div className="p-3.5 bg-netra-card2 border-b border-netra-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-netra-accent" />
                  <span className="text-xs font-semibold text-netra-text">Security Alerts Queue</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-netra-critical/15 text-netra-critical font-mono border border-netra-critical/20">
                  {openAlerts.length} Open
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-netra-line">
                {openAlerts.length === 0 ? (
                  <div className="p-6 text-center text-netra-muted text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-netra-normal" />
                    <span>Sector clear. No active alerts.</span>
                  </div>
                ) : (
                  openAlerts.slice(0, 5).map((alert) => (
                    <button
                      key={alert.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-white/[0.03] transition-colors"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/alerts");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <RiskBadge severity={alert.severity} />
                        <span className="text-[10px] font-mono text-netra-muted2">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-netra-text mt-1 line-clamp-1">{alert.title}</div>
                      <div className="text-[11px] text-netra-muted line-clamp-1 mt-0.5">
                        {alert.camera_id} · {alert.description}
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-netra-card2 border-t border-netra-line text-center">
                <Link
                  to="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-netra-accent hover:text-netra-normal transition-colors"
                >
                  Open Security Alert Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/[0.04] border border-netra-accent/15">
          <div className="w-6 h-6 rounded-full bg-netra-accent/15 border border-netra-accent/30 flex items-center justify-center text-[10px] font-semibold text-netra-accent">
            {user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "OP"}
          </div>
          <span className="hidden lg:inline text-[12px] font-medium text-netra-text max-w-[120px] truncate">
            {user?.name || "Operator"}
          </span>
        </div>

        <button
          onClick={() => setShowLogoutModal(true)}
          className="p-2 rounded-xl bg-white/[0.04] border border-netra-accent/15 text-netra-muted hover:text-netra-critical hover:border-netra-critical/30 transition-colors"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="n-card max-w-sm w-full p-6">
            <div className="flex items-center gap-3 text-netra-high mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-semibold text-netra-text">End NETRA Session</h3>
            </div>
            <p className="text-xs text-netra-muted leading-relaxed mb-6">
              Confirm operator session logout? Live monitoring will pause on this console.
            </p>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setShowLogoutModal(false)} className="n-btn-secondary">
                Cancel
              </button>
              <button onClick={handleLogout} className="n-btn-danger">
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
