"use client";

import {
  ArrowPathIcon,
  CheckIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

import type {
  CategoryFormErrors,
  CategoryFormValues,
  DepartmentOption,
} from "../types";

type CategoryFormPanelProps = {
  mode: "create" | "edit";
  form: CategoryFormValues;
  errors: CategoryFormErrors;
  departments: DepartmentOption[];
  isSubmitting: boolean;
  isDepartmentsLoading: boolean;
  onFieldChange: (field: keyof CategoryFormValues, value: string) => void;
  onReset: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const selectClass = `${inputClass} appearance-none pr-10`;

export default function CategoryFormPanel({
  mode,
  form,
  errors,
  departments,
  isSubmitting,
  isDepartmentsLoading,
  onFieldChange,
  onReset,
  onSubmit,
}: CategoryFormPanelProps) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-500">
        {mode === "edit" ? "Edit Category" : "Create Category"}
      </h2>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
            Category Name
          </span>
          <input
            name="name"
            value={form.name}
            onChange={(event) => onFieldChange("name", event.target.value)}
            placeholder="Example: Network"
            className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
            Department
          </span>
          <div className="relative">
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={(event) => onFieldChange("departmentId", event.target.value)}
              disabled={isDepartmentsLoading}
              className={`${selectClass} ${errors.departmentId ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
            >
              <option value="">
                {isDepartmentsLoading ? "Loading departments..." : "Select department"}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <ChevronUpDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            />
          </div>
          {errors.departmentId && (
            <p className="text-xs text-red-600">{errors.departmentId}</p>
          )}
        </label>

        {/* Action bar ကို sticky မလုပ်ဘဲ compact footer အဖြစ်ထားလို့
            form short ဖြစ်တဲ့ဒီ layout မှာ cursor movement နည်းစေပါတယ်။ */}
        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            type="button"
            onClick={onReset}
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckIcon className="h-4 w-4" />
            {isSubmitting
              ? mode === "edit"
                ? "Updating..."
                : "Creating..."
              : mode === "edit"
                ? "Update Category"
                : "Create Category"}
          </button>
        </div>
      </form>
    </article>
  );
}
