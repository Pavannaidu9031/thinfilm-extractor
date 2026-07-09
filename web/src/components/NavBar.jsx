import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const Logo = () => (
  <svg className="h-8 w-8 text-prussian" viewBox="0 0 32 32" fill="none">
    {/* stacked thin-film layers on a substrate rule */}
    <line x1="3" y1="28.5" x2="29" y2="28.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="5" y="21" width="22" height="5" rx="1" fill="currentColor" opacity="0.9" />
    <rect x="8" y="14.5" width="16" height="4.5" rx="1" fill="currentColor" opacity="0.55" />
    <rect x="11" y="8.5" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.28" />
  </svg>
);

const LINKS = [
  ["/library", "Library"],
  ["/upload", "Upload"],
  ["/templates", "Templates"],
  ["/about", "About"],
];

const linkClass = ({ isActive }) =>
  `relative rounded-[3px] px-2.5 py-1.5 text-sm font-medium transition-colors duration-200
   ${
     isActive
       ? "text-prussian after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-prussian"
       : "text-graphite/60 hover:text-graphite"
   }`;

function AccountArea() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  if (loading) return null;
  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="ml-1 rounded-[3px] border border-prussian/40 px-2.5 py-1.5 text-sm
          font-medium text-prussian transition-colors duration-200 hover:bg-wash/50"
      >
        Sign in
      </button>
    );
  }
  return (
    <div className="ml-1.5 flex items-center gap-2 border-l border-gridline pl-1.5 sm:pl-2.5">
      <span
        className="hidden max-w-[13rem] truncate font-mono text-[11px] text-graphite/55 sm:inline"
        title={user.email}
      >
        {user.email}
      </span>
      <button
        onClick={signOut}
        className="rounded-[3px] px-2.5 py-1.5 text-sm font-medium text-graphite/60
          transition-colors duration-200 hover:text-prussian"
      >
        Sign out
      </button>
    </div>
  );
}

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-gridline bg-notebook/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/library" className="flex items-center gap-2.5">
          <Logo />
          <div className="leading-none">
            <span className="font-display text-xl font-semibold tracking-tight text-graphite">
              Rock AI
            </span>
            <span className="ml-2 hidden font-mono text-[9px] uppercase tracking-[0.16em] text-graphite/45 sm:inline">
              lab-research extraction
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1.5">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={linkClass}>
              {label}
            </NavLink>
          ))}
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="rounded-[3px] px-2.5 py-1.5 text-sm font-medium text-graphite/60 transition-colors duration-200 hover:text-prussian"
          >
            API docs <span className="text-[11px]">↗</span>
          </a>
          <AccountArea />
        </nav>
      </div>
    </header>
  );
}
