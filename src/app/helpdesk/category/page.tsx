"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { createCategory, updateCategory } from "./action";
import CategoryFormPanel from "./components/CategoryFormPanel";
import CategoryListPanel from "./components/CategoryListPanel";
import CategoryToolbar from "./components/CategoryToolbar";
import {
  CategoryFormSchema,
  type CategoryEntity,
  type CategoryFormErrors,
  type CategoryFormValues,
} from "./types";
import {
  categoriesQueryOptions,
  departmentNamesQueryOptions,
  helpdeskQueryKeys,
} from "../queries/query-options";

const initialFormValues: CategoryFormValues = {
  name: "",
  departmentId: "",
};

export default function CategoryPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryFormValues>(initialFormValues);
  const [errors, setErrors] = useState<CategoryFormErrors>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(
    null,
  );

  const categoriesQuery = useQuery(categoriesQueryOptions());
  const departmentsQuery = useQuery(departmentNamesQueryOptions());

  const categories = useMemo(
    () => ((categoriesQuery.data ?? []) as CategoryEntity[]),
    [categoriesQuery.data],
  );
  const departments = useMemo(
    () => departmentsQuery.data ?? [],
    [departmentsQuery.data],
  );
  const isLoading = categoriesQuery.isLoading || departmentsQuery.isLoading;
  const isRefreshing = categoriesQuery.isFetching || departmentsQuery.isFetching;

  const queryError = categoriesQuery.error ?? departmentsQuery.error;
  const queryErrorMessage = queryError
    ? queryError instanceof Error
      ? queryError.message
      : "Failed to load categories."
    : null;

  const errorMessage = localErrorMessage ?? queryErrorMessage;

  const lastUpdatedEpoch = Math.max(
    categoriesQuery.dataUpdatedAt,
    departmentsQuery.dataUpdatedAt,
  );
  const lastUpdatedAt = lastUpdatedEpoch
    ? new Date(lastUpdatedEpoch).toLocaleString()
    : "";

  const createCategoryMutation = useMutation({
    mutationFn: createCategory,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string;
      payload: CategoryFormValues;
    }) => updateCategory(categoryId, payload),
  });

  const filteredCategories = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(keyword) ||
        category.departmentName.toLowerCase().includes(keyword)
      );
    });
  }, [categories, searchQuery]);

  const activeCategory = useMemo(
    () =>
      categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  const handleStartCreate = () => {
    setSelectedCategoryId(null);
    setForm(initialFormValues);
    setErrors({});
    setLocalErrorMessage(null);
  };

  const handleFieldChange = (field: keyof CategoryFormValues, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: "" }));
    setLocalErrorMessage(null);
  };

  const handleSelectCategory = (category: CategoryEntity) => {
    setSelectedCategoryId(category.id);
    setForm({
      name: category.name,
      departmentId: category.departmentId,
    });
    setErrors({});
    setLocalErrorMessage(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = CategoryFormSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: CategoryFormErrors = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof CategoryFormValues;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setLocalErrorMessage(null);

      if (selectedCategoryId) {
        await updateCategoryMutation.mutateAsync({
          categoryId: selectedCategoryId,
          payload: parsed.data,
        });
        toast.success("Category updated.");
      } else {
        await createCategoryMutation.mutateAsync(parsed.data);
        toast.success("Category created.");
      }

      // Mutation ပြီးချိန်မှာ list cache ကို invalidate ပြန်လုပ်ပြီး newest data ကို fetch ချက်ချင်းယူထားမှ
      // create/update mode switching လုပ်တဲ့ UI state က stale မဖြစ်ဘဲတိတိကျကျနေပါမယ်။
      await queryClient.invalidateQueries({
        queryKey: helpdeskQueryKeys.categories,
      });
      const latestCategories = await queryClient.fetchQuery(categoriesQueryOptions());

      if (selectedCategoryId) {
        const editedCategory = latestCategories.find(
          (category) => category.id === selectedCategoryId,
        );

        if (editedCategory) {
          setForm({
            name: editedCategory.name,
            departmentId: editedCategory.departmentId,
          });
        }
      } else {
        setForm(initialFormValues);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save category.";
      setLocalErrorMessage(message);
      toast.error(message);
    }
  };

  const submitPending =
    createCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <section className="min-h-screen bg-zinc-50 text-zinc-900">
      <ToastContainer position="top-right" autoClose={2500} />

      <CategoryToolbar
        searchQuery={searchQuery}
        totalCount={categories.length}
        visibleCount={filteredCategories.length}
        activeCategoryName={activeCategory?.name ?? null}
        isLoading={isLoading}
        lastUpdatedAt={lastUpdatedAt}
        onSearchChange={setSearchQuery}
        onStartCreate={handleStartCreate}
      />

      <main className="mx-auto w-full max-w-7xl space-y-3 px-4 py-4 sm:px-6 sm:py-5">
        {isRefreshing && !isLoading && (
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500">
            Syncing latest category data...
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <section className="grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
          <CategoryListPanel
            categories={filteredCategories}
            selectedCategoryId={selectedCategoryId}
            isLoading={isLoading}
            onSelectCategory={handleSelectCategory}
          />

          <div className="space-y-3">
            <CategoryFormPanel
              mode={selectedCategoryId ? "edit" : "create"}
              form={form}
              errors={errors}
              departments={departments}
              isSubmitting={submitPending}
              isDepartmentsLoading={isLoading && departments.length === 0}
              onFieldChange={handleFieldChange}
              onReset={handleStartCreate}
              onSubmit={handleSubmit}
            />

            <article className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase tracking-[0.08em] text-zinc-500">
                Notes
              </h3>
              <p className="mt-2 text-sm text-zinc-600">
                Category names are unique per department. Selecting an item on the
                left switches form to edit mode automatically.
              </p>
            </article>
          </div>
        </section>
      </main>
    </section>
  );
}
