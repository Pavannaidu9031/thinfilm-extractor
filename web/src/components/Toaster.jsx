import { useLibrary } from "../LibraryContext.jsx";

export default function Toaster() {
  const { toasts } = useLibrary();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-in pointer-events-auto rounded-[3px] border px-4 py-3 font-mono text-xs shadow-lg
            ${
              toast.tone === "error"
                ? "border-furnace/50 bg-furnace-wash text-furnace-ink"
                : "border-gridline bg-white text-graphite"
            }`}
        >
          {toast.tone !== "error" && <span className="mr-1.5 text-prussian">✓</span>}
          {toast.text}
        </div>
      ))}
    </div>
  );
}
