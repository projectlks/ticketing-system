// "use client";

// type Props = {
//   value: string;
//   error?: string;
//   visible: boolean;
//   onChange: (v: string) => void;
// };

// export default function RemarkInput({ value, error, visible, onChange }: Props) {
//   if (!visible) return null;

//   return (
//     <div className="mb-6">
//       <label className="block font-medium mb-1">Remark</label>
//       <textarea
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         className={`w-full border-b py-2 focus:outline-none
//           ${error ? "bg-red-100 border-red-500" : "border-gray-400"}`}
//         placeholder="Add remark when changing priority"
//       />
//       {error && <p className="text-red-500 text-sm">{error}</p>}
//     </div>
//   );
// }


"use client";

type Props = {
  value: string;
  error?: string;
  visible: boolean;
  onChange: (v: string) => void;
};

export default function RemarkInput({
  value,
  error,
  visible,
  onChange,
}: Props) {
  if (!visible) return null;

  return (
    <div className="mt-4">
      <label className="block font-medium mb-1">
        Remark <span className="text-red-500">*</span>
      </label>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full resize-none bg-transparent outline-none border-b
                   border-gray-300 focus:border-gray-600"
        placeholder="Explain why you changed the priority"
      />

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
