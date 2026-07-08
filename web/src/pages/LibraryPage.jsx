import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { downloadBulkExcel } from "../api.js";
import { useLibrary } from "../LibraryContext.jsx";
import PaperCard from "../components/PaperCard.jsx";
import PapersTable from "../components/PapersTable.jsx";
import SamplesView from "../components/SamplesView.jsx";

const VIEWS = [
  ["cards", "Cards"],
  ["table", "Papers"],
  ["samples", "Samples"],
];

export default function LibraryPage() {
  const {
    records,
    templateMap,
    loading,
    loadError,
    duplicateNames,
    notify,
    load,
    onDelete,
  } = useLibrary();

  const [view, setView] = useState("cards");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState(false);

  const visibleRecords = useMemo(
    () =>
      templateFilter === "all"
        ? records
        : records.filter((r) => (r.template || "unknown") === templateFilter),
    [records, templateFilter]
  );

  const usedTemplates = useMemo(
    () => [...new Set(records.map((r) => r.template || "unknown"))],
    [records]
  );

  const stats = useMemo(() => {
    const samples = visibleRecords.flatMap((r) => r.data.samples || []);
    const years = visibleRecords.map((r) => r.data.paper?.year).filter(Boolean);
    return [
      ["Papers", visibleRecords.length],
      ["Records", samples.length],
      ["Templates used", new Set(visibleRecords.map((r) => r.template || "unknown")).size],
      ["Year span", years.length ? `${Math.min(...years)}–${Math.max(...years)}` : "—"],
    ];
  }, [visibleRecords]);

  const bulkExport = async () => {
    setBulkBusy(true);
    setBulkError(false);
    try {
      await downloadBulkExcel();
      notify("Comparison workbook downloaded");
    } catch {
      setBulkError(true);
      setTimeout(() => setBulkError(false), 2500);
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      {/* readout row */}
      {!loading && !loadError && records.length > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([label, value], i) => (
            <div
              key={label}
              className="lift rise-in mm-grid rounded-md border border-gridline bg-white px-4 py-3 shadow-sm hover:border-prussian/30"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-graphite/50">
                {label}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-prussian">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-xl font-semibold text-graphite">Paper library</h1>

        {usedTemplates.length > 1 && (
          <select
            value={templateFilter}
            onChange={(e) => setTemplateFilter(e.target.value)}
            className="rounded-[3px] border border-gridline bg-white px-3 py-1.5 font-mono text-[11px]
              text-graphite shadow-sm transition-all duration-200 focus:border-prussian
              focus:outline-none focus:ring-2 focus:ring-prussian/15"
            title="Filter by template"
          >
            <option value="all">All templates</option>
            {usedTemplates.map((name) => (
              <option key={name} value={name}>
                {templateMap[name]?.display_name || name}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto flex rounded-[3px] border border-gridline bg-white p-0.5 shadow-sm">
          {VIEWS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-[2px] px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95
                ${view === key ? "bg-prussian text-white shadow-sm" : "text-graphite/55 hover:text-graphite"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={bulkExport}
          disabled={bulkBusy || records.length === 0}
          className={`inline-flex items-center gap-2 rounded-[3px] border px-3.5 py-2 text-xs font-semibold
            shadow-sm transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50
            ${
              bulkError
                ? "border-furnace/50 bg-furnace-wash text-furnace-ink"
                : "border-prussian bg-white text-prussian hover:bg-prussian hover:text-white"
            }`}
        >
          {bulkBusy ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.6L6.3 8.4a.75.75 0 10-1.02 1.1l4.2 3.9c.29.27.73.27 1.02 0l4.2-3.9a.75.75 0 10-1.02-1.1l-2.93 2.94v-8.6z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
          )}
          {bulkError ? "Failed" : "Export all (Excel)"}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-md border border-gridline bg-white"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      )}

      {loadError && (
        <div className="rounded-md border border-furnace/40 bg-furnace-wash px-5 py-4 text-sm text-furnace-ink">
          Couldn't load the paper library: {loadError}
          <button
            onClick={load}
            className="ml-3 rounded-[3px] border border-furnace/50 bg-white px-2.5 py-1 text-xs font-semibold
              transition-all duration-200 hover:bg-furnace hover:text-white active:scale-95"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !loadError && records.length === 0 && (
        <p className="rounded-md border border-gridline bg-white px-5 py-10 text-center font-mono text-xs text-graphite/45">
          No papers yet —{" "}
          <Link to="/upload" className="text-prussian underline underline-offset-2">
            drop your first PDF
          </Link>
          .
        </p>
      )}

      {!loading && !loadError && records.length > 0 && (
        <div key={`${view}-${templateFilter}`} className="rise-in">
          {view === "cards" && (
            <div className="space-y-3">
              {visibleRecords.map((record, i) => (
                <div key={record.id} className="rise-in" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <PaperCard
                    record={record}
                    templateMap={templateMap}
                    isDuplicate={duplicateNames.has(record.filename)}
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          )}
          {view === "table" && (
            <PapersTable
              records={visibleRecords}
              templateMap={templateMap}
              duplicateNames={duplicateNames}
              onDelete={onDelete}
            />
          )}
          {view === "samples" && (
            <SamplesView records={visibleRecords} templateMap={templateMap} />
          )}
        </div>
      )}
    </div>
  );
}
