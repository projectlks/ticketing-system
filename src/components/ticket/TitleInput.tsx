"use client";

type Props = {
  value: string;
  error?: string;
  onChange: (v: string) => void;
};

export default function TitleInput({ value, error, onChange }: Props) {
  return (
    <div className="mb-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`border-b-2 w-[75%] py-2 text-xl border-gray-300 focus:outline-none
          ${error ? "border-red-500" : "focus:border-indigo-500"}`}
        placeholder="Enter ticket title"
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
