import { useNavigate } from "react-router-dom";
import {
  fieldsForRecord,
  recordLabel,
  summarize,
  templateDisplayName,
} from "../fields.js";
import DeleteButton from "./DeleteButton.jsx";
import ExportButtons from "./ExportButtons.jsx";

/* rubber-stamp template badge */
const Stamp = ({ children }) => (
  <span className="inline-block max-w-56 truncate rounded-[2px] border border-prussian/45 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-prussian">
    {children}
  </span>
);

/* instrument-readout value chip */
const Readout = ({ children, tone = "plain" }) => (
  <span
    className={`inline-block max-w-64 truncate rounded-[2px] border px-1.5 py-0.5 font-mono text-[11px]
      ${
        tone === "ink"
          ? "border-prussian/30 bg-wash text-prussian"
          : tone === "furnace"
            ? "border-furnace/40 bg-furnace-wash text-furnace-ink"
            : "border-gridline bg-white text-graphite/80"
      }`}
  >
    {children}
  </span>
);

export default function PaperCard({ record, templateMap, isDuplicate, onDelete }) {
  const navigate = useNavigate();
  const { data } = record;
  const paper = data.paper || {};
  const fields = fieldsForRecord(record, templateMap);
  const s = summarize(record, fields);
  const label = recordLabel(record, templateMap);

  const go = () => navigate(`/paper/${record.id}`);

  return (
    <article className="lift overflow-hidden rounded-md border border-gridline bg-white shadow-sm hover:border-prussian/30 hover:shadow-md">
      <div
        role="button"
        tabIndex={0}
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        }}
        className="group flex w-full cursor-pointer items-stretch text-left transition-colors duration-200 hover:bg-wash/40"
      >
        {/* ruled margin column with the extraction number */}
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-gridline bg-notebook/60 py-4 sm:w-14">
          <span className="font-mono text-[9px] uppercase tracking-widest text-graphite/40">Nº</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-prussian">
            {record.id}
          </span>
          <svg
            className="h-3.5 w-3.5 text-graphite/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-prussian"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.2 14.8a.75.75 0 010-1.06L10.94 10 7.2 6.26a.75.75 0 111.06-1.06l4.27 4.27a.75.75 0 010 1.06L8.26 14.8a.75.75 0 01-1.06 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-start gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1 basis-64">
            <h3 className="font-display text-[17px] leading-snug text-graphite underline-offset-4 group-hover:text-prussian group-hover:underline">
              {paper.title || record.filename}
            </h3>
            <p className="mt-1 font-mono text-[11px] text-graphite/55">
              {record.filename}
              {paper.journal ? ` · ${paper.journal}` : ""}
              {paper.year ? ` · ${paper.year}` : ""}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Stamp>{templateDisplayName(record, templateMap)}</Stamp>
              {isDuplicate && <Readout tone="furnace">duplicate file</Readout>}
              {s.primary.slice(0, 3).map((v) => (
                <Readout key={v} tone="ink">{v}</Readout>
              ))}
              {s.secondary && <Readout>{s.secondary}</Readout>}
              {s.ranges.map((r) => (
                <Readout key={r.label}>{r.label}: {r.text}</Readout>
              ))}
              <Readout>{s.sampleCount} {label}{s.sampleCount === 1 ? "" : "s"}</Readout>
            </div>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex shrink-0 items-center gap-1.5 pt-0.5"
          >
            <ExportButtons id={record.id} sourceName={record.filename} compact />
            <DeleteButton onConfirm={() => onDelete(record)} compact />
          </div>
        </div>
      </div>
    </article>
  );
}
