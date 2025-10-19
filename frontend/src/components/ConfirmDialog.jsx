import React from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {title && <h3 className="font-serif text-[1.4rem]">{title}</h3>}
        {message && (
          <p className="text-muted mt-2 whitespace-pre-line leading-relaxed">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
