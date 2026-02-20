// // src/app/helpdesk/category/CategoryPage.tsx
// "use client";

// import React, { useEffect, useState } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Button from "@/components/Button";
// import { z } from "zod";
// import { getCategories, createCategory, updateCategory } from "./action";
// import { getDepartmentNames } from "../department/action";
// import {PencilSquareIcon

// } from "@heroicons/react/24/outline";

// const CategorySchema = z.object({
//   id: z.string().optional(), // only for editing
//   name: z.string().min(1, "Name is required"),
//   departmentId: z.string().min(1, "Department is required"),
// });

// type CategoryForm = z.infer<typeof CategorySchema>;

// interface Category {
//   id: string;
//   name: string;
//   departmentId: string;
//   departmentName: string;
// }

// export default function CategoryPage() {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
//   const [form, setForm] = useState<CategoryForm>({ name: "", departmentId: "" });
//   const [errors, setErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});
//   const [submitting, setSubmitting] = useState(false);
//   const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

//   // Load categories and departments
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [cats, depts] = await Promise.all([getCategories(), getDepartmentNames()]);
//         setCategories(cats);
//         setDepartments(depts);
//       } catch (err: unknown) {
//         toast.error((err as Error).message);
//       }
//     };
//     fetchData();
//   }, []);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//     setErrors({ ...errors, [e.target.name]: "" });
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     const result = CategorySchema.safeParse(form);
//     if (!result.success) {
//       const fieldErrors: Partial<Record<keyof CategoryForm, string>> = {};
//       result.error.issues.forEach((err) => {
//         const key = err.path[0] as keyof CategoryForm;
//         fieldErrors[key] = err.message;
//       });
//       setErrors(fieldErrors);
//       return;
//     }

//     setSubmitting(true);
//     try {
//       if (selectedCategoryId) {
//         // Update
//         await updateCategory(selectedCategoryId, form);
//         toast.success("Category updated!");
//       } else {
//         // Create
//         await createCategory(form);
//         toast.success("Category created!");
//       }

//       // Refresh list
//       const cats = await getCategories();
//       setCategories(cats);

//       // Reset form
//       setForm({ name: "", departmentId: "" });
//       setSelectedCategoryId(null);
//     } catch (err: unknown) {
//       toast.error((err as Error).message);
//     }
//     setSubmitting(false);
//   };

//   const handleEdit = (cat: Category) => {
//     setSelectedCategoryId(cat.id);
//     setForm({ name: cat.name, departmentId: cat.departmentId });
//   };

//   return (
//     <section className="w-full container mx-auto p-5">
//       <ToastContainer />

//       <div className="flex  space-x-5">
//         <form
//           onSubmit={handleSubmit}
//           className="shadow-md p-8 space-y-6 bg-white mb-8">
//           <h2 className="text-2xl font-bold mb-4">
//             {selectedCategoryId ? "Edit Category" : "Create Category"}
//           </h2>

//           {/* Name */}
//           <div>
//             <label className="block text-gray-700 font-semibold mb-1">
//               Name
//             </label>
//             <input
//               name="name"
//               value={form.name}
//               onChange={handleChange}
//               placeholder="Enter category name"
//               className={`w-full border-b py-2 focus:outline-none ${errors.name ? "border-red-500" : "border-indigo-500"}`}
//             />
//             {errors.name && (
//               <p className="text-red-500 text-sm">{errors.name}</p>
//             )}
//           </div>

//           {/* Department */}

//           <div className="grid grid-cols-2">
//             <div>
//               <label className="block text-gray-700 font-semibold mb-1">
//                 Department
//               </label>
//               <select
//                 name="departmentId"
//                 value={form.departmentId}
//                 onChange={handleChange}
//                 className={`w-full border-b py-2 focus:outline-none ${errors.departmentId ? "border-red-500" : "border-indigo-500"}`}>
//                 <option value="">Select department</option>
//                 {departments.map((d) => (
//                   <option key={d.id} value={d.id}>
//                     {d.name}
//                   </option>
//                 ))}
//               </select>
//               {errors.departmentId && (
//                 <p className="text-red-500 text-sm">{errors.departmentId}</p>
//               )}
//             </div>
//           </div>

