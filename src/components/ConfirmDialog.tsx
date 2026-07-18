"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "削除",
  cancelLabel = "キャンセル",
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      onClose={onCancel}
      onClick={(e) => {
        // closedby="any" 未対応ブラウザ（Safari）向けの背景クリックフォールバック
        if (e.target === dialogRef.current) onCancel();
      }}
      aria-labelledby="confirm-dialog-title"
      className="m-auto rounded-xl p-0 backdrop:bg-black/40"
      style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)" }}
    >
      <div className="flex w-[min(90vw,360px)] flex-col gap-4 p-5">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h2>
        {message && (
          <p className="text-sm" style={{ color: "var(--body)" }}>
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm active:opacity-70"
            style={{ color: "var(--body)", border: "1px solid var(--hairline)" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg px-4 py-2 text-sm font-medium active:opacity-70"
            style={
              danger
                ? { background: "var(--error)", color: "#fff" }
                : { background: "var(--primary)", color: "#fff" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
