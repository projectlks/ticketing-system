import React from "react";

type Tag = { tag: string; value: string };

export const Tags: React.FC<{ tags: Tag[] }> = ({ tags }) => {
  if (!tags.length) {
    return <span className="text-sm text-zinc-400">-</span>;
  }

  // Tag တွေများတဲ့ row မှာ width မပေါက်သွားအောင် first two ကိုပဲပြပြီး
  // ကျန်တာကို lightweight hover summary နဲ့ ပြန်ဖော်ထားပါတယ်။
  const visibleTags = tags.slice(0, 2);
  const hiddenTags = tags.slice(2);
  const tooltipTags = tags;

  return (
    <div className="flex max-w-full items-center gap-1.5 overflow-visible whitespace-nowrap">
      {visibleTags.map((tag, index) => (
        <span
          key={`${tag.tag}-${tag.value}-${index}`}
          className="inline-flex max-w-[170px] shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
          <span className="max-w-[70px] truncate font-medium">{tag.tag}</span>
          <span className="text-zinc-400">:</span>
          <span className="max-w-[80px] truncate">{tag.value}</span>
        </span>
      ))}

      {hiddenTags.length > 0 && (
        <span className="group relative inline-flex shrink-0 cursor-default items-center rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] text-zinc-600">
          +{hiddenTags.length}
          <span className="absolute right-0 top-[calc(100%+6px)] z-20 hidden w-[280px] max-w-[360px] rounded-lg border border-zinc-200 bg-white p-2 shadow-lg group-hover:block">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
              All Tags
            </span>
            <span className="flex max-h-40 flex-wrap gap-1 overflow-y-auto pb-0.5">
              {tooltipTags.map((tag, index) => (
                <span
                  key={`${tag.tag}-${tag.value}-extra-${index}`}
                  className="inline-flex max-w-[170px] items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
                  <span className="max-w-[70px] truncate font-medium">{tag.tag}</span>
                  <span className="text-zinc-400">:</span>
                  <span className="max-w-[110px] truncate">{tag.value}</span>
                </span>
              ))}
            </span>
          </span>
        </span>
      )}
    </div>
  );
};
