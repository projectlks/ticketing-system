'use client';

import Input from '@/components/Input';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { DepartmentWithRelations } from './page';
import { createDepartment, getDepartment, updateDepartment } from './action';
import { getUserIdsandEmail } from '@/libs/action';

interface AccountCreateFormProps {
    setShowForm: (value: boolean) => void;
    setDepartments: Dispatch<SetStateAction<DepartmentWithRelations[]>>;
    updateID: string | null;
}

const emptyForm = {
    name: '',
    email: '',
    contact: '',
    description: '',
    managerId: '',
};

export default function Form({ setShowForm, setDepartments, updateID }: AccountCreateFormProps) {
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({ ...emptyForm, response: null as string | null });
    const [loading, setLoading] = useState(false);
    const [userIdsAndEmails, setUserIdsAndEmails] = useState<{ id: string; email: string; name: string }[]>([]);
    const initialFormRef = useRef(emptyForm);
    const selectRef = useRef<HTMLSelectElement>(null);

    // Fetch manager list
    useEffect(() => {
        const fetchUserIdsAndEmails = async () => {
            const users = await getUserIdsandEmail();
            setUserIdsAndEmails(users);
        };
        fetchUserIdsAndEmails();
    }, []);

    // Fetch department data for update
    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const departmentData: DepartmentWithRelations | null = await getDepartment(updateID);


                if (!departmentData) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Department not found.',
                        icon: 'error',
                        confirmButtonColor: '#ef4444',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                        },
                    });
                    setShowForm(false);
                    return;
                } 
                const mappedData = {
                    name: departmentData.name || '',
                    email: departmentData.email || '',
                    contact: departmentData.contact || '',
                    description: departmentData.description || '',
                    managerId: departmentData.managerId || '',
                };
                setForm(mappedData);
                initialFormRef.current = mappedData;
            };
            getData();
        } else {
            setForm(emptyForm);
            initialFormRef.current = emptyForm;
        }
    }, [updateID]);

    // Form change handler
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    // Check unsaved changes
    const isFormDirty = () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    // Cancel handler
    const handleCancel = () => {
        if (isFormDirty()) {
            Swal.fire({
                title: 'Are you sure?',
                text: 'You have unsaved changes. Closing the form will lose them.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: 'Yes, close it',
                cancelButtonText: 'No, keep editing',
                customClass: {
                    popup: 'rounded-lg p-6',
                    confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                    cancelButton: 'bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400',
                },
            }).then((result) => {
                if (result.isConfirmed) {
                    setShowForm(false);
                }
            });
        } else {
            setShowForm(false);
        }
    };

    // Validation helper
    const validateForm = (form: typeof emptyForm) => {
        const newErrors = { ...emptyForm, response: null };
        let isValid = true;

        if (!form.name.trim()) { newErrors.name = 'Name is required.'; isValid = false; }
        if (!form.email.trim()) { newErrors.email = 'Email is required.'; isValid = false; }
        else if (!/\S+@\S+\.\S+/.test(form.email)) { newErrors.email = 'Please enter a valid email.'; isValid = false; }
        if (!form.contact.trim()) { newErrors.contact = 'Contact is required.'; isValid = false; }
        if (!form.managerId.trim()) { newErrors.managerId = 'Manager is required.'; isValid = false; }

        return { isValid, newErrors };
    };

    // Submit handler
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ ...emptyForm, response: null });

        const { isValid, newErrors } = validateForm(form);
        if (!isValid) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);
        formData.set('managerId', form.managerId);

        try {
            if (updateID) {
                const { success, data } = await updateDepartment(formData, updateID);
                if (success) {
                    setDepartments((prev) => prev.map((item) => (item.id === updateID ? data : item)));
                    Swal.fire({
                        title: 'Success',
                        text: 'Department updated successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            } else {
                const { success, data } = await createDepartment(formData);
                if (success) {
                    setDepartments((prev) => [...prev, data]);
                    Swal.fire({
                        title: 'Success',
                        text: 'Department created successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            }
            setShowForm(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Something went wrong.';
            setErrors((prev) => ({ ...prev, response: message }));
            Swal.fire({
                title: 'Error',
                text: message,
                icon: 'error',
                confirmButtonColor: '#ef4444',
                customClass: {
                    popup: 'rounded-lg p-6',
                    confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50">
            <div
                className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                onClick={handleCancel}
                aria-hidden="true"
            />

            <form
                onSubmit={handleSubmit}
                className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 bg-white z-50"
                onClick={(e) => e.stopPropagation()}
                noValidate
            >
                <div className="px-5 py-4 sm:px-6 sm:py-5">
                    <h1 className="text-2xl text-gray-800 font-bold mb-3 mt-5">
                        {updateID ? "Update Department" : "Add New Department"}
                    </h1>
                    <p className="text-gray-500 text-sm font-semibold">
                        Effortlessly manage your departments: {updateID ? "update existing details" : "add a new department"}.
                    </p>
                </div>

                <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">
                    {/* Name */}
                    <div>
                        <label htmlFor="name" className="block mb-1.5 text-sm font-medium text-gray-700">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            id="name"
                            name="name"
                            placeholder="Enter department name"
                            value={form.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            // disabled={loading}
                        />
                        {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            placeholder="Enter department description"
                            value={form.description}
                            onChange={handleChange}
                            disabled={loading}
                            className="w-full rounded-lg border border-gray-300 p-2 text-gray-800 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                            rows={4}
                        />
                    </div>

                    {/* Contact */}
                    <div>
                        <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Contact Number
                        </label>
                        <Input
                            id="contact"
                            name="contact"
                            placeholder="Enter contact number"
                            value={form.contact}
                            onChange={handleChange}
                            error={!!errors.contact}
                            // disabled={loading}
                        />
                        {errors.contact && <p className="text-red-600 text-sm mt-1">{errors.contact}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                            Email
                        </label>
                        <Input
                            id="email"
                            name="email"
                            placeholder="Enter email"
                            value={form.email}
                            onChange={handleChange}
                            error={!!errors.email}
                            // disabled={loading}
                        />
                        {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
                    </div>

                    {/* Manager */}
                    <div>
                        <label htmlFor="managerId" className="block mb-1.5 text-sm font-medium text-gray-700">
                            Manager <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                ref={selectRef}
                                id="managerId"
                                name="managerId"
                                value={form.managerId}
                                onChange={handleChange}
                                disabled={loading}
                                className={`h-11 w-full rounded-lg border px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none
                                  ${errors.managerId ? 'border-red-600' : 'border-gray-300'}
                                `}
                            >
                                <option value="">Select a manager</option>
                                {userIdsAndEmails.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                            <span
                                onClick={() => {
                                    selectRef.current?.focus();
                                    selectRef.current?.click();
                                }}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 cursor-pointer"
                            >
                                <ChevronDownIcon className="w-5 h-5" />
                            </span>
                        </div>
                        {errors.managerId && <p className="text-red-600 text-sm mt-1">{errors.managerId}</p>}
                    </div>

                    {/* General Error */}
                    {errors.response && (
                        <p className="text-red-500 text-xs mb-4" role="alert">{errors.response}</p>
                    )}

                    {/* Buttons */}
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={loading}
                            className="px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 h-[44px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${
                                loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                            }`}
                        >
                            {loading
                                ? updateID
                                    ? 'Updating...'
                                    : 'Creating...'
                                : updateID
                                    ? 'Update Department'
                                    : 'Create Department'}
                        </button>
                    </div>
                </section>
            </form>
        </section>
    );
}