//           <div>
//             <Button
//               buttonLabel={
//                 submitting
//                   ? "Saving..."
//                   : selectedCategoryId
//                     ? "Update"
//                     : "Create"
//               }
//               type="submit"
//               disabled={submitting}
//             />
//           </div>
//         </form>

//         {/* Category List */}
//         <div className="shadow-md p-4 flex-1 bg-white">
//           <h2 className="text-2xl font-bold mb-4">Categories</h2>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-4">
//             {categories.map((cat) => (
//               <div
//                 key={cat.id}
//                 className={`border  rounded-xl p-5  hover:shadow transition-all bg-white ${selectedCategoryId === cat.id ? "border-indigo-500" : "border-gray-300"}`}>
//                 <div className="flex justify-between items-center mb-4">
//                   <h3 className="text-lg font-bold flex items-center gap-2">
//                     <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
//                     {cat.name}
//                   </h3>

//                   <button
//                     disabled={submitting || !!selectedCategoryId}
//                     onClick={() => handleEdit(cat)}
//                     className="w-8 aspect-square flex justify-center items-center cursor-pointer text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
//                     <PencilSquareIcon className="w-4 h-4" />
//                   </button>
//                 </div>

//                 <p className="text-gray-600 text-sm">
//                   <span className="font-medium">Department:</span>{" "}
//                   {cat.departmentName}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// src/app/helpdesk/category/CategoryPage.tsx

// "use client";

// import React, { useEffect, useState } from "react";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Button from "@/components/Button";
// import { z } from "zod";
// import { getCategories, createCategory, updateCategory } from "./action";
// import { getDepartmentNames } from "../department/action";
// import {PencilSquareIcon

// } from "@heroicons/react/24/outline";

// const CategorySchema = z.object({
//   id: z.string().optional(), // only for editing
//   name: z.string().min(1, "Name is required"),
//   departmentId: z.string().min(1, "Department is required"),
// });

// type CategoryForm = z.infer<typeof CategorySchema>;

// interface Category {
//   id: string;
//   name: string;
//   departmentId: string;
//   departmentName: string;
// }

// export default function CategoryPage() {
//   const [categories, setCategories] = useState<Category[]>([]);
//   const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
//   const [form, setForm] = useState<CategoryForm>({ name: "", departmentId: "" });
//   const [errors, setErrors] = useState<Partial<Record<keyof CategoryForm, string>>>({});
//   const [submitting, setSubmitting] = useState(false);
//   const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

//   // Load categories and departments
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [cats, depts] = await Promise.all([getCategories(), getDepartmentNames()]);
//         setCategories(cats);
//         setDepartments(depts);
//       } catch (err: unknown) {
//         toast.error((err as Error).message);
//       }
//     };
//     fetchData();
//   }, []);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//     setForm({ ...form, [e.target.name]: e.target.value });
//     setErrors({ ...errors, [e.target.name]: "" });
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();

//     const result = CategorySchema.safeParse(form);
//     if (!result.success) {
//       const fieldErrors: Partial<Record<keyof CategoryForm, string>> = {};
//       result.error.issues.forEach((err) => {
//         const key = err.path[0] as keyof CategoryForm;
//         fieldErrors[key] = err.message;
//       });
//       setErrors(fieldErrors);
//       return;
//     }

//     setSubmitting(true);
//     try {
//       if (selectedCategoryId) {
//         // Update
//         await updateCategory(selectedCategoryId, form);
//         toast.success("Category updated!");
//       } else {
//         // Create
//         await createCategory(form);
//         toast.success("Category created!");
//       }

//       // Refresh list
//       const cats = await getCategories();
//       setCategories(cats);

