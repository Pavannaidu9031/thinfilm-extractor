import { useState } from "react";
import { downloadExport } from "../api.js";

const FORMATS = [
  ["xlsx", "Excel"],
  ["docx", "Word"],
  ["pdf", "PDF"],
];

const Spinner = () => (
  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
);

const Check = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 111.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z"
      clipRule="evenodd"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.6L6.3 8.4a.75.75 0 10-1.02 1.1l4.2 3.9c.29.27.73.27 1.02 0l4.2-3.9a.75.75 0 10-1.02-1.1l-2.93 2.94v-8.6z" />
    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
  </svg>
);

/** Per-paper Excel / Word / PDF download buttons with busy + done states. */
export default function ExportButtons({ id, sourceName, compact = false }) {
  const [state, setState] = useState({}); // fmt -> "busy" | "done" | "error"

  const run = async (event, fmt) => {
    event.stopPropagation();
    setState((s) => ({ ...s, [fmt]: "busy" }));
    try {
      await downloadExport(id, fmt, sourceName);
      setState((s) => ({ ...s, [fmt]: "done" }));
    } catch {
      setState((s) => ({ ...s, [fmt]: "error" }));
    }
    setTimeout(() => setState((s) => ({ ...s, [fmt]: undefined })), 1800);
  };

  return (
    <div className="flex items-center gap-1.5">
      {FORMATS.map(([fmt, label]) => {
        const status = state[fmt];
        return (
          <button
            key={fmt}
            onClick={(e) => run(e, fmt)}
            disabled={status === "busy"}
            title={`Download as ${label}`}
            className={`inline-flex items-center gap-1.5 rounded-[3px] border px-2.5 font-medium
              transition-all duration-200 active:scale-95 disabled:cursor-wait
              ${compact ? "py-1 text-[11px]" : "py-1.5 text-xs"}
              ${
                status === "error"
                  ? "border-furnace/50 bg-furnace-wash text-furnace-ink"
                  : status === "done"
                    ? "border-prussian/40 bg-wash text-prussian"
                    : "border-gridline bg-white text-graphite/70 hover:border-prussian hover:bg-wash hover:text-prussian"
              }`}
          >
            {status === "busy" ? <Spinner /> : status === "done" ? <Check /> : <DownloadIcon />}
            {status === "error" ? "Failed" : label}
          </button>
        );
      })}
    </div>
  );
}
