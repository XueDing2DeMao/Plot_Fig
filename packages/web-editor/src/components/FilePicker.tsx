type Props = { onFile: (file: File) => void };
export function FilePicker({ onFile }: Props) {
  return (
    <>
      <label htmlFor="csv-file">选择 CSV 文件</label>
      <input
        id="csv-file"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </>
  );
}
