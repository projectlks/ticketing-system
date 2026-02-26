"use client";

import type { CategoryEntity } from "../types";
import CategoryListItem from "./CategoryListItem";

type CategoryListPanelProps = {
  categories: CategoryEntity[];
  selectedCategoryId: string | null;
  isLoading: boolean;
  onSelectCategory: (category: CategoryEntity) => void;
};

export default function CategoryListPanel({
  categories,
  selectedCategoryId,
  isLoading,
  onSelectCategory,
}: CategoryListPanelProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
          Category List
        </p>
      </div>

      {isLoading && (
        <div className="px-3 py-3 text-sm text-zinc-500">Loading categories...</div>
      )}

      {!isLoading && categories.length === 0 && (
        <div className="px-3 py-6 text-center text-sm text-zinc-500">
          No categories matched your filters.
        </div>
      )}

      {!isLoading && categories.length > 0 && (
        // List panel ကို max-height ထားလို့ item များလာလည်း
        // page layout မဖောက်ဘဲ section အတွင်းမှာပဲ scroll ဖြစ်အောင်ထိန်းထားပါတယ်။
        <div className="max-h-[70vh] divide-y divide-zinc-200 overflow-y-auto">
          {categories.map((category) => (
            <CategoryListItem
              key={category.id}
              category={category}
              isActive={selectedCategoryId === category.id}
              onSelect={() => onSelectCategory(category)}
            />
          ))}
        </div>
      )}
    </article>
  );
}
