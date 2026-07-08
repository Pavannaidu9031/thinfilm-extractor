/* The signature element: unstructured "text lines" resolving into a grid of
   table cells — literally what the tool does. Two modes:
   - idle (no progress prop): static motif for the upload zone
   - loading (progress 0..100): lines drain while cells fill in sequence;
     under prefers-reduced-motion the CSS falls back to static states. */

const LINES = [
  { y: 6, w: 78 },
  { y: 20, w: 62 },
  { y: 34, w: 72 },
  { y: 48, w: 50 },
  { y: 62, w: 68 },
];

const CELL_W = 27;
const CELL_H = 19;
const GRID_X = 126;
const COLS = 3;
const ROWS = 3;

export default function ProseToGrid({ progress, className = "" }) {
  const loading = progress !== undefined;
  const filledCells = loading
    ? Math.min(COLS * ROWS, Math.floor((progress / 100) * (COLS * ROWS + 1)))
    : 5; // idle: partially resolved, inviting

  return (
    <svg
      viewBox="0 0 210 84"
      className={className}
      role="img"
      aria-label="Text from a paper being resolved into structured table cells"
    >
      {/* prose lines */}
      {LINES.map((line, i) => (
        <rect
          key={i}
          x="0"
          y={line.y}
          width={line.w}
          height="6"
          rx="1.5"
          fill="currentColor"
          opacity={loading ? undefined : 0.35}
          className={loading ? "ptg-line-active" : ""}
          style={loading ? { animationDelay: `${i * 180}ms` } : undefined}
        />
      ))}

      {/* flow marks */}
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M ${94 + i * 8} 38 l 5 4 l -5 4`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity={0.35 + i * 0.18}
        />
      ))}

      {/* grid cells: header row + data rows */}
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const filled = i < filledCells;
        const header = row === 0;
        return (
          <rect
            key={i}
            x={GRID_X + col * (CELL_W + 3)}
            y={11 + row * (CELL_H + 3)}
            width={CELL_W}
            height={CELL_H}
            rx="1.5"
            fill={filled ? "currentColor" : "none"}
            fillOpacity={filled ? (header ? 0.85 : 0.22) : 0}
            stroke="currentColor"
            strokeOpacity={filled ? 0.9 : 0.3}
            strokeWidth="1"
            className={filled && loading ? "ptg-cell-filled" : ""}
            style={filled && loading ? { animationDelay: `${(i % COLS) * 90}ms` } : undefined}
          />
        );
      })}
    </svg>
  );
}
