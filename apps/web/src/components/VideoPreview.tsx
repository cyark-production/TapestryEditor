"use client";

import { useEffect, useRef, useState } from "react";

type VideoPreviewProps = {
  url?: string | null;
  width?: number;
};

export function VideoPreview({ url, width = 720 }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setOpen(false);
      setError(null);
    }
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => setOpen(false);
    const handleError = () => setError("Unable to load video");

    video.addEventListener("ended", handleEnded);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!open) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    setError(null);
    video.currentTime = 0;
    const playPromise = video.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.catch(() => setError("Autoplay blocked. Use the controls to play."));
    }
  }, [open]);

  const disabled = !url;

  const close = () => {
    setOpen(false);
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        className="legacy-icon-btn"
        title={disabled ? "No video available" : "Play preview"}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
        }}
        disabled={disabled}
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        ▶
      </button>
      {open && url && (
        <div className="modal-backdrop" onClick={close}>
          <div
            className="modal-card"
            style={{ maxWidth: width, width: width, paddingBottom: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Video Preview</h3>
            <video
              ref={videoRef}
              src={url || undefined}
              controls
              autoPlay
              style={{ width: "100%", borderRadius: 8, background: "black", marginTop: 12 }}
            />
            {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={close}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



