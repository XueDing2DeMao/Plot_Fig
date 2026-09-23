import { createContext, useContext, useEffect, useId, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export const PropertyNumberDraftContext = createContext<{
  texts: Record<string, string>;
  setText: (label: string, text: string, path?: string[]) => void;
  clearGeometryTexts?: () => void;
} | null>(null);

export function PropertyCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="property-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function PropertyInput({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | undefined;
}) {
  const errorId = useId();
  return (
    <label>
      {label}
      <input
        {...props}
        aria-label={props['aria-label'] ?? label}
        data-property-field={label}
        aria-describedby={
          [props['aria-describedby'], error ? errorId : '']
            .filter(Boolean)
            .join(' ') || undefined
        }
      />
      {error && (
        <span className="property-field-error" id={errorId}>
          {error}
        </span>
      )}
    </label>
  );
}

export function PropertyFill({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const empty = value === 'none' || value === '';
  const emptyLabel = `${label.replace(/颜色$|填充$/, '')}无填充`;
  const lastColor = useRef(empty ? '#ffffff' : value);
  useEffect(() => {
    if (!empty) lastColor.current = value;
  }, [empty, value]);
  return (
    <div className="property-fill">
      <PropertyInput
        label={label}
        type="color"
        disabled={empty}
        value={empty ? lastColor.current : value}
        onChange={(event) => {
          lastColor.current = event.target.value;
          onChange(event.target.value);
        }}
      />
      <PropertyCheck
        label={emptyLabel}
        checked={empty}
        onChange={(checked) => onChange(checked ? 'none' : lastColor.current)}
      />
    </div>
  );
}

export function PropertyNumber({
  label,
  value,
  onChange,
  step,
  min = 0,
  fieldPath,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number | 'any';
  min?: number | null;
  fieldPath?: string | undefined;
}) {
  const draft = useContext(PropertyNumberDraftContext);
  if (draft) {
    const text =
      draft.texts[label] ?? (Number.isNaN(value) ? '' : String(value));
    const change = (raw: string) => {
      draft.setText(label, raw, fieldPath?.split('.'));
      const parsed = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
        raw.trim(),
      )
        ? Number(raw)
        : Number.NaN;
      onChange(Number.isFinite(parsed) ? parsed : Number.NaN);
    };
    return (
      <PropertyInput
        label={label}
        type="text"
        inputMode="decimal"
        role="spinbutton"
        value={text}
        aria-valuenow={Number.isFinite(value) ? value : undefined}
        aria-valuemin={min ?? undefined}
        aria-invalid={
          Number.isNaN(value) || (min !== null && value < min) || undefined
        }
        error={
          Number.isNaN(value)
            ? '请输入完整的有效数字'
            : min !== null && value < min
              ? `请输入不小于 ${min} 的数值`
              : undefined
        }
        onChange={(event) => change(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          const direction = event.key === 'ArrowUp' ? 1 : -1;
          const next =
            (Number.isFinite(value) ? value : 0) +
            direction * (step === 'any' ? 1 : step);
          change(String(min === null ? next : Math.max(min, next)));
        }}
      />
    );
  }
  return (
    <PropertyInput
      label={label}
      type="number"
      min={min ?? undefined}
      step={step}
      value={Number.isNaN(value) ? '' : value}
      onChange={(e) => onChange(e.target.valueAsNumber)}
    />
  );
}

export function PropertySelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="property-select">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {(Object.keys(options) as T[]).map((key) => (
          <option key={key} value={key}>
            {options[key]}
          </option>
        ))}
      </select>
    </div>
  );
}
