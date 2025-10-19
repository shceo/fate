import React from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  confirmTone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const confirmClasses = ["btn"];
  if (confirmTone === "primary") {
    confirmClasses.push("primary");
  } else if (confirmTone === "danger") {
    confirmClasses.push("danger");
  }

  const showCancel = cancelLabel !== null && cancelLabel !== false;

  const renderMessage = () => {
    if (!message) return null;
    if (typeof message === "string") {
      return (
        <p className="text-muted mt-2 whitespace-pre-line leading-relaxed">
          {message}
        </p>
      );
    }
    return <div className="mt-2">{message}</div>;
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        {title && <h3 className="font-serif text-[1.4rem]">{title}</h3>}
        {renderMessage()}
        <div className="flex justify-end gap-2 mt-4">
          {showCancel && (
            <button
              type="button"
              className="btn"
              onClick={onCancel}
              disabled={busy}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={confirmClasses.join(" ")}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

