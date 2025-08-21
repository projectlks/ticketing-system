'use client';

import Input from '@/components/Input';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { createAccount, getAccount, updateAccount } from './action';
import Swal from 'sweetalert2';
import { UserWithRelations } from './page';
import Loading from '@/components/Loading';
import { getAllDepartmentIdAndName, getJobPositionsByDepartment } from '@/libs/action';
import { useSession } from 'next-auth/react';

interface AccountCreateFormProps {
    setShowForm: (value: boolean) => void;
    setAccounts: Dispatch<SetStateAction<UserWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>;
}

export default function Form({ setShowForm, setAccounts, updateID, setUpdateID }: AccountCreateFormProps) {
    const [errors, setErrors] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        job_position: '',
        response: null as string | null,
    });

    const [loading, setLoading] = useState(false);

    const emptyForm = {
        name: '',
        email: '',
        password: '',
        department: '',
        job_position: '',
        role: 'REQUESTER',
    };

    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);

    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [jobPositions, setJobPositions] = useState<{ id: string; name: string }[]>([]);

    const selectRef = useRef<HTMLSelectElement>(null);
    const { data } = useSession();
    const isSuperAdmin = data?.user.role === "SUPER_ADMIN";
    const isEditing = !!updateID;

    // Load account data if updating
    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const accountData = await getAccount(updateID);

                const normalizedData = {
                    name: accountData?.name ?? '',
                    email: accountData?.email ?? '',
                    password: '',
                    role: accountData?.role ?? 'REQUESTER', // keep DB role
                    department: accountData?.departmentId ?? '',
                    job_position: accountData?.jobPositionId ?? '',
                };

                setForm(normalizedData);
                setInitialForm(normalizedData);
            };
            getData();
        } else {
            // New account creation
            setForm(isSuperAdmin ? emptyForm : { ...emptyForm, role: 'REQUESTER' });
            setInitialForm(isSuperAdmin ? emptyForm : { ...emptyForm, role: 'REQUESTER' });
        }
    }, [updateID, isSuperAdmin]);

    // Fetch departments
    useEffect(() => {
        const getDepartment = async () => {
            const data = await getAllDepartmentIdAndName();
            setDepartments(data);
        };
        getDepartment();
    }, []);

    // Fetch job positions based on selected department
    useEffect(() => {
        if (form.department) {
            const getJobs = async () => {
                const data = await getJobPositionsByDepartment(form.department);
                setJobPositions(data);

                if (!data.some((job) => job.id === form.job_position)) {
                    setForm((prev) => ({ ...prev, job_position: '' }));
                }
            };
            getJobs();
        } else {
            setJobPositions([]);
            setForm((prev) => ({ ...prev, job_position: '' }));
        }
    }, [form.department]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    const isFormDirty = () =>
        form.name.trim() !== initialForm.name.trim() ||
        form.email.trim() !== initialForm.email.trim() ||
        form.password.trim() !== initialForm.password.trim() ||
        form.role !== initialForm.role;

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
                    setUpdateID(null);
                }
            });
        } else {
            setShowForm(false);
            setUpdateID(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ name: '', email: '', password: '', department: '', job_position: '', response: null });

        let isValid = true;
        const newErrors = { name: '', email: '', password: '', department: '', job_position: '', response: null };

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
        if (!updateID) {
            if (!form.password.trim()) {
                newErrors.password = 'Password is required.';
                isValid = false;
            } else if (form.password.length < 8) {
                newErrors.password = 'Password must be at least 8 characters.';
                isValid = false;
            }
        }
        if (!form.department.trim()) {
            newErrors.department = 'Department is required.';
            isValid = false;
        }
        if (!String(form.job_position).trim()) {
            newErrors.job_position = 'Job Position is required.';
            isValid = false;
        }

        if (updateID && form.password.trim()) {
            if (form.password.length < 8) {
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

                if (form.password.trim()) {
                    formData.set('password', form.password);

                }
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

                if (!isSuperAdmin) {
                    formData.set('role', 'REQUESTER'); // force role for non-SUPER_ADMIN
                }
                const { success, data }: { success: boolean; data: UserWithRelations } = await createAccount(formData);
                if (success) {
                    setAccounts((prev) => [data, ...prev]);
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


    // const { data } = useSession()
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
                            {updateID ? 'Update Account' : 'Add New Account'}
                        </h1>
                        <p className="text-gray-500 text-sm font-semibold">
                            Effortlessly manage your accounts: {updateID ? 'update existing details' : 'add a new account'}.
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">
                        <Input
                            id="name"
                            name="name"
                            placeholder="Enter user name"
                            value={form.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            label="User name"
                            require
                            disable={loading}
                            errorMessage={errors.name}
                        />

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
                            label="Email"
                            require
                            disable={loading || !!updateID}
                            errorMessage={errors.email}
                        />

                        {(data?.user.role === "SUPER_ADMIN" || !updateID) && (
                            <Input
                                id="password"
                                name="password" // keep this as "password"
                                type="password"
                                placeholder={updateID ? "Enter new password" : "Enter password"}
                                value={form.password}
                                onChange={handleChange}
                                error={!!errors.password}
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                label={updateID ? "New Password (leave blank to keep current)" : "Password"}
                                require
                                disable={loading}
                                errorMessage={errors.password}
                            />
                        )}


                        {/* Role */}
                        {isSuperAdmin && (
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
                        )}

                        {/* Department */}
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="department"
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                >
                                    <option value="" disabled>
                                        Select Department
                                    </option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <ChevronDownIcon className="w-5 h-5" />
                                </span>
                            </div>
                            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                        </div>

                        {/* Job Position */}
                        <div>
                            <label htmlFor="jobPosition" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Job Position
                            </label>
                            <div className="relative">
                                <select
                                    id="job_position"
                                    name="job_position"
                                    value={form.job_position}
                                    onChange={handleChange}
                                    className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                    disabled={!form.department}
                                >
                                    <option value="" disabled>
                                        Select Job Position
                                    </option>
                                    {jobPositions.map((job) => (
                                        <option key={job.id} value={job.id}>
                                            {job.name}
                                        </option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                    <ChevronDownIcon className="w-5 h-5" />
                                </span>
                            </div>
                            {errors.job_position && <p className="text-red-500 text-xs mt-1">{errors.job_position}</p>}
                        </div>

                        {errors.response && (
                            <p className="text-red-500 text-xs mb-4" role="alert" aria-live="assertive">
                                {errors.response}
                            </p>
                        )}

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
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading ? (updateID ? 'Updating...' : 'Creating...') : updateID ? 'Update Account' : 'Create Account'}
                            </button>
                        </div>
                    </section>
                </form>
            </section>
        </>
    );
}
