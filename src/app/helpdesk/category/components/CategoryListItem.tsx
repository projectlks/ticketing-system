"use client";

import { PencilSquareIcon } from "@heroicons/react/24/outline";

import type { CategoryEntity } from "../types";

type CategoryListItemProps = {
  category: CategoryEntity;
  isActive: boolean;
  onSelect: () => void;
};

export default function CategoryListItem({
  category,
  isActive,
  onSelect,
}: CategoryListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full px-3 py-3 text-left transition-colors ${
        isActive ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      {/* Row button တစ်ခုလုံး clickable လုပ်ထားလို့ icon ကိုတိတိကျကျနှိပ်စရာမလိုဘဲ
          list scan လုပ်ရင်း select/edit flow ကိုမြန်မြန်သုံးနိုင်ပါတယ်။ */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-zinc-900">{category.name}</p>
          <p className="truncate text-xs text-zinc-500">{category.departmentName}</p>
        </div>

        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[11px] text-zinc-600">
          <PencilSquareIcon className="h-3.5 w-3.5" />
          Edit
        </span>
      </div>
    </button>
  );
}
