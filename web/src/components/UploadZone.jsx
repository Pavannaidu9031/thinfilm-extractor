import { useEffect, useRef, useState } from "react";
import { uploadPdf } from "../api.js";
import ProseToGrid from "./ProseToGrid.jsx";

// Post-upload stages are timed estimates (the backend gives no mid-extraction
// progress events); the bar holds at 94% until the real response arrives.
const STAGES = [
  { at: 0, until: 30, label: "Uploading PDF" },
  { at: 30, until: 55, label: "Extracting text from PDF" },
  { at: 55, until: 85, label: "Rock AI is analyzing the paper" },
  { at: 85, until: 94, label: "Validating against schema" },
];

const stageFor = (pct) =>
  [...STAGES].reverse().find((s) => pct >= s.at)?.label ?? STAGES[0].label;

/* ruled lab-form row: mono micro-label on the left, value on the right */
const FormRow = ({ label, children }) => (
  <div className="flex items-center gap-4 border-b border-gridline py-2.5 last:border-b-0">
    <span className="w-24 shrink-0 text-left font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-graphite/50">
      {label}
    </span>
    <div className="min-w-0 flex-1 text-left">{children}</div>
  </div>
);

export default function UploadZone({ templates, onExtracted }) {
  const [file, setFile] = useState(null);
  const [templateName, setTemplateName] = useState("thin_film_deposition");
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | working | done | error
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // if the default template isn't available, fall back to the first one
  useEffect(() => {
    if (templates.length && !templates.some((t) => t.name === templateName)) {
      setTemplateName(templates[0].name);
    }
  }, [templates, templateName]);

  const pick = (candidate) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      setPhase("error");
      setMessage("Only PDF files are supported.");
      return;
    }
    setFile(candidate);
    setPhase("idle");
    setMessage("");
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  };

  const extract = async () => {
    if (!file || phase === "working") return;
    setPhase("working");
    setPct(0);
    try {
      const uploadPromise = uploadPdf(
        file,
        (frac) => setPct(Math.round(frac * 30)),
        templateName
      );
      timerRef.current = setInterval(() => {
        setPct((p) => (p >= 94 ? 94 : p + (p < 55 ? 1.5 : 0.4)));
      }, 350);
      const result = await uploadPromise;
      clearInterval(timerRef.current);
      setPct(100);
      setPhase("done");
      setMessage(`Saved as extraction Nº ${result.id}`);
      onExtracted(result);
      setTimeout(() => {
        setFile(null);
        setPhase("idle");
        setPct(0);
      }, 2500);
    } catch (err) {
      clearInterval(timerRef.current);
      setPhase("error");
      setMessage(err.message);
    }
  };

  const working = phase === "working";

  return (
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-md border bg-white p-8 text-center shadow-sm transition-all duration-300
        ${
          dragging
            ? "border-prussian bg-wash shadow-md"
            : "border-gridline"
        }`}
      style={{ borderStyle: "dashed", borderWidth: "1.5px" }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {!file && (
        <div className="rise-in">
          <ProseToGrid
            className={`mx-auto mb-5 h-20 w-52 text-prussian transition-transform duration-300 ${dragging ? "scale-105" : ""}`}
          />
          <p className="font-display text-2xl text-graphite">
            {dragging ? "Drop it here" : "Drop a research paper"}
          </p>
          <p className="mt-1.5 font-mono text-xs text-graphite/55">
            PDF with a text layer · scanned papers aren't supported yet
          </p>
          <button
            onClick={() => inputRef.current?.click()}
            className="mt-5 rounded-[3px] border border-prussian/40 bg-white px-5 py-2 text-sm
              font-medium text-prussian transition-all duration-200 hover:border-prussian
              hover:bg-wash active:scale-95"
          >
            Browse files
          </button>
        </div>
      )}

      {file && (
        <div className="rise-in mx-auto max-w-xl">
          {/* specimen intake form */}
          <div className="rounded-[3px] border border-gridline bg-white px-4 py-1 text-sm">
            <FormRow label="File">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[13px] text-graphite">{file.name}</span>
                {!working && phase !== "done" && (
                  <button
                    onClick={() => {
                      setFile(null);
                      setPhase("idle");
                    }}
                    className="shrink-0 rounded-[2px] p-1 text-graphite/40 transition-colors duration-200 hover:bg-wash hover:text-furnace-ink"
                    title="Remove file"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.3 5.3a.7.7 0 00-1 1L9 10l-3.7 3.7a.7.7 0 101 1L10 11l3.7 3.7a.7.7 0 001-1L11 10l3.7-3.7a.7.7 0 00-1-1L10 9 6.3 5.3z" />
                    </svg>
                  </button>
                )}
              </div>
            </FormRow>
            <FormRow label="Size">
              <span className="font-mono text-[13px] tabular-nums text-graphite">
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
            </FormRow>
            {!working && phase !== "done" && (
              <FormRow label="Template">
                <select
                  id="template-picker"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full rounded-[3px] border border-gridline bg-white px-2.5 py-1.5
                    font-mono text-[13px] text-graphite transition-all duration-200
                    focus:border-prussian focus:outline-none focus:ring-2 focus:ring-prussian/15"
                >
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.display_name} ({t.field_count} fields)
                    </option>
                  ))}
                </select>
              </FormRow>
            )}
          </div>

          {working && (
            <div className="rise-in mt-5">
              <ProseToGrid progress={pct} className="mx-auto h-16 w-44 text-prussian" />
              <div className="mx-auto mt-3 h-px w-full max-w-md overflow-hidden bg-gridline">
                <div
                  className="progress-rule h-full bg-prussian"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mx-auto mt-2 flex max-w-md items-center justify-between font-mono text-[11px] text-graphite/60">
                <span>{stageFor(pct)}…</span>
                <span className="tabular-nums">{Math.round(pct)}%</span>
              </div>
            </div>
          )}

          {phase === "done" && (
            <p className="rise-in mt-4 font-mono text-sm font-medium text-prussian">
              ✓ {message}
            </p>
          )}

          {phase !== "done" && !working && (
            <button
              onClick={extract}
              className="mt-4 w-full rounded-[3px] bg-prussian px-4 py-2.5 text-sm font-semibold
                tracking-wide text-white shadow-sm transition-all duration-200
                hover:bg-prussian-deep hover:shadow active:scale-[0.99]"
            >
              Extract parameters
            </button>
          )}
        </div>
      )}

      {phase === "error" && (
        <p className="rise-in mt-3 font-mono text-sm font-medium text-furnace-ink">{message}</p>
      )}
    </section>
  );
}
