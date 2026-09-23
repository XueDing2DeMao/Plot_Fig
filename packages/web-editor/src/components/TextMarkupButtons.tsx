export function TextMarkupButtons({
  prefix,
  value,
  onChange,
}: {
  prefix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="property-grid">
      <button
        type="button"
        aria-label={`${prefix}插入下标`}
        onClick={() => onChange(value + '_{2}')}
      >
        插入下标
      </button>
      <button
        type="button"
        aria-label={`${prefix}插入上标`}
        onClick={() => onChange(value + '^{2}')}
      >
        插入上标
      </button>
    </div>
  );
}
