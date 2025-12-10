"use client";

import React, { useState, useEffect } from "react";
import { z } from "zod";
import Button from "@/components/Button";
import { getDepartmentNames } from "../../department/action";
import { createUser } from "../action";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Role enum
const RoleEnum = z.enum(["ADMIN", "REQUESTER", "AGENT", "SUPER_ADMIN"]);

// Zod validation
const UserSchema = z.object({
    name: z.string().min(5, "Name must be at least 5 letters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 letters"),
    department: z.string().min(1, "Department is required"),
    role: RoleEnum,
});

type FormType = z.infer<typeof UserSchema>;

export default function UserForm() {
    const [form, setForm] = useState<FormType>({
        name: "",
        email: "",
        password: "",
        department: "",
        role: "REQUESTER",
    });

    const [errors, setErrors] = useState<
        Partial<Record<keyof FormType, string>>
    >({});
    const [departments, setDepartments] = useState<
        { id: string; name: string }[]
    >([]);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<boolean>(false);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: "" });
        setErrorMessage(false);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const result = UserSchema.safeParse(form);

        if (!result.success) {
            const fieldErrors: Partial<Record<keyof FormType, string>> = {};
            result.error.issues.forEach((err) => {
                const key = err.path[0] as keyof FormType;
                fieldErrors[key] = err.message;
            });
            setErrors(fieldErrors);
            setErrorMessage(true);
            return;
        }

        // reset the error highlight
        setErrorMessage(false);

        setSubmitting(true);

        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v));

            await createUser(fd);

            toast.success("User created!");

            // Reset form
            setForm({
                name: "",
                email: "",
                password: "",
                department: "",
                role: "REQUESTER",
            });
        } catch (err) {
            toast.error((err as Error).message);
            setErrorMessage(true);
        }

        setSubmitting(false);
    };

    useEffect(() => {
        const getDept = async () => {
            const departments = await getDepartmentNames();
            setDepartments(departments);
        };

        getDept();
    }, []);



    return (
        <section className="w-full p-5">
            {/* ToastContainer MUST BE OUTSIDE form */}
            <ToastContainer />

            <form
                onSubmit={handleSubmit}
                className={`shadow-md p-8 space-y-6 ${
                    errorMessage
                        ? " bg-red-100 "
                        : "bg-white"
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
                            errors.name
                                ? "border-red-500"
                                : "border-indigo-500"
                        }`}
                        placeholder="Enter User Name"
                        value={form.name}
                        onChange={handleChange}
                    />
                    {errors.name && (
                        <p className="text-red-500 text-sm">{errors.name}</p>
                    )}
                </div>

                {/* Grid section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Email */}
                    <div>
                        <label className="block text-gray-600 mb-1 font-medium">
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            className={`w-full border-b py-2 focus:outline-none ${
                                errors.email
                                    ? "border-red-500"
                                    : "border-gray-400 focus:border-indigo-500"
                            }`}
                            placeholder="Enter User Email"
                            value={form.email}
                            onChange={handleChange}
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm">
                                {errors.email}
                            </p>
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
                            placeholder="Enter User Password"
                            value={form.password}
                            onChange={handleChange}
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm">
                                {errors.password}
                            </p>
                        )}
                    </div>

                    {/* Department */}
                    <div>
                        <label className="block text-gray-600 mb-1 font-medium">
                            Department
                        </label>
                        <select
                            name="department"
                            className={`w-full border-b py-2 focus:outline-none ${
                                errors.department
                                    ? "border-red-500"
                                    : "border-gray-400 focus:border-indigo-500"
                            }`}
                            value={form.department}
                            onChange={handleChange}
                        >
                            <option value="">Select Department</option>
                            {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                        {errors.department && (
                            <p className="text-red-500 text-sm">
                                {errors.department}
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
                        {errors.role && (
                            <p className="text-red-500 text-sm">
                                {errors.role}
                            </p>
                        )}
                    </div>
                </div>

                <div className="mt-6">
                    <Button
                        buttonLabel={submitting ? "Creating..." : "Create"}
                        type="submit"
                        disabled={submitting}
                    />
                </div>
            </form>
        </section>
    );
}
