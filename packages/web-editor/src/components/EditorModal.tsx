import { useEffect, useRef, type ReactNode } from 'react';
import './publication.css';
export function EditorModal({
  title,
  onDismiss,
  children,
  footer,
  className = '',
}: {
  title: string;
  onDismiss: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      if (d.showModal) d.showModal();
      else d.setAttribute('open', '');
    }
  }, []);
  return (
    <dialog
      ref={ref}
      className={`publication-dialog ${className}`}
      aria-label={title}
      onCancel={(e) => {
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        onDismiss();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" aria-label={'关闭' + title} onClick={onDismiss}>
          ×
        </button>
      </header>
      {children}
      <footer>
        {footer ?? (
          <button type="button" onClick={onDismiss}>
            关闭
          </button>
        )}
      </footer>
    </dialog>
  );
}
