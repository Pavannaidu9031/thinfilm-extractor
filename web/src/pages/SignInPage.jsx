import { useAuth } from "../auth.jsx";

// Multi-color Google "G" mark (inline SVG so it works offline / no CDN).
const GoogleMark = () => (
  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

export default function SignInPage() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-graphite/45">
        Sign in
      </p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-graphite">
        Rock AI
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-graphite/65">
        Sign in with Google to upload papers and keep a private library. Your
        daily extraction allowance is tied to your Google account.
      </p>

      <div className="mt-7 w-full rounded-md border border-gridline bg-white px-6 py-7 shadow-sm">
        <button
          onClick={signInWithGoogle}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-[3px]
            border border-gridline bg-white px-4 py-2.5 text-sm font-medium text-graphite
            shadow-sm transition-colors duration-200 hover:border-prussian/40 hover:bg-wash/40"
        >
          <GoogleMark />
          Sign in with Google
        </button>
        <p className="mt-4 font-mono text-[10px] leading-relaxed text-graphite/45">
          We only use your Google account to identify you and scope your library.
          Uploaded PDFs are processed temporarily; only the extracted fields are
          stored.
        </p>
      </div>
    </div>
  );
}
