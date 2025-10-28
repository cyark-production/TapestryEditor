"use client";
import { useEffect } from "react";

export function ConfirmDialog({
  open,
  title = "Confirm",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel
}: {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{message}</p>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>{cancelText}</button>
          <button className="btn btn-primary" style={{ background: 'var(--danger, #dc2626)' }} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}



