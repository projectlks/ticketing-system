'use client';

import Input from '@/components/Input';
import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { CategoryWithRelations } from './page';
import { createCategory, getCategory, updateCategory } from './action';
import Loading from '@/components/Loading';
import Button from '@/components/Button';
import { useTranslations } from 'next-intl';

interface CategoryFormProps {
    setShowForm: (value: boolean) => void;
    setCategories: Dispatch<SetStateAction<CategoryWithRelations[]>>
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>
}

export default function Form({ setShowForm, setCategories, updateID, setUpdateID }: CategoryFormProps) {
    const t = useTranslations('categoryForm'); // 🔹 single translation instance

    const [errors, setErrors] = useState({
        name: '',
        response: null as string | null,
    });

    const [loading, setLoading] = useState(false);
    const [newSubCategory, setNewSubCategory] = useState<string>("");
    const [subCategories, setSubCategories] = useState<{ id?: string; title: string }[]>([]);

    const addSubCategories = () => {
        if (!newSubCategory.trim()) return;
        setSubCategories(prev => [{ title: newSubCategory.trim() }, ...prev]);
        setNewSubCategory("");
    };

    const updateSubCategories = (index: number, newTitle: string) => {
        setSubCategories(prev => prev.map((job, i) => i === index ? { ...job, title: newTitle } : job));
    };

    const emptyForm = { name: '' };
    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);

    useEffect(() => {
        if (updateID) {
            const getData = async () => {
                const categories = await getCategory(updateID);
                const normalizedData = { name: categories?.name ?? '' };
                setForm(normalizedData);
                setInitialForm(normalizedData);

                if (categories?.subcategories?.length) {
                    const normalizedSubs = categories.subcategories.map(sub => ({
                        id: sub.id,
                        title: sub.name,
                    }));
                    setSubCategories(normalizedSubs);
                } else {
                    setSubCategories([]);
                }
            };
            getData();
        } else {
            setForm(emptyForm);
            setInitialForm(emptyForm);
            setSubCategories([]);
        }
    }, [updateID]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: '', response: null }));
    };

    const isFormDirty = () => form.name.trim() !== initialForm.name.trim();

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
        setErrors({ name: '', response: null });

        let isValid = true;
        const newErrors = { name: '', response: null };

        if (!form.name.trim()) {
            newErrors.name = t('errors.required');
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
                const { success, data } = await updateCategory(formData, updateID, subCategories);
                if (success) {
                    setCategories(prev => prev.map(item => item.id === updateID ? data : item));
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
                const { success, data }: { success: boolean, data: CategoryWithRelations } = await createCategory(formData, subCategories);
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
                    onClick={(e) => e.stopPropagation()}
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

                        {/* Subcategories */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                {t('labels.subcategories')}
                            </label>
                            <div className="flex space-x-2 items-center mb-3">
                                <input
                                    type="text"
                                    placeholder={t('placeholders.subCategory')}
                                    value={newSubCategory}
                                    onChange={(e) => setNewSubCategory(e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-2 text-sm border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50 bg-white dark:bg-gray-800"
                                />
                                <Button click={addSubCategories} buttonLabel={t('buttons.add')} disabled={!newSubCategory?.trim()} />
                            </div>

                            {subCategories.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-xl p-3">
                                    {subCategories.map((job, idx) => (
                                        <div key={job.id ?? idx} className="flex flex-col">
                                            <div className="flex items-center w-fit space-x-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 pr-1 text-sm relative">
                                                <input
                                                    type="text"
                                                    value={job.title}
                                                    onChange={(e) => updateSubCategories(idx, e.target.value)}
                                                    onBlur={() => {
                                                        const trimmed = job.title.trim();
                                                        if (trimmed === "") return;
                                                        updateSubCategories(idx, trimmed);
                                                    }}
                                                    className={`bg-transparent border-none text-sm text-gray-800 dark:text-gray-100 focus:outline-none w-auto min-w-[10px] ${job.title.trim() === "" ? "border-b-2 border-red-500" : ""}`}
                                                />
                                            </div>
                                            {job.title.trim() === "" && (
                                                <span className="text-red-500 text-xs mt-1 ml-1">{t('errors.subCategoryEmpty')}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
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
                                    ? updateID
                                        ? t('buttons.updating')
                                        : t('buttons.creating')
                                    : updateID
                                        ? t('buttons.update')
                                        : t('buttons.create')}
                            </button>
                        </div>
                    </section>
                </form>
            </section>

        </>
    );
}
