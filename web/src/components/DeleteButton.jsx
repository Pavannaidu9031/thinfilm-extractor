import { useEffect, useRef, useState } from "react";

/** Two-step delete: first click arms it ("Delete?"), second click confirms.
    Disarms itself after 3 s so a stray click can't destroy anything. */
export default function DeleteButton({ onConfirm, compact = false }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const click = async (event) => {
    event.stopPropagation();
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 3000);
      return;
    }
    clearTimeout(timer.current);
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setArmed(false);
    }
  };

  return (
    <button
      onClick={click}
      disabled={busy}
      title={armed ? "Click again to permanently delete" : "Delete this extraction"}
      className={`inline-flex items-center gap-1.5 rounded-[3px] border font-medium
        transition-all duration-200 active:scale-95 disabled:cursor-wait
        ${compact ? "px-2 py-1 text-[11px]" : "px-2.5 py-1.5 text-xs"}
        ${
          armed
            ? "border-furnace bg-furnace text-white hover:bg-furnace-ink"
            : "border-gridline bg-white text-graphite/45 hover:border-furnace hover:bg-furnace-wash hover:text-furnace-ink"
        }`}
    >
      {busy ? (
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.75 1a2.75 2.75 0 00-2.75 2.75V4H3.5a.75.75 0 000 1.5h.443l.795 11.13A2.75 2.75 0 007.48 19.2h5.04a2.75 2.75 0 002.742-2.57L16.057 5.5h.443a.75.75 0 000-1.5h-2.5v-.25A2.75 2.75 0 0011.25 1h-2.5zM10 6.75a.75.75 0 01.75.75v7a.75.75 0 01-1.5 0v-7a.75.75 0 01.75-.75zm-3.25.82a.75.75 0 011.5-.07l.3 7a.75.75 0 01-1.5.07l-.3-7zm7.24-.07a.75.75 0 00-1.5.07l-.3 7a.75.75 0 001.5.07l.3-7zM8.75 2.5a1.25 1.25 0 00-1.25 1.25V4h5v-.25a1.25 1.25 0 00-1.25-1.25h-2.5z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {armed && !busy ? "Delete?" : null}
    </button>
  );
}
