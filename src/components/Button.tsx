import React from "react";

interface ButtonProps {
  buttonLabel: React.ReactNode; // changed from string to ReactNode
  click?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export default function Button({
  buttonLabel,
  click,
  disabled,
  type = "button",
}: ButtonProps) {
  return (
    <button
      onClick={click}
      type={type}
      className={`rounded h-[33px] text-sm px-2.5 text-gray-100 cursor-pointer bg-main hover:bg-mainHover shadow-md flex items-center space-x-1 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      disabled={disabled}>
      {buttonLabel}
    </button>
  );
}
