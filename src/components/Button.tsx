import React from 'react';

interface ButtonProps {
  buttonLabel: React.ReactNode;  // changed from string to ReactNode
  click: () => void;
  disabled?: boolean;
}

export default function Button({ buttonLabel, click, disabled }: ButtonProps) {
  return (
    <button
      onClick={click}
      type="button"
      className={`rounded h-[33px] text-sm px-2.5 text-gray-100 cursor-pointer bg-indigo-500 hover:bg-indigo-600 shadow-md flex items-center space-x-1 ${disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      disabled={disabled}
    >
      {buttonLabel}
    </button>
  );
}
