"use client";

import { ArrowLeftIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import React, { useMemo, useState } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { createDepartment } from "../action";

const DepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .max(80, "Department name must be at most 80 characters"),
  description: z
    .string()
    .trim()
    .max(300, "Description must be at most 300 characters")
    .optional(),
  email: z.string().trim().email("Invalid email address"),
  contact: z
    .string()
    .trim()
    .max(60, "Contact must be at most 60 characters")
    .optional(),
});

type FormType = z.infer<typeof DepartmentSchema>;
type FormErrors = Partial<Record<keyof FormType, string>>;

const initialForm: FormType = {
  name: "",
  description: "",
  email: "",
  contact: "",
};

const inputClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

const textareaClass =
  "min-h-[96px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200";

export default function DepartmentForm() {
  const [form, setForm] = useState<FormType>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverErrorMessage, setServerErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  const descriptionCount = useMemo(
    () => (form.description ?? "").trim().length,
    [form.description],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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

    const result = DepartmentSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormType;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    setServerErrorMessage(null);
    try {
      const formData = new FormData();
      formData.append("name", result.data.name);
      formData.append("email", result.data.email);
      formData.append("description", result.data.description ?? "");
      formData.append("contact", result.data.contact ?? "");

      await createDepartment(formData);
      toast.success("Department created.");
      handleReset();
      router.push("/helpdesk/department");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create department.";
      setServerErrorMessage(message);
      toast.error(message);
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
                Department Workbench
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                Create Department
              </h1>
              <p className="mt-1 text-xs text-zinc-500">
                Register a new queue owner for ticket routing and reporting.
              </p>
            </div>

            <Link
              href="/helpdesk/department"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to Departments
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-700">
              required: name email
            </span>
            <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-zinc-500">
              optional: description contact
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Department Name
              </span>
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className={`${inputClass} ${errors.name ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Example: Network Operations"
                autoComplete="organization"
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
                placeholder="department@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
            </label>

            <label className="space-y-1 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Description
                </span>
                <span className="text-[11px] text-zinc-500">{descriptionCount}/300</span>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className={`${textareaClass} ${errors.description ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Describe department scope and responsibilities"
                maxLength={300}
              />
              {errors.description && (
                <p className="text-xs text-red-600">{errors.description}</p>
              )}
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Contact
              </span>
              <input
                name="contact"
                type="text"
                value={form.contact}
                onChange={handleChange}
                className={`${inputClass} ${errors.contact ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                placeholder="Phone or extension"
                autoComplete="tel"
              />
              {errors.contact && <p className="text-xs text-red-600">{errors.contact}</p>}
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Department name must be unique and is used across filters, charts, and ticket forms.
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
                {submitting ? "Creating..." : "Create Department"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
