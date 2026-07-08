import { useState } from "react";
import { createTemplate } from "../api.js";
import { useLibrary } from "../LibraryContext.jsx";

const FIELD_TYPES = ["string", "number", "integer", "boolean"];
const blankField = () => ({ name: "", type: "string", description: "" });

/* ---- template list (data sheet) --------------------------------------- */

function TemplateList({ templateMap }) {
  const names = Object.keys(templateMap).sort();
  return (
    <div className="space-y-4">
      {names.map((name) => {
        const t = templateMap[name];
        return (
          <div key={name} className="overflow-hidden rounded-md border border-gridline bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-gridline px-4 py-3">
              <span className="rounded-[2px] border border-prussian/45 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-prussian">
                {t.display_name || name}
              </span>
              <span className="font-mono text-[11px] text-graphite/50">{name}</span>
              <span className="ml-auto font-mono text-[11px] text-graphite/50">
                {t.fields.length} field{t.fields.length === 1 ? "" : "s"} · records: {t.record_label || "record"}
              </span>
            </div>
            {t.description && (
              <p className="border-b border-gridline/60 px-4 py-2 text-xs text-graphite/70">
                {t.description}
              </p>
            )}
            {t.fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="border-b-2 border-gridline text-left">
                      <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-prussian">Field</th>
                      <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-prussian">Type</th>
                      <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-prussian">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.fields.map((f) => (
                      <tr key={f.name} className="border-b border-gridline/60 last:border-0">
                        <td className="px-4 py-2 font-mono text-graphite">{f.name}</td>
                        <td className="px-4 py-2 font-mono text-graphite/70">{f.type}</td>
                        <td className="px-4 py-2 text-graphite/70">{f.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-3 font-mono text-[11px] text-graphite/45">
                No named fields — everything goes into other_properties.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- create form (ledger) --------------------------------------------- */

const FormRow = ({ label, children, hint }) => (
  <div className="flex flex-col gap-1 border-b border-gridline py-3 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
    <span className="w-40 shrink-0 pt-2 text-left font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-graphite/50">
      {label}
    </span>
    <div className="min-w-0 flex-1">
      {children}
      {hint && <p className="mt-1 font-mono text-[10px] text-graphite/45">{hint}</p>}
    </div>
  </div>
);

const inputCls =
  "w-full rounded-[3px] border border-gridline bg-white px-2.5 py-1.5 font-mono text-[13px] text-graphite transition-all duration-200 focus:border-prussian focus:outline-none focus:ring-2 focus:ring-prussian/15";

function CreateTemplateForm({ onCreated }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [recordLabel, setRecordLabel] = useState("record");
  const [fields, setFields] = useState([blankField()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const setField = (i, key, value) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, [key]: value } : f)));
  const addField = () => setFields((fs) => [...fs, blankField()]);
  const removeField = (i) => setFields((fs) => fs.filter((_, j) => j !== i));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const cleaned = fields
      .map((f) => ({ ...f, name: f.name.trim(), description: f.description.trim() }))
      .filter((f) => f.name);
    if (!name.trim()) {
      setError("A template name (slug) is required.");
      return;
    }
    if (cleaned.length === 0) {
      setError("Add at least one field.");
      return;
    }

    setBusy(true);
    try {
      const created = await createTemplate({
        name: name.trim(),
        display_name: displayName.trim() || undefined,
        description: description.trim() || undefined,
        record_label: recordLabel.trim() || "record",
        fields: cleaned,
      });
      // reset
      setName("");
      setDisplayName("");
      setDescription("");
      setRecordLabel("record");
      setFields([blankField()]);
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-md border border-gridline bg-white px-5 py-4 shadow-sm">
      <FormRow label="Name (slug)" hint="lowercase letters, digits, underscores — e.g. battery_cycling">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="battery_cycling"
          className={inputCls}
        />
      </FormRow>
      <FormRow label="Display name">
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Battery cycling"
          className={inputCls}
        />
      </FormRow>
      <FormRow label="Description">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this template extracts"
          className={inputCls}
        />
      </FormRow>
      <FormRow label="Record label" hint="what one extracted row is called (sample, reaction, cell…)">
        <input
          value={recordLabel}
          onChange={(e) => setRecordLabel(e.target.value)}
          placeholder="record"
          className={`${inputCls} max-w-48`}
        />
      </FormRow>

      <FormRow label="Fields">
        <div className="space-y-2">
          {/* header */}
          <div className="hidden gap-2 px-1 font-mono text-[9px] uppercase tracking-[0.14em] text-graphite/45 sm:flex">
            <span className="flex-1">Name</span>
            <span className="w-28">Type</span>
            <span className="flex-[1.4]">Description</span>
            <span className="w-7" />
          </div>
          {fields.map((f, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={f.name}
                onChange={(e) => setField(i, "name", e.target.value)}
                placeholder="field_name"
                className={`${inputCls} sm:flex-1`}
              />
              <select
                value={f.type}
                onChange={(e) => setField(i, "type", e.target.value)}
                className={`${inputCls} sm:w-28`}
              >
                {FIELD_TYPES.map((ty) => (
                  <option key={ty} value={ty}>{ty}</option>
                ))}
              </select>
              <input
                value={f.description}
                onChange={(e) => setField(i, "description", e.target.value)}
                placeholder="what it means / units"
                className={`${inputCls} sm:flex-[1.4]`}
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                disabled={fields.length === 1}
                title="Remove field"
                className="shrink-0 self-start rounded-[3px] border border-gridline bg-white p-1.5 text-graphite/40
                  transition-colors duration-200 hover:border-furnace hover:bg-furnace-wash hover:text-furnace-ink
                  disabled:cursor-not-allowed disabled:opacity-40 sm:self-auto"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.5 9.25a.75.75 0 000 1.5h11a.75.75 0 000-1.5h-11z" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addField}
            className="mt-1 rounded-[3px] border border-dashed border-gridline px-3 py-1.5 font-mono text-[11px]
              text-graphite/60 transition-colors duration-200 hover:border-prussian hover:text-prussian"
          >
            + Add field
          </button>
        </div>
      </FormRow>

      {error && (
        <p className="mt-3 rounded-[3px] border border-furnace/40 bg-furnace-wash px-3 py-2 font-mono text-[11px] text-furnace-ink">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-[3px] bg-prussian px-4 py-2 text-sm font-semibold
            text-white shadow-sm transition-all duration-200 hover:bg-prussian-deep active:scale-[0.99]
            disabled:cursor-wait disabled:opacity-70"
        >
          {busy && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          Create template
        </button>
      </div>
    </form>
  );
}

/* ---- page ------------------------------------------------------------- */

export default function TemplatesPage() {
  const { templateMap, loading, refreshTemplates, notify } = useLibrary();

  const onCreated = async (created) => {
    notify(`Created template "${created.display_name || created.name}"`);
    await refreshTemplates();
  };

  return (
    <div>
      <div className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite/45">
          Extraction schemas
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-graphite">Templates</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-graphite/65">
          A template defines the fields Rock AI extracts for a research area. Pick one at
          upload time; build new ones here without touching code.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-lg font-semibold text-graphite">Available templates</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-md border border-gridline bg-white" />
        ) : (
          <TemplateList templateMap={templateMap} />
        )}
      </section>

      <section>
        <h2 className="mb-1 font-display text-lg font-semibold text-graphite">Build a new template</h2>
        <p className="mb-3 font-mono text-[11px] text-graphite/50">
          POST /templates — paper metadata (title, authors, year, …) is always included.
        </p>
        <CreateTemplateForm onCreated={onCreated} />
      </section>
    </div>
  );
}
