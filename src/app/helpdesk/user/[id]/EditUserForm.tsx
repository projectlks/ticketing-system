// // src/app/helpdesk/user/[id]/EditUserForm.tsx
// "use client";

// import React, { useState } from "react";
// import { z } from "zod";
// import { updateUser } from "../action";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Button from "@/components/Button";
// import { Role } from "@/generated/prisma/client";

// const RoleEnum = z.enum(["ADMIN", "REQUESTER", "AGENT", "SUPER_ADMIN"]);

// const UserSchema = z.object({
//     id: z.string(),
//     name: z.string().min(5),
//     email: z.string().email(),
//     // password: z.string().min(8).optional(),
//     password: z
//         .string()
//         .optional()
//         .refine((val) => !val || val.length >= 8, {
//             message: "Password must be at least 8 characters",
//         }),

//     departmentId: z.string().optional(),
//     role: RoleEnum,
// });

// type FormType = z.infer<typeof UserSchema>;

// interface Props {
//     user: {
//         id: string;
//         name: string;
//         email: string;
//         departmentId: string | null;
//         role: Role;
//     };
//     departments: { id: string; name: string }[];
// }

// export default function EditUserForm({ user, departments }: Props) {
//     const [form, setForm] = useState<FormType>({
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         password: "",
//         departmentId: user.departmentId || "",
//         role: user.role,
//     });

//     const [errors, setErrors] = useState<Partial<Record<keyof FormType, string>>>({});
//     const [submitting, setSubmitting] = useState(false);
//     const [errorMessage, setErrorMessage] = useState<boolean>(false)

//     const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
//         setForm({ ...form, [e.target.name]: e.target.value });
//         setErrors({ ...errors, [e.target.name]: "" });
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();

//         const result = UserSchema.safeParse(form);
//         if (!result.success) {
//             const fieldErrors: Partial<Record<keyof FormType, string>> = {};
//             result.error.issues.forEach((err) => {
//                 const key = err.path[0] as keyof FormType;
//                 fieldErrors[key] = err.message;
//             });
//             setErrors(fieldErrors);
//             return;
//         }

//         setSubmitting(true);

//         try {
//             const fd = new FormData();

//             Object.entries(form).forEach(([k, v]) => {
//                 if ((k === "password" && !v) || v === undefined || v === null) return;
//                 fd.append(k, String(v));
//             });



//             await updateUser(fd);
//             toast.success("User updated successfully!");
//         } catch (err: unknown) {
//             toast.error((err as Error).message);
//             setErrorMessage(true);
//         }

//         setSubmitting(false);
//     };

//     return (


//         <section className="w-full p-5">
//             {/* ToastContainer MUST BE OUTSIDE form */}
//             <ToastContainer />

//             <form
//                 onSubmit={handleSubmit}
//                 className={`shadow-md p-8 space-y-6 ${errorMessage
//                     ? " bg-red-100 "
//                     : "bg-white"
//                     }`}
//             >
//                 {/* Name */}
//                 <div>
//                     <label className="block text-gray-700 text-xl font-semibold mb-1">
//                         User Name
//                     </label>
//                     <input
//                         name="name"
//                         type="text"
//                         className={`border-b-2 w-full py-2 text-2xl focus:outline-none ${errors.name
//                             ? "border-red-500"
//                             : "border-indigo-500"
//                             }`}
//                         placeholder="Enter User Name"
//                         value={form.name}
//                         onChange={handleChange}
//                     />
//                     {errors.name && (
//                         <p className="text-red-500 text-sm">{errors.name}</p>
//                     )}
//                 </div>

//                 {/* Grid section */}
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
//                     {/* Email */}
//                     <div>
//                         <label className="block text-gray-600 mb-1 font-medium">
//                             Email
//                         </label>
//                         <input
//                             name="email"
//                             type="email"
//                             disabled 
//                             className={`w-full border-b py-2 focus:outline-none cursor-not-allowed ${errors.email
//                                 ? "border-red-500" 
//                                 : "border-gray-400 focus:border-indigo-500"
//                                 }`}
//                             placeholder="Enter User Email"
//                             value={form.email}
//                             onChange={handleChange}
//                         />
//                         {errors.email && (
//                             <p className="text-red-500 text-sm">
//                                 {errors.email}
//                             </p>
//                         )}
//                     </div>

//                     {/* Password */}
//                     <div>
//                         <label className="block text-gray-600 mb-1 font-medium">
//                             Password
//                         </label>
//                         <input
//                             name="password"
//                             type="password"
//                             className={`w-full border-b py-2 focus:outline-none ${errors.password
//                                 ? "border-red-500"
//                                 : "border-gray-400 focus:border-indigo-500"
//                                 }`}
//                             placeholder="place empty to keep current password"
//                             value={form.password || ""}
//                             onChange={handleChange}
//                         />
//                         {errors.password && (
//                             <p className="text-red-500 text-sm">
//                                 {errors.password}
//                             </p>
//                         )}
//                     </div>

//                     {/* Department */}
//                     <div>
//                         <label className="block text-gray-600 mb-1 font-medium">
//                             Department
//                         </label>
//                         <select
//                             name="departmentId"
//                             className={`w-full border-b py-2 focus:outline-none ${errors.departmentId
//                                 ? "border-red-500"
//                                 : "border-gray-400 focus:border-indigo-500"
//                                 }`}
//                             value={form.departmentId}
//                             onChange={handleChange}
//                         >
//                             <option value="">Select Department</option>
//                             {departments.map((d) => (
//                                 <option key={d.id} value={d.id}>
//                                     {d.name}
//                                 </option>
//                             ))}
//                         </select>
//                         {errors.departmentId && (
//                             <p className="text-red-500 text-sm">
//                                 {errors.departmentId}
//                             </p>
//                         )}
//                     </div>

