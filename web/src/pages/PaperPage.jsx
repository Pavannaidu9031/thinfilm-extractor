import { Link, useNavigate, useParams } from "react-router-dom";
import { useLibrary } from "../LibraryContext.jsx";
import { dash, fieldsForRecord, recordLabel, templateDisplayName } from "../fields.js";
import DeleteButton from "../components/DeleteButton.jsx";
import ExportButtons from "../components/ExportButtons.jsx";

const BackLink = () => (
  <Link
    to="/library"
    className="inline-flex items-center gap-1 font-mono text-[11px] text-graphite/55 transition-colors duration-200 hover:text-prussian"
  >
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M12.8 5.2a.75.75 0 010 1.06L9.06 10l3.74 3.74a.75.75 0 11-1.06 1.06l-4.27-4.27a.75.75 0 010-1.06l4.27-4.27a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
    Back to library
  </Link>
);

export default function PaperPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { records, templateMap, loading, onDelete } = useLibrary();

  const record = records.find((r) => String(r.id) === String(id));

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="h-40 animate-pulse rounded-md border border-gridline bg-white" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <p className="font-display text-2xl text-graphite">Extraction Nº {id} not found</p>
        <p className="mt-2 font-mono text-xs text-graphite/55">
          It may have been deleted.
        </p>
        <Link
          to="/library"
          className="mt-5 inline-block rounded-[3px] border border-prussian bg-white px-4 py-2 text-sm font-semibold text-prussian transition-all duration-200 hover:bg-prussian hover:text-white"
        >
          Back to library
        </Link>
      </div>
    );
  }

  const { data } = record;
  const paper = data.paper || {};
  const fields = fieldsForRecord(record, templateMap);
  const label = recordLabel(record, templateMap);
  const samples = data.samples || [];

  const handleDelete = async () => {
    const ok = await onDelete(record);
    if (ok) navigate("/library");
  };

  return (
    <div className="rise-in">
      <div className="mb-4">
        <BackLink />
      </div>

      {/* header */}
      <div className="rounded-md border border-gridline bg-white shadow-sm">
        <div className="flex flex-wrap items-start gap-4 border-b border-gridline px-5 py-5">
          <div className="min-w-0 flex-1 basis-72">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs font-semibold tabular-nums text-prussian">
                Nº {record.id}
              </span>
              <span className="rounded-[2px] border border-prussian/45 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-prussian">
                {templateDisplayName(record, templateMap)}
              </span>
            </div>
            <h1 className="font-display text-2xl font-semibold leading-snug text-graphite">
              {paper.title || record.filename}
            </h1>
            {(paper.authors || []).length > 0 && (
              <p className="mt-2 text-sm text-graphite/70">{paper.authors.join(", ")}</p>
            )}
            <p className="mt-2 font-mono text-[11px] text-graphite/55">
              {[
                record.filename,
                paper.journal,
                paper.year,
                paper.doi ? `DOI: ${paper.doi}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-1 font-mono text-[10px] text-graphite/40">
              Extracted {record.created_at} · {samples.length} {label}
              {samples.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ExportButtons id={record.id} sourceName={record.filename} />
            <DeleteButton onConfirm={handleDelete} />
          </div>
        </div>

        {/* samples data sheet */}
        <div className="px-5 py-5">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite/50">
            Extracted {label}s
          </h2>
          <div className="overflow-x-auto rounded-[3px] border border-gridline">
            <table className="w-full min-w-[900px] text-xs">
              <thead>
                <tr className="border-b-2 border-gridline text-left">
                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-prussian">#</th>
                  {fields.map((f) => (
                    <th key={f.name} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-prussian">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {samples.map((sample, i) => (
                  <tr key={i} className="border-t border-gridline/60 transition-colors hover:bg-wash/50">
                    <td className="px-3 py-2 font-mono text-graphite/40">{i + 1}</td>
                    {fields.map((f) => (
                      <td key={f.name} className="px-3 py-2 font-mono tabular-nums text-graphite">
                        {dash(sample[f.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {samples.some((x) => (x.other_properties || []).length > 0) && (
            <div className="mt-5">
              <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite/50">
                Other measured properties
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {samples.map((sample, i) =>
                  (sample.other_properties || []).length > 0 ? (
                    <div key={i} className="rounded-[3px] border border-gridline bg-notebook/50 p-3">
                      <p className="mb-1.5 font-mono text-[11px] font-semibold text-prussian">
                        {label.charAt(0).toUpperCase() + label.slice(1)} {i + 1}
                        {fields[0] && sample[fields[0].name] ? ` — ${sample[fields[0].name]}` : ""}
                      </p>
                      <ul className="space-y-1">
                        {sample.other_properties.map((prop, j) => (
                          <li key={j} className="text-[11px] leading-relaxed text-graphite/75">
                            <span className="font-mono font-medium text-graphite">{prop.name}:</span>{" "}
                            <span className="font-mono">{prop.value}{prop.unit ? ` ${prop.unit}` : ""}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}

          {data.notes && (
            <div className="mt-5 rounded-[3px] border border-furnace/35 bg-furnace-wash px-4 py-3 text-xs leading-relaxed text-furnace-ink">
              <span className="font-semibold">Extraction notes: </span>
              {data.notes}
            </div>
          )}

          <details className="mt-5 group">
            <summary className="cursor-pointer select-none font-mono text-[11px] font-medium text-graphite/55 transition-colors hover:text-prussian">
              Raw JSON
            </summary>
            <pre className="mt-2 max-h-96 overflow-auto rounded-[3px] bg-prussian-deep p-4 font-mono text-[11px] leading-relaxed text-wash">
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
