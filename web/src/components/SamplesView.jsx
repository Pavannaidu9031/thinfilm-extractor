import { useMemo, useState } from "react";
import { dash, fieldsForRecord, isNumericType } from "../fields.js";

function compareValues(av, bv, dir) {
  if (av == null && bv == null) return 0;
  if (av == null) return 1; // nulls always last
  if (bv == null) return -1;
  const cmp =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
  return cmp * (dir === "asc" ? 1 : -1);
}

/** One flat data sheet for one template's records. */
function SamplesTable({ groupName, records, templateMap, query }) {
  const [sortKey, setSortKey] = useState("paperId");
  const [sortDir, setSortDir] = useState("desc");

  const fields = fieldsForRecord(records[0], templateMap);
  const displayName =
    templateMap?.[groupName]?.display_name || groupName || "unknown";
  const recordLabel = templateMap?.[groupName]?.record_label || "record";

  const rows = useMemo(
    () =>
      records.flatMap((record) =>
        (record.data.samples || []).map((sample, i) => ({
          key: `${record.id}-${i}`,
          paperId: record.id,
          filename: record.filename,
          title: record.data.paper?.title || record.filename,
          sampleNo: i + 1,
          ...Object.fromEntries(fields.map((f) => [f.name, sample[f.name]])),
        }))
      ),
    [records, fields]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter(
      (r) =>
        !q ||
        [r.title, r.filename, ...fields.map((f) => r[f.name])]
          .filter((v) => v !== null && v !== undefined)
          .some((v) => String(v).toLowerCase().includes(q))
    );
    out.sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir));
    return out;
  }, [rows, query, sortKey, sortDir, fields]);

  const toggleSort = (key, type) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(isNumericType(type) || key === "paperId" ? "desc" : "asc");
    }
  };

  const columns = [["paperId", "Paper", "integer"], ...fields.map((f) => [f.name, f.label, f.type])];

  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <span className="inline-block rounded-[2px] border border-prussian/45 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-prussian">
          {displayName}
        </span>
        <span className="font-mono text-[11px] text-graphite/55">
          {visible.length} of {rows.length} {recordLabel}s
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border border-gridline bg-white shadow-sm">
        <table className="w-full min-w-[1000px] text-xs">
          <thead>
            <tr className="border-b-2 border-gridline text-left">
              {columns.map(([key, label, type]) => (
                <th key={key} className="px-3 py-0 font-semibold">
                  <button
                    onClick={() => toggleSort(key, type)}
                    className="group inline-flex w-full items-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.12em]
                      text-prussian transition-colors duration-200 hover:text-prussian-deep"
                  >
                    {label}
                    <span
                      className={`transition-opacity duration-200 ${
                        sortKey === key ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                      }`}
                    >
                      {sortKey === key && sortDir === "asc" ? "▲" : "▼"}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.key} className="border-b border-gridline/60 transition-colors duration-150 last:border-0 hover:bg-wash/50">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-graphite/55" title={row.title}>
                  <span className="font-semibold text-prussian">Nº {row.paperId}</span>{" "}
                  <span className="text-graphite/35">·</span> {row.filename}
                  <span className="text-graphite/35"> · s{row.sampleNo}</span>
                </td>
                {fields.map((f) => (
                  <td
                    key={f.name}
                    className={`max-w-64 truncate px-3 py-2 font-mono text-graphite ${isNumericType(f.type) ? "tabular-nums" : ""}`}
                    title={row[f.name] != null ? String(row[f.name]) : ""}
                  >
                    {dash(row[f.name])}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center font-mono text-xs text-graphite/45">
                  No {recordLabel}s match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Flat per-sample data sheets, one per template (columns differ by template). */
export default function SamplesView({ records, templateMap }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const out = new Map();
    for (const record of records) {
      const key = record.template || "unknown";
      if (!out.has(key)) out.set(key, []);
      out.get(key).push(record);
    }
    return [...out.entries()];
  }, [records]);

  return (
    <div className="rise-in">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-graphite/40" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.4l3.32 3.33a.75.75 0 11-1.06 1.06l-3.33-3.32A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all records…"
            className="w-72 max-w-full rounded-[3px] border border-gridline bg-white py-2 pl-8 pr-3 text-sm
              text-graphite placeholder:text-graphite/40 transition-all duration-200
              focus:border-prussian focus:outline-none focus:ring-2 focus:ring-prussian/15"
          />
        </div>
      </div>

      {groups.map(([name, group]) => (
        <SamplesTable
          key={name}
          groupName={name}
          records={group}
          templateMap={templateMap}
          query={query}
        />
      ))}
    </div>
  );
}
