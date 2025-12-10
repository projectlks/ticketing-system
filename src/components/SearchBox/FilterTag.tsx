// components/SearchBox/FilterTag.tsx

import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface FilterTagProps {
  label: string;
  options: string[];
  onRemove: () => void;
  icon?: React.ReactNode;
}

const FilterTag: React.FC<FilterTagProps> = ({ label, options, onRemove, icon }) => (
  <span className="bg-gray-100 text-gray-900 text-xs px-2 py-1 rounded-full flex items-center gap-1">
    {icon && <span>{icon}</span>}
    <span className="font-semibold">{label}:</span>

    {options.map((opt, idx) => (
      <React.Fragment key={opt}>
        <span>{opt}</span>
        {idx < options.length - 1 && (
          <span className="text-gray-500 italic font-bold"> or </span>
        )}
      </React.Fragment>
    ))}

    <XMarkIcon
      onClick={onRemove}
      className="w-4 h-4 cursor-pointer text-red-500 ml-2"
    />
  </span>
);

export default FilterTag;
