import { useEffect, useRef, type ReactNode } from 'react';

export function WorkspaceDialog({
  title,
  description,
  className,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    return () => {
      if (typeof dialog?.close === 'function') dialog.close();
      else dialog?.removeAttribute('open');
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`workspace-dialog${className ? ` ${className}` : ''}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="workspace-dialog-head">
        <div>
          <h2>{title}</h2>
          {description && (
            <p className="workspace-dialog-description">{description}</p>
          )}
        </div>
        <button type="button" aria-label={`关闭${title}`} onClick={onClose}>
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