//                     {/* Role */}
//                     <div>
//                         <label className="block text-gray-600 mb-1 font-medium">
//                             Role
//                         </label>
//                         <select
//                             name="role"
//                             className="w-full border-b py-2 focus:outline-none border-gray-400 focus:border-indigo-500"
//                             value={form.role as string}
//                             onChange={handleChange}
//                         >
//                             <option value="REQUESTER">REQUESTER</option>
//                             <option value="AGENT">AGENT</option>
//                             <option value="ADMIN">ADMIN</option>
//                             <option value="SUPER_ADMIN">SUPER_ADMIN</option>
//                         </select>
//                         {errors.role && (
//                             <p className="text-red-500 text-sm">
//                                 {errors.role}
//                             </p>
//                         )}
//                     </div>
//                 </div>

//                 <div className="mt-6">
//                     <Button
//                         buttonLabel={submitting ? "Update..." : "Update"}
//                         type="submit"
//                         disabled={submitting}
//                     />
//                 </div>
//             </form>
//         </section>
//     );
// }
// src/app/helpdesk/user/[id]/EditUserForm.tsx
"use client";

import React, { useState, ChangeEvent, FormEvent } from "react";
import { z } from "zod";
import { updateUser } from "../action";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Button from "@/components/Button";
import { Role } from "@/generated/prisma/client";

/* ================================
   Schema
================================ */

const RoleEnum = z.enum(["ADMIN", "REQUESTER", "AGENT", "SUPER_ADMIN"]);

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(5, "Name must be at least 5 characters"),
  email: z.string().email(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, {
      message: "Password must be at least 8 characters",
    }),
  departmentId: z.string().optional(),
  role: RoleEnum,
});

type FormValues = z.infer<typeof UserSchema>;
type FormErrors = Partial<Record<keyof FormValues, string>>;

/* ================================
   Props
================================ */

interface EditUserFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    departmentId: string | null;
    role: Role;
  };
  departments: {
    id: string;
    name: string;
  }[];
}

/* ================================
   Component
================================ */

export default function EditUserForm({
  user,
  departments,
}: EditUserFormProps) {
  const [form, setForm] = useState<FormValues>({
    id: user.id,
    name: user.name,
    email: user.email,
    password: "",
    departmentId: user.departmentId ?? "",
    role: user.role,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasServerError, setHasServerError] = useState(false);

  /* ================================
     Handlers
  ================================ */

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setHasServerError(false);

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

      const fd = new FormData();

      (Object.entries(parsed.data) as [
        keyof FormValues,
        FormValues[keyof FormValues]
      ][]).forEach(([key, value]) => {
        if (key === "password" && !value) return;
        if (value === undefined || value === null) return;

        fd.append(key, String(value));
      });

      await updateUser(fd);
      toast.success("User updated successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      setHasServerError(true);
    } finally {
      setSubmitting(false);
    }
  };

  /* ================================
     JSX
  ================================ */

  return (
    <section className="w-full p-5">
   

      <form
        onSubmit={handleSubmit}
        className={`shadow-md p-8 space-y-6 ${
          hasServerError ? "bg-red-100" : "bg-white"
        }`}
      >
        {/* Name */}
        <div>
          <label className="block text-gray-700 text-xl font-semibold mb-1">
            User Name
          </label>
          <input
            name="name"
            type="text"
            className={`border-b-2 w-full py-2 text-2xl focus:outline-none ${
              errors.name ? "border-red-500" : "border-indigo-500"
            }`}
            placeholder="Enter User Name"
            value={form.name}
            onChange={handleChange}
          />
          {errors.name && (
            <p className="text-red-500 text-sm">{errors.name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Email */}
          <div>
            <label className="block text-gray-600 mb-1 font-medium">
              Email
            </label>
            <input
              name="email"
              type="email"
              disabled
              className={`w-full border-b py-2 focus:outline-none cursor-not-allowed ${
                errors.email
                  ? "border-red-500"
                  : "border-gray-400 focus:border-indigo-500"
              }`}
              value={form.email}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-600 mb-1 font-medium">
              Password
            </label>
            <input
              name="password"
              type="password"
              className={`w-full border-b py-2 focus:outline-none ${
                errors.password
                  ? "border-red-500"
                  : "border-gray-400 focus:border-indigo-500"
              }`}
              placeholder="Place empty to keep current password"
              value={form.password ?? ""}
              onChange={handleChange}
            />
            {errors.password && (
              <p className="text-red-500 text-sm">{errors.password}</p>
            )}
          </div>

          {/* Department */}
          <div>
            <label className="block text-gray-600 mb-1 font-medium">
              Department
            </label>
            <select
              name="departmentId"
              className={`w-full border-b py-2 focus:outline-none ${
                errors.departmentId
                  ? "border-red-500"
                  : "border-gray-400 focus:border-indigo-500"
              }`}
              value={form.departmentId}
              onChange={handleChange}
            >
              <option value="">Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {errors.departmentId && (
              <p className="text-red-500 text-sm">
                {errors.departmentId}
              </p>
            )}
          </div>

          {/* Role */}
          <div>
            <label className="block text-gray-600 mb-1 font-medium">
              Role
            </label>
            <select
              name="role"
              className="w-full border-b py-2 focus:outline-none border-gray-400 focus:border-indigo-500"
              value={form.role}
              onChange={handleChange}
            >
              <option value="REQUESTER">REQUESTER</option>
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </select>
          </div>
        </div>

        <div className="mt-6">
          <Button
            buttonLabel={submitting ? "Update..." : "Update"}
            type="submit"
            disabled={submitting}
          />
        </div>
      </form>
    </section>
  );
}
