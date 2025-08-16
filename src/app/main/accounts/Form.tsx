'use client';

import Input from '@/components/Input';
import {
    EyeIcon,
    ChevronDownIcon,
    EyeSlashIcon,
} from '@heroicons/react/24/outline';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { createAccount, getAccount, updateAccount } from './action';
import Swal from 'sweetalert2';
import { UserWithRelations } from './page';
import Loading from '@/components/Loading';

interface AccountCreateFormProps {
    setShowForm: (value: boolean) => void;
    setAccounts: Dispatch<SetStateAction<UserWithRelations[]>>
    updateID: string | null;
}

export default function Form({ setShowForm, setAccounts, updateID }: AccountCreateFormProps) {
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        response: null as string | null,
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const emptyForm = {
        name: '',
        email: '',
        password: '',
        role: 'REQUESTER',
    };

    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);
    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const accountData = await getAccount(updateID);
                // Normalize properties to string with defaults:
                const normalizedData = {
                    name: accountData?.name ?? '',
                    email: accountData?.email ?? '',
                    password: '', // password usually not sent back
                    role: accountData?.role ?? 'REQUESTER',
                };
                setForm(normalizedData);
                setInitialForm(normalizedData);
            };

            getData();
        } else {
            setForm(emptyForm);
            setInitialForm(emptyForm);
        }
    }, [updateID]);


    const selectRef = useRef<HTMLSelectElement>(null);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    // Check if form has unsaved changes
    const isFormDirty = () => {
        return (
            form.name.trim() !== initialForm.name.trim() ||
            form.email.trim() !== initialForm.email.trim() ||
            form.password.trim() !== initialForm.password.trim() ||
            form.role !== initialForm.role
        );
    };

    // Confirm cancel if form dirty
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ name: '', email: '', password: '', response: null });

        // Validate form
        let isValid = true;
        const newErrors = { name: '', email: '', password: '', response: null };

        if (!form.name.trim()) {
            newErrors.name = 'Name is required.';
            isValid = false;
        }
        if (!form.email.trim()) {
            newErrors.email = 'Email is required.';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = 'Please enter a valid email.';
            isValid = false;
        }
        if (!updateID) { // only validate password on create
            if (!form.password.trim()) {
                newErrors.password = 'Password is required.';
                isValid = false;
            } else if (form.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters.';
                isValid = false;
            }
        }

        if (!isValid) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);

        try {
            if (updateID) {
                const { success, data } = await updateAccount(formData, updateID);

                if (success) {
                    setAccounts((prev) => prev.map((item) => (item.id === updateID ? data : item)));

                    Swal.fire({
                        title: 'Success',
                        text: 'Account updated successfully!',
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            } else {
                const { success, data }: { success: boolean, data: UserWithRelations } = await createAccount(formData);

                if (success) {
                    setAccounts((prev: UserWithRelations[]) => [data, ...prev]);

                    Swal.fire({
                        title: 'Success',
                        text: 'Account created successfully!',
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
        <>

            {loading && <Loading />}
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
                            {updateID ? "Update Account" : "Add New Account"}
                        </h1>
                        <p className="text-gray-500 text-sm font-semibold">
                            Effortlessly manage your accounts: {updateID ? "update existing details" : "add a new account"}.
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">
                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                User name
                            </label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="Enter user name"
                                value={form.name}
                                onChange={handleChange}
                                error={!!errors.name}
                                aria-invalid={!!errors.name}
                                aria-describedby={errors.name ? 'name-error' : undefined}
                            />
                            {errors.name && (
                                <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email
                            </label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter user email"
                                value={form.email}
                                onChange={handleChange}
                                error={!!errors.email}
                                aria-invalid={!!errors.email}
                                aria-describedby={errors.email ? 'email-error' : undefined}
                            />
                            {errors.email && (
                                <p id="email-error" className="text-red-600 text-sm mt-1" role="alert">
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        {
                            !updateID && (
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Enter your password"
                                            value={form.password}
                                            onChange={handleChange}
                                            error={!!errors.password}
                                            aria-invalid={!!errors.password}
                                            aria-describedby={errors.password ? 'password-error' : undefined}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500"
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showPassword ? (
                                                <EyeSlashIcon className="w-5 h-5" />
                                            ) : (
                                                <EyeIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p id="password-error" className="text-red-600 text-sm mt-1" role="alert">
                                            {errors.password}
                                        </p>
                                    )}
                                </div>
                            )
                        }

                        {/* Role */}
                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Role
                            </label>
                            <div className="relative">
                                <select
                                    ref={selectRef}
                                    id="role"
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                >
                                    <option value="REQUESTER">Requester</option>
                                    <option value="AGENT">Agent</option>
                                    <option value="ADMIN">Admin</option>
                                    {/* <option value="SUPER_ADMIN">Super Admin</option> */}
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
                        </div>

                        {/* General Error */}
                        {errors.response && (
                            <p className="text-red-500 text-xs mb-4" role="alert" aria-live="assertive">
                                {errors.response}
                            </p>
                        )}

                        {/* Buttons */}
                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-3 text-sm font-medium border border-gray-300 rounded-lg text-gray-800 hover:bg-gray-100 h-[44px]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading
                                    ? 'bg-indigo-300 cursor-not-allowed'
                                    : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading
                                    ? updateID
                                        ? 'Updating...'
                                        : 'Creating...'
                                    : updateID
                                        ? 'Update Account'
                                        : 'Create Account'}
                            </button>
                        </div>
                    </section>
                </form>
            </section>
        </>
    );
}
