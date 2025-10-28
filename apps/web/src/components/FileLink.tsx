"use client";
import { filenameFromUrl, useFileSize } from "../lib/files";

type FileLinkProps = {
  url?: string | null;
  showIcon?: boolean;
};

export function FileLink({ url, showIcon = true }: FileLinkProps) {
  const size = useFileSize(url);
  const filename = filenameFromUrl(url);

  if (!url) {
    return <span className="legacy-muted">—</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <a 
        className="legacy-link-like file-link" 
        href={url} 
        target="_blank" 
        rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {showIcon && <span style={{ fontSize: 16 }}>📄</span>}
        <span>{filename}</span>
      </a>
      {size && (
        <span className="file-size-badge">
          {size}
        </span>
      )}
    </div>
  );
}





