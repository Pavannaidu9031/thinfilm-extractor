// In dev, requests go through the Vite proxy (/api -> http://localhost:8000).
// In production, set VITE_API_URL to the deployed backend origin.
import { getSessionId } from "./session.js";

const API = import.meta.env.VITE_API_URL || "/api";

function headers(extra = {}) {
  return { "X-Session-Id": getSessionId(), ...extra };
}

export async function listExtractions() {
  const res = await fetch(`${API}/extractions`, { headers: headers() });
  if (!res.ok) throw new Error(`Backend error (HTTP ${res.status})`);
  return res.json();
}

export async function getExtraction(id) {
  const res = await fetch(`${API}/extractions/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`Backend error (HTTP ${res.status})`);
  return res.json();
}

export async function listTemplates() {
  const res = await fetch(`${API}/templates`, { headers: headers() });
  if (!res.ok) throw new Error(`Backend error (HTTP ${res.status})`);
  return res.json();
}

export async function getTemplate(name) {
  const res = await fetch(`${API}/templates/${name}`, { headers: headers() });
  if (!res.ok) throw new Error(`Backend error (HTTP ${res.status})`);
  return res.json();
}

export async function createTemplate(spec) {
  const res = await fetch(`${API}/templates`, {
    method: "POST",
    headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify(spec),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.detail || `Create failed (HTTP ${res.status})`);
  }
  return body;
}

export async function deleteExtraction(id) {
  const res = await fetch(`${API}/extractions/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error(`Delete failed (HTTP ${res.status})`);
  return res.json();
}

/** Upload a PDF for a given template. onUploadProgress receives 0..1 for the
    upload leg only. Scoped to this browser's session; extraction runs on the
    server's shared Gemini key. */
export function uploadPdf(file, onUploadProgress, template) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API}/extract`);
    xhr.setRequestHeader("X-Session-Id", getSessionId());
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onUploadProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      let body = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON error body */
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
      } else {
        reject(new Error(body?.detail || `Extraction failed (HTTP ${xhr.status})`));
      }
    };
    xhr.onerror = () =>
      reject(new Error("Could not reach the backend. Check your connection / API URL."));
    const form = new FormData();
    form.append("file", file);
    if (template) form.append("template", template);
    xhr.send(form);
  });
}

async function saveResponseAsFile(res, filename) {
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadExport(id, fmt, sourceName) {
  const res = await fetch(`${API}/extractions/${id}/export/${fmt}`, { headers: headers() });
  if (!res.ok) throw new Error(`Export failed (HTTP ${res.status})`);
  const stem = sourceName.replace(/\.pdf$/i, "");
  await saveResponseAsFile(res, `${stem}_extraction.${fmt}`);
}

export async function downloadBulkExcel() {
  const res = await fetch(`${API}/extractions/export/all`, { headers: headers() });
  if (!res.ok) throw new Error(`Bulk export failed (HTTP ${res.status})`);
  await saveResponseAsFile(res, "all_extractions.xlsx");
}

export async function getUsage() {
  const res = await fetch(`${API}/usage`, { headers: headers() });
  if (!res.ok) throw new Error(`Backend error (HTTP ${res.status})`);
  return res.json();
}