//       // Reset form
//       setForm({ name: "", departmentId: "" });
//       setSelectedCategoryId(null);
//     } catch (err: unknown) {
//       toast.error((err as Error).message);
//     }
//     setSubmitting(false);
//   };

//   const handleEdit = (cat: Category) => {
//     setSelectedCategoryId(cat.id);
//     setForm({ name: cat.name, departmentId: cat.departmentId });
//   };

//   return (
//     <section className="w-full min-h-screen bg-background">
//       <ToastContainer />

//       <div className="max-w-2xl mx-auto px-6 py-12">
//         {/* Form Section */}
//         <div className="mb-16">
//           <h1 className="text-3xl font-bold mb-8 text-foreground">
//             {selectedCategoryId ? "Edit Category" : "Create Category"}
//           </h1>

//           <form onSubmit={handleSubmit} className="space-y-6">
//             {/* Name */}
//             <div>
//               <label className="block text-sm font-medium text-foreground mb-2">
//                 Name
//               </label>
//               <input
//                 name="name"
//                 value={form.name}
//                 onChange={handleChange}
//                 placeholder="Enter category name"
//                 className={`w-full px-0 py-2 bg-transparent border-b-2 focus:outline-none transition-colors ${
//                   errors.name
//                     ? "border-destructive text-destructive"
//                     : "border-muted-foreground focus:border-foreground"
//                 }`}
//               />
//               {errors.name && (
//                 <p className="text-destructive text-xs mt-1">{errors.name}</p>
//               )}
//             </div>

//             {/* Department */}
//             <div>
//               <label className="block text-sm font-medium text-foreground mb-2">
//                 Department
//               </label>
//               <select
//                 name="departmentId"
//                 value={form.departmentId}
//                 onChange={handleChange}
//                 className={`w-full px-0 py-2 bg-transparent border-b-2 focus:outline-none transition-colors ${
//                   errors.departmentId
//                     ? "border-destructive text-destructive"
//                     : "border-muted-foreground focus:border-foreground"
//                 }`}>
//                 <option value="">Select department</option>
//                 {departments.map((d) => (
//                   <option key={d.id} value={d.id}>
//                     {d.name}
//                   </option>
//                 ))}
//               </select>
//               {errors.departmentId && (
//                 <p className="text-destructive text-xs mt-1">{errors.departmentId}</p>
//               )}
//             </div>

//             {/* Submit Button */}
//             <div className="pt-4">
//               <Button
//                 buttonLabel={
//                   submitting
//                     ? "Saving..."
//                     : selectedCategoryId
//                       ? "Update"
//                       : "Create"
//                 }
//                 type="submit"
//                 disabled={submitting}
//               />
//             </div>
//           </form>
//         </div>

//         {/* Category List */}
//         <div>
//           <h2 className="text-2xl font-bold mb-6 text-foreground">Categories</h2>

//           <div className="space-y-3">
//             {categories.length === 0 ? (
//               <p className="text-muted-foreground text-sm py-8 text-center">
//                 No categories yet. Create one to get started.
//               </p>
//             ) : (
//               categories.map((cat) => (
//                 <div
//                   key={cat.id}
//                   className={`flex items-center justify-between p-4 border-b transition-colors ${
//                     selectedCategoryId === cat.id
//                       ? "border-foreground bg-secondary"
//                       : "border-border hover:bg-secondary"
//                   }`}>
//                   <div className="flex-1">
//                     <h3 className="font-medium text-foreground">
//                       {cat.name}
//                     </h3>
//                     <p className="text-xs text-muted-foreground mt-1">
//                       {cat.departmentName}
//                     </p>
//                   </div>

//                   <button
//                     disabled={submitting || !!selectedCategoryId}
//                     onClick={() => handleEdit(cat)}
//                     className="ml-4 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
//                     <PencilSquareIcon className="w-4 h-4" />
//                   </button>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }

// src/app/helpdesk/category/CategoryPage.tsx

"use client";

