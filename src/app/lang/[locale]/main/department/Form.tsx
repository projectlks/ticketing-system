'use client';

import Input from '@/components/Input';
import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { DepartmentWithRelations } from './page';
import { createDepartment, getDepartment, updateDepartment } from './action';
import { getUserIdsandEmail } from '@/libs/action';
import Loading from '@/components/Loading';
import SelectBox from '@/components/SelectBox';
import Button from '@/components/Button';
import { useTranslations } from 'next-intl';

interface FormProps {
    setShowForm: (value: boolean) => void;
    setDepartments: Dispatch<SetStateAction<DepartmentWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>;
}

const emptyForm = {
    name: '',
    email: '',
    contact: '',
    description: '',
    managerId: '',
};

export default function Form({ setShowForm, setDepartments, updateID, setUpdateID }: FormProps) {
    const t = useTranslations('departmentForm');
    const [form, setForm] = useState(emptyForm);
    const [errors, setErrors] = useState({ ...emptyForm, response: null as string | null });
    const [loading, setLoading] = useState(false);
    const [userIdsAndEmails, setUserIdsAndEmails] = useState<{ id: string; email: string; name: string }[]>([]);
    const initialFormRef = useRef(emptyForm);

    const [jobPositions, setJobPositions] = useState<{ id?: string; title: string }[]>([]);
    const [newJobTitle, setNewJobTitle] = useState('');

    useEffect(() => {
        const fetchUserIdsAndEmails = async () => {
            const users = await getUserIdsandEmail();
            setUserIdsAndEmails(users);
        };
        fetchUserIdsAndEmails();
    }, []);

    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const departmentData: DepartmentWithRelations | null = await getDepartment(updateID);
                if (!departmentData) {
                    Swal.fire({
                        title: t('alerts.error.title'),
                        text: t('alerts.error.text'),
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

                setJobPositions(
                    departmentData.positions?.map((job) => ({ id: job.id, title: job.name })) || []
                );

                initialFormRef.current = mappedData;
            };
            getData();
        } else {
            setForm(emptyForm);
            initialFormRef.current = emptyForm;
            setJobPositions([]);
        }
    }, [updateID, t, setShowForm]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    const isFormDirty = () => JSON.stringify(form) !== JSON.stringify(initialFormRef.current);

    const handleCancel = () => {
        if (isFormDirty() || jobPositions.length > 0) {
            Swal.fire({
                title: t('alerts.cancel.title'),
                text: t('alerts.cancel.text'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#6b7280',
                confirmButtonText: t('alerts.cancel.confirm'),
                cancelButtonText: t('alerts.cancel.cancel'),
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

    const validateForm = (form: typeof emptyForm) => {
        const newErrors = { ...emptyForm, response: null };
        let isValid = true;

        if (!form.name.trim()) { newErrors.name = t('errors.required'); isValid = false; }
        if (!form.email.trim()) { newErrors.email = t('errors.required'); isValid = false; }
        else if (!/\S+@\S+\.\S+/.test(form.email)) { newErrors.email = t('errors.invalidEmail'); isValid = false; }
        if (!form.contact.trim()) { newErrors.contact = t('errors.required'); isValid = false; }

        return { isValid, newErrors };
    };

    const addJobPosition = () => {
        if (!newJobTitle.trim()) return;
        setJobPositions(prev => [{ title: newJobTitle.trim() }, ...prev]);
        setNewJobTitle('');
    };

    const updateJobTitle = (index: number, newTitle: string) => {
        setJobPositions(prev => prev.map((job, i) => i === index ? { ...job, title: newTitle } : job));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setErrors({ ...emptyForm, response: null });

        const { isValid, newErrors } = validateForm(form);

        let hasEmptyJob = false;
        const updatedJobs = jobPositions.map((job) => {
            if (!job.title.trim()) hasEmptyJob = true;
            return { ...job, title: job.title.trim() };
        });

        if (!isValid || hasEmptyJob) {
            setJobPositions(updatedJobs);
            if (hasEmptyJob) {
                Swal.fire({
                    title: t('alerts.error.title'),
                    text: t('errors.jobEmpty'),
                    icon: 'error',
                    confirmButtonColor: '#ef4444',
                    customClass: {
                        popup: 'rounded-lg p-6',
                        confirmButton: 'bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600',
                    },
                });
            }
            setErrors(newErrors);
            setLoading(false);
            return;
        }

        const formData = new FormData(e.currentTarget);

        try {
            if (updateID) {
                const { success, data } = await updateDepartment(formData, updateID, updatedJobs);
                if (success) {
                    setDepartments(prev => prev.map(item => item.id === updateID ? data : item));
                    Swal.fire({
                        title: t('alerts.success.title'),
                        text: t('alerts.success.update'),
                        icon: 'success',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            popup: 'rounded-lg p-6',
                            confirmButton: 'bg-indigo-500 text-white px-4 py-2 rounded text-sm hover:bg-indigo-600',
                        },
                    });
                }
            } else {
                const { success, data } = await createDepartment(formData, updatedJobs);
                if (success) {
                    setDepartments(prev => [data, ...prev]);
                    Swal.fire({
                        title: t('alerts.success.title'),
                        text: t('alerts.success.create'),
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
            const message = error instanceof Error ? error.message : t('errors.response');
            setErrors(prev => ({ ...prev, response: message }));
            Swal.fire({
                title: t('alerts.error.title'),
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
                <div className="w-full h-full fixed top-0 left-0 bg-black opacity-20" onClick={handleCancel} aria-hidden="true" />
                <form onSubmit={handleSubmit} className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50" onClick={(e) => e.stopPropagation()} noValidate>
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-3 mt-5">{updateID ? t('headings.update') : t('headings.create')}</h1>
                        <p className="text-gray-500 dark:text-gray-300 text-sm font-semibold">
                            {updateID ? t('headings.updateDesc') : t('headings.createDesc')}
                        </p>
                    </div>
                    <section className="p-5 space-y-6 border-t max-h-[75vh] overflow-y-auto overflow-x-hidden border-gray-100 dark:border-gray-700 sm:p-6">
                        <Input id="name" name="name" placeholder={t('placeholders.name')} value={form.name} onChange={handleChange} error={!!errors.name} disable={loading} label={t('labels.name')} require={true} errorMessage={errors.name} />
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('labels.description')}</label>
                            <textarea
                                id="description"
                                name="description"
                                placeholder={t('placeholders.description')}
                                value={form.description}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 text-gray-800 dark:text-gray-100 dark:bg-gray-800 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50"
                                rows={4}
                            />
                        </div>
                        <Input id="contact" name="contact" placeholder={t('placeholders.contact')} value={form.contact} onChange={handleChange} error={!!errors.contact} label={t('labels.contact')} disable={loading} require={true} errorMessage={errors.contact} />
                        <Input id="email" name="email" placeholder={t('placeholders.email')} value={form.email} onChange={handleChange} error={!!errors.email} disable={loading} require={true} errorMessage={errors.email} label={t('labels.email')} />
                        <SelectBox label={t('labels.manager')} id="managerId" name="managerId" value={form.managerId} options={userIdsAndEmails} onChange={handleChange} error={errors.managerId} showEmail={true} />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('labels.jobPositions')} <span className="text-red-500">*</span></label>
                            <div className="flex space-x-2 items-center mb-3">
                                <input type="text" placeholder={t('placeholders.jobTitle')} value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} className="flex-1 border rounded-lg px-3 py-2 text-sm border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50" />
                                <Button click={addJobPosition} buttonLabel={t('buttons.addJob')} disabled={!newJobTitle.trim()} />
                            </div>
                            {jobPositions.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-xl p-3">
                                    {jobPositions.map((job, idx) => (
                                        <div key={job.id ?? idx} className="flex flex-col">
                                            <div className="flex items-center w-fit space-x-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 pr-1 text-sm relative">
                                                <input
                                                    type="text"
                                                    value={job.title}
                                                    onChange={(e) => updateJobTitle(idx, e.target.value)}
                                                    onBlur={() => {
                                                        const trimmed = job.title.trim();
                                                        if (trimmed === "") return;
                                                        updateJobTitle(idx, trimmed);
                                                    }}
                                                    className={`bg-transparent border-none text-sm text-gray-800 dark:text-gray-100 focus:outline-none w-auto min-w-[10px] ${job.title.trim() === "" ? "border-b-2 border-red-500" : ""}`}
                                                />
                                            </div>
                                            {job.title.trim() === "" && <span className="text-red-500 text-xs mt-1 ml-1">{t('errors.jobEmpty')}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {errors.response && <p className="text-red-500 text-xs mb-4" role="alert">{errors.response}</p>}

                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={handleCancel} disabled={loading} className="px-4 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 h-[44px]">{t('buttons.cancel')}</button>
                            <button type="submit" disabled={loading} className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                {loading ? (updateID ? t('buttons.updating') : t('buttons.creating')) : (updateID ? t('buttons.update') : t('buttons.create'))}
                            </button>
                        </div>
                    </section>
                </form>
            </section>

        </>
    );
}
