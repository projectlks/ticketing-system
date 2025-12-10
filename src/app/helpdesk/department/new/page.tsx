"use client";

import React, {  useState } from "react";
import { z } from "zod";
import Button from "@/components/Button";
import { createDepartment } from "../action"; // server action
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/navigation";

const DepartmentSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    email: z.string().email("Invalid email address"),
    contact: z.string().optional(),
});

export default function DepartmentForm() {
    const [form, setForm] = useState({
        name: "",
        description: "",
        email: "",
        contact: "",
    });

    const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
    const [submitting, setSubmitting] = useState(false);
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: "" });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // validate
        const result = DepartmentSchema.safeParse(form);
        if (!result.success) {
            const fieldErrors: Partial<Record<keyof typeof form, string>> = {};

            (result.error as z.ZodError<typeof form>).issues.forEach((err) => {
                const key = err.path[0] as keyof typeof form;
                if (key) fieldErrors[key] = err.message;
            });

            setErrors(fieldErrors);
            return;
        }


        setSubmitting(true);
        try {
            // server action expects FormData
            await createDepartment(new FormData(e.currentTarget));
            setForm({ name: "", description: "", email: "", contact: "" });
            toast.success("Department created successfully!");
            router.push("/helpdesk/department");

        } catch (err: unknown) {
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                // alert("Something went wrong");
                toast.error("Something went wrong");
            }
        } finally {
            setSubmitting(false);
        }

    };

    return (
        <section className="w-full p-5">
            <ToastContainer />
            <form onSubmit={handleSubmit} className="bg-white shadow-md p-8 space-y-6">
                {/* Name */}
                <div>
                    <label className="block text-gray-700 text-xl font-semibold mb-1">Department Name</label>
                    <input
                        name="name"
                        type="text"
                        className={`border-b-2 w-full py-2 text-2xl focus:outline-none ${errors.name ? "border-red-500" : "border-indigo-500"
                            }`}
                        placeholder="Enter Department Name"
                        value={form.name}
                        onChange={handleChange}
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                </div>

                {/* Grid fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-gray-600 mb-1 font-medium">Description</label>
                        <input
                            name="description"
                            type="text"
                            className={`w-full border-b py-2 focus:outline-none ${errors.description ? "border-red-500" : "border-gray-400 focus:border-indigo-500"
                                }`}
                            placeholder="Enter Department Description"
                            value={form.description}
                            onChange={handleChange}
                        />
                        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                    </div>

                    <div>
                        <label className="block text-gray-600 mb-1 font-medium">Email</label>
                        <input
                            name="email"
                            type="email"
                            className={`w-full border-b py-2 focus:outline-none ${errors.email ? "border-red-500" : "border-gray-400 focus:border-indigo-500"
                                }`}
                            placeholder="Enter Department Email"
                            value={form.email}
                            onChange={handleChange}
                        />
                        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                        <label className="block text-gray-600 mb-1 font-medium">Phone</label>
                        <input
                            name="contact"
                            type="text"
                            className={`w-full border-b py-2 focus:outline-none ${errors.contact ? "border-red-500" : "border-gray-400 focus:border-indigo-500"
                                }`}
                            placeholder="Enter Department Phone"
                            value={form.contact}
                            onChange={handleChange}
                        />
                        {errors.contact && <p className="text-red-500 text-sm mt-1">{errors.contact}</p>}
                    </div>
                </div>

                <div className="mt-6">
                    <Button buttonLabel={submitting ? "Creating..." : "Create"} type="submit" disabled={submitting} />
                </div>
            </form>
        </section>
    );
}
