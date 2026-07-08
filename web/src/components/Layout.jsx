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
            Papers are processed temporarily to extract data — results are tied to your browser
            session. Only upload papers you have the right to analyze (respect copyright).{" "}
            <Link to="/about#terms" className="text-prussian underline underline-offset-2">
              Terms &amp; Privacy
            </Link>
          </p>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}
