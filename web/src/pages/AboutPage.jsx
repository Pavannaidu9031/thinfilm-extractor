import { useEffect, useState } from "react";
import { getUsage } from "../api.js";
import { getSessionId } from "../session.js";

export default function AboutPage() {
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    getUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite/45">
          About this tool
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-graphite">
          Rock AI
        </h1>
        <p className="mt-1.5 text-sm text-graphite/70">
          Free structured-data extraction from lab-research PDFs. Extraction runs on a
          shared server key — you don't need your own.
        </p>
      </div>

      {/* usage */}
      <div className="mb-6 rounded-md border border-gridline bg-white px-5 py-4 shadow-sm">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-graphite/50">
          Your daily usage
        </p>
        {usage ? (
          <p className="mt-1 font-mono text-lg tabular-nums text-prussian">
            {usage.used} / {usage.limit}{" "}
            <span className="text-sm text-graphite/55">
              extractions used today · resets at {usage.resets}
            </span>
          </p>
        ) : (
          <p className="mt-1 font-mono text-sm text-graphite/50">Loading…</p>
        )}
        <p className="mt-2 font-mono text-[10px] text-graphite/45">
          Session id (scopes your library on this browser):{" "}
          <span className="text-graphite/60">{getSessionId().slice(0, 8)}…</span>
        </p>
      </div>

      {/* Terms & Privacy */}
      <div id="terms">
        <h2 className="mb-2 font-display text-lg font-semibold text-graphite">
          Terms &amp; Privacy
        </h2>
        <ul className="space-y-2 rounded-md border border-gridline bg-white px-5 py-4 text-sm leading-relaxed text-graphite/80 shadow-sm">
          <li>
            <span className="font-semibold text-graphite">Temporary processing.</span> Uploaded
            PDFs are processed only to extract data; the file itself is not retained after
            extraction — only the extracted fields are stored.
          </li>
          <li>
            <span className="font-semibold text-graphite">Tied to your browser session.</span>{" "}
            Your results are scoped to a random session id kept in this browser. Clearing your
            browser storage, or opening a different browser, starts a fresh, separate library.
          </li>
          <li>
            <span className="font-semibold text-graphite">Your responsibility.</span> Only upload
            papers you have the right to analyze. You are responsible for respecting copyright and
            the terms of the publishers and sources you obtain papers from.
          </li>
        </ul>
      </div>
    </div>
  );
}
