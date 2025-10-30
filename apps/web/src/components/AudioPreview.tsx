"use client";

import { useEffect, useRef, useState } from "react";

type AudioPreviewProps = {
  url?: string | null;
  width?: number;
};

export function AudioPreview({ url, width = 360 }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setOpen(false);
      setError(null);
    }
  }, [url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setOpen(false);
    const handleError = () => setError("Unable to load audio");

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!open) {
      audio.pause();
      audio.currentTime = 0;
      return;
    }

    setError(null);
    audio.currentTime = 0;
    const playPromise = audio.play();
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
        title={disabled ? "No audio available" : "Play preview"}
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
            <h3 style={{ marginTop: 0 }}>Audio Preview</h3>
            <audio
              ref={audioRef}
              src={url || undefined}
              controls
              autoPlay
              style={{ width: "100%", marginTop: 12 }}
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



