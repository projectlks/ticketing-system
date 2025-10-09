'use client';

import Input from '@/components/Input';
import SelectBox from '@/components/SelectBox';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { useTranslations } from 'next-intl';
import Loading from '@/components/Loading';
import { CategoryWithRelations } from './page';
import { createCategory, getCategory, getDepartments, updateCategory } from './action';

interface CategoryFormProps {
    setShowForm: (value: boolean) => void;
    setCategories: Dispatch<SetStateAction<CategoryWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>;
}

export default function Form({ setShowForm, setCategories, updateID, setUpdateID }: CategoryFormProps) {
    const t = useTranslations('categoryForm');

    const emptyForm = { name: '', departmentId: '' };
    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [errors, setErrors] = useState<{ name: string; departmentId: string; response: string | null }>({
        name: '',
        departmentId: '',
        response: null,
    });
    const [loading, setLoading] = useState(false);

    // Fetch departments on mount
    useEffect(() => {
        const fetchDepartments = async () => {
            const data = await getDepartments();
            setDepartments(data);
        };
        fetchDepartments();
    }, []);

    // Populate form when updating
    useEffect(() => {
        if (!updateID) return;
        const fetchCategory = async () => {
            const data = await getCategory(updateID);
            if (data) {
                setForm({ name: data.name, departmentId: data.departmentId });
                setInitialForm({ name: data.name, departmentId: data.departmentId });
            }
        };
        fetchCategory();
    }, [updateID]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: '', response: null }));
    };

    const isFormDirty = () =>
        form.name.trim() !== initialForm.name.trim() || form.departmentId !== initialForm.departmentId;

    const handleCancel = () => {
        if (isFormDirty()) {
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
            }).then(result => {
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
        setErrors({ name: '', departmentId: '', response: null });

        // Validation
        let isValid = true;
        const newErrors = { name: '', departmentId: '', response: null };

        if (!form.name.trim()) {
            newErrors.name = t('errors.required');
            isValid = false;
        }
        if (!form.departmentId) {
            newErrors.departmentId = t('errors.required');
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
                const { success, data } = await updateCategory(formData, updateID);
                if (success) {
                    setCategories(prev => prev.map(item => (item.id === updateID ? data : item)));
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
                const { success, data }: { success: boolean; data: CategoryWithRelations } = await createCategory(formData);
                if (success) {
                    setCategories(prev => [data, ...prev]);
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
            setUpdateID(null);
        } catch (error) {
            const message = error instanceof Error ? error.message : t('alerts.error.text');
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
                <div
                    className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                    onClick={handleCancel}
                    aria-hidden="true"
                />

                <form
                    onSubmit={handleSubmit}
                    className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50"
                    onClick={e => e.stopPropagation()}
                    noValidate
                >
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-3 mt-5">
                            {updateID ? t('headings.update') : t('headings.create')}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-300 text-sm font-semibold">
                            {updateID ? t('headings.updateDesc') : t('headings.createDesc')}
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t border-gray-100 dark:border-gray-700 sm:p-6">
                   


                            <SelectBox
                                label={t('labels.department')}
                                id="departmentId"
                                name="departmentId"
                                value={form.departmentId}
                                options={departments.map(dep => ({ id: dep.id, name: dep.name }))}
                                onChange={handleChange}
                                placeholder={t('placeholders.department')}
                                error={errors.departmentId}
                                  require={true}
                                
                            />
                     
                        <Input
                            id="name"
                            name="name"
                            placeholder={t('placeholders.name')}
                            value={form.name}
                            onChange={handleChange}
                            error={!!errors.name}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? 'name-error' : undefined}
                            disable={loading}
                            errorMessage={errors.name}
                            label={t('labels.name')}
                            require={true}
                        />

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
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading ? (updateID ? t('buttons.updating') : t('buttons.creating')) : updateID ? t('buttons.update') : t('buttons.create')}
                            </button>
                        </div>
                    </section>
                </form>
            </section>
        </>
    );
}
