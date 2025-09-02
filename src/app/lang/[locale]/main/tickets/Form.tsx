'use client';

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import Input from '@/components/Input';
import { createTicket, getTicket, updateTicket } from './action';
import { TicketWithRelations } from './page';
import { getAllCategoryIdAndName, getAllDepartmentIdAndName } from '@/libs/action';
import SelectBox from '@/components/SelectBox';
import ImageInput from './ImageInput';
import { useTranslations } from 'next-intl';

interface TicketFormProps {
    setShowForm: (value: boolean) => void;
    setTickets: Dispatch<SetStateAction<TicketWithRelations[]>>;
    updateID: string | null;
    setUpdateID: Dispatch<SetStateAction<string | null>>
}

const emptyForm = {
    title: '',
    description: '',
    departmentId: '',
    categoryId: '',
    subcategoryId: '',
    priority: 'MEDIUM',
};

export default function TicketForm({
    setShowForm,
    setTickets,
    updateID,
    setUpdateID
}: TicketFormProps) {
    const t = useTranslations('ticketForm'); // translation instance

    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const [categories, setCategories] = useState<{ id: string; name: string, subcategories?: { id: string; name: string }[]; }[]>([]);
    const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
    const [images, setImages] = useState<File[]>([]);
    const [existingImages, setExistingImages] = useState<{ id: string; url: string }[]>([]);

    // Fetch categories and departments
    useEffect(() => {
        const fetchData = async () => {
            const cats = await getAllCategoryIdAndName();
            const depts = await getAllDepartmentIdAndName();
            setCategories(cats);
            setDepartments(depts);
        };
        fetchData();
    }, []);

    // Update subcategories when category changes
    useEffect(() => {
        const selectedCat = categories.find(c => c.id === form.categoryId);
        setSubcategories(selectedCat?.subcategories || []);
        if (!updateID) {
            setForm(prev => ({ ...prev, subcategoryId: '' }));
        }
    }, [form.categoryId, categories, updateID]);

    // Fetch ticket for update
    useEffect(() => {
        if (updateID) {
            getTicket(updateID).then((data) => {
                if (data) {
                    setForm({
                        title: data.title ?? '',
                        description: data.description ?? '',
                        categoryId: data.categoryId ?? '',
                        departmentId: data.departmentId ?? '',
                        subcategoryId: data.subcategoryId ?? '',
                        priority: data.priority ?? 'MEDIUM',
                    });
                    setExistingImages(data.images || [])
                }
            });
        } else {
            setForm(emptyForm);
        }
    }, [updateID]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        setErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { value } = e.target;
        setForm(prev => ({ ...prev, categoryId: value, subcategoryId: '' }));
        const selectedCat = categories.find(c => c.id === value);
        setSubcategories(selectedCat?.subcategories || []);
    };

    const handleCancel = () => {
        Swal.fire({
            title: t('confirm.cancelTitle'),
            text: t('confirm.cancelText'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: t('confirm.cancelConfirm'),
            cancelButtonText: t('confirm.cancelDeny'),
        }).then((result) => {
            if (result.isConfirmed) {
                setShowForm(false);
            }
        });
        setUpdateID(null);
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.title.trim()) newErrors.title = t('errors.title');
        if (!form.description.trim()) newErrors.description = t('errors.description');
        if (!form.categoryId) newErrors.categoryId = t('errors.category');
        if (!form.departmentId) newErrors.departmentId = t('errors.department');
        if (!form.subcategoryId) newErrors.subcategoryId = t('errors.subcategory');
        if (!form.priority) newErrors.priority = t('errors.priority');

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const uploadImages = async (files: FileList | File[]) => {
        const formData = new FormData();
        Array.from(files).forEach(file => formData.append('file', file));
        const res = await fetch('/api/uploads', { method: 'POST', body: formData });
        const data = await res.json();
        return data.urls as string[];
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            const imageUrls = await uploadImages(images);
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));

            let response;
            if (updateID) {
                formData.append("newImages", JSON.stringify(imageUrls));
                formData.append('existingImageIds', JSON.stringify(existingImages.map(i => i.id)));
                response = await updateTicket(formData, updateID);
            } else {
                formData.append("images", JSON.stringify(imageUrls));
                response = await createTicket(formData);
            }

            if (response.success) {
                if (updateID) {
                    setTickets(prev => prev.map(ticket => ticket.id === updateID ? response.data : ticket));
                    Swal.fire(t('alerts.success'), t('alerts.updateSuccess'), 'success');
                } else {
                    setTickets(prev => [response.data, ...prev]);
                    Swal.fire(t('alerts.success'), t('alerts.createSuccess'), 'success');
                }
                setShowForm(false);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : t('alerts.error');
            Swal.fire({
                title: t('alerts.error'),
                text: message,
                icon: 'error',
                confirmButtonColor: "#ef4444",
                customClass: {
                    popup: "rounded-lg p-6",
                    confirmButton: "bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600",
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {loading && <Loading />}
            <section className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50" aria-modal="true" role="dialog">
                <div className="w-full h-full fixed top-0 left-0 bg-black opacity-20" onClick={handleCancel} aria-hidden="true" />

                <form onSubmit={handleSubmit} className="w-[90%] md:w-[700px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-50" onClick={(e) => e.stopPropagation()} noValidate>
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl font-bold mb-3 mt-5 text-gray-800 dark:text-gray-100">{updateID ? t('headings.update') : t('headings.create')}</h1>
                        <p className="text-gray-500 dark:text-gray-300 text-sm mb-3">{updateID ? t('headings.updateDesc') : t('headings.createDesc')}</p>
                    </div>

                    <section className="p-5 space-y-6 border-t max-h-[80vh] overflow-y-auto border-gray-100 dark:border-gray-700 sm:p-6">
                        <Input
                            id="title"
                            name="title"
                            placeholder={t('placeholders.title')}
                            label={t('labels.title')}
                            value={form.title}
                            onChange={handleChange}
                            error={!!errors.title}
                            errorMessage={errors.title ?? ""}
                            disable={loading}
                            require={true}
                        />

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('labels.description')}</label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                placeholder={t('placeholders.description')}
                                value={form.description}
                                onChange={handleChange}
                                className={`w-full rounded-lg border ${errors.description ? "border-red-500" : "border-gray-300 dark:border-gray-600"} bg-transparent dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300/50`}
                                aria-invalid={!!errors.description}
                                aria-describedby={errors.description ? 'description-error' : undefined}
                            />
                            {errors.description && <p id="description-error" className="text-red-600 text-sm mt-1">{errors.description}</p>}
                        </div>

                        <SelectBox
                            label={t('labels.department')}
                            id="departmentId"
                            name="departmentId"
                            value={form.departmentId}
                            options={departments}
                            onChange={handleChange}
                            error={errors.departmentId}
                            placeholder={t('placeholders.department')}
                        />

                        <div className='grid grid-cols-2 gap-3'>
                            <SelectBox
                                label={t('labels.category')}
                                id="categoryId"
                                name="categoryId"
                                value={form.categoryId}
                                options={categories}
                                onChange={handleCategoryChange}
                                error={errors.categoryId}
                                placeholder={t('placeholders.category')}
                            />

                            <SelectBox
                                label={t('labels.subcategory')}
                                id="subcategoryId"
                                name="subcategoryId"
                                value={form.subcategoryId}
                                options={subcategories}
                                onChange={handleChange}
                                error={errors.subcategoryId}
                                placeholder={t('placeholders.subcategory')}
                                disabled={!form.categoryId}
                            />
                        </div>

                        <SelectBox
                            label={t('labels.priority')}
                            id="priority"
                            name="priority"
                            value={form.priority}
                            options={[
                                { id: 'LOW', name: 'LOW' },
                                { id: 'MEDIUM', name: 'MEDIUM' },
                                { id: 'HIGH', name: 'HIGH' },
                                { id: 'URGENT', name: 'URGENT' },
                            ]}
                            onChange={handleChange}
                            error={errors.priority}
                            placeholder={t('placeholders.priority')}
                        />

                        <ImageInput images={images} setImages={setImages} existingImages={existingImages} setExistingImages={setExistingImages} />

                        <div className="mt-6 flex justify-end space-x-3">
                            <button type="button" onClick={handleCancel} className="px-4 py-3 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 h-[44px]">{t('buttons.cancel')}</button>
                            <button type="submit" disabled={loading} className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}>
                                {loading ? (updateID ? t('buttons.updating') : t('buttons.creating')) : updateID ? t('buttons.update') : t('buttons.create')}
                            </button>
                        </div>
                    </section>
                </form>
            </section>

        </>
    );
}
