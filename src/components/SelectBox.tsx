import { ChevronDownIcon } from '@heroicons/react/24/outline';
import React, { useRef } from 'react';

export interface Option {
    id: string;
    name: string;
    email?: string;  // optional, for showing extra info
}

interface SelectBoxProps {
    label: string;
    id: string;
    name: string;
    value: string;
    options: Option[];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
    disabled?: boolean;
    error?: string | null;
    placeholder?: string;
    showEmail?: boolean; // whether to show email along with name
}

export default function SelectBox({
    label,
    id,
    name,
    value,
    options,
    onChange,
    disabled = false,
    error = null,
    placeholder = 'Select an option',
    showEmail = false,
}: SelectBoxProps) {
    const selectRef = useRef<HTMLSelectElement>(null);



    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>


            <div className="relative">
                <select
                    ref={selectRef}
                    id={id}
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e)}
                    disabled={disabled}
                    className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none
          ${error ? 'border-red-600' : 'border-gray-300'}`}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {showEmail && option.email ? `${option.name} (${option.email})` : option.name}


                        </option>
                    ))}
                </select>

                <span
                    onClick={() => {
                        selectRef.current?.focus();
                        selectRef.current?.click();
                    }}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                >
                    <ChevronDownIcon className="w-5 h-5" />
                </span>
            </div>
            {error && (
                <p className="text-red-600 text-sm mt-1" role="alert" aria-live="assertive">
                    {error}
                </p>
            )}
        </div>
    );
}
