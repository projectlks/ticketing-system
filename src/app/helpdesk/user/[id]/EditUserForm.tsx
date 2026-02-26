"use client";

import {
  ArrowLeftIcon,
  ChevronUpDownIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import type { Role } from "@/generated/prisma/client";
import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { z } from "zod";

import { updateUser } from "../action";

const RoleEnum = z.enum(["ADMIN", "REQUESTER", "AGENT", "SUPER_ADMIN"]);

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(5, "Name must be at least 5 characters"),
  email: z.string().email(),
  password: z
    .string()
    .optional()
    .refine((value) => !value || value.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
  departmentId: z.string().min(1, "Department is required"),
  role: RoleEnum,
});

type FormValues = z.infer<typeof UserSchema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

type EditUserFormProps = {
  user: {
    id: string;
    name: string;
    email: string;
    departmentId: string | null;
    role: Role;
  };
  departments: { id: string; name: string }[];
};

const ROLE_OPTIONS: Array<FormValues["role"]> = [
  "REQUESTER",
  "AGENT",
  "ADMIN",
  "SUPER_ADMIN",
];

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const selectClass = `${inputClass} appearance-none pr-10`;

export default function EditUserForm({ user, departments }: EditUserFormProps) {
  const initialForm = useMemo<FormValues>(
    () => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password: "",
      departmentId: user.departmentId ?? "",
      role: user.role,
    }),
    [user],
  );

  const [form, setForm] = useState<FormValues>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerErrorMessage(null);

    const parsed = UserSchema.safeParse(form);

    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormValues;
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();

      (Object.entries(parsed.data) as Array<[keyof FormValues, FormValues[keyof FormValues]]>)
        .forEach(([key, value]) => {
          // Password ကို edit မှာမပြောင်းချင်ရင် empty string မပို့ဘဲ skip လုပ်ပေးထားပါတယ်။
          if (key === "password" && !value) return;
          formData.append(key, String(value));
        });

      await updateUser(formData);
      toast.success("User updated.");
      setForm((previous) => ({ ...previous, password: "" }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user.";
      toast.error(message);
      setServerErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

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
                Edit User
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                Update role, department, and password policy for this account.
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

          {/* Edit context chip တွေက immutable field (email) နဲ့ target user ကိုမြင်အောင်
              header မှာတင်ပြထားလို့ form action မှားနှိပ်မှုတွေကို လျော့ချပေးပါတယ်။ */}
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
              user: {user.name}
            </span>
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
              email locked
            </span>
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
              departments: {departments.length}
            </span>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5"
        >
          {serverErrorMessage && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{serverErrorMessage}</p>
            </div>
          )}

          <input type="hidden" name="id" value={form.id} />

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
                disabled
                className="h-10 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 text-sm text-zinc-500"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                New Password
              </span>
              <input
                name="password"
                type="password"
                value={form.password ?? ""}
                onChange={handleChange}
                className={`${inputClass} ${errors.password ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Leave empty to keep current password"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password}</p>
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Department
              </span>
              <div className="relative">
                <select
                  name="departmentId"
                  value={form.departmentId}
                  onChange={handleChange}
                  className={`${selectClass} ${errors.departmentId ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                >
                  <option value="">Select Department</option>
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
              Keep password empty when you only want to update profile details.
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
                {submitting ? "Updating..." : "Update User"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
