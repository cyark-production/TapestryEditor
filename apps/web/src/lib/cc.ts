"use client";
import { api, ensureSignedIn } from "./api";
import { toOriginBlobUrl } from "./blob";

export async function editCcWithPrompt(url: string, label = "Closed Captions") {
  await ensureSignedIn();
  const origin = toOriginBlobUrl(url);
  const { data } = await api.get("/blobs/sas", { params: { url: origin } });
  const sasUrl: string = data.sasUrl;
  const text = await fetch(sasUrl, { cache: "no-store" }).then(r => r.text());
  const edited = window.prompt(`Edit ${label}:`, text);
  if (edited == null) return false;
  const contentType = origin.toLowerCase().endsWith(".vtt") ? "text/vtt" : "text/plain";
  const resp = await fetch(sasUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    },
    body: new Blob([edited], { type: contentType })
  });
  if (!resp.ok) throw new Error(`Save failed (${resp.status})`);
  return true;
}



