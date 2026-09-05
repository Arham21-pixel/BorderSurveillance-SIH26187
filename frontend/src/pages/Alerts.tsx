import { useState, useMemo, useEffect } from "react";
import { useAlerts } from "../hooks/useAlerts";
import { useCameras } from "../hooks/useCameras";
import AlertCard from "../components/AlertCard";
import EvidenceViewer from "../components/EvidenceViewer";
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
  Activity,
  ShieldCheck,
  AlertOctagon,
  ExternalLink
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
  const openCount = alerts.filter((a) => a.status === "open").length;

  return (
    <div className="space-y-6">
      {/* Alert Center Header & KPI Counters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#243140]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#3a1212] text-[#ff4d4d] border border-[#ff4d4d]/40">
              <AlertOctagon className="w-3 h-3 animate-pulse" />
              TACTICAL INCIDENT MANAGEMENT
            </span>
            <span className="text-[11px] font-mono text-[#8fa3b8]">
              NORTHERN DEFENSE SECTOR 4
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
            Perimeter Security Alert Center
          </h1>
          <p className="text-xs text-[#8fa3b8] mt-1">
            Multi-tier incident triage queue with autonomous risk scoring and evidence audit correlation.
          </p>
        </div>

        {/* Severity Counters */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#ff4d4d]/30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff4d4d] animate-ping" />
            <span className="text-[#ff4d4d] font-bold">{criticalCount}</span>
            <span className="text-[#8fa3b8]">CRITICAL</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#ff5a5a]/30 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a5a]" />
            <span className="text-[#ff5a5a] font-bold">{highCount}</span>
            <span className="text-[#8fa3b8]">HIGH</span>
          </div>

          <div className="px-3 py-2 rounded-lg bg-[#101820] border border-[#243140] flex items-center gap-2">
            <span className="text-[#3dd6c6] font-bold">{openCount}</span>
            <span className="text-[#8fa3b8]">TOTAL OPEN</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#101820] border border-[#243140] space-y-3 font-mono text-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Keyword Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#8fa3b8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search alert reason, camera, track ID..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] placeholder-[#8fa3b8]/50 focus:outline-none focus:border-[#3dd6c6]"
            />
          </div>

          {/* Severity Quick-Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[10px]">
            <span className="text-[#8fa3b8] mr-1 hidden sm:inline">SEVERITY:</span>
            {["ALL", "CRITICAL", "HIGH", "SUSPICIOUS", "NORMAL"].map((sev) => {
              const isSelected = severityFilter === sev;
              return (
                <button
                  key={sev}
                  onClick={() => {
                    setSeverityFilter(sev);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md border font-bold uppercase transition-all whitespace-nowrap ${
                    isSelected
                      ? sev === "CRITICAL"
                        ? "bg-[#3a1212] text-[#ff4d4d] border-[#ff4d4d]"
                        : sev === "HIGH"
                        ? "bg-[#3a1515] text-[#ff5a5a] border-[#ff5a5a]"
                        : sev === "SUSPICIOUS"
                        ? "bg-[#3a2e12] text-[#f5b942] border-[#f5b942]"
                        : sev === "NORMAL"
                        ? "bg-[#14321c] text-[#5ad67a] border-[#5ad67a]"
                        : "bg-[#16202b] text-[#3dd6c6] border-[#3dd6c6]"
                      : "bg-[#0c141c] text-[#8fa3b8] border-[#243140] hover:text-[#e8eef5]"
                  }`}
                >
                  {sev}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secondary Filters: Camera, Status, Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#243140]/60 text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            {/* Camera Dropdown */}
            <div className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-[#3dd6c6]" />
              <span className="text-[#8fa3b8]">Camera:</span>
              <select
                value={cameraFilter}
                onChange={(e) => {
                  setCameraFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#0c141c] border border-[#243140] rounded px-2 py-1 text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6]"
              >
                <option value="ALL">All Stations</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-[#8fa3b8]">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#0c141c] border border-[#243140] rounded px-2 py-1 text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6]"
              >
                <option value="ALL">All Statuses</option>
                <option value="open">Open Only</option>
                <option value="acknowledged">Acknowledged Only</option>
              </select>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#3dd6c6]" />
            <span className="text-[#8fa3b8]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#0c141c] border border-[#243140] rounded px-2 py-1 text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="risk_desc">Highest Risk Score</option>
              <option value="severity_desc">Highest Severity</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Alerts Workspace: Alert List (Left) + Detail & Evidence (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Alerts List Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-[#8fa3b8] px-1">
            <span>
              Showing {paginatedAlerts.length} of {processedAlerts.length} filtered incidents
            </span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {paginatedAlerts.length === 0 ? (
            <div className="p-12 text-center bg-[#101820] border border-[#243140] rounded-xl text-[#8fa3b8] font-mono text-xs">
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
            <div className="flex items-center justify-between pt-3 border-t border-[#243140] font-mono text-xs">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded bg-[#101820] border border-[#243140] text-[#e8eef5] hover:bg-[#16202b] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
                      className={`w-7 h-7 rounded text-xs font-mono flex items-center justify-center transition-colors ${
                        currentPage === pageNum
                          ? "bg-[#3dd6c6] text-[#06221f] font-bold"
                          : "bg-[#101820] text-[#8fa3b8] hover:text-[#e8eef5] border border-[#243140]"
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
                className="px-3 py-1.5 rounded bg-[#101820] border border-[#243140] text-[#e8eef5] hover:bg-[#16202b] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
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
            <div className="bg-[#101820] border border-[#243140] rounded-xl p-5 space-y-4 sticky top-20">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#243140]">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <RiskBadge severity={selectedAlert.severity} size="md" />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0c141c] border border-[#243140] text-[#e8eef5]">
                      RISK SCORE: <span className="text-[#ff5a5a] font-bold">{((selectedAlert.risk_score ?? 0.88) * 100).toFixed(0)}%</span>
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#e8eef5]">
                    {selectedAlert.title}
                  </h2>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    selectedAlert.status === "open"
                      ? "bg-[#3a1515] text-[#ff5a5a] border border-[#ff5a5a]/40"
                      : "bg-[#14321c] text-[#5ad67a] border border-[#5ad67a]/40"
                  }`}
                >
                  {selectedAlert.status}
                </span>
              </div>

              {/* Reason Summary Box */}
              <div className="p-3 rounded-lg bg-[#0c141c] border border-[#243140] text-xs">
                <div className="text-[10px] font-mono text-[#3dd6c6] font-bold uppercase mb-1">
                  Autonomous Risk Assessment Reason:
                </div>
                <p className="text-[#e8eef5] leading-relaxed">
                  {selectedAlert.reason || selectedAlert.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1">
                    <Camera className="w-3 h-3 text-[#3dd6c6]" />
                    CAMERA
                  </div>
                  <div className="font-bold text-[#e8eef5] mt-1">{selectedAlert.camera_id}</div>
                </div>

                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#f5b942]" />
                    EVENT TYPE
                  </div>
                  <div className="font-bold text-[#e8eef5] mt-1 uppercase">
                    {selectedAlert.event_type || "ZONE_INTRUSION"}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#3dd6c6]" />
                    TIME
                  </div>
                  <div className="font-bold text-[#e8eef5] mt-1">{formatTime(selectedAlert.timestamp)}</div>
                </div>

                <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
                  <div className="text-[10px] text-[#8fa3b8] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#5ad67a]" />
                    EVIDENCE
                  </div>
                  <div className="font-bold text-[#5ad67a] mt-1">
                    {selectedAlert.evidence_path ? "SNAPSHOT READY" : "NONE"}
                  </div>
                </div>
              </div>

              {/* Attached Evidence Viewer Component */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono text-[#8fa3b8] uppercase font-bold">
                  Forensic Media Attachment:
                </div>
                <EvidenceViewer path={selectedAlert.evidence_path} />
              </div>

              {/* Operator Action Controls */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="w-full py-2 px-3 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#3dd6c6] border border-[#3dd6c6]/40 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Incident Dossier & Controls</span>
                </button>

                <div className="flex gap-2">
                  {selectedAlert.status === "open" ? (
                    <button
                      onClick={() => handleAcknowledge(selectedAlert.id)}
                      className="flex-1 py-2 px-3 rounded-lg bg-[#3dd6c6] text-[#06221f] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-[#3dd6c6]/90 transition-all shadow-lg shadow-[#3dd6c6]/10"
                    >
                      <Check className="w-4 h-4" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <div className="flex-1 py-2 px-3 rounded-lg bg-[#14321c] border border-[#5ad67a]/40 text-[#5ad67a] text-center font-mono text-xs font-bold flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" />
                      <span>ACKNOWLEDGED</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-[#101820] border border-[#243140] rounded-xl text-[#8fa3b8] font-mono text-xs">
              Select an alert from the queue to inspect full telemetry.
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
