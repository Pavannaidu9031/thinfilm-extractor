// Template-driven field helpers. Field lists come from each record's stored
// template (fetched from the backend); nothing here is thin-film specific.

export const dash = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));

const prettify = (name) =>
  name.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const NUMERIC_TYPES = new Set(["number", "integer"]);

export const isNumericType = (type) => NUMERIC_TYPES.has(type);

/** [{name, label, type}] for a record, from its template.
    Falls back to deriving fields from the record's own data if the template
    is unknown (e.g. deleted template file). */
export function fieldsForRecord(record, templateMap) {
  const template = templateMap?.[record.template];
  if (template) {
    return template.fields.map((f) => ({
      name: f.name,
      label: f.label || prettify(f.name),
      type: f.type,
    }));
  }
  const keys = [];
  for (const sample of record.data.samples || []) {
    for (const key of Object.keys(sample)) {
      if (key !== "other_properties" && !keys.includes(key)) keys.push(key);
    }
  }
  return keys.map((k) => ({ name: k, label: prettify(k), type: "string" }));
}

export function templateDisplayName(record, templateMap) {
  return templateMap?.[record.template]?.display_name || record.template || "unknown";
}

export function recordLabel(record, templateMap) {
  return templateMap?.[record.template]?.record_label || "record";
}

const uniq = (arr) => [...new Set(arr.filter((v) => v !== null && v !== undefined && v !== ""))];

/** Quick-glance summary for cards/table, generic across templates:
    values of the primary (first) field, plus ranges of the first two numeric
    fields that carry data. */
export function summarize(record, fields) {
  const samples = record.data.samples || [];

  const primaryField = fields[0];
  const primary = primaryField ? uniq(samples.map((s) => s[primaryField.name])) : [];

  const ranges = [];
  for (const field of fields) {
    if (!isNumericType(field.type)) continue;
    const values = samples
      .map((s) => s[field.name])
      .filter((v) => typeof v === "number");
    if (!values.length) continue;
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    ranges.push({ label: field.label, text: lo === hi ? `${lo}` : `${lo}–${hi}` });
    if (ranges.length === 2) break;
  }

  // one representative secondary string value (e.g. method/solvent)
  let secondary = null;
  for (const field of fields.slice(1)) {
    if (isNumericType(field.type)) continue;
    const values = uniq(samples.map((s) => s[field.name]));
    if (values.length) {
      secondary = values[0];
      break;
    }
  }

  return { primary, secondary, ranges, sampleCount: samples.length };
}

/** Lower-cased searchable text for a record (title, filename, template, and
    every string value in its samples). */
export function searchBlob(record, templateMap) {
  const bits = [
    record.filename,
    record.template,
    templateDisplayName(record, templateMap),
    record.data.paper?.title,
    String(record.data.paper?.year ?? ""),
  ];
  for (const sample of record.data.samples || []) {
    for (const value of Object.values(sample)) {
      if (typeof value === "string") bits.push(value);
    }
  }
  return bits.filter(Boolean).join(" ").toLowerCase();
}
