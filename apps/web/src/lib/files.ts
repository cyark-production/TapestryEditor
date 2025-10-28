const sizeCache = new Map<string, string>();

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(2)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(3)} MB`;
}

export async function fetchFileSize(url: string): Promise<string | null> {
  if (sizeCache.has(url)) return sizeCache.get(url)!;
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    const len = resp.headers.get('content-length');
    if (len) {
      const formatted = formatBytes(Number(len));
      sizeCache.set(url, formatted);
      return formatted;
    }
  } catch {
    // ignore
  }
  return null;
}

export function filenameFromUrl(url?: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const last = u.pathname.split('/').pop();
    return last || url;
  } catch {
    return url;
  }
}

import { useEffect, useState } from "react";
export function useFileSize(url?: string | null): string | null {
  const [size, setSize] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    if (!url) { setSize(null); return; }
    fetchFileSize(url).then((s) => { if (mounted) setSize(s); });
    return () => { mounted = false; };
  }, [url]);
  return size;
}


