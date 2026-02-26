import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface FilterTagProps {
  label: string;
  options: string[];
  onRemove: () => void;
  icon?: React.ReactNode;
}

const FilterTag: React.FC<FilterTagProps> = ({
  label,
  options,
  onRemove,
  icon,
}) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
    {icon && <span>{icon}</span>}
    <span className="font-semibold">{label}:</span>

    {options.map((option, index) => (
      <React.Fragment key={option}>
        <span>{option}</span>
        {index < options.length - 1 && (
          <span className="font-medium text-zinc-400">or</span>
        )}
      </React.Fragment>
    ))}

    <XMarkIcon
      onClick={onRemove}
      className="ml-1 h-3.5 w-3.5 cursor-pointer text-zinc-500"
    />
  </span>
);

export default FilterTag;
