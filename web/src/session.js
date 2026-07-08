// Per-browser session id, stored only in this browser. It scopes which
// extractions the backend shows you (isolation, not authentication).

const SESSION_KEY = "rockai_session_id";

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      (crypto.randomUUID && crypto.randomUUID()) ||
      `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}
