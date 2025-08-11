'use client';

import React, { Dispatch, SetStateAction, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loading from '@/components/Loading';
import Input from '@/components/Input';
import { createTicket, getTicket, updateTicket } from './action';
import { TicketWithRelations } from './page';
import { getAllCategoryIdAndName, getAllDepartmentIdAndName } from '@/libs/action';
import SelectBox from '@/components/SelectBox';

interface TicketFormProps {
    setShowForm: (value: boolean) => void;
    setTickets: Dispatch<SetStateAction<TicketWithRelations[]>>;
    updateID: string | null;
}

const emptyForm = {
    title: '',
    description: '',
    categoryId: '',
    channelId: '',
    priority: 'MEDIUM',
    status: 'OPEN',
};

export default function TicketForm({
    setShowForm,
    setTickets,
    updateID,
}: TicketFormProps) {
    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        // Fetch categories and departments once
        const fetchData = async () => {
            const cats = await getAllCategoryIdAndName();
            const depts = await getAllDepartmentIdAndName();
            setCategories(cats);
            setDepartments(depts);
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (updateID) {
            getTicket(updateID).then((data) => {
                if (data) {
                    setForm({
                        title: data.title ?? '',
                        description: data.description ?? '',
                        categoryId: data.categoryId ?? '',
                        channelId: data.channelId ?? '',
                        priority: data.priority ?? 'MEDIUM',
                        status: data.status ?? 'OPEN',
                    });
                }
            });
        } else {
            setForm(emptyForm);
        }
    }, [updateID]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: null }));
    };

    const handleCancel = () => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Any unsaved changes will be lost.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, close it',
            cancelButtonText: 'No, keep editing',
        }).then((result) => {
            if (result.isConfirmed) {
                setShowForm(false);
            }
        });
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!form.title.trim()) newErrors.title = 'Title is required';
        if (!form.description.trim()) newErrors.description = 'Description is required';
        if (!form.categoryId) newErrors.categoryId = 'Category is required';
        if (!form.channelId.trim()) newErrors.channelId = 'Channel is required';
        if (!form.priority) newErrors.priority = 'Priority is required';
        if (!form.status) newErrors.status = 'Status is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    //   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    //     e.preventDefault();

    //     if (!validate()) return;

    //     setLoading(true);

    //     try {
    //       const formData = new FormData();
    //       Object.entries(form).forEach(([key, value]) => {
    //         formData.append(key, value);
    //       });

    //       // If you want to add an image upload:
    //       // formData.append('image', selectedFile);

    //       if (updateID) {
    //         const { success, data } = await updateTicket(formData, updateID);
    //         if (success) {
    //           setTickets((prev) => prev.map((t) => (t.id === updateID ? data : t)));
    //           Swal.fire('Success', 'Ticket updated successfully!', 'success');
    //         }
    //       } else {
    //         const { success, data } = await createTicket(formData);
    //         if (success) {
    //           setTickets((prev) => [data, ...prev]);
    //           Swal.fire('Success', 'Ticket created successfully!', 'success');
    //         }
    //       }
    //       setShowForm(false);
    //     } catch (error: any) {
    //       Swal.fire('Error', error.message || 'Failed to save ticket', 'error');
    //     } finally {
    //       setLoading(false);
    //     }
    //   };

    return (
        <>
            {loading && <Loading />}
            <section
                className="w-screen fixed top-0 left-0 flex justify-center min-h-screen overflow-auto h-screen items-center backdrop-blur-lg z-50"
                aria-modal="true"
                role="dialog"
            >
                <div
                    className="w-full h-full fixed top-0 left-0 bg-black opacity-20"
                    onClick={handleCancel}
                    aria-hidden="true"
                />

                <form
                    //   onSubmit={handleSubmit}
                    className="w-[90%] md:w-[600px] rounded-2xl border border-gray-200 bg-white z-50"
                    onClick={(e) => e.stopPropagation()}
                    noValidate
                >
                    <div className="px-5 py-4 sm:px-6 sm:py-5">
                        <h1 className="text-2xl font-bold mb-3 mt-5">
                            {updateID ? 'Update Ticket' : 'Create New Ticket'}
                        </h1>
                        <p className="text-gray-500 text-sm mb-3">
                            {updateID ? 'Update ticket details' : 'Fill out the form to create a ticket'}
                        </p>
                    </div>

                    <section className="p-5 space-y-6 border-t border-gray-100 sm:p-6">
                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                            </label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="Enter ticket title"
                                value={form.title}
                                onChange={handleChange}
                                error={!!errors.title}
                                aria-invalid={!!errors.title}
                                aria-describedby={errors.title ? 'title-error' : undefined}
                            />
                            {errors.title && (
                                <p id="title-error" className="text-red-600 text-sm mt-1">
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                placeholder="Enter ticket description"
                                value={form.description}
                                onChange={handleChange}
                                className={`w-full rounded-lg border px-4 py-2 text-gray-800 text-sm resize-none ${errors.description ? 'border-red-600' : 'border-gray-300'
                                    }`}
                                aria-invalid={!!errors.description}
                                aria-describedby={errors.description ? 'description-error' : undefined}
                            />
                            {errors.description && (
                                <p id="description-error" className="text-red-600 text-sm mt-1">
                                    {errors.description}
                                </p>
                            )}
                        </div>


                        {/* Category */}
                        <SelectBox
                            label="Category"
                            id="categoryId"
                            name="categoryId"
                            value={form.categoryId}
                            options={categories}  // categories is [{ id, name }]
                            onChange={handleChange}
                            error={errors.categoryId}
                            placeholder="Select Category"
                        />

                        {/* Priority */}
                        <SelectBox
                            label="Priority"
                            id="priority"
                            name="priority"
                            value={form.priority}
                            options={[
                                { id: 'LOW', name: 'Low' },
                                { id: 'MEDIUM', name: 'Medium' },
                                { id: 'HIGH', name: 'High' },
                                { id: 'URGENT', name: 'Urgent' },
                            ]}
                            onChange={handleChange}
                            error={errors.priority}
                            placeholder="Select Priority"
                        />







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
                                className={`px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md h-[44px] ${loading ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'
                                    }`}
                            >
                                {loading ? (updateID ? 'Updating...' : 'Creating...') : updateID ? 'Update Ticket' : 'Create Ticket'}
                            </button>
                        </div>
                    </section>
                </form>
            </section>
        </>
    );
}
