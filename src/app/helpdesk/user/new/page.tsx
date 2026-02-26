"use client";

import {
  ArrowLeftIcon,
  ChevronUpDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import React, { useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { z } from "zod";

import { createUser } from "../action";
import { departmentNamesQueryOptions } from "../../queries/query-options";

const RoleEnum = z.enum(["ADMIN", "REQUESTER", "AGENT", "SUPER_ADMIN"]);

const UserSchema = z.object({
  name: z.string().min(5, "Name must be at least 5 letters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 letters"),
  department: z.string().min(1, "Department is required"),
  role: RoleEnum,
});

type FormType = z.infer<typeof UserSchema>;

type FormErrors = Partial<Record<keyof FormType, string>>;

const ROLE_OPTIONS: Array<FormType["role"]> = [
  "REQUESTER",
  "AGENT",
  "ADMIN",
  "SUPER_ADMIN",
];

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const selectClass = `${inputClass} appearance-none pr-10`;

const initialForm: FormType = {
  name: "",
  email: "",
  password: "",
  department: "",
  role: "REQUESTER",
};

export default function UserForm() {
  const [form, setForm] = useState<FormType>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const departmentsQuery = useQuery(departmentNamesQueryOptions());
  const departments = departmentsQuery.data ?? [];
  const isDepartmentLoading = departmentsQuery.isLoading;

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setServerErrorMessage(null);
  };

  const handleReset = () => {
    setForm(initialForm);
    setErrors({});
    setServerErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = UserSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormType;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setServerErrorMessage(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(result.data).forEach(([key, value]) => {
        formData.append(key, value);
      });

      await createUser(formData);

      toast.success("User created.");
      handleReset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user.";
      toast.error(message);
      setServerErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Department list ကို query cache က reuse လုပ်နိုင်လို့ user create form ပြန်ဝင်ချိန်မှာ
  // dropdown loading wait time လျော့သွားအောင် TanStack Query သုံးထားပါတယ်။
  const departmentErrorMessage = departmentsQuery.error
    ? departmentsQuery.error instanceof Error
      ? departmentsQuery.error.message
      : "Failed to load departments."
    : null;

  const mergedErrorMessage = serverErrorMessage ?? departmentErrorMessage;

  return (
    <section className="min-h-screen bg-zinc-50 text-zinc-900">
      <ToastContainer position="top-right" autoClose={2500} />

      <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-4 sm:px-6 sm:py-5">
        <header className="rounded-2xl border border-zinc-200 bg-[radial-gradient(circle_at_12%_10%,#f5f5f5_0%,#ffffff_52%)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
                User Workbench
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                Create User
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                Add a new teammate with role and department mapping.
              </p>
            </div>

            <Link
              href="/helpdesk/user"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to Users
            </Link>
          </div>

          {/* Header chip တွေက create flow မှာလိုအပ်တဲ့ field map ကိုကြိုပြထားလို့
              form ဖောင့်အောက်ထိ scroll မလုပ်ခင် user expectation ကိုတိတိကျကျပေးနိုင်ပါတယ်။ */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
              fields: name email password department role
            </span>
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-500">
              department: {isDepartmentLoading ? "loading..." : departments.length}
            </span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
        >
          {mergedErrorMessage && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{mergedErrorMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                User Name
              </span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Enter full name"
                autoComplete="name"
              />
              {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Email
              </span>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className={`${inputClass} ${errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="name@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Password
              </span>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className={`${inputClass} ${errors.password ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Department
              </span>
              <div className="relative">
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={`${selectClass} ${errors.department ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                  disabled={isDepartmentLoading}
                >
                  <option value="">
                    {isDepartmentLoading ? "Loading departments..." : "Select Department"}
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
              {errors.department && (
                <p className="text-xs text-red-600">{errors.department}</p>
              )}
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Role
              </span>
              <div className="relative">
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={`${selectClass} ${errors.role ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <ChevronUpDownIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                />
              </div>
              {errors.role && <p className="text-xs text-red-600">{errors.role}</p>}
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Password is hashed on save and never stored as plain text.
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
