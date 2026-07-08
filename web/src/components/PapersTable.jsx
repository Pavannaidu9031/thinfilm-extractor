import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  fieldsForRecord,
  searchBlob,
  summarize,
  templateDisplayName,
} from "../fields.js";
import DeleteButton from "./DeleteButton.jsx";
import ExportButtons from "./ExportButtons.jsx";

const COLUMNS = [
  ["id", "Nº"],
  ["title", "Title"],
  ["year", "Year"],
  ["template", "Template"],
  ["keyValues", "Key values"],
  ["samples", "Records"],
];

function compare(a, b, key, dir) {
  const av = a[key];
  const bv = b[key];
  // nulls always sink to the bottom, regardless of sort direction
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  const cmp =
    typeof av === "number" && typeof bv === "number"
      ? av - bv
      : String(av).localeCompare(String(bv));
  return cmp * (dir === "asc" ? 1 : -1);
}

export default function PapersTable({ records, templateMap, duplicateNames, onDelete }) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("id");
  const [sortDir, setSortDir] = useState("desc");

  const rows = useMemo(
    () =>
      records.map((record) => {
        const fields = fieldsForRecord(record, templateMap);
        const s = summarize(record, fields);
        const keyBits = [...s.primary.slice(0, 3)];
        if (s.secondary) keyBits.push(s.secondary);
        for (const r of s.ranges) keyBits.push(`${r.label}: ${r.text}`);
        return {
          id: record.id,
          filename: record.filename,
          title: record.data.paper?.title || record.filename,
          year: record.data.paper?.year ?? null,
          template: templateDisplayName(record, templateMap),
          keyValues: keyBits.join(" · ") || null,
          samples: s.sampleCount,
          blob: searchBlob(record, templateMap),
          record,
        };
      }),
    [records, templateMap]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => !q || r.blob.includes(q));
    out.sort((a, b) => compare(a, b, sortKey, sortDir));
    return out;
  }, [rows, query, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(["title", "template", "keyValues"].includes(key) ? "asc" : "desc");
    }
  };

  return (
    <div className="rise-in">
      {/* controls */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-graphite/40"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.4l3.32 3.33a.75.75 0 11-1.06 1.06l-3.33-3.32A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, values, template…"
            className="w-72 max-w-full rounded-[3px] border border-gridline bg-white py-2 pl-8 pr-3 text-sm
              text-graphite placeholder:text-graphite/40 transition-all duration-200
              focus:border-prussian focus:outline-none focus:ring-2 focus:ring-prussian/15"
          />
        </div>

        <span className="ml-auto font-mono text-[11px] text-graphite/55">
          {visible.length} of {rows.length} papers
        </span>
      </div>

      {/* data sheet */}
      <div className="overflow-x-auto rounded-md border border-gridline bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b-2 border-gridline text-left">
              {COLUMNS.map(([key, label]) => (
                <th key={key} className="px-4 py-0 font-semibold">
                  <button
                    onClick={() => toggleSort(key)}
                    className="group inline-flex w-full items-center gap-1 py-3 text-[10px] uppercase tracking-[0.14em]
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
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-prussian">
                Export
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gridline/60 transition-colors duration-150 last:border-0 hover:bg-wash/50"
              >
                <td className="px-4 py-3 font-mono tabular-nums text-graphite/45">{row.id}</td>
                <td className="max-w-80 px-4 py-3">
                  <Link
                    to={`/paper/${row.id}`}
                    className="block truncate font-display text-[15px] text-graphite underline-offset-4 hover:text-prussian hover:underline"
                    title={row.title}
                  >
                    {row.title}
                  </Link>
                  <p className="font-mono text-[10px] text-graphite/45">
                    {row.filename}
                    {duplicateNames?.has(row.filename) && (
                      <span className="ml-1.5 rounded-[2px] border border-furnace/40 bg-furnace-wash px-1 py-px font-mono text-[9px] uppercase tracking-wide text-furnace-ink">
                        duplicate
                      </span>
                    )}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-graphite/80">{row.year ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-block max-w-44 truncate rounded-[2px] border border-prussian/45 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-prussian">
                    {row.template}
                  </span>
                </td>
                <td className="max-w-80 truncate px-4 py-3 font-mono text-xs text-graphite/75" title={row.keyValues ?? ""}>
                  {row.keyValues ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-graphite/80">{row.samples}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <ExportButtons id={row.id} sourceName={row.filename} compact />
                    <DeleteButton onConfirm={() => onDelete(row.record)} compact />
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center font-mono text-xs text-graphite/45">
                  No papers match this search / filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
