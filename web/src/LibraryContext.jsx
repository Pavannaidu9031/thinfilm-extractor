import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  deleteExtraction,
  getExtraction,
  getTemplate,
  listExtractions,
  listTemplates,
} from "./api.js";

// Shared app state (records, templates, toasts) so every route reads the same
// data without refetching on navigation.
const LibraryContext = createContext(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within <LibraryProvider>");
  return ctx;
}

export function LibraryProvider({ children }) {
  const [records, setRecords] = useState([]);
  const [templates, setTemplates] = useState([]); // summaries for the picker/list
  const [templateMap, setTemplateMap] = useState({}); // name -> full template
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((text, tone = "ok") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [items, templateList] = await Promise.all([listExtractions(), listTemplates()]);
      const [full, fullTemplates] = await Promise.all([
        Promise.all(items.map((item) => getExtraction(item.id))),
        Promise.all(templateList.map((t) => getTemplate(t.name))),
      ]);
      setRecords(full); // backend returns newest first
      setTemplates(templateList);
      setTemplateMap(Object.fromEntries(fullTemplates.map((t) => [t.name, t])));
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshTemplates = useCallback(async () => {
    const templateList = await listTemplates();
    const fullTemplates = await Promise.all(templateList.map((t) => getTemplate(t.name)));
    setTemplates(templateList);
    setTemplateMap(Object.fromEntries(fullTemplates.map((t) => [t.name, t])));
    return templateList;
  }, []);

  const onExtracted = useCallback(async (result) => {
    try {
      const record = await getExtraction(result.id);
      setRecords((prev) => [record, ...prev.filter((r) => r.id !== record.id)]);
    } catch {
      setRecords((prev) => [{ ...result, created_at: new Date().toISOString() }, ...prev]);
    }
  }, []);

  const onDelete = useCallback(
    async (record) => {
      try {
        await deleteExtraction(record.id);
        setRecords((prev) => prev.filter((r) => r.id !== record.id));
        notify(`Deleted Nº ${record.id} — ${record.filename}`);
        return true;
      } catch (err) {
        notify(err.message, "error");
        return false;
      }
    },
    [notify]
  );

  const duplicateNames = useMemo(() => {
    const counts = {};
    for (const r of records) counts[r.filename] = (counts[r.filename] || 0) + 1;
    return new Set(Object.keys(counts).filter((name) => counts[name] > 1));
  }, [records]);

  const value = {
    records,
    templates,
    templateMap,
    loading,
    loadError,
    duplicateNames,
    toasts,
    notify,
    load,
    refreshTemplates,
    onExtracted,
    onDelete,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}
