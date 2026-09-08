import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents } from "../services/api";
import type { EventItem } from "../types/event";
import RiskBadge from "../components/RiskBadge";
import { formatTime } from "../utils/formatters";
import {
  Search,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Camera,
  FileSearch,
  Activity,
  ShieldAlert,
  Filter,
  CheckCircle2,
  Layers,
  Sparkles,
} from "lucide-react";

function severityFromScore(score: number): "CRITICAL" | "HIGH" | "SUSPICIOUS" | "NORMAL" {
  if (score >= 0.9) return "CRITICAL";
  if (score >= 0.75) return "HIGH";
  if (score >= 0.45) return "SUSPICIOUS";
  return "NORMAL";
}

export default function Events() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("ALL");
  const [cameraFilter, setCameraFilter] = useState("ALL");
  const [minRiskThreshold, setMinRiskThreshold] = useState<number>(0);
  const [dateRange, setDateRange] = useState<"ALL" | "TODAY" | "24H" | "7D">("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "risk_desc" | "risk_asc">("newest");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected row for detail drawer
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    fetchEvents(50)
      .then((data) => {
        setEvents(data || []);
      })
      .catch(() => {
        setEvents([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Filter and sort events
  const processedEvents = useMemo(() => {
    let result = [...events];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.kind.toLowerCase().includes(q) ||
          e.camera_id.toLowerCase().includes(q) ||
          (e.zone && e.zone.toLowerCase().includes(q)) ||
          (e.track_id !== undefined && e.track_id !== null && e.track_id.toString().includes(q))
      );
    }

    // 2. Event Kind Filter
    if (kindFilter !== "ALL") {
      result = result.filter((e) => e.kind.toLowerCase() === kindFilter.toLowerCase());
    }

    // 3. Camera Filter
    if (cameraFilter !== "ALL") {
      result = result.filter((e) => e.camera_id === cameraFilter);
    }

    // 4. Min Risk Score Threshold
    if (minRiskThreshold > 0) {
      result = result.filter((e) => e.risk_score >= minRiskThreshold);
    }

    // 5. Date Range Filter
    if (dateRange !== "ALL") {
      const now = Date.now();
      const cutoff =
        dateRange === "TODAY"
          ? new Date().setHours(0, 0, 0, 0)
          : dateRange === "24H"
          ? now - 24 * 60 * 60 * 1000
          : now - 7 * 24 * 60 * 60 * 1000;

      result = result.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
    }

    // 6. Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      if (sortBy === "risk_desc") {
        return b.risk_score - a.risk_score;
      }
      if (sortBy === "risk_asc") {
        return a.risk_score - b.risk_score;
      }
      return 0;
    });

    return result;
  }, [events, searchQuery, kindFilter, cameraFilter, minRiskThreshold, dateRange, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, kindFilter, cameraFilter, minRiskThreshold, dateRange, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(processedEvents.length / itemsPerPage));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedEvents.slice(start, start + itemsPerPage);
  }, [processedEvents, currentPage, itemsPerPage]);

  // Unique camera list for filter
  const uniqueCameras = useMemo(() => {
    return Array.from(new Set(events.map((e) => e.camera_id)));
  }, [events]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Event ID", "Timestamp", "Camera ID", "Event Kind", "Risk Score", "Track ID", "Defense Zone", "Description"];
    const rows = processedEvents.map((e) => [
      e.id,
      e.timestamp,
      e.camera_id,
      e.kind,
      e.risk_score.toFixed(2),
      e.track_id !== undefined && e.track_id !== null ? `#${e.track_id}` : "N/A",
      `"${(e.zone || "Sector").replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `border_audit_events_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export / Print PDF Report
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e8eef5]">
              Sensor Events & Forensic Audit Log
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#16202b] text-[#3dd6c6] border border-[#243140] uppercase">
              SIH 26187 Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#8fa3b8] mt-1">
            Complete sequential log of computer vision detections, behaviour anomalies, and risk engine scores.
          </p>
        </div>

        {/* Action Controls: CSV & PDF Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-lg bg-[#101820] hover:bg-[#16202b] text-[#e8eef5] border border-[#243140] text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
            title="Download CSV Audit Trail"
          >
            <Download className="w-3.5 h-3.5 text-[#3dd6c6]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="px-3 py-1.5 rounded-lg bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] text-xs font-mono flex items-center gap-1.5 transition-colors shadow-sm"
            title="Print or Export PDF Report"
          >
            <Printer className="w-3.5 h-3.5 text-[#f5b942]" />
            <span>Print Audit (PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono text-xs">
        <div className="p-3.5 rounded-xl bg-[#101820] border border-[#243140] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8fa3b8] uppercase">Total Events Audited</div>
            <div className="text-xl font-bold text-[#e8eef5] mt-1">{events.length}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c141c] text-[#3dd6c6] border border-[#243140]">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101820] border border-[#243140] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8fa3b8] uppercase">Zone Intrusions</div>
            <div className="text-xl font-bold text-[#ff5a5a] mt-1">
              {events.filter((e) => e.kind === "zone_intrusion").length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c141c] text-[#ff5a5a] border border-[#243140]">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101820] border border-[#243140] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8fa3b8] uppercase">High / Critical Risk</div>
            <div className="text-xl font-bold text-[#f5b942] mt-1">
              {events.filter((e) => e.risk_score >= 0.75).length}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c141c] text-[#f5b942] border border-[#243140]">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#101820] border border-[#243140] flex items-center justify-between">
          <div>
            <div className="text-[10px] text-[#8fa3b8] uppercase">Avg Incident Score</div>
            <div className="text-xl font-bold text-[#5ad67a] mt-1">
              {events.length > 0
                ? (events.reduce((acc, curr) => acc + curr.risk_score, 0) / events.length).toFixed(2)
                : "0.00"}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#0c141c] text-[#5ad67a] border border-[#243140]">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa3b8]" />
            <input
              type="text"
              placeholder="Search by keyword, camera, track ID, zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] placeholder-[#8fa3b8] focus:outline-none focus:border-[#3dd6c6] font-mono"
            />
          </div>

          {/* Event Kind Filter */}
          <div className="md:col-span-2">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-mono"
            >
              <option value="ALL">All Event Kinds</option>
              <option value="zone_intrusion">Zone Intrusion</option>
              <option value="loitering">Loitering</option>
              <option value="group_movement">Group Movement</option>
              <option value="perimeter_crossing">Perimeter Crossing</option>
              <option value="abnormal_velocity">Abnormal Velocity</option>
              <option value="routine_patrol">Routine Patrol</option>
            </select>
          </div>

          {/* Camera Filter */}
          <div className="md:col-span-2">
            <select
              value={cameraFilter}
              onChange={(e) => setCameraFilter(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-mono"
            >
              <option value="ALL">All Cameras</option>
              {uniqueCameras.map((cam) => (
                <option key={cam} value={cam}>
                  {cam}
                </option>
              ))}
            </select>
          </div>

          {/* Risk Threshold */}
          <div className="md:col-span-2">
            <select
              value={minRiskThreshold.toString()}
              onChange={(e) => setMinRiskThreshold(parseFloat(e.target.value))}
              className="w-full px-2.5 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-mono"
            >
              <option value="0">All Risk Scores</option>
              <option value="0.45">Risk ≥ 0.45 (Suspicious+)</option>
              <option value="0.75">Risk ≥ 0.75 (High+)</option>
              <option value="0.90">Risk ≥ 0.90 (Critical)</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div className="md:col-span-2">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full px-2.5 py-2 rounded-lg bg-[#0c141c] border border-[#243140] text-xs text-[#e8eef5] focus:outline-none focus:border-[#3dd6c6] font-mono"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today Only</option>
              <option value="24H">Past 24 Hours</option>
              <option value="7D">Past 7 Days</option>
            </select>
          </div>
        </div>

        {/* Active Filter Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#243140]/60 text-xs font-mono">
          <div className="flex items-center gap-2 text-[#8fa3b8]">
            <Filter className="w-3.5 h-3.5 text-[#3dd6c6]" />
            <span>
              Showing <strong>{processedEvents.length}</strong> matching audit entries
            </span>
            {(searchQuery || kindFilter !== "ALL" || cameraFilter !== "ALL" || minRiskThreshold > 0 || dateRange !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setKindFilter("ALL");
                  setCameraFilter("ALL");
                  setMinRiskThreshold(0);
                  setDateRange("ALL");
                }}
                className="text-[11px] text-[#ff5a5a] hover:underline ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#8fa3b8] text-[11px]">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0c141c] border border-[#243140] rounded px-2 py-1 text-[11px] text-[#e8eef5] focus:outline-none"
            >
              <option value="newest">Timestamp (Newest First)</option>
              <option value="oldest">Timestamp (Oldest First)</option>
              <option value="risk_desc">Risk Score (Highest First)</option>
              <option value="risk_asc">Risk Score (Lowest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#101820] border border-[#243140] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0c141c] text-[#8fa3b8] uppercase text-[10px] tracking-wider border-b border-[#243140]">
              <tr>
                <th className="py-3 px-4">Event Ref / Kind</th>
                <th className="py-3 px-4">Camera & Sector</th>
                <th className="py-3 px-4">Track ID</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Quick Jump</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#243140]/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8fa3b8]">
                    Loading forensic event logs...
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8fa3b8]">
                    No events found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const severity = severityFromScore(event.risk_score);
                  return (
                    <tr
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`hover:bg-[#16202b]/60 transition-colors cursor-pointer ${
                        selectedEvent?.id === event.id ? "bg-[#16202b] border-l-2 border-[#3dd6c6]" : ""
                      }`}
                    >
                      {/* Event Ref & Kind */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#e8eef5] flex items-center gap-1.5">
                          <span>{event.id}</span>
                        </div>
                        <div className="text-[10px] text-[#3dd6c6] uppercase tracking-wider font-semibold mt-0.5">
                          {event.kind.replace(/_/g, " ")}
                        </div>
                      </td>

                      {/* Camera & Sector */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#e8eef5] flex items-center gap-1">
                          <Camera className="w-3 h-3 text-[#8fa3b8]" />
                          <span>{event.camera_id}</span>
                        </div>
                        <div className="text-[10px] text-[#8fa3b8] mt-0.5 truncate max-w-[150px]">
                          {event.zone || "Border Sector"}
                        </div>
                      </td>

                      {/* Track ID */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#0c141c] border border-[#243140] text-[#e8eef5] text-[11px]">
                          {event.track_id !== undefined && event.track_id !== null
                            ? `TRK #${event.track_id}`
                            : "UNTRACKED"}
                        </span>
                      </td>

                      {/* Risk Severity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <RiskBadge severity={severity} size="sm" />
                          <span className="text-xs font-bold text-[#e8eef5]">
                            {event.risk_score.toFixed(2)}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-xs text-[#e8eef5] line-clamp-1">
                          {event.description}
                        </p>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-[#8fa3b8] whitespace-nowrap text-[11px]">
                        {formatTime(event.timestamp)}
                      </td>

                      {/* 1-Click Jump Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1-Click Jump to Live Camera */}
                          <button
                            onClick={() => navigate("/cameras")}
                            title={`Jump to Live Feed (${event.camera_id})`}
                            className="p-1.5 rounded-lg bg-[#0c141c] hover:bg-[#16202b] text-[#8fa3b8] hover:text-[#3dd6c6] border border-[#243140] transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                          </button>

                          {/* 1-Click Jump to Evidence Record */}
                          <button
                            onClick={() => navigate("/evidence")}
                            title="Jump to Evidence Record"
                            className="p-1.5 rounded-lg bg-[#0c141c] hover:bg-[#16202b] text-[#8fa3b8] hover:text-[#5ad67a] border border-[#243140] transition-colors"
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-[#243140] bg-[#0c141c] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="text-[#8fa3b8]">
            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong>{Math.min(currentPage * itemsPerPage, processedEvents.length)}</strong> of{" "}
            <strong>{processedEvents.length}</strong> events
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 rounded bg-[#16202b] border border-[#243140] text-[#e8eef5] hover:bg-[#243140] disabled:opacity-40 disabled:hover:bg-[#16202b] transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 text-[#8fa3b8]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 rounded bg-[#16202b] border border-[#243140] text-[#e8eef5] hover:bg-[#243140] disabled:opacity-40 disabled:hover:bg-[#16202b] transition-colors flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Selected Event Forensic Drawer */}
      {selectedEvent && (
        <div className="p-5 rounded-xl bg-[#101820] border border-[#243140] space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#243140]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#3dd6c6]" />
              <h3 className="text-xs font-mono font-bold uppercase text-[#e8eef5]">
                Forensic Audit Detail: {selectedEvent.id}
              </h3>
            </div>
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-xs font-mono text-[#8fa3b8] hover:text-[#e8eef5]"
            >
              ✕ Close Detail
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8]">CLASSIFIED KIND</div>
              <div className="font-bold text-[#e8eef5] mt-0.5 uppercase">
                {selectedEvent.kind.replace(/_/g, " ")}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8]">CAMERA FEED</div>
              <div className="font-bold text-[#3dd6c6] mt-0.5">{selectedEvent.camera_id}</div>
            </div>

            <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8]">RISK ATTRIBUTION</div>
              <div className="font-bold text-[#ff5a5a] mt-0.5">
                {selectedEvent.risk_score.toFixed(2)} (
                {severityFromScore(selectedEvent.risk_score)})
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#0c141c] border border-[#243140]">
              <div className="text-[10px] text-[#8fa3b8]">GEO ZONE</div>
              <div className="font-bold text-[#e8eef5] mt-0.5">
                {selectedEvent.zone || "Sector Perimeter"}
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-[#0c141c] border border-[#243140] text-xs font-mono text-[#8fa3b8]">
            <span className="font-bold text-[#e8eef5]">Incident Narrative: </span>
            {selectedEvent.description}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => navigate("/cameras")}
              className="px-3 py-1.5 rounded bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#3dd6c6]" />
              <span>Open Camera ({selectedEvent.camera_id})</span>
            </button>

            <button
              onClick={() => navigate("/evidence")}
              className="px-3 py-1.5 rounded bg-[#16202b] hover:bg-[#243140] text-[#e8eef5] border border-[#243140] text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 text-[#5ad67a]" />
              <span>Examine Evidence Snapshot</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
