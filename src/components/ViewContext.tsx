import React from "react";

interface ViewContextProps {
  label: string;
  value: string;
  type?: "text" | "tel" | "email" | "link";
  href?: string;
  colspan?: number; // now number instead of string
}

export default function ViewContext({
  label,
  value,
  type = "text",
  href,
  colspan = 1,
}: ViewContextProps) {
  let link = href;

  if (!link) {
    if (type === "tel") link = `tel:${value}`;
    if (type === "email") link = `mailto:${value}`;
    if (type === "link") link = value;
  }

  return (
    <div
      className={`flex flex-col items-start gap-1.5`}
      style={{
        gridColumn: `span ${colspan} / span ${colspan}`,
      }}
    >
      <h3 className="text-xs tracking-wide text-muted-foreground dark:text-gray-400">{label}</h3>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {type === "text" ? (
          value
        ) : (
          <a href={link} className="hover:underline">
            {value}
          </a>
        )}
      </p>
    </div>

  );
}