import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "@/components/Button";
import { z } from "zod";
import { getCategories, createCategory, updateCategory } from "./action";
import { getDepartmentNames } from "../department/action";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

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
  const [departments, setDepartments] = useState<
    { id: string; name: string }[]
  >([]);
  const [form, setForm] = useState<CategoryForm>({
    name: "",
    departmentId: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CategoryForm, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null,
  );

  // စဖွင့်ချိန်မှာ category list နဲ့ department list ကို တပြိုင်နက်တည်း load
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Promise.all သုံးထားလို့ request နှစ်ခုကိုအတူတင်ပြီး စောင့်ချိန်လျှော့နိုင်တယ်
        const [cats, depts] = await Promise.all([
          getCategories(),
          getDepartmentNames(),
        ]);
        setCategories(cats);
        setDepartments(depts);
      } catch (err: unknown) {
        toast.error((err as Error).message);
      }
    };
    fetchData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    // field တန်ဖိုးပြောင်းတိုင်း form update လုပ်ပြီး အဲဒီ field error ကို တစ်ခါတည်းရှင်း
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // submit မလုပ်ခင် schema နဲ့ validate လုပ်ပြီး field-wise error map ပြန်တည်ဆောက်
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
        // id ရှိနေပြီဆို edit mode အဖြစ် update လုပ်
        await updateCategory(selectedCategoryId, form);
        toast.success("Category updated!");
      } else {
        // id မရှိသေးရင် create mode နဲ့ အသစ်တည်ဆောက်
        await createCategory(form);
        toast.success("Category created!");
      }

      // create/update ပြီးပြီးချင်း latest list ပြန်ဆွဲ
      const cats = await getCategories();
      setCategories(cats);

      // submit အောင်မြင်ရင် form state ကို default ပြန်ချပြီး edit mode ဖြုတ်
      setForm({ name: "", departmentId: "" });
      setSelectedCategoryId(null);
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
    setSubmitting(false);
  };

  const handleEdit = (cat: Category) => {
    // row တစ်ခုကို edit နှိပ်ရင် form ကို အဲဒီ row data နဲ့ prefill
    setSelectedCategoryId(cat.id);
    setForm({ name: cat.name, departmentId: cat.departmentId });
  };

  return (
    <section className="w-full min-h-screen bg-background">
      <ToastContainer />

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Form Section */}
        <div className="mb-16">
          <h1 className="text-3xl font-bold mb-8 text-foreground">
            {selectedCategoryId ? "Edit Category" : "Create Category"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter category name"
                className={`w-full px-0 py-2 bg-transparent border-b-2 focus:outline-none transition-colors ${
                  errors.name
                    ? "border-destructive text-destructive"
                    : "border-muted-foreground focus:border-foreground"
                }`}
              />
              {errors.name && (
                <p className="text-destructive text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Department
              </label>
              <select
                name="departmentId"
                value={form.departmentId}
                onChange={handleChange}
                className={`w-full px-0 py-2 bg-transparent border-b-2 focus:outline-none transition-colors ${
                  errors.departmentId
                    ? "border-destructive text-destructive"
                    : "border-muted-foreground focus:border-foreground"
                }`}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && (
                <p className="text-destructive text-xs mt-1">
                  {errors.departmentId}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                buttonLabel={
                  submitting
                    ? "Saving..."
                    : selectedCategoryId
                      ? "Update"
                      : "Create"
                }
                type="submit"
                disabled={submitting}
              />
            </div>
          </form>
        </div>

        {/* Category List */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-foreground">
            Categories
          </h2>

          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">
                No categories yet. Create one to get started.
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-4 border-b transition-colors ${
                    selectedCategoryId === cat.id
                      ? "border-foreground bg-secondary"
                      : "border-border hover:bg-secondary"
                  }`}>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cat.departmentName}
                    </p>
                  </div>

                  <button
                    disabled={submitting || !!selectedCategoryId}
                    onClick={() => handleEdit(cat)}
                    className="ml-4 p-2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <PencilSquareIcon className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
