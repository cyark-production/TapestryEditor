const STORAGE_HOST = 'tapestrystorage.blob.core.windows.net';

export function toOriginBlobUrl(rawUrl?: string | null): string {
  if (!rawUrl) throw new Error("No URL provided");
  const u = new URL(rawUrl);
  // Normalize to blob host if not already
  if (!u.hostname.endsWith('.blob.core.windows.net')) {
    // Handle common CDN hosts (e.g., Azure Front Door *.azurefd.net) by preserving path
    // If your CDN rewrites paths, update this logic accordingly
    u.hostname = STORAGE_HOST;
  }
  // Drop any existing query/fragment from the stored URL; SAS will provide its own
  u.search = '';
  u.hash = '';
  // Ensure we don't end with multiple slashes
  const normalized = u.toString().replace(/\/+$/, (m) => (m.length > 1 ? '/' : ''));
  return normalized;
}


