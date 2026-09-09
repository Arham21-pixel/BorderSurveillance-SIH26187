import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import AlertCard from "../components/AlertCard";
import EvidenceViewer, { hasAlertMedia } from "../components/EvidenceViewer";
import RiskBadge, { normalizeSeverity } from "../components/RiskBadge";
import AlertDetailsModal from "../components/AlertDetailsModal";
import { ackAlert } from "../services/api";
import type { Alert } from "../types/alert";
import { formatTime } from "../utils/formatters";
import {
  Search,
  Check,
  Camera,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  FileSearch,
} from "lucide-react";

export default function Alerts() {
  const rawAlerts = useAlerts();
  const cameras = useCameras();

  // Local state for alerts to allow immediate optimistic updates
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [cameraFilter, setCameraFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "risk_desc" | "severity_desc">("newest");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Initialize and sync alerts
  useEffect(() => {
    if (rawAlerts && rawAlerts.length > 0) {
      setAlerts(rawAlerts);
      if (!selectedAlertId) {
        setSelectedAlertId(rawAlerts[0].id);
      }
    }
  }, [rawAlerts, selectedAlertId]);

  // Handle alert acknowledgement with optimistic update
  const handleAcknowledge = async (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "acknowledged" } : a))
    );
    try {
      await ackAlert(id);
    } catch {
      // Keep optimistic update
    }
  };

  const handleStatusUpdate = (id: string, newStatus: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    );
  };

  // Severity rank helper for sorting
  const severityRank = (sev: string): number => {
    const norm = normalizeSeverity(sev);
    if (norm === "CRITICAL") return 4;
    if (norm === "HIGH") return 3;
    if (norm === "SUSPICIOUS") return 2;
    return 1;
  };

  // Filtered & Sorted alerts
  const processedAlerts = useMemo(() => {
    let result = [...alerts];

    // 1. Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          (a.reason && a.reason.toLowerCase().includes(q)) ||
          a.camera_id.toLowerCase().includes(q) ||
          (a.event_type && a.event_type.toLowerCase().includes(q))
      );
    }

    // 2. Severity filter
    if (severityFilter !== "ALL") {
      result = result.filter((a) => normalizeSeverity(a.severity) === severityFilter);
    }

    // 3. Camera filter
    if (cameraFilter !== "ALL") {
      result = result.filter((a) => a.camera_id === cameraFilter);
    }

    // 4. Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((a) => a.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // 5. Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === "risk_desc") {
        const scoreA = a.risk_score ?? (severityRank(a.severity) * 0.25);
        const scoreB = b.risk_score ?? (severityRank(b.severity) * 0.25);
        return scoreB - scoreA;
      }
      if (sortBy === "severity_desc") {
        return severityRank(b.severity) - severityRank(a.severity);
      }
      return 0;
    });

    return result;
  }, [alerts, searchQuery, severityFilter, cameraFilter, statusFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(processedAlerts.length / itemsPerPage));
  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedAlerts.slice(start, start + itemsPerPage);
  }, [processedAlerts, currentPage, itemsPerPage]);

  // Selected alert item
  const selectedAlert = useMemo(() => {
    const found = alerts.find((a) => a.id === selectedAlertId);
    return found ?? paginatedAlerts[0] ?? alerts[0] ?? null;
  }, [alerts, selectedAlertId, paginatedAlerts]);

  // Stats
  const criticalCount = alerts.filter((a) => normalizeSeverity(a.severity) === "CRITICAL" && a.status === "open").length;
  const highCount = alerts.filter((a) => normalizeSeverity(a.severity) === "HIGH" && a.status === "open").length;
  const suspiciousCount = alerts.filter((a) => normalizeSeverity(a.severity) === "SUSPICIOUS" && a.status === "open").length;
  const openCount = alerts.filter((a) => a.status === "open").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-netra-line">
        <div>
          <h1 className="n-page-title">Security Alert Center</h1>
          <p className="n-page-sub">
            Prioritized events generated from video, behaviour and contextual risk.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <div className="px-3.5 py-2 rounded-xl n-card-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-netra-critical" />
            <span className="text-netra-critical font-bold font-mono">{criticalCount}</span>
            <span className="text-netra-muted">Critical</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl n-card-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-netra-high" />
            <span className="text-netra-high font-bold font-mono">{highCount}</span>
            <span className="text-netra-muted">High</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl n-card-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-netra-suspicious" />
            <span className="text-netra-suspicious font-bold font-mono">{suspiciousCount}</span>
            <span className="text-netra-muted">Suspicious</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl n-card-2 flex items-center gap-2">
            <span className="text-netra-accent font-bold font-mono">{openCount}</span>
            <span className="text-netra-muted">Open Alerts</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="n-card p-4 sm:p-5 space-y-3.5 text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search alert reason, camera, track ID..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#26E5E5]/50 transition-colors"
            />
          </div>

          {/* Severity Quick-Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-slate-400 mr-1 hidden sm:inline">Severity:</span>
            {["ALL", "CRITICAL", "HIGH", "SUSPICIOUS", "NORMAL"].map((sev) => {
              const isSelected = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => {
                    setSeverityFilter(sev);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg border font-medium uppercase transition-all whitespace-nowrap text-xs ${
                    isSelected
                      ? sev === "CRITICAL"
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/40 font-semibold"
                        : sev === "HIGH"
                        ? "bg-orange-500/15 text-orange-400 border-orange-500/40 font-semibold"
                        : sev === "SUSPICIOUS"
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold"
                        : sev === "NORMAL"
                        ? "bg-emerald-500/15 text-[#35D07F] border-emerald-500/40 font-semibold"
                        : "bg-[#26E5E5]/15 text-[#26E5E5] border-[#26E5E5]/40 font-semibold"
                      : "bg-white/[0.02] text-slate-400 border-white/[0.06] hover:text-white"
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filters: Camera, Status, Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.05] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Camera Dropdown */}
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#26E5E5]" />
              <span className="text-slate-400">Camera:</span>
              <select
                value={cameraFilter}
                onChange={(e) => {
                  setCameraFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-[#26E5E5]"
              >
                <option value="ALL" className="bg-[#0C141C]">All Stations</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0C141C]">
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-[#26E5E5]"
              >
                <option value="ALL" className="bg-[#0C141C]">All Statuses</option>
                <option value="open" className="bg-[#0C141C]">Open Only</option>
                <option value="acknowledged" className="bg-[#0C141C]">Acknowledged Only</option>
              </select>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#26E5E5]" />
            <span className="text-slate-400">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-[#26E5E5]"
            >
              <option value="newest" className="bg-[#0C141C]">Newest First</option>
              <option value="oldest" className="bg-[#0C141C]">Oldest First</option>
              <option value="risk_desc" className="bg-[#0C141C]">Highest Risk Score</option>
              <option value="severity_desc" className="bg-[#0C141C]">Highest Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Alerts Workspace: Alert List (Left) + Detail & Evidence (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts List Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {paginatedAlerts.length} of {processedAlerts.length} filtered incidents
            </span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {paginatedAlerts.length === 0 ? (
            <div className="p-12 text-center n-card text-slate-400 text-xs">
              No security alerts match the current filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={handleAcknowledge}
                  onSelect={(a) => setSelectedAlertId(a.id)}
                  isSelected={alert.id === selectedAlert?.id}
                />
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pageNum = idx + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono flex items-center justify-center transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#26E5E5] text-[#070B12] font-bold shadow-sm shadow-[#26E5E5]/30"
                          : "bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.06]"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-300 hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Selected Alert Quick-Inspector Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {selectedAlert ? (
            <div className="n-card p-5 sm:p-6 space-y-4 sticky top-20">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-white/[0.06]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <RiskBadge severity={selectedAlert.severity} size="md" />
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.03] border border-netra-line text-slate-300">
                      RISK {((selectedAlert.risk_score ?? 0) <= 1 ? (selectedAlert.risk_score ?? 0) * 100 : (selectedAlert.risk_score ?? 0)).toFixed(0)}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-white">
                    {selectedAlert.title}
                  </h2>
                </div>

                <span
                  className={`text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full border ${
                    selectedAlert.status === "open"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-emerald-500/10 text-[#35D07F] border-emerald-500/20"
                  }`}
                >
                  {selectedAlert.status}
                </span>
              </div>

              {/* Reason Summary Box */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                <div className="text-[10px] font-mono text-[#26E5E5] font-semibold uppercase mb-1">
                  Contextual Risk Assessment:
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {selectedAlert.reason || selectedAlert.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted">CAMERA</div>
                  <div className="font-semibold text-white mt-1">{selectedAlert.camera_id}</div>
                </div>
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted">ZONE</div>
                  <div className="font-semibold text-white mt-1">{selectedAlert.zone || "—"}</div>
                </div>
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted">EVENT TYPE</div>
                  <div className="font-semibold text-white mt-1 uppercase">
                    {selectedAlert.event_type || selectedAlert.title}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted">TRACK ID</div>
                  <div className="font-semibold text-white mt-1">{selectedAlert.track_id ?? "—"}</div>
                </div>
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted flex items-center gap-1">
                    <Clock className="w-3 h-3 text-netra-accent" />
                    TIME
                  </div>
                  <div className="font-semibold text-white mt-1">{formatTime(selectedAlert.timestamp)}</div>
                </div>
                <div className="p-3 rounded-xl bg-netra-card2 border border-netra-line">
                  <div className="text-[10px] text-netra-muted flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-netra-normal" />
                    EVIDENCE
                  </div>
                  <div className="font-semibold text-netra-normal mt-1">
                    {hasAlertMedia(selectedAlert) ? "Captured" : "Pending"}
                  </div>
                </div>
              </div>

              {(selectedAlert.risk_breakdown?.length || selectedAlert.reason) && (
                <div className="p-3.5 rounded-xl bg-netra-card2 border border-netra-line text-xs space-y-1.5">
                  <div className="n-label">Reasons</div>
                  {selectedAlert.risk_breakdown?.length
                    ? selectedAlert.risk_breakdown.map((item) => (
                        <div key={item.signal} className="flex justify-between text-netra-muted">
                          <span>{item.signal}</span>
                          <span className={item.delta >= 0 ? "text-netra-high font-mono" : "text-netra-normal font-mono"}>
                            {item.delta >= 0 ? `+${item.delta}` : item.delta}
                          </span>
                        </div>
                      ))
                    : <p className="text-netra-muted">{selectedAlert.reason}</p>}
                </div>
              )}

              {/* Attached Evidence Viewer Component */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                  Evidence Media Attachment:
                </div>
                <EvidenceViewer alert={selectedAlert} path={selectedAlert.evidence_path} showTabs />
              </div>

              {/* Operator Action Controls */}
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/evidence"
                  className="w-full py-2.5 px-3 rounded-xl bg-netra-accent text-netra-bg text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <FileSearch className="w-3.5 h-3.5" />
                  VIEW EVIDENCE
                </Link>
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-transparent text-netra-accent border border-netra-line text-xs font-medium flex items-center justify-center gap-1.5 hover:border-netra-accent/40"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Alert Details</span>
                </button>

                <div className="flex gap-2">
                  {selectedAlert.status === "open" ? (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-[#26E5E5] hover:bg-[#35D07F] text-[#070B12] text-xs font-semibold uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#26E5E5]/20"
                    >
                      <Check className="w-4 h-4" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2.5 px-3 rounded-xl bg-[#35D07F]/10 border border-[#35D07F]/20 text-[#35D07F] text-center text-xs font-semibold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center n-card text-slate-400 text-xs">
              Select an alert from the queue to inspect evidence and event details.
            </div>
          )}
        </div>
      </div>

      {/* Alert Details Modal */}
      {showDetailsModal && selectedAlert && (
        <AlertDetailsModal
          alert={selectedAlert}
          onClose={() => setShowDetailsModal(false)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
