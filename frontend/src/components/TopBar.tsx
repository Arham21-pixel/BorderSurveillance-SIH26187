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

  // Live system clock (IST / UTC)
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
    <header className="h-16 border-b border-[#243140] bg-[#0c141c]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile menu toggle + System Status */}
      <div className="flex items-center gap-3 sm:gap-5">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 rounded-lg bg-[#16202b] text-[#8fa3b8] hover:text-[#e8eef5] border border-[#243140]"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101820] border border-[#243140]">
            <Radio className="w-3.5 h-3.5 text-[#3dd6c6] animate-pulse" />
            <span className="text-xs font-mono font-semibold text-[#3dd6c6]">
              SENTINEL-AI
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#14321c]/70 border border-[#5ad67a]/30 text-[#5ad67a] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[#5ad67a] animate-ping" />
            <span>ONLINE</span>
            <span className="text-[#8fa3b8]">|</span>
            <span>{onlineCameras}/{cameras.length || 3} CAMS ACTIVE</span>
          </div>

          <div className="hidden xl:flex items-center gap-2 text-xs font-mono text-[#8fa3b8]">
            <Shield className="w-3.5 h-3.5 text-[#3dd6c6]" />
            <span>SECTOR: NORTHERN COMMAND (LADAKH)</span>
          </div>
        </div>
      </div>

      {/* Right: Clock + Notification Bell + User Profile + Logout */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Time */}
        <div className="hidden sm:flex flex-col text-right font-mono">
          <span className="text-xs text-[#e8eef5] font-semibold tracking-wider">
            {currentTime} <span className="text-[10px] text-[#3dd6c6]">IST</span>
          </span>
          <span className="text-[10px] text-[#8fa3b8]">
            {new Date().toISOString().split("T")[0]}
          </span>
        </div>

        <div className="h-6 w-[1px] bg-[#243140] hidden sm:block" />

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-[#101820] border border-[#243140] text-[#8fa3b8] hover:text-[#e8eef5] hover:border-[#3dd6c6]/50 transition-colors"
            title="Active Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {openAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#ff5a5a] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {openAlerts.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#101820] border border-[#243140] shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-3 bg-[#16202b] border-b border-[#243140] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#3dd6c6]" />
                  <span className="text-xs font-bold text-[#e8eef5] tracking-wide uppercase">
                    Incident Alerts Queue
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ff5a5a]/20 text-[#ff5a5a] font-mono font-bold">
                  {openAlerts.length} Open
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#243140]/60">
                {openAlerts.length === 0 ? (
                  <div className="p-6 text-center text-[#8fa3b8] text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-[#5ad67a]" />
                    <span>Sector perimeter clear. No active alerts.</span>
                  </div>
                ) : (
                  openAlerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 hover:bg-[#16202b]/60 transition-colors cursor-pointer"
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/alerts");
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            alert.severity === "high"
                              ? "bg-[#3a1515] text-[#ff5a5a]"
                              : alert.severity === "medium"
                              ? "bg-[#3a2e12] text-[#f5b942]"
                              : "bg-[#14321c] text-[#5ad67a]"
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-mono text-[#8fa3b8]">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#e8eef5] mt-1 line-clamp-1">
                        {alert.title}
                      </div>
                      <div className="text-[11px] text-[#8fa3b8] line-clamp-1 mt-0.5">
                        {alert.camera_id} · {alert.description}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-[#0c141c] border-t border-[#243140] text-center">
                <Link
                  to="/alerts"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-[#3dd6c6] hover:underline"
                >
                  Open Full Alert Center →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Current User Badge */}
        <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-[#101820] border border-[#243140]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#16202b] to-[#3dd6c6]/30 border border-[#3dd6c6]/50 flex items-center justify-center text-xs font-bold text-[#3dd6c6]">
            {user?.name ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "OP"}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-[#e8eef5] leading-tight">
              {user?.name || user?.email || "Capt. V. Sharma"}
            </span>
            <span className="text-[10px] font-mono text-[#3dd6c6] flex items-center gap-1">
              <UserCheck className="w-2.5 h-2.5" />
              {user?.role ? user.role.toUpperCase() : "OPERATOR #402"}
            </span>
          </div>
        </div>

        {/* Logout Action */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="p-2 rounded-lg bg-[#101820] border border-[#243140] text-[#8fa3b8] hover:text-[#ff5a5a] hover:border-[#ff5a5a]/50 transition-colors"
          title="Sign Out"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#101820] border border-[#243140] rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#ff5a5a] mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#e8eef5]">End Sentinel Session</h3>
            </div>
            <p className="text-xs text-[#8fa3b8] leading-relaxed mb-6">
              Confirm operator shift handoff? All telemetry and alert queues will continue recording to the central surveillance log.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#16202b] text-[#e8eef5] hover:bg-[#243140] border border-[#243140]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#ff5a5a] text-white hover:bg-[#ff5a5a]/90"
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
