import { Link, Outlet } from "react-router-dom";
import NavBar from "./NavBar.jsx";
import Toaster from "./Toaster.jsx";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-8 sm:px-6">
        <Outlet />
      </main>
      <footer className="border-t border-gridline bg-notebook/60">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <p className="text-xs leading-relaxed text-graphite/60">
            Papers are processed temporarily to extract data — results are tied to your Google
            account. Only upload papers you have the right to analyze (respect copyright).{" "}
            <Link to="/about#terms" className="text-prussian underline underline-offset-2">
              Terms &amp; Privacy
            </Link>
          </p>
          <div className="mt-3">
            <span className="inline-flex items-center gap-2 rounded-[2px] border border-prussian/40 px-2.5 py-1 font-mono text-[13px] uppercase tracking-[0.18em] text-prussian">
              <span className="font-medium text-prussian/55">Built by</span>
              <span aria-hidden="true" className="h-3.5 w-px bg-prussian/25" />
              <span className="font-semibold tracking-[0.22em]">Pavan Kalyan</span>
            </span>
          </div>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
