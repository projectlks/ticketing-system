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
import { useTranslations } from 'next-intl';

interface AccountCreateFormProps {
    setShowForm: (value: boolean) => void;
    setAccounts: Dispatch<SetStateAction<UserWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>;
}

export default function Form({ setShowForm, setAccounts, updateID, setUpdateID }: AccountCreateFormProps) {
    const t = useTranslations('accountForm'); // single translation instance

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

    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const accountData = await getAccount(updateID);
                setForm({
                    name: accountData?.name ?? '',
                    email: accountData?.email ?? '',
                    password: '',
                    role: accountData?.role ?? 'REQUESTER',
                    department: accountData?.departmentId ?? '',
                    job_position: accountData?.jobPositionId ?? '',
                });
                setInitialForm({
                    name: accountData?.name ?? '',
                    email: accountData?.email ?? '',
                    password: '',
                    role: accountData?.role ?? 'REQUESTER',
                    department: accountData?.departmentId ?? '',
                    job_position: accountData?.jobPositionId ?? '',
                });
            };
            getData();
        } else {
            setForm(isSuperAdmin ? emptyForm : { ...emptyForm, role: 'REQUESTER' });
            setInitialForm(isSuperAdmin ? emptyForm : { ...emptyForm, role: 'REQUESTER' });
        }
    }, [updateID, isSuperAdmin]);

    useEffect(() => {
        const getDepartment = async () => {
            const data = await getAllDepartmentIdAndName();
            setDepartments(data);
        };
        getDepartment();
    }, []);

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
                title: t("alerts.cancel.title"),
                text: t("alerts.cancel.text"),
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#6b7280",
                confirmButtonText: t("alerts.cancel.confirm"),
                cancelButtonText: t("alerts.cancel.cancel"),
                customClass: {
                    popup: "rounded-lg p-6",
                    confirmButton: "bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600",
                    cancelButton: "bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-400",
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
        setErrors({ name: "", email: "", password: "", department: "", job_position: "", response: null });

        let isValid = true;
        const newErrors = { name: "", email: "", password: "", department: "", job_position: "", response: null };

        if (!form.name.trim()) {
            newErrors.name = t("labels.name") + " " + t("errors.required");
            isValid = false;
        }
        if (!form.email.trim()) {
            newErrors.email = t("labels.email") + " " + t("errors.required");
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(form.email)) {
            newErrors.email = t("errors.invalidEmail");
            isValid = false;
        }
        if (!updateID) {
            if (!form.password.trim()) {
                newErrors.password = t("labels.password.create") + " " + t("errors.required");
                isValid = false;
            } else if (form.password.length < 8) {
                newErrors.password = t("errors.passwordLength");
                isValid = false;
            }
        }
        if (!form.department.trim()) {
            newErrors.department = t("labels.department") + " " + t("errors.required");
            isValid = false;
        }
        if (!String(form.job_position).trim()) {
            newErrors.job_position = t("labels.job_position") + " " + t("errors.required");
            isValid = false;
        }
        if (updateID && form.password.trim() && form.password.length < 8) {
            newErrors.password = t("errors.passwordLength");
            isValid = false;
        }

        if (!isValid) {
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);

        try {
            if (updateID) {
                if (form.password.trim()) formData.set("password", form.password);
                const { success, data } = await updateAccount(formData, updateID);
                if (success) {
                    setAccounts((prev) => prev.map((item) => (item.id === updateID ? data : item)));
                    Swal.fire({
                        title: t("alerts.success.title"),
                        text: t("alerts.success.update"),
                        icon: "success",
                        confirmButtonColor: "#6366f1",
                        customClass: { popup: "rounded-lg p-6", confirmButton: "bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600" },
                    });
                }
            } else {
                if (!isSuperAdmin) formData.set("role", "REQUESTER");
                const { success, data }: { success: boolean; data: UserWithRelations } = await createAccount(formData);
                if (success) {
                    setAccounts((prev) => [data, ...prev]);
                    Swal.fire({
                        title: t("alerts.success.title"),
                        text: t("alerts.success.create"),
                        icon: "success",
                        confirmButtonColor: "#6366f1",
                        customClass: { popup: "rounded-lg p-6", confirmButton: "bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600" },
                    });
                }
            }
            setShowForm(false);
        } catch (error) {
            const message = error instanceof Error ? error.message : t("alerts.error.title");
            setErrors((prev) => ({ ...prev, response: message }));
            Swal.fire({
                title: t("alerts.error.title"),
                text: message,
                icon: "error",
                confirmButtonColor: "#ef4444",
                customClass: { popup: "rounded-lg p-6", confirmButton: "bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600" },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <Loading />}
            <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50" aria-modal="true" role="dialog">
                <div
                    className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                    onClick={handleCancel}
                    aria-hidden="true"
                />

                <form
                    onSubmit={handleSubmit}
                    className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50"
                    onClick={(e) => e.stopPropagation()}
                    noValidate
                >
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl font-bold mb-3 mt-5 text-gray-800 dark:text-gray-100">
                            {updateID ? t('headings.update') : t('headings.create')}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-300 text-sm font-semibold">
                            {updateID ? t('headings.updateDesc') : t('headings.createDesc')}
                        </p>
                    </div>
                    <section className="p-5 space-y-6 border-t border-gray-100 dark:border-gray-700 sm:p-6">
                        <Input
                            id="name"
                            name="name"
                            placeholder={t('placeholders.name')}
                            value={form.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            label={t('labels.name')}
                            require
                            disable={loading}
                            errorMessage={errors.name}
                        />

                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder={t('placeholders.email')}
                            value={form.email}
                            onChange={handleChange}
                            error={!!errors.email}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? 'email-error' : undefined}
                            label={t('labels.email')}
                            require
                            disable={loading || !!updateID}
                            errorMessage={errors.email}
                        />

                        {(isSuperAdmin || !updateID) && (
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder={updateID ? t('placeholders.password.update') : t('placeholders.password.create')}
                                value={form.password}
                                onChange={handleChange}
                                error={!!errors.password}
                                aria-invalid={!!errors.password}
                                aria-describedby={errors.password ? 'password-error' : undefined}
                                label={updateID ? t('labels.password.update') : t('labels.password.create')}
                                require
                                disable={loading}
                                errorMessage={errors.password}
                            />
                        )}

                        {isSuperAdmin && (
                            <div>
                                <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('labels.role')}
                                </label>
                                <div className="relative">
                                    <select
                                        ref={selectRef}
                                        id="role"
                                        name="role"
                                        value={form.role}
                                        onChange={handleChange}
                                        className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                    >
                                        <option value="REQUESTER">REQUESTER</option>
                                        <option value="AGENT">AGENT</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                    <span
                                        onClick={() => {
                                            selectRef.current?.focus();
                                            selectRef.current?.click();
                                        }}
                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 cursor-pointer"
                                    >
                                        <ChevronDownIcon className="w-5 h-5" />
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Department */}
                        <div>
                            <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('labels.department')} <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    id="department"
                                    name="department"
                                    value={form.department}
                                    onChange={handleChange}
                                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                >
                                    <option value="" disabled>{t('placeholders.department')}</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                                    <ChevronDownIcon className="w-5 h-5" />
                                </span>
                            </div>
                            {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                        </div>

                        {/* Job Position */}
                        <div>
                            <label htmlFor="jobPosition" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('labels.job_position')}
                            </label>
                            <div className="relative">
                                <select
                                    id="job_position"
                                    name="job_position"
                                    value={form.job_position}
                                    onChange={handleChange}
                                    className="h-11 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 appearance-none"
                                    disabled={!form.department}
                                >
                                    <option value="" disabled>{t('placeholders.job_position')}</option>
                                    {jobPositions.map((job) => (
                                        <option key={job.id} value={job.id}>{job.name}</option>
                                    ))}
                                </select>
                                <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
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
                                className="px-4 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 h-[44px]"
                            >
                                {t('buttons.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                            >
                                {loading
                                    ? (updateID ? t('buttons.updating') : t('buttons.creating'))
                                    : updateID ? t('buttons.update') : t('buttons.create')}
                            </button>
                        </div>
                    </section>
                </form>
            </section>

        </>
    );
}
