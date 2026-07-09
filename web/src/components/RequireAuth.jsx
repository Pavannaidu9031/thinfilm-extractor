import { useAuth } from "../auth.jsx";
import SignInPage from "../pages/SignInPage.jsx";

// Gate for data pages (Library, Upload, paper detail). While the session is
// resolving we show a light placeholder; signed-out users get the sign-in
// screen in place of the page content.
export default function RequireAuth({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <p className="py-16 text-center font-mono text-xs text-graphite/45">
        Checking your session…
      </p>
    );
  }
  if (!session) return <SignInPage />;
  return children;
}
