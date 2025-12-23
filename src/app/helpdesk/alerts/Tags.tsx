import React from "react";

type Tag = { tag: string; value: string };

export const Tags: React.FC<{ tags: Tag[] }> = ({ tags }) => (
  <div className="h-full overflow-x-visible">
    <div className="flex gap-1 items-center">
      {tags.slice(0, 3).map((t, i) => (
        <span
          key={i}
          className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full"
        >
          <p>{t.tag}</p>
          <p>:</p>
          <p>{t.value}</p>
        </span>
      ))}
      {tags.length > 3 && (
        <span className="px-2 py-0.5 text-[11px] whitespace-nowrap bg-gray-200 text-gray-700 rounded-full cursor-pointer relative group">
          +{tags.length - 3} more
          <div className="absolute z-999 left-0 top-0 mt-1 w-max max-w-xs p-2 bg-white border border-gray-200 shadow-lg rounded hidden group-hover:flex flex-wrap gap-1 ">
            {tags.map((t, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[11px] flex space-x-1 bg-blue-100 text-blue-700 rounded-full"
              >
                <p>{t.tag}</p>
                <p>:</p>
                <p>{t.value}</p>
              </span>
            ))}
          </div>
        </span>
      )}
    </div>
  </div>
);
