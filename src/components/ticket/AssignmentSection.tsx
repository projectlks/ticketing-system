"use client";

import { ChevronUpDownIcon } from "@heroicons/react/24/outline";

type Props = {
  departmentId: string;
  categoryId: string;
  assignedToId: string;
  depts: { id: string; name: string }[];
  cats: { id: string; name: string; departmentId: string }[];
  users: { id: string; name: string; email: string; departmentId: string }[];
  errors: Record<string, string | undefined>;
  onChange: (name: string, value: string) => void;
};

type SelectFieldProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  placeholder: string;
};

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled = false,
  error,
  placeholder,
}: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700">{label}</label>

      {/* Select element ပေါ်မှာ icon ကို absolute ထည့်ထားပြီး pointer-events-none သတ်မှတ်ထားလို့
          ဘယ်နေရာနှိပ်နှိပ် native select dropdown ပဲဖွင့်သွားစေပါတယ်။ */}
      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full appearance-none rounded-xl border bg-white px-3 pr-10 text-sm outline-none transition ${
            disabled
              ? "cursor-not-allowed border-zinc-200 text-zinc-400"
              : error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-zinc-200 text-zinc-900 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200"
          }`}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronUpDownIcon
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AssignmentSection({
  departmentId,
  categoryId,
  assignedToId,
  depts,
  cats,
  users,
  errors,
  onChange,
}: Props) {
  const filteredCategories = cats.filter(
    (category) => category.departmentId === departmentId,
  );
  const filteredUsers = users.filter((user) => user.departmentId === departmentId);

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <SelectField
        label="Department"
        value={departmentId}
        placeholder="Select department"
        options={depts.map((department) => ({
          value: department.id,
          label: department.name,
        }))}
        onChange={(value) => onChange("departmentId", value)}
        error={errors.departmentId}
      />

      <SelectField
        label="Category"
        value={categoryId}
        disabled={!departmentId}
        placeholder="Select category"
        options={filteredCategories.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        onChange={(value) => onChange("categoryId", value)}
        error={errors.categoryId}
      />

      <SelectField
        label="Assign To"
        value={assignedToId}
        disabled={!departmentId}
        placeholder="Select user"
        options={filteredUsers.map((user) => ({
          value: user.id,
          label: `${user.name} (${user.email})`,
        }))}
        onChange={(value) => onChange("assignedToId", value)}
      />
    </section>
  );
}
