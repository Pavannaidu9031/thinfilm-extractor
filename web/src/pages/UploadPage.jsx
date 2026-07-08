import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getUsage } from "../api.js";
import { useLibrary } from "../LibraryContext.jsx";
import UploadZone from "../components/UploadZone.jsx";

export default function UploadPage() {
  const { templates, onExtracted } = useLibrary();
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);

  const refreshUsage = useCallback(() => {
    getUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  // add to shared state, then take the user to the new paper's page
  const handleExtracted = async (result) => {
    await onExtracted(result);
    refreshUsage();
    navigate(`/paper/${result.id}`);
  };

  const atLimit = usage && usage.remaining <= 0;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <div className="mb-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite/45">
          Specimen intake
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-graphite">
          Extract a paper
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-graphite/65">
          Choose an extraction template, then drop a research PDF. Rock AI reads the
          full text and files a structured record you can browse and export.
        </p>
      </div>

      {/* daily usage / limit banner */}
      {usage && (
        <div
          className={`mb-4 rounded-md border px-4 py-2.5 text-center font-mono text-xs
            ${
              atLimit
                ? "border-furnace/50 bg-furnace-wash text-furnace-ink"
                : "border-gridline bg-white text-graphite/70"
            }`}
        >
          {atLimit ? (
            <>Daily limit reached — resets at midnight UTC.</>
          ) : (
            <>
              {usage.remaining} of {usage.limit} extractions left today · resets at{" "}
              {usage.resets}
            </>
          )}
        </div>
      )}

      <UploadZone templates={templates} onExtracted={handleExtracted} />

      <p className="mt-5 text-center font-mono text-[11px] text-graphite/50">
        Every extraction is saved to your{" "}
        <Link to="/library" className="text-prussian underline underline-offset-2">
          Library
        </Link>
        . Need a new field set?{" "}
        <Link to="/templates" className="text-prussian underline underline-offset-2">
          Build a template
        </Link>
        .
      </p>
    </div>
  );
}
