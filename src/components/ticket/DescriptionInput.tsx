"use client";

type Props = {
  value: string;
  error?: string;
  onChange: (v: string) => void;
};

export default function DescriptionInput({ value, error, onChange }: Props) {
  return (
    <div className="mb-6">
      <label className="block font-medium mb-1">Description</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border-b py-2 focus:outline-none
          ${error ? "border-red-500" : "border-gray-400"}`}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
