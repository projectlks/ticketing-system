// src/app/helpdesk/category/CategoryPage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "@/components/Button";
import { z } from "zod";
import { getCategories, createCategory, updateCategory } from "./action";
import { getDepartmentNames } from "../department/action";
import {PencilSquareIcon

} from "@heroicons/react/24/outline";

const CategorySchema = z.object({
  id: z.string().optional(), // only for editing
  name: z.string().min(1, "Name is required"),
  departmentId: z.string().min(1, "Department is required"),
});

type CategoryForm = z.infer<typeof CategorySchema>;

interface Category {
  id: string;
  name: string;
  departmentId: string;
  departmentName: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<CategoryForm>({ name: "", departmentId: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Load categories and departments
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cats, depts] = await Promise.all([getCategories(), getDepartmentNames()]);
        setCategories(cats);
        setDepartments(depts);
      } catch (err: unknown) {
        toast.error((err as Error).message);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = CategorySchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CategoryForm, string>> = {};
      result.error.issues.forEach((err) => {
        const key = err.path[0] as keyof CategoryForm;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (selectedCategoryId) {
        // Update
        await updateCategory(selectedCategoryId, form);
        toast.success("Category updated!");
      } else {
        // Create
        await createCategory(form);
        toast.success("Category created!");
      }

      // Refresh list
      const cats = await getCategories();
      setCategories(cats);

      // Reset form
      setForm({ name: "", departmentId: "" });
      setSelectedCategoryId(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSubmitting(false);
  };

  const handleEdit = (cat: Category) => {
    setSelectedCategoryId(cat.id);
    setForm({ name: cat.name, departmentId: cat.departmentId });
  };

  return (
    <section className="w-full p-5">
      <ToastContainer />

      <form
        onSubmit={handleSubmit}
        className="shadow-md p-8 space-y-6 bg-white mb-8"
      >
        <h2 className="text-2xl font-bold mb-4">
          {selectedCategoryId ? "Edit Category" : "Create Category"}
        </h2>

        {/* Name */}
        <div>
          <label className="block text-gray-700 font-semibold mb-1">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter category name"
            className={`w-full border-b py-2 focus:outline-none ${errors.name ? "border-red-500" : "border-indigo-500"}`}
          />
          {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
        </div>

        {/* Department */}

        <div className="grid grid-cols-2">

          <div>
            <label className="block text-gray-700 font-semibold mb-1">Department</label>
            <select
              name="departmentId"
              value={form.departmentId}
              onChange={handleChange}
              className={`w-full border-b py-2 focus:outline-none ${errors.departmentId ? "border-red-500" : "border-indigo-500"}`}
            >
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {errors.departmentId && <p className="text-red-500 text-sm">{errors.departmentId}</p>}
          </div>
        </div>

        <div>
          <Button
            buttonLabel={submitting ? "Saving..." : selectedCategoryId ? "Update" : "Create"}
            type="submit"
            disabled={submitting}
          />
        </div>
      </form>

      {/* Category List */}
      <div className="shadow-md p-4 bg-white">
        <h2 className="text-2xl font-bold mb-4">Categories</h2>
       




<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
  {categories.map((cat) => (
    <div
      key={cat.id}
      className={`border  rounded-xl p-5  hover:shadow transition-all bg-white ${selectedCategoryId === cat.id ? "border-indigo-500" : "border-gray-300"}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
          {cat.name}
        </h3>

        <button
          disabled={submitting || !!selectedCategoryId}
          onClick={() => handleEdit(cat)}
          className="w-8 aspect-square flex justify-center items-center cursor-pointer text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
        >
          <PencilSquareIcon className="w-4 h-4" />
        </button>
      </div>

      <p className="text-gray-600 text-sm">
        <span className="font-medium">Department:</span> {cat.departmentName}
      </p>
    </div>
  ))}
</div>



      </div>
    </section>
  );
}
